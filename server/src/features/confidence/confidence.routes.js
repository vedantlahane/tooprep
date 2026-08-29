import { Router } from 'express';
import { confidenceController } from './confidence.controller.js';

const router = Router();

// POST /api/topics/:id/confidence
router.post('/:id/confidence', confidenceController.setConfidence);

// GET /api/topics/:id/confidence-history
router.get('/:id/confidence-history', confidenceController.getConfidenceHistory);

export default router;
