/***
 * Profile Service
 * ===============
 * Feature: User Profile Management
 * Layer:   Service (Business Logic)
 *
 * This service manages user profile data stored in the `profiles` table.
 * Profiles are lightweight records tied 1:1 to authenticated users, storing
 * user-facing metadata like display name and target exam year.
 *
 * The profiles table uses the user's auth UUID as its primary key (id),
 * which enables the upsert pattern: if a profile already exists for the
 * user, it is updated in place; otherwise a new row is created.
 *
 * Architecture:
 *   Routes (profile.routes.js)
 *     → Controller (profile.controller.js)
 *       → Service (this file)
 *         → Database (Supabase: profiles)
 *
 * Key Design Decisions:
 *   - Upsert on `id` ensures idempotency — calling upsertProfile() multiple
 *     times with the same userId never creates duplicate rows
 *   - The profile schema is intentionally minimal (display_name, target_exam_year)
 *     to keep the feature lightweight; auth-related fields live in Supabase Auth
 ***/

/* Supabase admin client — bypasses RLS for server-side operations */
import { supabaseAdmin } from '../../lib/supabase.js';

export const profileService = {
  /**
   * Fetch a user's profile by their user ID.
   *
   * @description Retrieves all columns from the profiles table for the given
   *   user ID. Since profiles.id is the user's auth UUID, this is a direct
   *   primary key lookup (fast, indexed).
   *
   * @param {string} userId - The authenticated user's UUID (matches profiles.id)
   * @returns {Promise<Object>} The complete profile record
   * @throws {Error} if the profile doesn't exist or the query fails
   */
  async getProfile(userId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message || 'Profile not found');
    return data;
  },

  /**
   * Create or update a user's profile (upsert).
   *
   * @description Uses Supabase's upsert with onConflict: 'id' to handle both
   *   first-time profile creation and subsequent updates in a single operation.
   *   If a profile with the given userId already exists, its display_name and
   *   target_exam_year are updated. Otherwise, a new row is inserted.
   *
   *   This approach is idempotent and avoids race conditions that could occur
   *   with a separate "check-then-insert-or-update" pattern.
   *
   * @param {string} userId - The authenticated user's UUID (becomes profiles.id)
   * @param {Object} profileData - The profile fields to set
   * @param {string} profileData.display_name - User's chosen display name
   * @param {number} profileData.target_exam_year - The year the user is targeting for their exam
   * @returns {Promise<Object>} The created or updated profile record
   * @throws {Error} if the upsert operation fails
   */
  async upsertProfile(userId, { display_name, target_exam_year }) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        display_name,
        target_exam_year
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(error.message || 'Failed to update profile');
    return data;
  }
};
