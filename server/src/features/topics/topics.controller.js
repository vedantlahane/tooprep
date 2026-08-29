/***
 * ============================================================================
 * Module:  topics.controller.js
 * Feature: Topics — Subject/Chapter/Topic Hierarchy & Detail
 * Layer:   Controller (HTTP ↔ Service bridge)
 * ============================================================================
 *
 * Thin controller layer for the Topics feature endpoints.
 *
 * Responsibilities:
 *   - Extract authenticated user ID from `req.user` and route params
 *   - Delegate to topicsService for hierarchy assembly and detail retrieval
 *   - Translate null service responses into 404 (topic not found)
 *   - Catch and log errors, returning generic 500 to avoid leaking internals
 *
 * Architecture:
 *   Routes (topics.routes.js) → Controller (this file) → Service (topics.service.js)
 *
 * This controller contains NO business logic — all hierarchy construction,
 * gap computation, and data annotation happens in the service layer.
 *
 * ============================================================================
 ***/

/* topicsService provides getTopicsHierarchy() and getTopicDetail() */
import { topicsService } from './topics.service.js';

export const topicsController = {
  /**
   * Handler for GET /api/topics
   *
   * @description Returns the full subject → chapter → topic hierarchy tree,
   *   with each topic node annotated with the user's confidence rating,
   *   evaluation accuracy, gap status, and last practiced date.
   *
   * @param {import('express').Request} req - Express request; `req.user.id`
   *   must be set by upstream auth middleware
   * @param {import('express').Response} res - Express response
   * @returns {void} Sends JSON array of subject objects (nested hierarchy),
   *   or 500 on error
   */
  async getTopics(req, res) {
    try {
      const data = await topicsService.getTopicsHierarchy(req.user.id);
      return res.json(data);
    } catch (err) {
      console.error('GET /topics error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  },

  /**
   * Handler for GET /api/topics/:id
   *
   * @description Returns a detailed view for a single topic, including
   *   full confidence history, evaluation history with per-eval accuracy,
   *   total questions attempted, and computed gap data. Returns 404 if
   *   the topic ID doesn't exist in the database.
   *
   * @param {import('express').Request} req - Express request; `req.user.id`
   *   must be set by auth middleware, `req.params.id` is the topic UUID
   * @param {import('express').Response} res - Express response
   * @returns {void} Sends JSON topic detail object, 404 if not found,
   *   or 500 on error
   */
  async getTopicDetail(req, res) {
    try {
      const topicId = req.params.id;
      const data = await topicsService.getTopicDetail(req.user.id, topicId);
      if (!data) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      return res.json(data);
    } catch (err) {
      console.error('GET /topics/:id error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
};
