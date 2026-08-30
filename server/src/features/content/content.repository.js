import { getMongoDb } from '../../lib/mongodb.js';

let indexesReady;

async function collections() {
  const db = await getMongoDb();
  if (!indexesReady) {
    indexesReady = Promise.all([
      db.collection('content_questions').createIndex({ question_id: 1 }, { unique: true }),
      db.collection('content_questions').createIndex({ 'lifecycle.status': 1, updated_at: -1 }),
      db.collection('content_questions').createIndex({ 'synchronization.vector.status': 1, 'synchronization.vector.next_attempt_at': 1 }),
      db.collection('ingestion_jobs').createIndex({ job_id: 1 }, { unique: true }),
      db.collection('ingestion_jobs').createIndex({ 'source.sha256': 1 }, { unique: true, sparse: true }),
      db.collection('ingestion_jobs').createIndex({ stage: 1, 'retry.next_attempt_at': 1 }),
      db.collection('parsed_documents').createIndex({ job_id: 1 }, { unique: true }),
      db.collection('extracted_candidates').createIndex({ job_id: 1, candidate_key: 1 }, { unique: true })
    ]);
  }
  await indexesReady;
  return {
    questions: db.collection('content_questions'),
    jobs: db.collection('ingestion_jobs'),
    parsedDocuments: db.collection('parsed_documents'),
    extractedCandidates: db.collection('extracted_candidates')
  };
}

