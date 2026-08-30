import {
  createIngestionJobId,
  createQuestionId
} from './content.contracts.js';
import { assertIngestionTransition } from './ingestion-state.js';
import { contentRepository } from './content.repository.js';
import { validateContentDraft, validateIngestionSource } from './content.validation.js';
import { storeSourcePdf } from './content.storage.js';
import { assertContentTransition } from './content-lifecycle.js';
import { markSupabaseSync, upsertPublishedQuestion } from './publication.repository.js';

function applicationError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function buildContentDraft(input, actorId, now = new Date()) {
  validateContentDraft(input);
  return {
    question_id: input.question_id || createQuestionId(),
    version: 1,
    lifecycle: { status: 'RAW', changed_at: now, changed_by: actorId },
    content: {
      question_type: input.question_type || 'single_correct',
      question_text: input.question_text,
      options: input.options,
      correct_answer: input.correct_answer,
      solution_text: input.solution_text || null,
      assets: input.assets || []
    },
    provenance: {
      source_type: input.source_type || 'PYQ',
      provider: input.provider || null,
      exam: input.exam || null,
      year: input.year || null,
      session: input.session || null,
      shift: input.shift || null,
      paper_code: input.paper_code || null,
      question_number: input.question_number || null,
      source_storage_path: input.source_storage_path || null,
      source_pages: input.source_pages || [],
      ingestion_job_id: input.ingestion_job_id || null
    },
    curriculum: input.curriculum || {},
    classification: input.classification || { confidence: null, source: 'MANUAL' },
    synchronization: {
      supabase: { status: 'NOT_REQUESTED', content_version: 1 },
      vector: { status: 'NOT_REQUESTED', content_version: 1 }
    },
    audit_history: [{
      event: 'DRAFT_CREATED', actor_id: actorId, occurred_at: now, reason: input.review_note || null
    }],
    created_at: now,
    updated_at: now
  };
}

export function buildIngestionJob(input, actorId, now = new Date()) {
  validateIngestionSource(input);
  return {
    job_id: createIngestionJobId(),
    stage: 'CREATED',
    source: {
      storage_path: input.source_storage_path,
      sha256: input.source_sha256 || null,
      filename: input.filename || null,
      exam: input.exam || null,
      year: input.year || null,
      metadata: input.metadata || {}
    },
    progress: { total_pages: null, processed_pages: 0, questions_extracted: 0, questions_awaiting_review: 0 },
    retry: { attempt_count: 0, next_attempt_at: now },
    errors: [],
    events: [{ event: 'JOB_CREATED', actor_id: actorId, occurred_at: now }],
    created_by: actorId,
    created_at: now,
    updated_at: now
  };
}

