import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../../platform/logger.js';
import { contentRepository } from './content.repository.js';
import { downloadSourcePdf } from './content.storage.js';
import { createLlamaParseJob, getLlamaParseResult } from './llamaparse.provider.js';
import { nextRetryAt } from './ingestion-state.js';
import { extractQuestionCandidates } from './question-extraction.js';
import { extractPdfDiagrams } from './diagram.service.js';
import { buildVectorDocument, embedQuestionDocument } from './embedding.provider.js';
import { upsertQuestionVector } from './qdrant.repository.js';
import { createVectorPointId } from './content.contracts.js';
import { ingestionEvents } from './ingestion-events.js';
import { classifyQuestionTopic } from './groq.provider.js';

const MAX_ATTEMPTS = 5;

/** Emit a progress event for a job (shorthand). */
function emit(jobId, stage, step, message, detail = null, level = 'info') {
  ingestionEvents.progress(jobId, { stage, step, message, detail, level });
}

function workerError(error) {
  const status = error?.status || error?.statusCode;
  return {
    code: status === 429 ? 'RATE_LIMITED' : 'PARSER_FAILED',
    message: error?.message || 'Unknown parser failure',
    retryable: status === 429 || !status || status >= 500
  };
}

async function pauseOrFail(job, error, workerId) {
  const details = workerError(error);
  const attemptCount = (job.retry?.attempt_count || 0) + 1;
  const stage = details.retryable && attemptCount < MAX_ATTEMPTS ? 'PAUSED' : 'FAILED';

  emit(job.job_id, job.stage || 'PARSING', 'error',
    `Pipeline ${stage.toLowerCase()}: ${details.message}`,
    { error_code: details.code, attempt: attemptCount, retryable: details.retryable },
    'error'
  );

  await contentRepository.setJobState(job.job_id, 'PARSING', stage, {
    retry: { attempt_count: attemptCount, next_attempt_at: stage === 'PAUSED' ? nextRetryAt(attemptCount) : null },
    lease: null,
    errors: [...(job.errors || []), { ...details, occurred_at: new Date() }]
  }, { event: stage === 'PAUSED' ? 'JOB_PAUSED' : 'JOB_FAILED', actor_id: workerId, occurred_at: new Date(), reason: details.code });
}

