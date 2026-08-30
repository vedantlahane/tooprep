import { randomUUID } from 'node:crypto';
import { logger } from '../../platform/logger.js';
import { contentRepository } from './content.repository.js';
import { downloadSourcePdf } from './content.storage.js';
import { createLlamaParseJob, getLlamaParseResult } from './llamaparse.provider.js';
import { nextRetryAt } from './ingestion-state.js';
import { extractQuestionCandidates } from './question-extraction.js';
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
    let providerJobId = job.external_parse?.provider_job_id;
    if (!providerJobId) {
      const bytes = await downloadSourcePdf(job.source.storage_path);
      const externalJob = await createLlamaParseJob({ bytes, filename: job.source.filename || `${job.job_id}.pdf` });
      providerJobId = externalJob.id;
      await contentRepository.setJobMetadata(job.job_id, 'PARSING', {
        external_parse: { provider: 'LLAMA_PARSE', provider_job_id: providerJobId, created_at: new Date() }
      }, { event: 'EXTERNAL_PARSE_CREATED', actor_id: workerId, occurred_at: new Date(), provider_job_id: providerJobId });
    }

    const parsed = await getLlamaParseResult(providerJobId);
    await contentRepository.saveParsedDocument({ job_id: job.job_id, source: job.source, ...parsed, created_at: new Date() });
    const candidates = extractQuestionCandidates(job.job_id, parsed.pages);
    await contentRepository.saveExtractedCandidates(candidates);

    const structured = await contentRepository.setJobState(job.job_id, 'PARSING', 'STRUCTURING', {
      lease: null
    }, { event: 'PARSING_COMPLETED', actor_id: workerId, occurred_at: new Date(), provider_job_id: providerJobId });
    const validating = await contentRepository.setJobState(job.job_id, 'STRUCTURING', 'VALIDATING', {
      progress: {
        ...job.progress,
        total_pages: parsed.pages.length,
        processed_pages: parsed.pages.length,
        questions_extracted: candidates.length,
        questions_awaiting_review: candidates.length
      }
    }, { event: 'STRUCTURE_STORED', actor_id: workerId, occurred_at: new Date() });
    await contentRepository.setJobState(job.job_id, 'VALIDATING', 'AWAITING_REVIEW', {
      progress: validating.progress
    }, { event: 'VALIDATION_COMPLETED', actor_id: workerId, occurred_at: new Date(), result: 'REVIEW_REQUIRED' });
    logger.info('ingestion.job.awaiting_review', { job_id: job.job_id, worker_id: workerId, provider_job_id: providerJobId });
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