export const contentService = {
  async createDraft(input, actorId) {
    const draft = buildContentDraft(input, actorId);
    try {
      return await contentRepository.insertQuestion(draft);
    } catch (error) {
      if (error?.code === 11000) throw applicationError('question_id already exists', 409);
      throw error;
    }
  },

  async getDraft(questionId) {
    const question = await contentRepository.findQuestion(questionId);
    if (!question) throw applicationError('Content question not found', 404);
    return question;
  },

  async createIngestionJob(input, actorId) {
    const job = buildIngestionJob(input, actorId);
    try {
      return await contentRepository.insertJob(job);
    } catch (error) {
      if (error?.code === 11000) throw applicationError('An ingestion job already exists for this source checksum', 409);
      throw error;
    }
  },

  async createIngestionJobFromUpload(file, input, actorId) {
    const source = await storeSourcePdf(file);
    return this.createIngestionJob({
      ...input,
      source_storage_path: source.storagePath,
      source_sha256: source.sha256,
      filename: source.filename,
      metadata: { ...(input.metadata || {}), size_bytes: source.sizeBytes }
    }, actorId);
  },

  async getIngestionJob(jobId) {
    const job = await contentRepository.findJob(jobId);
    if (!job) throw applicationError('Ingestion job not found', 404);
    return job;
  },

  async listIngestionJobs(limit) {
    return contentRepository.listJobs(Math.min(Math.max(Number(limit) || 50, 1), 100));
  },

  async listCandidates(jobId) {
    await this.getIngestionJob(jobId);
    return contentRepository.listCandidates(jobId);
  },

  async acceptCandidate(jobId, candidateKey, draftInput, actorId) {
    const candidate = await contentRepository.findCandidate(jobId, candidateKey);
    if (!candidate) throw applicationError('Review candidate not found', 404);
    if (!draftInput.curriculum?.topic_id) throw applicationError('Select a curriculum topic before verification', 400);
    if (candidate.status === 'PUBLISHED') {
      const question = await contentRepository.findQuestion(candidate.canonical_question_id);
      return { candidate, question, projection: null, idempotent: true };
    }
    if (candidate.status !== 'REVIEW_REQUIRED') {
      throw applicationError('Candidate is already being reviewed; reload to see its current state', 409);
    }

    const questionId = candidate.canonical_question_id || createQuestionId();
    const claimed = await contentRepository.claimCandidate(jobId, candidateKey, questionId, actorId);
    if (!claimed) throw applicationError('Candidate changed concurrently; reload and retry', 409);

    try {
      let question = await contentRepository.findQuestion(questionId);
      if (!question) {
        question = await this.createDraft({
          ...draftInput,
          question_id: questionId,
          source_pages: candidate.source_pages,
          ingestion_job_id: jobId,
          question_number: candidate.source_question_number,
          review_note: draftInput.review_note || 'Accepted from deterministic extraction candidate'
        }, actorId);
      }
      if (question.lifecycle.status === 'RAW') {
        question = await contentRepository.updateQuestionLifecycle(questionId, 'RAW', 'VERIFIED', {
          'lifecycle.changed_by': actorId
        }, { event: 'VERIFIED_FROM_CANDIDATE', actor_id: actorId, occurred_at: new Date() });
      }
      if (!question || !['VERIFIED', 'PUBLISHED'].includes(question.lifecycle.status)) {
        throw applicationError('Candidate question is not in a publishable lifecycle state', 409);
      }
      const publication = question.lifecycle.status === 'PUBLISHED'
        ? { question, projection: null, idempotent: true }
        : await this.publishQuestion(questionId, actorId);
      const reviewed = await contentRepository.updateCandidate(jobId, candidateKey, 'VERIFYING', {
        status: 'PUBLISHED', reviewed_by: actorId, reviewed_at: new Date()
      });
      if (!reviewed) throw applicationError('Question published but candidate review must be reconciled', 409);
      return { candidate: reviewed, question: publication.question, projection: publication.projection, idempotent: publication.idempotent || false };
    } catch (error) {
      await contentRepository.updateCandidate(jobId, candidateKey, 'VERIFYING', {
        status: 'REVIEW_REQUIRED', last_review_error: error.message
      }).catch(() => {});
      throw error;
    }
  },

  async rejectCandidate(jobId, candidateKey, reason, actorId) {
    if (typeof reason !== 'string' || reason.trim() === '') {
      throw applicationError('A rejection reason is required', 400);
    }
    const reviewed = await contentRepository.updateCandidate(jobId, candidateKey, 'REVIEW_REQUIRED', {
      status: 'REJECTED', reviewed_by: actorId, reviewed_at: new Date(), review_reason: reason
    });
    if (!reviewed) throw applicationError('Review candidate not found or already reviewed', 404);
    return reviewed;
  },

  async transitionQuestion(questionId, nextStatus, actorId, reason = null) {
    const question = await this.getDraft(questionId);
    assertContentTransition(question.lifecycle.status, nextStatus);
    const updated = await contentRepository.updateQuestionLifecycle(questionId, question.lifecycle.status, nextStatus, {
      'lifecycle.changed_by': actorId
    }, { event: 'LIFECYCLE_CHANGED', from: question.lifecycle.status, to: nextStatus, actor_id: actorId, occurred_at: new Date(), reason });
    if (!updated) throw applicationError('Question changed concurrently; reload and retry', 409);
    return updated;
  },

  async publishQuestion(questionId, actorId) {
    const question = await this.getDraft(questionId);
    if (question.lifecycle.status !== 'VERIFIED') {
      throw applicationError('Only VERIFIED questions can be published', 409);
    }
    let projection;
    try {
      projection = await upsertPublishedQuestion(question);
      await markSupabaseSync(question.question_id, question.version, 'SYNCED');
    } catch (error) {
      await markSupabaseSync(question.question_id, question.version, 'FAILED', error).catch(() => {});
      throw error;
    }
    const published = await contentRepository.updateQuestionLifecycle(questionId, 'VERIFIED', 'PUBLISHED', {
      synchronization: {
        ...question.synchronization,
        supabase: { status: 'SYNCED', content_version: question.version, synced_at: new Date() },
        vector: { status: 'PENDING', content_version: question.version, attempt_count: 0, next_attempt_at: new Date(), lease: null }
      }
    }, { event: 'PUBLISHED', actor_id: actorId, occurred_at: new Date(), projection_id: projection.id });
    if (!published) throw applicationError('Question publication completed but lifecycle update must be reconciled', 409);
    return { question: published, projection };
  },

  async transitionIngestionJob(jobId, nextStage, actorId, reason = null) {
    const job = await this.getIngestionJob(jobId);
    assertIngestionTransition(job.stage, nextStage);
    const occurredAt = new Date();
    const updated = await contentRepository.updateJobStage(jobId, job.stage, nextStage, {
      event: 'STAGE_CHANGED', from: job.stage, to: nextStage,
      actor_id: actorId, occurred_at: occurredAt, reason
    });
    if (!updated) throw applicationError('Ingestion job changed concurrently; reload and retry', 409);
    return updated;
  },

  async searchQuestions(queryText, limit = 10) {
    if (!queryText || queryText.trim() === '') return [];
    const { embedSearchQuery } = await import('./embedding.provider.js');
    const { searchQuestionVectors } = await import('./qdrant.repository.js');
    
    const vector = await embedSearchQuery(queryText);
    const searchResults = await searchQuestionVectors(vector, limit);
    if (!searchResults || searchResults.length === 0) return [];
    
    const questionIds = searchResults.map(res => res.payload?.question_id).filter(Boolean);
    const fullQuestions = await contentRepository.findQuestionsByIds(questionIds);
    
    return searchResults.map(res => {
      const question = fullQuestions.find(q => q.question_id === res.payload?.question_id);
      return {
        score: res.score,
        question: question || res.payload
      };
    }).filter(item => item.question);
  }
};
