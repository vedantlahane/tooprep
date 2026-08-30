import { assertLifecycleStatus } from './content.contracts.js';

const transitions = Object.freeze({
  RAW: ['PARSED', 'REVIEW_REQUIRED', 'REJECTED'],
  PARSED: ['VALIDATED', 'REVIEW_REQUIRED', 'REJECTED'],
  VALIDATED: ['REVIEW_REQUIRED', 'VERIFIED', 'FLAGGED', 'REJECTED'],
  REVIEW_REQUIRED: ['VERIFIED', 'FLAGGED', 'REJECTED'],
  FLAGGED: ['REVIEW_REQUIRED', 'REJECTED'],
  VERIFIED: ['PUBLISHED', 'NEEDS_REVIEW'],
  PUBLISHED: ['NEEDS_REVIEW'],
  NEEDS_REVIEW: ['VERIFIED', 'REJECTED'],
  REJECTED: []
});

export function assertContentTransition(from, to) {
  assertLifecycleStatus(from);
  assertLifecycleStatus(to);
  if (!transitions[from].includes(to)) {
    throw new Error(`Invalid content lifecycle transition: ${from} -> ${to}`);
  }
  return to;
}
