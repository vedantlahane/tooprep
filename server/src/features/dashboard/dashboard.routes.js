import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';

const router = Router();

// GET /api/dashboard — full knowledge map
router.get('/', dashboardController.getDashboard);

// GET /api/dashboard/insights/biggest-gap (and alias /api/insights/biggest-gap)
router.get('/insights/biggest-gap', dashboardController.getBiggestGap);

export default router;
