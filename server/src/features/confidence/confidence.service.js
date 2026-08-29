/***
 * Confidence Assessment — Service Layer
 *
 * Feature domain : Confidence Tracking
 * Architecture   : Service (business logic + data access)
 *
 * This module encapsulates all business rules and database operations for the
 * confidence-assessment feature. Each user can record how confident they feel
 * about a given topic on a 1-10 integer scale. Recordings are tagged with a
 * "trigger" that describes *when* the rating was captured:
 *
 *   • INITIAL           – the user's self-assessment before any evaluation
 *   • POST_EVALUATION   – the user's revised assessment after completing an
 *                         evaluation (quiz, practice session, etc.)
 *
 * Comparing INITIAL vs POST_EVALUATION scores over time lets the front-end
 * visualise the Dunning-Kruger gap and track genuine learning progress.
 *
 * Data is persisted in the `confidence_assessments` Supabase table via the
 * admin client (bypasses RLS), so auth checks must happen at the controller
 * or middleware layer.
 *
 * Consumed by: confidence.controller.js
 ***/

/* Supabase admin client — used instead of the anon client so that inserts and
   selects bypass Row-Level Security; authorisation is enforced upstream by
   the auth middleware attached to the route. */
import { supabaseAdmin } from '../../lib/supabase.js';

export const confidenceService = {

  /**
   * Record a new confidence assessment for a user–topic pair.
   *
   * @description Validates the incoming confidence value and trigger type,
   *   then inserts a row into `confidence_assessments`. The inserted row is
   *   returned so the controller can echo it back to the client.
   *
   * @param   {string} userId     - UUID of the authenticated user.
   * @param   {string} topicId    - UUID of the topic being assessed.
   * @param   {number} confidence - Integer rating on the 1-10 scale (inclusive).
   * @param   {string} trigger    - When the rating was captured:
   *                                 'INITIAL' or 'POST_EVALUATION'.
   * @returns {Promise<Object>}     The newly created confidence_assessment row.
   * @throws  {Error} If confidence is outside the 1-10 range.
   * @throws  {Error} If trigger is not one of the two allowed enum values.
   * @throws  {Error} If the Supabase insert fails (e.g. FK violation).
   */
  async addConfidence(userId, topicId, confidence, trigger) {
    /* ── Input validation ─────────────────────────────────────────────── */
    /* Confidence must be a truthy number in the closed interval [1, 10].
       Falsy check also catches undefined/null when the body field is missing. */
    if (!confidence || confidence < 1 || confidence > 10) {
      throw new Error('Confidence must be between 1 and 10');
    }
    /* Trigger must be one of two predefined lifecycle moments.
       INITIAL  = before the user has been evaluated on this topic.
       POST_EVALUATION = after a quiz / practice session is completed. */
    if (!trigger || !['INITIAL', 'POST_EVALUATION'].includes(trigger)) {
      throw new Error('Trigger must be INITIAL or POST_EVALUATION');
    }

    /* ── Persist to Supabase ──────────────────────────────────────────── */
    /* .select().single() chains ensure the freshly inserted row is returned
       as a plain object rather than an array, keeping the API response lean. */
    const { data, error } = await supabaseAdmin
      .from('confidence_assessments')
      .insert({
        user_id: userId,
        topic_id: topicId,
        confidence,
        trigger
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Retrieve the full confidence-rating history for a user–topic pair.
   *
   * @description Returns every confidence assessment the user has ever
   *   recorded for the specified topic, sorted chronologically (oldest
   *   first). The front-end uses this to render a progress chart showing
   *   how confidence evolves across INITIAL and POST_EVALUATION snapshots.
   *
   * @param   {string} userId  - UUID of the authenticated user.
   * @param   {string} topicId - UUID of the target topic.
   * @returns {Promise<Array<Object>>} Array of confidence_assessment rows
   *   ordered by `recorded_at` ascending.
   * @throws  {Error} If the Supabase query fails.
   */
  async getConfidenceHistory(userId, topicId) {
    /* Fetch all assessments for this user + topic pair.
       Ascending order by recorded_at produces a natural timeline that the
       client can plot directly on a line chart without re-sorting. */
    const { data, error } = await supabaseAdmin
      .from('confidence_assessments')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .order('recorded_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }
};
