/***
 * Confidence Assessment — Controller Layer
 *
 * Feature domain : Confidence Tracking
 * Architecture   : Controller (HTTP ↔ Service bridge)
 *
 * This module sits between the Express route definitions and the confidence
 * service. Its responsibilities are intentionally narrow:
 *   1. Extract relevant data from the request (params, body, auth context).
 *   2. Delegate to `confidenceService` for validation and persistence.
 *   3. Map service-level outcomes to appropriate HTTP status codes & JSON.
 *
 * Error handling strategy:
 *   • Validation errors thrown by the service (confidence range, trigger
 *     enum) are detected by message substring and returned as 400 Bad Request.
 *   • All other errors (database failures, unexpected runtime exceptions)
 *     fall through to 500 Internal Server Error.
 *
 * Consumed by : confidence.routes.js
 * Depends on  : confidence.service.js
 ***/

/* Service layer — contains all business rules and data access logic
   for confidence assessments. */
import { confidenceService } from './confidence.service.js';

export const confidenceController = {

  /**
   * POST /:id/confidence — Record a new confidence rating.
   *
   * @description Accepts a confidence score (1-10) and a trigger type from
   *   the request body and persists them via the service layer. The topic is
   *   identified by the `:id` route param; the user is taken from the auth
   *   middleware (`req.user`).
   *
   * @param {import('express').Request}  req  - Express request.
   *   req.params.id  — Topic UUID.
   *   req.body.confidence — Numeric rating (1-10).
   *   req.body.trigger    — 'INITIAL' | 'POST_EVALUATION'.
   *   req.user.id    — Authenticated user UUID (set by auth middleware).
   * @param {import('express').Response} res  - Express response.
   * @returns {Promise<void>} Sends JSON response; does not return a value.
   */
  async setConfidence(req, res) {
    try {
      const { confidence, trigger } = req.body;
      const data = await confidenceService.addConfidence(req.user.id, req.params.id, confidence, trigger);
      return res.status(201).json(data); // 201 Created — new assessment row
    } catch (err) {
      console.error('POST confidence error:', err);

      /* ── Classify errors as client-caused (400) vs server-caused (500) ─ */
      /* Validation messages thrown by the service start with known prefixes.
         Matching on substrings is a lightweight approach that avoids custom
         error subclasses while still giving the client a meaningful status. */
      if (err.message.includes('Confidence must be') || err.message.includes('Trigger must be')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * GET /:id/confidence-history — Retrieve confidence timeline.
   *
   * @description Returns the authenticated user's chronological list of
   *   confidence assessments for the topic identified by `:id`. The array is
   *   ordered oldest-first so that front-end charts can render a timeline
   *   without additional sorting.
   *
   * @param {import('express').Request}  req  - Express request.
   *   req.params.id — Topic UUID.
   *   req.user.id   — Authenticated user UUID.
   * @param {import('express').Response} res  - Express response.
   * @returns {Promise<void>} Sends JSON array response.
   */
  async getConfidenceHistory(req, res) {
    try {
      const data = await confidenceService.getConfidenceHistory(req.user.id, req.params.id);
      return res.json(data); // 200 OK — array (possibly empty)
    } catch (err) {
      console.error('GET confidence-history error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
};
