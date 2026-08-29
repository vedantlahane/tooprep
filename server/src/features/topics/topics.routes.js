import { Router } from 'express';
import { topicsController } from './topics.controller.js';

const router = Router();

// GET /api/topics — hierarchy with user annotations
router.get('/', topicsController.getTopics);

// GET /api/topics/:id — topic detail
router.get('/:id', topicsController.getTopicDetail);

export default router;