export async function processOneIngestionJob(workerId = `worker_${randomUUID()}`) {
  const job = await contentRepository.claimNextJob(workerId, new Date(Date.now() + 15 * 60_000));
  if (!job) return false;

  const jobId = job.job_id;
  const filename = job.source?.filename || `${jobId}.pdf`;

  emit(jobId, 'PARSING', 'claimed',
    `Worker ${workerId} claimed job for "${filename}"`,
    { job_id: jobId, filename, worker_id: workerId }
  );

  try {
    // ─────────────────────────────────────────────────
    // STAGE: PARSING — Submit to LlamaParse
    // ─────────────────────────────────────────────────

    // BUG 6 FIX: Declare pdfBytes in outer scope so it is always accessible later.
    let pdfBytes = null;

    let providerJobId = job.external_parse?.provider_job_id;
    if (!providerJobId) {
      emit(jobId, 'PARSING', 'download_pdf',
        `Downloading source PDF "${filename}" from Supabase Storage…`,
        { storage_path: job.source?.storage_path }
      );

      pdfBytes = await downloadSourcePdf(job.source.storage_path);

      emit(jobId, 'PARSING', 'pdf_downloaded',
        `PDF downloaded (${(pdfBytes.length / 1024).toFixed(0)} KB). Submitting to LlamaParse…`,
        { size_bytes: pdfBytes.length }
      );

      const externalJob = await createLlamaParseJob(
        { bytes: pdfBytes, filename },
        (ev) => emit(jobId, 'PARSING', ev.step, ev.message, ev.detail || null)
      );

      providerJobId = externalJob.id;
      await contentRepository.setJobMetadata(job.job_id, 'PARSING', {
        external_parse: { provider: 'LLAMA_PARSE', provider_job_id: providerJobId, created_at: new Date() }
      }, { event: 'EXTERNAL_PARSE_CREATED', actor_id: workerId, occurred_at: new Date(), provider_job_id: providerJobId });

      emit(jobId, 'PARSING', 'llamaparse_job_created',
        `LlamaParse job created: ${providerJobId}. Waiting for OCR to complete…`,
        { provider_job_id: providerJobId },
        'info'
      );
    } else {
      emit(jobId, 'PARSING', 'llamaparse_resume',
        `Resuming existing LlamaParse job ${providerJobId} (retry run)…`,
        { provider_job_id: providerJobId }
      );
    }

    // Wait for LlamaParse result
    const parsed = await getLlamaParseResult(
      providerJobId,
      (ev) => emit(jobId, 'PARSING', ev.step, ev.message, ev.detail || null)
    );

    // ─────────────────────────────────────────────────
    // STAGE: STRUCTURING — Save parsed document
    // ─────────────────────────────────────────────────
    emit(jobId, 'STRUCTURING', 'save_parsed_doc',
      `Saving parsed document to MongoDB (${parsed.pages?.length || 0} pages)…`,
      { total_pages: parsed.pages?.length, usage: parsed.usage }
    );

    await contentRepository.saveParsedDocument({
      job_id: jobId,
      source: job.source,
      ...parsed,
      created_at: new Date()
    });

    await contentRepository.setJobState(jobId, 'PARSING', 'STRUCTURING', {
      lease: null
    }, { event: 'PARSING_COMPLETED', actor_id: workerId, occurred_at: new Date(), provider_job_id: providerJobId });

    emit(jobId, 'STRUCTURING', 'parsed_doc_saved',
      `Parsed document saved. Preparing for diagram extraction and question structuring…`,
      { total_pages: parsed.pages?.length },
      'success'
    );

    // ─────────────────────────────────────────────────
    // STAGE: VALIDATING — Load topics, prepare for extraction
    // ─────────────────────────────────────────────────
    emit(jobId, 'VALIDATING', 'load_topics',
      'Loading syllabus topic hierarchy from Supabase for classification…'
    );

    let allTopics = [];
    try {
      const { supabaseAdmin } = await import('../../lib/supabase.js');
      const { data: dbTopics } = await supabaseAdmin
        .from('topics')
        .select('id, name, chapter_id, chapters(name, subjects(name))');
      allTopics = (dbTopics || []).map(t => ({
        id: t.id,
        name: t.name,
        chapter: t.chapters?.name,
        subject: t.chapters?.subjects?.name
      }));
      emit(jobId, 'VALIDATING', 'topics_loaded',
        `Loaded ${allTopics.length} syllabus topics for classification.`,
        { topic_count: allTopics.length }
      );
    } catch (e) {
      logger.warn('ingestion.topics.fetch_failed', { job_id: jobId, error: e.message });
      emit(jobId, 'VALIDATING', 'topics_load_warn',
        `Could not load topics from Supabase: ${e.message}. Classification will use rule-based only.`,
        null, 'warn'
      );
    }

    await contentRepository.setJobState(jobId, 'STRUCTURING', 'VALIDATING', {
      progress: {
        ...job.progress,
        total_pages: parsed.pages?.length || 0,
        processed_pages: parsed.pages?.length || 0
      }
    }, { event: 'STRUCTURE_STORED', actor_id: workerId, occurred_at: new Date() });

    // ─────────────────────────────────────────────────
    // STAGE: VALIDATING → CLASSIFYING — Diagram extraction
    // ─────────────────────────────────────────────────
    let diagramMap = {};
    let tempPdfPath = null;

    emit(jobId, 'VALIDATING', 'diagram_extract_start',
      'Extracting vector diagrams and chemical structures from PDF using PyMuPDF…'
    );

    try {
      // Use already-downloaded pdfBytes if available; otherwise re-download
      const bytesToUse = pdfBytes || await downloadSourcePdf(job.source.storage_path);
      tempPdfPath = path.join(os.tmpdir(), `job_${jobId}.pdf`);
      await fs.writeFile(tempPdfPath, bytesToUse);

      diagramMap = await extractPdfDiagrams(tempPdfPath);
      const diagCount = Object.keys(diagramMap).length;

      emit(jobId, 'VALIDATING', 'diagram_extract_done',
        `Diagram extraction complete: found ${diagCount} question(s) with diagrams.`,
        { questions_with_diagrams: diagCount, question_numbers: Object.keys(diagramMap).map(Number) },
        diagCount > 0 ? 'success' : 'info'
      );
    } catch (dErr) {
      logger.warn('worker.diagram_extraction.failed', { job_id: jobId, error: dErr.message });
      emit(jobId, 'VALIDATING', 'diagram_extract_warn',
        `Diagram extraction failed (non-fatal): ${dErr.message}`,
        null, 'warn'
      );
    } finally {
      if (tempPdfPath) {
        try { await fs.rm(tempPdfPath, { force: true }); } catch {}
      }
    }

    await contentRepository.setJobState(jobId, 'VALIDATING', 'CLASSIFYING', {}, {
      event: 'VALIDATION_COMPLETED', actor_id: workerId, occurred_at: new Date(),
      diagrams_found: Object.keys(diagramMap).length
    });

    // ─────────────────────────────────────────────────
    // STAGE: CLASSIFYING — Question extraction + topic classification
    // ─────────────────────────────────────────────────
    emit(jobId, 'CLASSIFYING', 'extraction_start',
      'Running question extraction and topic classification on parsed markdown pages…',
      { total_pages: parsed.pages?.length }
    );

    // Run rule-based extraction + classification
    const candidates = extractQuestionCandidates(jobId, parsed.pages, allTopics, diagramMap);

    emit(jobId, 'CLASSIFYING', 'extraction_done',
      `Extracted ${candidates.length} question candidates from exam paper.`,
      { total_extracted: candidates.length, with_options: candidates.filter(c => c.has_options).length, with_diagrams: candidates.filter(c => c.has_diagram).length }
    );

    // LLM-assisted re-classification for low-confidence questions
    const lowConfidenceCandidates = candidates.filter(c => (c.classification_confidence || 0) < 0.40 && allTopics.length > 0);

    if (lowConfidenceCandidates.length > 0) {
      emit(jobId, 'CLASSIFYING', 'groq_classify_start',
        `${lowConfidenceCandidates.length} questions have low classification confidence (<40%). Running Groq LLM re-classification…`,
        { count: lowConfidenceCandidates.length, model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b' }
      );

      let groqClassified = 0;
      for (const candidate of lowConfidenceCandidates) {
        const qText = `${candidate.question_text || ''}\nA: ${candidate.options?.A || ''}\nB: ${candidate.options?.B || ''}\nC: ${candidate.options?.C || ''}\nD: ${candidate.options?.D || ''}`;
        const result = await classifyQuestionTopic(qText, allTopics);

        if (result.topic_id && result.confidence > (candidate.classification_confidence || 0)) {
          candidate.suggested_topic_id = result.topic_id;
          candidate.suggested_topic = result.topic_name;
          candidate.suggested_chapter = result.chapter;
          candidate.subject = result.subject || candidate.subject;
          candidate.classification_confidence = result.confidence;
          candidate.classification_method = 'GROQ_LLM';
          groqClassified++;

          emit(jobId, 'CLASSIFYING', 'groq_classified_one',
            `Q.${candidate.source_question_number} → ${result.chapter} > ${result.topic_name} (${(result.confidence * 100).toFixed(0)}% confidence via LLM)`,
            { q: candidate.source_question_number, topic: result.topic_name, confidence: result.confidence }
          );
        }
      }

      emit(jobId, 'CLASSIFYING', 'groq_classify_done',
        `Groq LLM re-classified ${groqClassified}/${lowConfidenceCandidates.length} low-confidence questions.`,
        { improved: groqClassified, total_low: lowConfidenceCandidates.length },
        'success'
      );
    }

    // Summarise classification results
    const bySubject = candidates.reduce((acc, c) => {
      const s = c.subject || 'Unknown';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    emit(jobId, 'CLASSIFYING', 'classification_summary',
      `Classification complete: Physics=${bySubject.Physics || 0}, Chemistry=${bySubject.Chemistry || 0}, Maths=${bySubject.Mathematics || 0}.`,
      { by_subject: bySubject }
    );

    await contentRepository.setJobState(jobId, 'CLASSIFYING', 'STORING', {
      progress: { ...job.progress, questions_extracted: candidates.length }
    }, {
      event: 'CLASSIFICATION_COMPLETED', actor_id: workerId, occurred_at: new Date(),
      questions_classified: candidates.length
    });

    // ─────────────────────────────────────────────────
    // STAGE: STORING — Persist candidates to MongoDB
    // ─────────────────────────────────────────────────
    emit(jobId, 'STORING', 'save_candidates',
      `Saving ${candidates.length} extracted question candidates to MongoDB…`
    );

    await contentRepository.saveExtractedCandidates(candidates);

    emit(jobId, 'STORING', 'candidates_saved',
      `All ${candidates.length} candidates saved to MongoDB collection "extracted_candidates".`,
      { count: candidates.length },
      'success'
    );

    await contentRepository.setJobState(jobId, 'STORING', 'INDEXING', {
      progress: {
        ...job.progress,
        questions_extracted: candidates.length,
        questions_awaiting_review: candidates.length
      }
    }, {
      event: 'CANDIDATES_STORED', actor_id: workerId, occurred_at: new Date(),
      candidates_saved: candidates.length
    });

    // ─────────────────────────────────────────────────
    // STAGE: INDEXING → AWAITING_REVIEW
    // (Vector indexing happens per-question at publish time)
    // ─────────────────────────────────────────────────
    emit(jobId, 'INDEXING', 'index_enqueued',
      'Vector embedding index will be built per-question upon publication. Job moving to Awaiting Review.',
      { note: 'Qdrant vectors created when each question is published via acceptCandidate' }
    );

    await contentRepository.setJobState(jobId, 'INDEXING', 'AWAITING_REVIEW', {
      progress: {
        total_pages: parsed.pages?.length || 0,
        processed_pages: parsed.pages?.length || 0,
        questions_extracted: candidates.length,
        questions_awaiting_review: candidates.length
      }
    }, { event: 'VALIDATION_COMPLETED', actor_id: workerId, occurred_at: new Date(), result: 'REVIEW_REQUIRED' });

    emit(jobId, 'AWAITING_REVIEW', 'ready',
      `✅ Pipeline complete! ${candidates.length} questions are ready for faculty review in Content Ops Studio.`,
      {
        job_id: jobId,
        total_pages: parsed.pages?.length,
        questions_extracted: candidates.length,
        diagrams_found: Object.keys(diagramMap).length,
        with_options: candidates.filter(c => c.has_options).length
      },
      'success'
    );

    logger.info('ingestion.job.awaiting_review', {
      job_id: jobId,
      worker_id: workerId,
      provider_job_id: providerJobId,
      candidates: candidates.length
    });

    return true;
  } catch (error) {
    await pauseOrFail(job, error, workerId);
    logger.warn('ingestion.job.paused_or_failed', {
      job_id: jobId,
      worker_id: workerId,
      error_code: workerError(error).code
    });
    return true;
  }
}

export async function processOneVectorIndex(workerId = `worker_${randomUUID()}`) {
  const question = await contentRepository.claimNextVectorIndex(workerId, new Date(Date.now() + 5 * 60_000));
  if (!question) return false;

  try {
    const pointId = createVectorPointId(question.question_id);
    const docText = buildVectorDocument(question);

    logger.info('content.vector.embedding', { question_id: question.question_id, worker_id: workerId });
    const vector = await embedQuestionDocument(docText);

    await upsertQuestionVector({
      pointId,
      vector,
      payload: {
        question_id: question.question_id,
        content_version: question.version,
        topic_id: question.curriculum?.topic_id || null,
        subject: question.curriculum?.subject || null,
        difficulty: question.curriculum?.difficulty || null,
        exam: question.provenance?.exam || null,
        question_text: question.content.question_text
      }
    });

    const indexed = await contentRepository.completeVectorIndex(question.question_id, question.version, pointId, workerId);
    if (!indexed) throw new Error('Vector was stored but canonical index status must be reconciled');

    logger.info('content.vector.indexed', { question_id: question.question_id, point_id: pointId, worker_id: workerId });
  } catch (error) {
    const attemptCount = (question.synchronization?.vector?.attempt_count || 0) + 1;
    await contentRepository.failVectorIndex(question, error, nextRetryAt(attemptCount), workerId);
    logger.warn('content.vector.failed', { question_id: question.question_id, worker_id: workerId, error_message: error.message });
  }
  return true;
}
