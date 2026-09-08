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

const MAX_ATTEMPTS = 5;

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
  await contentRepository.setJobState(job.job_id, 'PARSING', stage, {
    retry: { attempt_count: attemptCount, next_attempt_at: stage === 'PAUSED' ? nextRetryAt(attemptCount) : null },
    lease: null,
    errors: [...(job.errors || []), { ...details, occurred_at: new Date() }]
  }, { event: stage === 'PAUSED' ? 'JOB_PAUSED' : 'JOB_FAILED', actor_id: workerId, occurred_at: new Date(), reason: details.code });
}

export async function processOneIngestionJob(workerId = `worker_${randomUUID()}`) {
  const job = await contentRepository.claimNextJob(workerId, new Date(Date.now() + 15 * 60_000));
  if (!job) return false;

  try {
    // BUG 6 FIX: Declare pdfBytes in outer scope so it's available throughout the function,
    // regardless of whether we need to create a new LlamaParse job or reuse an existing one.
    let pdfBytes = null;

    let providerJobId = job.external_parse?.provider_job_id;
    if (!providerJobId) {
      pdfBytes = await downloadSourcePdf(job.source.storage_path);
      const externalJob = await createLlamaParseJob({ bytes: pdfBytes, filename: job.source.filename || `${job.job_id}.pdf` });
      providerJobId = externalJob.id;
      await contentRepository.setJobMetadata(job.job_id, 'PARSING', {
        external_parse: { provider: 'LLAMA_PARSE', provider_job_id: providerJobId, created_at: new Date() }
      }, { event: 'EXTERNAL_PARSE_CREATED', actor_id: workerId, occurred_at: new Date(), provider_job_id: providerJobId });
    }

    // --- STAGE: PARSING complete → STRUCTURING ---
    const parsed = await getLlamaParseResult(providerJobId);
    await contentRepository.saveParsedDocument({ job_id: job.job_id, source: job.source, ...parsed, created_at: new Date() });

    await contentRepository.setJobState(job.job_id, 'PARSING', 'STRUCTURING', {
      lease: null
    }, { event: 'PARSING_COMPLETED', actor_id: workerId, occurred_at: new Date(), provider_job_id: providerJobId });

    logger.info('ingestion.job.structuring', { job_id: job.job_id, worker_id: workerId, total_pages: parsed.pages?.length });

    // --- STAGE: STRUCTURING → VALIDATING ---
    // Parse answer keys + solutions from the raw LlamaParse markdown pages
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
    } catch (e) {
      logger.warn('ingestion.topics.fetch_failed', { job_id: job.job_id, error: e.message });
    }

    await contentRepository.setJobState(job.job_id, 'STRUCTURING', 'VALIDATING', {
      progress: {
        ...job.progress,
        total_pages: parsed.pages?.length || 0,
        processed_pages: parsed.pages?.length || 0
      }
    }, { event: 'STRUCTURE_STORED', actor_id: workerId, occurred_at: new Date() });

    logger.info('ingestion.job.validating', { job_id: job.job_id, worker_id: workerId });

    // --- STAGE: VALIDATING → CLASSIFYING ---
    // Extract diagram locations from PDF using PyMuPDF
    let diagramMap = {};
    let tempPdfPath = null;
    try {
      // BUG 6 FIX: Use outer-scoped pdfBytes — download only if not already fetched above
      const bytesToUse = pdfBytes || await downloadSourcePdf(job.source.storage_path);
      tempPdfPath = path.join(os.tmpdir(), `job_${job.job_id}.pdf`);
      await fs.writeFile(tempPdfPath, bytesToUse);
      diagramMap = await extractPdfDiagrams(tempPdfPath);
    } catch (dErr) {
      logger.warn('worker.diagram_extraction.failed', { job_id: job.job_id, error: dErr.message });
    } finally {
      if (tempPdfPath) {
        try { await fs.rm(tempPdfPath, { force: true }); } catch {}
      }
    }

    await contentRepository.setJobState(job.job_id, 'VALIDATING', 'CLASSIFYING', {}, {
      event: 'VALIDATION_COMPLETED', actor_id: workerId, occurred_at: new Date(),
      diagrams_found: Object.keys(diagramMap).length
    });

    logger.info('ingestion.job.classifying', { job_id: job.job_id, worker_id: workerId, diagrams: Object.keys(diagramMap).length });

    // --- STAGE: CLASSIFYING → STORING ---
    // Run question extraction + topic classification
    const candidates = extractQuestionCandidates(job.job_id, parsed.pages, allTopics, diagramMap);

    await contentRepository.setJobState(job.job_id, 'CLASSIFYING', 'STORING', {
      progress: {
        ...job.progress,
        questions_extracted: candidates.length
      }
    }, {
      event: 'CLASSIFICATION_COMPLETED', actor_id: workerId, occurred_at: new Date(),
      questions_classified: candidates.length
    });

    logger.info('ingestion.job.storing', { job_id: job.job_id, worker_id: workerId, candidates: candidates.length });

    // --- STAGE: STORING → INDEXING ---
    // Persist all extracted question candidates to MongoDB
    await contentRepository.saveExtractedCandidates(candidates);

    await contentRepository.setJobState(job.job_id, 'STORING', 'INDEXING', {
      progress: {
        ...job.progress,
        questions_extracted: candidates.length,
        questions_awaiting_review: candidates.length
      }
    }, {
      event: 'CANDIDATES_STORED', actor_id: workerId, occurred_at: new Date(),
      candidates_saved: candidates.length
    });

    logger.info('ingestion.job.indexing', { job_id: job.job_id, worker_id: workerId });

    // --- STAGE: INDEXING → AWAITING_REVIEW ---
    // The vector index is built per-question when each question is published.
    // At the job level, INDEXING simply means "ready for human review" —
    // transition immediately so the UI pipeline is accurate.
    await contentRepository.setJobState(job.job_id, 'INDEXING', 'AWAITING_REVIEW', {
      progress: {
        total_pages: parsed.pages?.length || 0,
        processed_pages: parsed.pages?.length || 0,
        questions_extracted: candidates.length,
        questions_awaiting_review: candidates.length
      }
    }, { event: 'VALIDATION_COMPLETED', actor_id: workerId, occurred_at: new Date(), result: 'REVIEW_REQUIRED' });

    logger.info('ingestion.job.awaiting_review', { job_id: job.job_id, worker_id: workerId, provider_job_id: providerJobId, candidates: candidates.length });
    return true;
  } catch (error) {
    await pauseOrFail(job, error, workerId);
    logger.warn('ingestion.job.paused_or_failed', { job_id: job.job_id, worker_id: workerId, error_code: workerError(error).code });
    return true;
  }
}

export async function processOneVectorIndex(workerId = `worker_${randomUUID()}`) {
  const question = await contentRepository.claimNextVectorIndex(workerId, new Date(Date.now() + 5 * 60_000));
  if (!question) return false;
  try {
    const pointId = createVectorPointId(question.question_id);
    const vector = await embedQuestionDocument(buildVectorDocument(question));
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
