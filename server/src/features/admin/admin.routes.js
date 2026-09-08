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

// Deduplication Engine & Resolution Console
router.get('/duplicates', requireAdmin, adminController.listDuplicates);
router.post('/duplicates/scan', requireAdmin, adminController.scanDuplicates);
router.post('/duplicates/:id/resolve', requireAdmin, adminController.resolveDuplicate);
router.post('/duplicates/:id/dismiss', requireAdmin, adminController.dismissDuplicate);
router.post('/duplicates/:id/merge', requireAdmin, adminController.mergeDuplicates);

// Student Cohort Observability & Management
router.get('/students', requireAdmin, adminController.getStudentsList);
router.get('/students/:id', requireAdmin, adminController.getStudentDetail);
router.patch('/students/:id/role', requireAdmin, adminController.updateUserRole);

export default router;

