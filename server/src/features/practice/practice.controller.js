/***
 * Practice Session Controller
 * ===========================
 * Feature: Practice Mode
 * Layer:   Controller (HTTP Request/Response Handling)
 *
 * This controller acts as the thin HTTP layer between Express routes and the
 * practice service. It is responsible for:
 *   1. Extracting request parameters (body, params, user context)
 *   2. Delegating all business logic to practiceService
 *   3. Mapping service results and errors to appropriate HTTP status codes
 *
 * Error Handling Strategy:
 *   - Service methods throw errors with a custom `statusCode` property for
 *     anticipated failures (400, 404). The controller checks for this property
 *     and returns the corresponding HTTP status.
 *   - Unexpected errors fall through to a generic 500 response.
 *   - All errors are logged to console.error for server-side debugging.
 *
 * Architecture:
 *   Routes (practice.routes.js)
 *     → Controller (this file)
 *       → Service (practice.service.js)
 ***/

/* Import the practice service which contains all business logic */
import { practiceService } from './practice.service.js';

export const practiceController = {
  async startTargetedSession(req, res) {
    try {
      const { topic_id, question_ids } = req.body;
      const data = await practiceService.startTargetedSession(req.user.id, topic_id, question_ids);
      return res.status(201).json(data);
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * Start a new practice session.
   *
   * @description Handles POST /api/practice-sessions. Extracts topic_id and
   *   optional question_count from the request body, delegates to the service,
   *   and returns the newly created session with questions.
   *
   * @param {import('express').Request} req - Express request (req.body: { topic_id, question_count? })
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 201 with { session, questions } on success
   * @throws 400 if topic_id missing or no questions available; 500 on unexpected error
   */
  async startSession(req, res) {
    try {
      const { topic_id, question_count = 15 } = req.body;
      const data = await practiceService.startSession(req.user.id, topic_id, question_count);
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST /practice-sessions error:', err);
      /* Route service-level statusCode errors (400, 404) as proper HTTP codes */
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * Retrieve an existing practice session with its attempts.
   *
   * @description Handles GET /api/practice-sessions/:id. Returns the session
   *   details including topic hierarchy and all recorded attempts. Returns 404
   *   if the session doesn't exist or doesn't belong to the authenticated user.
   *
   * @param {import('express').Request} req - Express request (req.params.id: session UUID)
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 200 with { session, attempts } or 404
   */
  async getSession(req, res) {
    try {
      const data = await practiceService.getSession(req.user.id, req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'Session not found' });
      }
      return res.json(data);
    } catch (err) {
      console.error('GET /practice-sessions/:id error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * Record an answer attempt for a question within a practice session.
   *
   * @description Handles POST /api/practice-sessions/:id/attempts. Extracts
   *   attempt data from the request body, delegates grading to the service,
   *   and returns the attempt record WITH the correct answer (practice mode).
   *
   * @param {import('express').Request} req - Express request
   *   req.params.id: session UUID
   *   req.body: { question_id, selected_answer, time_spent_seconds, mistake_type? }
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 201 with attempt record (including correct_answer)
   * @throws 404 if session or question not found; 500 on unexpected error
   */
  async recordAttempt(req, res) {
    try {
      const { question_id, selected_answer, time_spent_seconds, mistake_type } = req.body;
      const data = await practiceService.recordAttempt(req.user.id, req.params.id, {
        question_id,
        selected_answer,
        time_spent_seconds,
        mistake_type
      });
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST /practice-sessions/:id/attempts error:', err);
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * Complete a practice session and return performance summary.
   *
   * @description Handles POST /api/practice-sessions/:id/complete. Marks the
   *   session as finished and returns aggregated statistics (accuracy, avg time).
   *
   * @param {import('express').Request} req - Express request (req.params.id: session UUID)
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 200 with { session, summary }
   */
  async completeSession(req, res) {
    try {
      const data = await practiceService.completeSession(req.user.id, req.params.id);
      return res.json(data);
    } catch (err) {
      console.error('POST /practice-sessions/:id/complete error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
};
