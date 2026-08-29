/***
 * ============================================================================
 * Module:  topics.routes.js
 * Feature: Topics — Subject/Chapter/Topic Hierarchy & Detail
 * Layer:   Route Definitions (Express Router)
 * ============================================================================
 *
 * Defines the HTTP endpoints for the Topics feature.
 * This router is mounted at `/api/topics` by the top-level app router.
 *
 * Endpoints:
 *   GET /api/topics
 *     → Returns the full subject > chapter > topic hierarchy annotated
 *       with per-user confidence, evaluation accuracy, and gap status
 *     → Handler: topicsController.getTopics
 *
 *   GET /api/topics/:id
 *     → Returns detailed view for a single topic including confidence
 *       history, evaluation history, practice counts, and gap data
 *     → Handler: topicsController.getTopicDetail
 *
 * Auth: All routes require authentication (enforced by middleware upstream
 *       of this router mount, which populates `req.user`).
 *
 * Architecture:
 *   Routes (this file) → Controller (topics.controller.js) →
 *   Service (topics.service.js) → Supabase DB
 *
 * ============================================================================
 ***/

/* Express Router factory for modular route definition */
import { Router } from 'express';
/* Controller containing the handler functions for each endpoint */
import { topicsController } from './topics.controller.js';

const router = Router();

// GET /api/topics — hierarchy with user annotations
router.get('/', topicsController.getTopics);

// GET /api/topics/:id — topic detail
router.get('/:id', topicsController.getTopicDetail);

export default router;
