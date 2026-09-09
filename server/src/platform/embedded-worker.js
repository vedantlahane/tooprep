import { randomUUID } from 'node:crypto';
import { logger } from './logger.js';
import { processOneIngestionJob, processOneVectorIndex } from '../features/content/content.worker.js';

let workerId = null;
let pollTimer = null;
let isRunning = false;
let isTicking = false;

/**
 * Executes a single draining cycle of pending ingestion and vector indexing jobs.
 */
export async function workerTick() {
  if (isTicking || !isRunning) return;
  isTicking = true;
  try {
    while (isRunning && await processOneIngestionJob(workerId)) {
      // Drain available ingestion work serially so rate limits and memory are respected
    }
    while (isRunning && await processOneVectorIndex(workerId)) {
      // Drain vector projection queue
    }
  } catch (err) {
    logger.error('embedded_worker.tick.failed', {
      worker_id: workerId,
      error_name: err.name,
      error_message: err.message
    });
  } finally {
    isTicking = false;
  }
}

/**
 * Initializes and starts the background worker loop inside the Express process.
 * Runs autonomously without requiring a separate worker service on Render or local dev.
 */
export function startEmbeddedWorker(customPollIntervalMs) {
  if (process.env.DISABLE_EMBEDDED_WORKER === 'true' || process.env.NODE_ENV === 'test') {
    logger.info('embedded_worker.disabled', { reason: 'Disabled via env or test runner' });
    return;
  }
  if (isRunning) return;

  workerId = process.env.WORKER_ID || `embedded_${randomUUID().slice(0, 8)}`;
  isRunning = true;
  const intervalMs = Number(customPollIntervalMs || process.env.WORKER_POLL_INTERVAL_MS || 5000);

  logger.info('embedded_worker.started', { worker_id: workerId, interval_ms: intervalMs });

  // Initial immediate tick
  setImmediate(() => {
    workerTick();
  });

  pollTimer = setInterval(() => {
    workerTick();
  }, intervalMs);

  if (pollTimer.unref) {
    pollTimer.unref(); // Do not prevent clean Node process termination
  }
}

/**
 * Triggers an immediate worker drain cycle when a new job is created.
 */
export function triggerWorkerTick() {
  if (!isRunning) return;
  setImmediate(() => {
    workerTick();
  });
}

/**
 * Stops the embedded worker loop gracefully on shutdown.
 */
export function stopEmbeddedWorker() {
  isRunning = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  logger.info('embedded_worker.stopped', { worker_id: workerId });
}