export const contentRepository = {
  async insertQuestion(document) {
    const { questions } = await collections();
    await questions.insertOne(document);
    return document;
  },

  async findQuestion(questionId) {
    const { questions } = await collections();
    return questions.findOne({ question_id: questionId }, { projection: { _id: 0 } });
  },

  async findQuestionsByIds(questionIds) {
    const { questions } = await collections();
    return questions.find({ question_id: { $in: questionIds } }, { projection: { _id: 0 } }).toArray();
  },

  async updateQuestionLifecycle(questionId, expectedStatus, status, changes, event) {
    const { questions } = await collections();
    return questions.findOneAndUpdate(
      { question_id: questionId, 'lifecycle.status': expectedStatus },
      {
        $set: { ...changes, 'lifecycle.status': status, 'lifecycle.changed_at': new Date(), updated_at: new Date() },
        $push: { audit_history: event }
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  },

  async claimNextVectorIndex(workerId, leaseExpiresAt) {
    const { questions } = await collections();
    const now = new Date();
    return questions.findOneAndUpdate(
      {
        'lifecycle.status': 'PUBLISHED',
        'synchronization.vector.status': { $in: ['PENDING', 'FAILED'] },
        'synchronization.vector.next_attempt_at': { $lte: now },
        $or: [{ 'synchronization.vector.lease.expires_at': { $exists: false } }, { 'synchronization.vector.lease.expires_at': { $lte: now } }]
      },
      {
        $set: {
          'synchronization.vector.status': 'INDEXING',
          'synchronization.vector.lease': { worker_id: workerId, acquired_at: now, expires_at: leaseExpiresAt },
          updated_at: now
        },
        $push: { audit_history: { event: 'VECTOR_INDEX_CLAIMED', actor_id: workerId, occurred_at: now } }
      },
      { sort: { 'synchronization.vector.next_attempt_at': 1, updated_at: 1 }, returnDocument: 'after', projection: { _id: 0 } }
    );
  },

  async completeVectorIndex(questionId, questionVersion, pointId, workerId) {
    const { questions } = await collections();
    const now = new Date();
    return questions.findOneAndUpdate(
      { question_id: questionId, 'lifecycle.status': 'PUBLISHED', 'synchronization.vector.status': 'INDEXING' },
      {
        $set: {
          'synchronization.vector': { status: 'SYNCED', content_version: questionVersion, point_id: pointId, indexed_at: now, lease: null },
          updated_at: now
        },
        $push: { audit_history: { event: 'VECTOR_INDEXED', actor_id: workerId, occurred_at: now, point_id: pointId } }
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  },

  async failVectorIndex(question, error, nextAttemptAt, workerId) {
    const { questions } = await collections();
    const now = new Date();
    const attemptCount = (question.synchronization?.vector?.attempt_count || 0) + 1;
    return questions.findOneAndUpdate(
      { question_id: question.question_id, 'synchronization.vector.status': 'INDEXING' },
      {
        $set: {
          'synchronization.vector': {
            status: 'FAILED', content_version: question.version, attempt_count: attemptCount,
            next_attempt_at: nextAttemptAt, lease: null, last_error: error.message, failed_at: now
          },
          updated_at: now
        },
        $push: { audit_history: { event: 'VECTOR_INDEX_FAILED', actor_id: workerId, occurred_at: now, error: error.message } }
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  },

  async insertJob(document) {
    const { jobs } = await collections();
    await jobs.insertOne(document);
    return document;
  },

  async findJob(jobId) {
    const { jobs } = await collections();
    return jobs.findOne({ job_id: jobId }, { projection: { _id: 0 } });
  },

  async updateJobStage(jobId, expectedStage, stage, transitionEvent) {
    const { jobs } = await collections();
    const now = new Date();
    const result = await jobs.findOneAndUpdate(
      { job_id: jobId, stage: expectedStage },
      {
        $set: { stage, updated_at: now },
        $push: { events: transitionEvent }
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    return result;
  },

  async claimNextJob(workerId, leaseExpiresAt) {
    const { jobs } = await collections();
    const now = new Date();
    return jobs.findOneAndUpdate(
      {
        $and: [
          { $or: [
            { stage: { $in: ['CREATED', 'PAUSED'] }, 'retry.next_attempt_at': { $lte: now } },
            { stage: 'PARSING', 'lease.expires_at': { $lte: now } }
          ] },
          { $or: [{ 'lease.expires_at': { $exists: false } }, { 'lease.expires_at': { $lte: now } }] }
        ]
      },
      {
        $set: { stage: 'PARSING', lease: { worker_id: workerId, acquired_at: now, expires_at: leaseExpiresAt }, updated_at: now },
        $push: { events: { event: 'WORK_CLAIMED', actor_id: workerId, occurred_at: now } }
      },
      { sort: { 'retry.next_attempt_at': 1, created_at: 1 }, returnDocument: 'after', projection: { _id: 0 } }
    );
  },

  async setJobState(jobId, expectedStage, stage, changes, event) {
    const { jobs } = await collections();
    const now = new Date();
    return jobs.findOneAndUpdate(
      { job_id: jobId, stage: expectedStage },
      { $set: { ...changes, stage, updated_at: now }, $push: { events: event } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  },

  async setJobMetadata(jobId, expectedStage, changes, event) {
    const { jobs } = await collections();
    const now = new Date();
    return jobs.findOneAndUpdate(
      { job_id: jobId, stage: expectedStage },
      { $set: { ...changes, updated_at: now }, $push: { events: event } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  },

  async saveParsedDocument(document) {
    const { parsedDocuments } = await collections();
    await parsedDocuments.updateOne({ job_id: document.job_id }, { $set: document }, { upsert: true });
    return document;
  },

  async saveExtractedCandidates(candidates) {
    if (candidates.length === 0) return [];
    const { extractedCandidates } = await collections();
    const now = new Date();
    await extractedCandidates.bulkWrite(candidates.map(candidate => ({
      updateOne: {
        filter: { job_id: candidate.job_id, candidate_key: candidate.candidate_key },
        update: { $set: { ...candidate, updated_at: now }, $setOnInsert: { created_at: now } },
        upsert: true
      }
    })));
    return candidates;
  },

  async listJobs(limit = 50) {
    const { jobs } = await collections();
    return jobs.find({}, { projection: { _id: 0 } }).sort({ updated_at: -1 }).limit(limit).toArray();
  },

  async listCandidates(jobId) {
    const { extractedCandidates } = await collections();
    return extractedCandidates.find({ job_id: jobId }, { projection: { _id: 0 } })
      .sort({ source_pages: 1, source_question_number: 1 }).toArray();
  },

  async findCandidate(jobId, candidateKey) {
    const { extractedCandidates } = await collections();
    return extractedCandidates.findOne({ job_id: jobId, candidate_key: candidateKey }, { projection: { _id: 0 } });
  },

  async claimCandidate(jobId, candidateKey, questionId, actorId) {
    const { extractedCandidates } = await collections();
    return extractedCandidates.findOneAndUpdate(
      { job_id: jobId, candidate_key: candidateKey, status: 'REVIEW_REQUIRED' },
      {
        $set: {
          status: 'VERIFYING',
          canonical_question_id: questionId,
          review_started_by: actorId,
          review_started_at: new Date(),
          updated_at: new Date()
        }
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  },

  async updateCandidate(jobId, candidateKey, expectedStatus, changes) {
    const { extractedCandidates } = await collections();
    return extractedCandidates.findOneAndUpdate(
      { job_id: jobId, candidate_key: candidateKey, status: expectedStatus },
      { $set: { ...changes, updated_at: new Date() } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  }
};
