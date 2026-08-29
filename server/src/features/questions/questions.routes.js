import { Router } from 'express';
import { questionsController } from './questions.controller.js';
import { requireAdmin } from '../../middleware/auth.js';

const router = Router();

// GET /api/questions?topic_id=&difficulty=&source_type=&verified=true
router.get('/', questionsController.getQuestions);

// POST /api/questions — admin-only
router.post('/', requireAdmin, questionsController.createQuestion);

export default router;
