/***
 * Confidence Assessment — Route Definitions
 *
 * Feature domain : Confidence Tracking
 * Architecture   : Routes (thin routing layer)
 *
 * This router is **mounted under `/api/topics`** in the application's central
 * `index.js`, so all paths defined here are relative to that prefix.
 *
 * Endpoints exposed:
 *   POST  /api/topics/:id/confidence          — Record a confidence rating
 *   GET   /api/topics/:id/confidence-history   — Get chronological ratings
 *
 * Authentication is expected to be enforced by middleware applied at the
 * mount point (e.g. `requireAuth` in index.js), so individual routes here
 * do not re-apply auth guards.
 *
 * Consumed by : server/src/index.js (app.use('/api/topics', ...))
 * Depends on  : confidence.controller.js
 ***/

/* Express Router factory — creates a modular, mountable route handler. */
import { Router } from 'express';

/* Controller containing the request-handling logic for confidence endpoints. */
import { confidenceController } from './confidence.controller.js';

const router = Router();

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/topics/:id/confidence
 *
 * Records a new confidence assessment for the authenticated user on the
 * topic identified by :id. Expects { confidence: 1-10, trigger: string }
 * in the request body. Returns the created row with 201 status.
 * ────────────────────────────────────────────────────────────────────────── */
router.post('/:id/confidence', confidenceController.setConfidence);

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/topics/:id/confidence-history
 *
 * Returns the authenticated user's full timeline of confidence ratings for
 * the specified topic, ordered oldest-first. Used by the front-end to
 * render progress charts comparing INITIAL vs POST_EVALUATION scores.
 * ────────────────────────────────────────────────────────────────────────── */
router.get('/:id/confidence-history', confidenceController.getConfidenceHistory);

export default router;
