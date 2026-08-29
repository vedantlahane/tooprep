/***
 * Profile Routes
 * ==============
 * Feature: User Profile Management
 * Layer:   Routes (HTTP Endpoint Definitions)
 *
 * Defines the REST API endpoints for user profile management.
 * All routes are mounted under /api/profile by the parent router
 * and are protected by authentication middleware (applied upstream).
 *
 * Endpoints:
 *   1. GET  / → Retrieve the authenticated user's own profile
 *   2. POST / → Create or update the authenticated user's own profile
 *
 * Access Pattern:
 *   Both endpoints operate on the caller's own profile exclusively.
 *   There is no /:id parameter — the user ID is derived from the
 *   authenticated session (req.user.id). This eliminates the possibility
 *   of users accessing or modifying other users' profiles.
 *
 * Architecture:
 *   Routes (this file)
 *     → Controller (profile.controller.js)
 *       → Service (profile.service.js)
 *
 * Note: Authentication middleware is not applied here — it is expected to be
 * applied at the parent router level so that req.user is always available.
 ***/

/* Express Router factory for creating modular, mountable route handlers */
import { Router } from 'express';

/* Controller that handles request/response logic for each endpoint */
import { profileController } from './profile.controller.js';

const router = Router();

/* GET /api/profile — Retrieve the authenticated user's own profile.
 * No route parameters needed — user identity comes from auth middleware.
 * Response: 200 { id, display_name, target_exam_year, ... } or 404 */
router.get('/', profileController.getProfile);

/* POST /api/profile — Create or update the authenticated user's own profile.
 * Uses upsert semantics: creates a new profile if none exists, otherwise
 * updates the existing one. Idempotent operation.
 * Request body: { display_name?: string, target_exam_year?: number }
 * Response: 200 { id, display_name, target_exam_year, ... } */
router.post('/', profileController.updateProfile);

export default router;
