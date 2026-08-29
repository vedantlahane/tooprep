/***
 * ============================================================================
 * Module:  dashboard.routes.js
 * Feature: Dashboard — Knowledge Map
 * Layer:   Route Definitions (Express Router)
 * ============================================================================
 *
 * Defines the HTTP endpoints for the Knowledge Map dashboard feature.
 * This router is mounted at `/api/dashboard` by the top-level app router.
 *
 * Endpoints:
 *   GET /api/dashboard
 *     → Returns the full knowledge map (all topics with gap analysis)
 *     → Handler: dashboardController.getDashboard
 *
 *   GET /api/dashboard/insights/biggest-gap
 *     → Returns the single topic with the largest absolute gap
 *     → Also aliased at /api/insights/biggest-gap by the parent router
 *     → Handler: dashboardController.getBiggestGap
 *
 * Auth: All routes require authentication (enforced by middleware upstream
 *       of this router mount, which populates `req.user`).
 *
 * Architecture:
 *   Routes (this file) → Controller (dashboard.controller.js) →
 *   Service (dashboard.service.js) → Supabase DB
 *
 * ============================================================================
 ***/

/* Express Router factory for modular route definition */
import { Router } from 'express';
/* Controller containing the handler functions for each endpoint */
import { dashboardController } from './dashboard.controller.js';

const router = Router();

// GET /api/dashboard — full knowledge map
router.get('/', dashboardController.getDashboard);

// GET /api/dashboard/insights/biggest-gap (and alias /api/insights/biggest-gap)
router.get('/insights/biggest-gap', dashboardController.getBiggestGap);

export default router;
