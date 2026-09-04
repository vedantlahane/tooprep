/***
 * Questions — Route Definitions
 *
 * Feature domain : Question Bank Management
 * Architecture   : Routes (thin routing layer)
 *
 * This router is **mounted under `/api/questions`** in the application's
 * central `index.js`, so all paths defined here are relative to that prefix.
 *
 * Endpoints exposed:
 *   GET  /api/questions   — Public. List/filter questions from the bank.
 *   POST /api/questions   — Admin-only. Add a new question to the bank.
 *
 * Access control:
 *   • GET is open to any authenticated user (auth middleware applied at
 *     the mount point).
 *   • POST is additionally guarded by `requireAdmin` — only users whose
 *     JWT contains an admin role may create new questions.
 *
 * Consumed by : server/src/index.js (app.use('/api/questions', ...))
 * Depends on  : questions.controller.js, auth middleware (requireAdmin)
 ***/

/* Express Router factory — creates a modular, mountable route handler. */
import { Router } from 'express';

/* Controller containing the request-handling logic for question endpoints. */
import { questionsController } from './questions.controller.js';

/* Admin-gate middleware — rejects requests from non-admin users with 403.
   Applied selectively to the POST route below. */
import { requireAdmin } from '../../middleware/auth.js';

const router = Router();

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/questions
 *
 * Public endpoint (within the authenticated scope). Accepts optional
 * query-string filters: ?topic_id=&difficulty=&source_type=&verified=true.
 * The controller forwards them to the service's dynamic query builder.
 * ────────────────────────────────────────────────────────────────────────── */
router.get('/admin', requireAdmin, questionsController.getQuestionsForAdmin);
router.get('/', questionsController.getQuestions);

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/questions  (admin-only)
 *
 * Creates a new question in the bank. The `requireAdmin` middleware runs
 * before the controller and rejects non-admin users, ensuring only
 * privileged accounts can modify the question bank.
 * ────────────────────────────────────────────────────────────────────────── */
router.post('/', requireAdmin, questionsController.createQuestion);

/* ──────────────────────────────────────────────────────────────────────────
 * Question Management & Modification (admin-only)
 * ────────────────────────────────────────────────────────────────────────── */
router.put('/:id', requireAdmin, questionsController.updateQuestion);
router.delete('/:id', requireAdmin, questionsController.deleteQuestion);
router.patch('/:id/verify', requireAdmin, questionsController.toggleVerify);

export default router;
