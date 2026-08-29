import { Router } from 'express';
import { practiceController } from './practice.controller.js';

const router = Router();

// POST /api/practice-sessions — create session, select questions
router.post('/', practiceController.startSession);

// GET /api/practice-sessions/:id
router.get('/:id', practiceController.getSession);

// POST /api/practice-sessions/:id/attempts — record attempt
router.post('/:id/attempts', practiceController.recordAttempt);

// POST /api/practice-sessions/:id/complete
router.post('/:id/complete', practiceController.completeSession);

export default router;
