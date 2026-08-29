/***
 * Questions — Controller Layer
 *
 * Feature domain : Question Bank Management
 * Architecture   : Controller (HTTP ↔ Service bridge)
 *
 * This module translates incoming HTTP requests into service calls and
 * converts service outcomes back into properly-statused JSON responses.
 *
 * Endpoints handled:
 *   GET  /api/questions   — List questions with optional filters
 *   POST /api/questions   — Create a new question (admin-only)
 *
 * Error handling strategy:
 *   • Service-level validation errors carry a custom `statusCode` property
 *     (e.g. 400) which the controller checks to send the correct HTTP status.
 *   • All other errors default to 500 Internal Server Error.
 *
 * Consumed by : questions.routes.js
 * Depends on  : questions.service.js
 ***/

/* Service layer — contains dynamic query building, field validation,
   and all direct Supabase interactions for the questions feature. */
import { questionsService } from './questions.service.js';

export const questionsController = {

  /**
   * GET /api/questions — Retrieve a filtered list of questions.
   *
   * @description Forwards the raw query-string object (`req.query`) directly
   *   to the service's dynamic query builder. Supported query params:
   *   topic_id, difficulty, source_type, verified. Any combination (or none)
   *   is valid — the service handles missing params gracefully.
   *
   * @param {import('express').Request}  req - Express request.
   *   req.query — Optional filter params forwarded to the service.
   * @param {import('express').Response} res - Express response.
   * @returns {Promise<void>} Sends a JSON array of question objects.
   */
  async getQuestions(req, res) {
    try {
      /* Pass the entire query-string bag to the service; the service
         destructures only the recognised filter keys and ignores the rest. */
      const data = await questionsService.getQuestions(req.query);
      return res.json(data); // 200 OK — array (may be empty)
    } catch (err) {
      console.error('GET /questions error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  },

  /**
   * POST /api/questions — Create a new question (admin-only).
   *
   * @description Passes the full request body to the service for validation
   *   and insertion. The route is guarded by `requireAdmin` middleware, so
   *   only admin-authenticated requests reach this handler.
   *
   * @param {import('express').Request}  req - Express request.
   *   req.body — Complete question payload (see questionsService.createQuestion).
   * @param {import('express').Response} res - Express response.
   * @returns {Promise<void>} Sends the created question with 201 status.
   */
  async createQuestion(req, res) {
    try {
      const data = await questionsService.createQuestion(req.body);
      return res.status(201).json(data); // 201 Created — new question row
    } catch (err) {
      console.error('POST /questions error:', err);

      /* ── Error classification ────────────────────────────────────────
       * The service attaches a `statusCode` property to validation errors
       * (e.g. missing required fields → 400). This lets the controller
       * distinguish client errors from unexpected server failures. */
      if (err.statusCode === 400) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
};
