/***
 * Evaluations Routes
 * ==================
 * Feature: Timed Evaluations (Assessment Mode)
 * Layer:   Routes (HTTP Endpoint Definitions)
 *
 * Defines the REST API endpoints for the timed evaluation lifecycle.
 * All routes are mounted under /api/evaluations by the parent router
 * and are protected by authentication middleware (applied upstream).
 *
 * Endpoint Lifecycle:
 *   1. POST /                 → Create a timed evaluation (intelligent question assembly)
 *   2. GET  /:id              → Retrieve evaluation details (answers hidden until complete)
 *   3. POST /:id/attempts     → Record/update an answer (NO answer reveal — exam mode)
 *   4. POST /:id/complete     → Finalize and unlock full results with solutions
 *
 * Key Security Contract:
 *   Steps 1–3 never expose correct_answer or solution_text to the client.
 *   Only step 4 (complete) reveals solutions, enabling honest post-exam review.
 *
 * Architecture:
 *   Routes (this file)
 *     → Controller (evaluations.controller.js)
 *       → Service (evaluations.service.js)
 *
 * Note: Authentication middleware is not applied here — it is expected to be
 * applied at the parent router level so that req.user is always available.
 ***/

/* Express Router factory for creating modular, mountable route handlers */
import { Router } from 'express';

/* Controller that handles request/response logic for each endpoint */
import { evaluationsController } from './evaluations.controller.js';

const router = Router();

/* POST /api/evaluations — Start a new timed evaluation.
 * Assembles questions using intelligent selection (difficulty mix, PYQ bias,
 * recent-question exclusion). Returns questions WITHOUT answers.
 * Request body: { topic_id: string, question_count?: number, duration_seconds?: number }
 * Response: 201 { evaluation, questions } */
router.post('/', evaluationsController.startEvaluation);

/* GET /api/evaluations/:id — Retrieve evaluation details.
 * Returns evaluation metadata and attempts. Questions with solutions are
 * included ONLY if the evaluation has been completed (ended_at is set).
 * While in progress, questions array is empty to prevent answer leakage.
 * Response: 200 { evaluation, attempts, questions } or 404 */
router.get('/:id', evaluationsController.getEvaluation);

/* POST /api/evaluations/:id/attempts — Record or update an answer attempt.
 * Supports upsert: updates existing attempt if the user already answered
 * this question, allowing answer revision during the exam.
 * Does NOT reveal the correct answer in the response (exam mode).
 * Request body: { question_id, selected_answer, time_spent_seconds }
 * Response: 201 { attempt } */
router.post('/:id/attempts', evaluationsController.recordAttempt);

/* POST /api/evaluations/:id/complete — Finalize the evaluation.
 * Sets ended_at, computes detailed performance analytics (accuracy,
 * difficulty breakdown, PYQ accuracy), and returns the full mistake list
 * with correct answers and solution explanations.
 * Response: 200 { evaluation, summary, mistakes, attempts } */
router.post('/:id/complete', evaluationsController.completeEvaluation);

export default router;
