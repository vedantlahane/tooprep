/***
 * ============================================================================
 * Module:  dashboard.controller.js
 * Feature: Dashboard — Knowledge Map
 * Layer:   Controller (HTTP ↔ Service bridge)
 * ============================================================================
 *
 * Thin controller layer for the Knowledge Map dashboard endpoints.
 *
 * Responsibilities:
 *   - Extract the authenticated user ID from `req.user` (set by auth middleware)
 *   - Delegate to dashboardService for all business logic and data access
 *   - Translate service responses into HTTP responses (JSON body + status code)
 *   - Catch and log errors, returning a generic 500 to avoid leaking internals
 *
 * Architecture:
 *   Routes (dashboard.routes.js) → Controller (this file) → Service (dashboard.service.js)
 *
 * This controller intentionally contains NO business logic — all gap
 * computation, data assembly, and sorting happens in the service layer.
 *
 * ============================================================================
 ***/

/* dashboardService provides getDashboardData() and getBiggestGap() */
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  /**
   * Handler for GET /api/dashboard
   *
   * @description Returns the full Knowledge Map — an array of topic rows,
   *   each annotated with confidence, evaluation accuracy, gap, status,
   *   difficulty breakdown, and practice stats. Rows are pre-sorted by
   *   the service layer (OVERCONFIDENT first → ALIGNED last).
   *
   * @param {import('express').Request} req - Express request; `req.user.id`
   *   must be set by upstream auth middleware
   * @param {import('express').Response} res - Express response
   * @returns {void} Sends JSON array of dashboard rows, or 500 on error
   */
  async getDashboard(req, res) {
    try {
      const data = await dashboardService.getDashboardData(req.user.id);
      return res.json(data);
    } catch (err) {
      console.error('GET /dashboard error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  },

  /**
   * Handler for GET /api/dashboard/insights/biggest-gap
   *
   * @description Finds the single topic with the largest absolute
   *   confidence-performance gap for the authenticated user. Returns a
   *   JSON message (not 404) when no topics have sufficient data — this
   *   is intentional since "no gap data yet" is a valid informational
   *   state, not a resource-not-found error.
   *
   * @param {import('express').Request} req - Express request; `req.user.id`
   *   must be set by upstream auth middleware
   * @param {import('express').Response} res - Express response
   * @returns {void} Sends JSON topic object with gap data, an informational
   *   message if no gaps exist, or 500 on error
   */
  async getBiggestGap(req, res) {
    try {
      const biggestGapTopic = await dashboardService.getBiggestGap(req.user.id);
      if (!biggestGapTopic) {
        return res.json({ message: 'No topics with sufficient data to compute gaps' });
      }
      return res.json(biggestGapTopic);
    } catch (err) {
      console.error('GET /insights/biggest-gap error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
};
