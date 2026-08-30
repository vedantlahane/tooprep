/**
 * Provider-neutral contracts for the future content module. These are kept
 * intentionally small: callers depend on capabilities, not a particular PDF,
 * LLM, embedding, or vector vendor.
 */
export const CONTENT_LIFECYCLE = Object.freeze([
  'RAW',
  'PARSED',
  'VALIDATED',
  'REVIEW_REQUIRED',
  'VERIFIED',
  'PUBLISHED',
  'REJECTED',
  'FLAGGED',
  'NEEDS_REVIEW'
]);

export const INGESTION_STAGES = Object.freeze([
  'CREATED',
  'UPLOADING',
  'PARSING',
  'STRUCTURING',
  'VALIDATING',
  'CLASSIFYING',
  'STORING',
  'INDEXING',
  'AWAITING_REVIEW',
  'COMPLETED',
  'FAILED',
  'PAUSED'
]);

export function assertLifecycleStatus(status) {
  if (!CONTENT_LIFECYCLE.includes(status)) {
    throw new Error(`Unsupported content lifecycle status: ${status}`);
  }
  return status;
}

export function assertIngestionStage(stage) {
  if (!INGESTION_STAGES.includes(stage)) {
    throw new Error(`Unsupported ingestion stage: ${stage}`);
  }
  return stage;
}

/**
 * Idempotency key for each external projection. Reprocessing a job is safe
 * because only the exact content revision for a destination shares this key.
 */
export function createSyncKey(questionId, contentVersion, destination) {
  if (!questionId || !Number.isInteger(contentVersion) || contentVersion < 1 || !destination) {
    throw new Error('questionId, positive integer contentVersion, and destination are required');
  }
  return `${questionId}:v${contentVersion}:${destination}`;
}

/** A storage-independent, URL-safe canonical identity for a question. */
export function createQuestionId() {
  return `q_${randomUUID().replaceAll('-', '')}`;
}

export function createIngestionJobId() {
  return `ing_${randomUUID().replaceAll('-', '')}`;
}
import { createHash, randomUUID } from 'node:crypto';

/** Qdrant accepts UUID or integer point ids, so derive a stable UUID from the canonical id. */
export function createVectorPointId(questionId) {
  if (typeof questionId !== 'string' || !/^q_[a-f0-9]{32}$/.test(questionId)) {
    throw new Error('A canonical questionId is required to create a vector point id');
  }
  const hex = createHash('sha256').update(questionId).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${['8', '9', 'a', 'b'][Number.parseInt(hex[16], 16) % 4]}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
