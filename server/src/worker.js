import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { logger } from './platform/logger.js';
import { processOneIngestionJob, processOneVectorIndex } from './features/content/content.worker.js';

dotenv.config({ path: '../.env' });
const workerId = process.env.WORKER_ID || `ingestion_${randomUUID()}`;
const intervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS || 5_000);
let stopping = false;

async function tick() {
  if (stopping) return;
  try {
    while (!stopping && await processOneIngestionJob(workerId)) {
      // Drain available work serially so free-tier provider limits remain visible.
    }
    while (!stopping && await processOneVectorIndex(workerId)) {
      // Vector projection is independent of publication and uses idempotent point ids.
    }
  } catch (error) {
    logger.error('worker.tick.failed', { worker_id: workerId, error_name: error.name, error_message: error.message });
  }
}

process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
logger.info('worker.started', { worker_id: workerId, poll_interval_ms: intervalMs });
await tick();
setInterval(tick, intervalMs);
