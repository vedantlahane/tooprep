/***
 * Admin — Route Definitions
 *
 * Feature domain : Administrative Platform Management & Observability
 * Architecture   : Routes (Express Router)
 * Mounted under  : /api/admin
 ***/

import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { requireAdmin } from '../../middleware/auth.js';

const router = Router();

// Observability & System Metrics
router.get('/observability', requireAdmin, adminController.getObservability);

// Curriculum Coverage & Syllabus Question Audit
router.get('/curriculum', requireAdmin, adminController.getCurriculumCoverage);

export default router;
