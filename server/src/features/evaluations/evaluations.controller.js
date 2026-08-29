/***
 * Evaluations Controller
 * ======================
 * Feature: Timed Evaluations (Assessment Mode)
 * Layer:   Controller (HTTP Request/Response Handling)
 *
 * This controller acts as the thin HTTP layer between Express routes and the
 * evaluations service. It handles request parsing, delegates to the service,
 * and maps results/errors to proper HTTP responses.
 *
 * Key Difference from Practice Controller:
 *   - The recordAttempt handler does NOT return the correct answer in the
 *     response (the service intentionally withholds it).
 *   - The startEvaluation handler accepts an additional duration_seconds
 *     parameter to configure the evaluation time limit.
 *
 * Error Handling Strategy:
 *   - Service methods throw errors with a custom `statusCode` property for
 *     anticipated failures (400 for validation, 404 for not found).
 *   - Unexpected errors fall through to a generic 500 response.
 *   - All errors are logged via console.error for server-side diagnostics.
 *
 * Architecture:
 *   Routes (evaluations.routes.js)
 *     → Controller (this file)
 *       → Service (evaluations.service.js)
 ***/

/* Import the evaluations service which contains all business logic */
import { evaluationsService } from './evaluations.service.js';

export const evaluationsController = {
  /**
   * Start a new timed evaluation.
   *
   * @description Handles POST /api/evaluations. Extracts topic_id, optional
   *   question_count, and optional duration_seconds from the request body.
   *   Delegates to the service's intelligent question selection algorithm
   *   and returns the evaluation record with questions (sans answers).
   *
   * @param {import('express').Request} req - Express request
   *   req.body: { topic_id: string, question_count?: number, duration_seconds?: number }
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 201 with { evaluation, questions } on success
   * @throws 400 if topic_id missing or no questions available; 500 on unexpected error
   */
  async startEvaluation(req, res) {
    try {
      const { topic_id, question_count = 15, duration_seconds = 1800 } = req.body;
      const data = await evaluationsService.startEvaluation(req.user.id, {
        topic_id,
        question_count,
        duration_seconds
      });
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST /evaluations error:', err);
      /* Route service-level statusCode errors (400, 404) as proper HTTP codes */
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * Retrieve an existing evaluation with its attempts.
   *
   * @description Handles GET /api/evaluations/:id. Returns the evaluation
   *   details, attempts, and conditionally the question solutions (only after
   *   the evaluation has been completed — if still in progress, the questions
   *   array will be empty to prevent answer leakage).
   *
   * @param {import('express').Request} req - Express request (req.params.id: evaluation UUID)
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 200 with { evaluation, attempts, questions } or 404
   */
  async getEvaluation(req, res) {
    try {
      const data = await evaluationsService.getEvaluation(req.user.id, req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'Evaluation not found' });
      }
      return res.json(data);
    } catch (err) {
      console.error('GET /evaluations/:id error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * Record or update an answer attempt within an active evaluation.
   *
   * @description Handles POST /api/evaluations/:id/attempts. Unlike the
   *   practice controller, the response here does NOT include correct_answer.
   *   Supports upsert — if the user already answered this question, the
   *   existing attempt is updated rather than creating a duplicate.
   *
   * @param {import('express').Request} req - Express request
   *   req.params.id: evaluation UUID
   *   req.body: { question_id, selected_answer, time_spent_seconds }
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 201 with attempt record (no correct_answer)
   * @throws 404 if evaluation or question not found; 400 if evaluation completed; 500 on error
   */
  async recordAttempt(req, res) {
    try {
      const { question_id, selected_answer, time_spent_seconds } = req.body;
      const data = await evaluationsService.recordAttempt(req.user.id, req.params.id, {
        question_id,
        selected_answer,
        time_spent_seconds
      });
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST /evaluations/:id/attempts error:', err);
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * Complete an evaluation and return detailed performance analytics.
   *
   * @description Handles POST /api/evaluations/:id/complete. Finalizes the
   *   evaluation and returns comprehensive results including difficulty
   *   breakdown, PYQ accuracy, and a detailed mistake list with solutions.
   *   This is the endpoint that "unlocks" answer visibility.
   *
   * @param {import('express').Request} req - Express request (req.params.id: evaluation UUID)
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 200 with { evaluation, summary, mistakes, attempts }
   */
  async completeEvaluation(req, res) {
    try {
      const data = await evaluationsService.completeEvaluation(req.user.id, req.params.id);
      return res.json(data);
    } catch (err) {
      console.error('POST /evaluations/:id/complete error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
};
