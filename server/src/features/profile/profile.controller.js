/***
 * Profile Controller
 * ==================
 * Feature: User Profile Management
 * Layer:   Controller (HTTP Request/Response Handling)
 *
 * This controller handles HTTP requests for user profile operations.
 * It follows the "own profile only" pattern — users can only read and
 * update their own profile, identified via req.user.id from the
 * authentication middleware.
 *
 * Error Handling:
 *   - getProfile: Returns 404 on any error (profile not found is the most
 *     likely cause; other errors are treated the same for simplicity).
 *   - updateProfile: Returns 500 on any error (upsert failures are
 *     typically server-side issues, not client errors).
 *   - Both handlers log the full error for server-side debugging.
 *
 * Architecture:
 *   Routes (profile.routes.js)
 *     → Controller (this file)
 *       → Service (profile.service.js)
 ***/

/* Import the profile service which contains all business logic */
import { profileService } from './profile.service.js';

export const profileController = {
  /**
   * Get the authenticated user's own profile.
   *
   * @description Handles GET /api/profile. Uses req.user.id (set by auth
   *   middleware) to fetch the caller's profile. No route parameter is
   *   needed — users always access their own profile.
   *
   * @param {import('express').Request} req - Express request (req.user.id: authenticated user UUID)
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 200 with profile data, or 404 if not found
   */
  async getProfile(req, res) {
    try {
      const data = await profileService.getProfile(req.user.id);
      return res.json(data);
    } catch (err) {
      console.error('GET /profile error:', err);
      return res.status(404).json({ error: 'Profile not found' });
    }
  },

  /**
   * Create or update the authenticated user's own profile.
   *
   * @description Handles POST /api/profile. Extracts display_name and
   *   target_exam_year from the request body and delegates to the service's
   *   upsert method. The operation is idempotent — calling it repeatedly
   *   with the same data produces the same result.
   *
   * @param {import('express').Request} req - Express request
   *   req.body: { display_name?: string, target_exam_year?: number }
   * @param {import('express').Response} res - Express response
   * @returns {Promise<void>} 200 with the created/updated profile record
   */
  async updateProfile(req, res) {
    try {
      const { display_name, target_exam_year } = req.body;
      const data = await profileService.upsertProfile(req.user.id, { display_name, target_exam_year });
      return res.json(data);
    } catch (err) {
      console.error('POST /profile error:', err);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }
};
