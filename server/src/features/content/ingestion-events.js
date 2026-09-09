import { EventEmitter } from 'node:events';

/**
 * In-process event bus for real-time ingestion pipeline progress events.
 *
 * Workers emit events here; the SSE endpoint subscribes per-job and streams
 * them to the admin's Pipeline Console browser in real-time.
 *
 * Event payload shape:
 * {
 *   job_id:    string,                         // ingestion job ID
 *   stage:     string,                         // current pipeline stage name
 *   step:      string,                         // fine-grained step within the stage
 *   message:   string,                         // human-readable description
 *   detail:    object | null,                  // optional structured data
 *   level:     'info' | 'warn' | 'error' | 'success',
 *   timestamp: string                          // ISO 8601
 * }
 */
class IngestionEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200); // Allow many concurrent SSE connections
  }

  /**
   * Emit a progress event for a specific job.
   * Also keeps a rolling in-memory buffer (last 200 events per job)
   * so late-connecting SSE clients can get recent history.
   */
  progress(jobId, payload) {
    const event = {
      job_id: jobId,
      stage: payload.stage || 'WORKING',
      step: payload.step || 'progress',
      message: payload.message || '',
      detail: payload.detail || null,
      level: payload.level || 'info',
      timestamp: new Date().toISOString()
    };

    // Maintain rolling buffer per job
    if (!this._buffer) this._buffer = new Map();
    const buf = this._buffer.get(jobId) || [];
    buf.push(event);
    if (buf.length > 200) buf.shift();
    this._buffer.set(jobId, buf);

    this.emit(`job:${jobId}`, event);
  }

  /**
   * Get recent event history for a job (for late-joining SSE clients).
   * @param {string} jobId
   * @param {number} [maxEvents=50]
   * @returns {Array}
   */
  getHistory(jobId, maxEvents = 50) {
    if (!this._buffer) return [];
    const buf = this._buffer.get(jobId) || [];
    return buf.slice(-maxEvents);
  }

  /**
   * Clear the event buffer for a job (called when job completes).
   * @param {string} jobId
   */
  clearBuffer(jobId) {
    this._buffer?.delete(jobId);
  }

  /**
   * Subscribe to all future events for a specific job.
   * @param {string} jobId
   * @param {Function} handler - called with event object
   * @returns {Function} unsubscribe function
   */
  subscribe(jobId, handler) {
    const key = `job:${jobId}`;
    this.on(key, handler);
    return () => this.off(key, handler);
  }
}

export const ingestionEvents = new IngestionEventBus();
