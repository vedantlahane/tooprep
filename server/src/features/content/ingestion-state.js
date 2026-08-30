import { INGESTION_STAGES, assertIngestionStage } from './content.contracts.js';

const transitions = Object.freeze({
  CREATED: ['UPLOADING', 'PAUSED', 'FAILED'],
  UPLOADING: ['PARSING', 'PAUSED', 'FAILED'],
  PARSING: ['STRUCTURING', 'PAUSED', 'FAILED'],
  STRUCTURING: ['VALIDATING', 'PAUSED', 'FAILED'],
  VALIDATING: ['CLASSIFYING', 'AWAITING_REVIEW', 'PAUSED', 'FAILED'],
  CLASSIFYING: ['STORING', 'AWAITING_REVIEW', 'PAUSED', 'FAILED'],
  STORING: ['INDEXING', 'AWAITING_REVIEW', 'PAUSED', 'FAILED'],
  INDEXING: ['AWAITING_REVIEW', 'COMPLETED', 'PAUSED', 'FAILED'],
  AWAITING_REVIEW: ['COMPLETED', 'PAUSED', 'FAILED'],
  PAUSED: ['UPLOADING', 'PARSING', 'STRUCTURING', 'VALIDATING', 'CLASSIFYING', 'STORING', 'INDEXING', 'AWAITING_REVIEW', 'FAILED'],
  FAILED: ['UPLOADING', 'PARSING', 'STRUCTURING', 'VALIDATING', 'CLASSIFYING', 'STORING', 'INDEXING', 'AWAITING_REVIEW', 'PAUSED'],
  COMPLETED: []
});

export function canTransitionIngestionJob(from, to) {
  assertIngestionStage(from);
  assertIngestionStage(to);
  return transitions[from].includes(to);
}

export function assertIngestionTransition(from, to) {
  if (!canTransitionIngestionJob(from, to)) {
    throw new Error(`Invalid ingestion transition: ${from} -> ${to}`);
  }
  return to;
}

export function nextRetryAt(attemptCount, now = new Date()) {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) {
    throw new Error('attemptCount must be a positive integer');
  }
  // 1, 2, 4, ... minutes, capped at one hour. Jitter is deliberately added
  // by the worker when it is implemented, so this remains deterministic here.
  const delayMs = Math.min(60 * 60 * 1000, 60 * 1000 * (2 ** (attemptCount - 1)));
  return new Date(now.getTime() + delayMs);
}

export { transitions as INGESTION_TRANSITIONS };
