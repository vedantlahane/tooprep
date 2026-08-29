import { Router } from 'express';
import { evaluationsController } from './evaluations.controller.js';

const router = Router();

// POST /api/evaluations — create evaluation, auto-assemble questions
router.post('/', evaluationsController.startEvaluation);

// GET /api/evaluations/:id
router.get('/:id', evaluationsController.getEvaluation);

// POST /api/evaluations/:id/attempts — record attempt (no answer reveal)
router.post('/:id/attempts', evaluationsController.recordAttempt);

// POST /api/evaluations/:id/complete — finalize, return performance summary
router.post('/:id/complete', evaluationsController.completeEvaluation);

export default router;
