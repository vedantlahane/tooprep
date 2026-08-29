/***
 * Practice Session Routes
 * =======================
 * Feature: Practice Mode
 * Layer:   Routes (HTTP Endpoint Definitions)
 *
 * Defines the REST API endpoints for the practice session lifecycle.
 * All routes are mounted under /api/practice-sessions by the parent router
 * and are protected by authentication middleware (applied upstream).
 *
 * Endpoint Lifecycle:
 *   1. POST /                 → Create a new practice session (select questions)
 *   2. GET  /:id              → Retrieve session details and attempts
 *   3. POST /:id/attempts     → Record a single question attempt (immediate feedback)
 *   4. POST /:id/complete     → Finalize session and get performance summary
 *
 * Architecture:
 *   Routes (this file)
 *     → Controller (practice.controller.js)
 *       → Service (practice.service.js)
 *
 * Note: Authentication middleware is not applied here — it is expected to be
 * applied at the parent router level (e.g., in the main app setup) so that
 * req.user is always available in the controller.
 ***/

/* Express Router factory for creating modular, mountable route handlers */
import { Router } from 'express';

/* Controller that handles request/response logic for each endpoint */
import { practiceController } from './practice.controller.js';

const router = Router();

/* POST /api/practice-sessions — Start a new practice session.
 * Creates a session record and selects random verified questions for the topic.
 * Request body: { topic_id: string, question_count?: number }
 * Response: 201 { session, questions } */
router.post('/', practiceController.startSession);

/* GET /api/practice-sessions/:id — Retrieve an existing session.
 * Returns session details (with topic hierarchy) and all recorded attempts.
 * Response: 200 { session, attempts } or 404 if not found */
router.get('/:id', practiceController.getSession);

/* POST /api/practice-sessions/:id/attempts — Record an answer attempt.
 * Grades the answer server-side and reveals the correct answer (practice mode).
 * Request body: { question_id, selected_answer, time_spent_seconds, mistake_type? }
 * Response: 201 { attempt, correct_answer } */
router.post('/:id/attempts', practiceController.recordAttempt);

/* POST /api/practice-sessions/:id/complete — Finalize the session.
 * Sets ended_at and computes summary stats (accuracy, avg time per question).
 * Response: 200 { session, summary } */
router.post('/:id/complete', practiceController.completeSession);

export default router;
