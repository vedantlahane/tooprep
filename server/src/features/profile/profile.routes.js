import { Router } from 'express';
import { profileController } from './profile.controller.js';

const router = Router();

// GET /api/profile — own profile
router.get('/', profileController.getProfile);

// POST /api/profile — create/update own profile
router.post('/', profileController.updateProfile);

export default router;
