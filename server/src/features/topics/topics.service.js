/***
 * ============================================================================
 * Module:  topics.service.js
 * Feature: Topics — Subject/Chapter/Topic Hierarchy & Detail
 * Layer:   Service (Business Logic & Data Access)
 * ============================================================================
 *
 * Service layer for the Topics feature. Provides two main operations:
 *
 *   getTopicsHierarchy(userId)
 *     Builds the full subject → chapter → topic tree from Supabase, then
 *     annotates each topic node with the user's confidence rating, evaluation
 *     accuracy, gap/status classification, and last practiced date.
 *     Unlike the dashboard service (which returns a flat array), this returns
 *     the nested hierarchy suitable for tree-view rendering on the frontend.
 *
 *   getTopicDetail(userId, topicId)
 *     Returns a deep-dive view for a single topic, including:
 *       - Full confidence history (chronological) for trend charting
 *       - Evaluation history with per-evaluation accuracy breakdowns
 *       - Total questions attempted (practice + eval combined)
 *       - Computed gap and status from the latest evaluation
 *
 * Key Differences from dashboard.service.js:
 *   - Hierarchy: Returns nested subject > chapter > topic structure (not flat)
 *   - Per-topic eval queries: Fetches eval attempts per topic inside the
 *     annotation loop (N+1 pattern) — acceptable because the hierarchy is
 *     typically small and this endpoint is called less frequently
 *   - Shares computeGapAndStatus() from dashboard.utils.js for consistency
 *
 * Architecture:
 *   Controller (topics.controller.js) → Service (this file) →
 *   Supabase DB + Utils (dashboard.utils.js)
 *
 * ============================================================================
 ***/

/* Supabase admin client — uses service-role key for unrestricted DB access */
import { supabaseAdmin } from '../../lib/supabase.js';
/* Shared gap computation utility — imported from dashboard feature to avoid
 * duplication. This cross-feature import is intentional: the gap algorithm
 * is defined once in dashboard.utils.js and reused here. */
import { computeGapAndStatus } from '../dashboard/dashboard.utils.js';

export const topicsService = {
  /**
   * Build the full subject → chapter → topic hierarchy annotated with
   * user-specific confidence, evaluation, and gap data.
   *
   * @description Fetches the curriculum structure (subjects containing chapters
   *   containing topics) and then enriches each topic node with:
   *   - confidence: the user's latest self-reported confidence (1–10)
   *   - last_practiced_at: most recent practice session start time
   *   - evaluation_accuracy, gap, status, avg_time_seconds, pyq_accuracy:
   *     computed from the latest completed evaluation (via computeGapAndStatus)
   *
   *   Topics with no evaluation data receive status='INSUFFICIENT_DATA' and
   *   null values for all evaluation-derived fields.
   *
   * @param {string} userId - The authenticated user's UUID
   * @returns {Promise<Array<Object>>} Array of subject objects, each containing:
   *   ```
   *   {
   *     id, name,
   *     chapters: [{
   *       id, name,
   *       topics: [{
   *         id, name,
   *         confidence, last_practiced_at,
   *         evaluation_accuracy, gap, status,
   *         avg_time_seconds, pyq_accuracy
   *       }]
   *     }]
   *   }
   *   ```
   * @throws {Error} If the subjects hierarchy query fails
   */
  async getTopicsHierarchy(userId) {
    /* ── Step 1: Fetch the full curriculum tree ──
     * Uses Supabase's nested select syntax to join subjects → chapters → topics
     * in a single query, returning the full hierarchy as nested JSON. */
    // Get full hierarchy
    const { data: subjects, error: sErr } = await supabaseAdmin
      .from('subjects')
      .select('id, name, chapters(id, name, topics(id, name))')
      .order('name');

    if (sErr) throw new Error(sErr.message);

    /* ── Step 2: Fetch latest confidence per topic ──
     * Same descending-order + first-seen pattern as dashboard.service.js Step 2.
     * Here we store the full confidence object (including recorded_at) because
     * getTopicDetail needs the confidence value from the map entry. */
    // Get user's latest confidence per topic
    const { data: confidences } = await supabaseAdmin
      .from('confidence_assessments')
      .select('topic_id, confidence, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });

    // Build map of latest confidence per topic
    const confidenceMap = {};
    if (confidences) {
      for (const c of confidences) {
        if (!confidenceMap[c.topic_id]) {
          confidenceMap[c.topic_id] = c;
        }
      }
    }

    /* ── Step 3: Fetch completed evaluations, extract latest per topic ──
     * Only completed evaluations (ended_at IS NOT NULL) are used for gap
     * computation, since in-progress evaluations have incomplete data. */
    // Get user's evaluations
    const { data: evaluations } = await supabaseAdmin
      .from('evaluations')
      .select('id, topic_id, started_at, ended_at')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false });

    // Get evaluation attempts for latest eval per topic
    const latestEvalByTopic = {};
    if (evaluations) {
      for (const e of evaluations) {
        if (!latestEvalByTopic[e.topic_id]) {
          latestEvalByTopic[e.topic_id] = e;
        }
      }
    }

    /* ── Step 4: Fetch last-practiced dates from practice sessions ──
     * Descending order ensures the first entry per topic_id is the most recent. */
    // Get practice session last practiced dates
    const { data: practiceSessions } = await supabaseAdmin
      .from('practice_sessions')
      .select('topic_id, started_at')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    const lastPracticedMap = {};
    if (practiceSessions) {
      for (const ps of practiceSessions) {
        if (!lastPracticedMap[ps.topic_id]) {
          lastPracticedMap[ps.topic_id] = ps.started_at;
        }
      }
    }

    /* ── Step 5: Annotate the hierarchy tree ──
     * Triple-nested loop walks subject → chapter → topic and mutates each
     * topic node in-place with user-specific data.
     *
     * For topics WITH a latest evaluation: fetches evaluation_attempts and
     * runs computeGapAndStatus() to derive accuracy, gap, and status.
     *
     * For topics WITHOUT evaluation data: sets all eval-derived fields to
     * null with status='INSUFFICIENT_DATA'.
     *
     * NOTE: This is an N+1 query pattern — each topic with eval data triggers
     * an individual query for its evaluation_attempts. This is acceptable here
     * because the hierarchy endpoint is called infrequently and the total
     * number of topics with eval data per user is typically small. */
    // Annotate hierarchy
    for (const subject of subjects) {
      for (const chapter of subject.chapters || []) {
        for (const topic of chapter.topics || []) {
          const conf = confidenceMap[topic.id];
          const latestEval = latestEvalByTopic[topic.id];

          topic.confidence = conf ? conf.confidence : null;
          topic.last_practiced_at = lastPracticedMap[topic.id] || null;

          if (latestEval) {
            const { data: evalAttempts } = await supabaseAdmin
              .from('evaluation_attempts')
              .select('correct, time_spent_seconds, questions(source_type)')
              .eq('evaluation_id', latestEval.id);

            const gapData = computeGapAndStatus(conf?.confidence, evalAttempts);
            Object.assign(topic, gapData);
          } else {
            topic.evaluation_accuracy = null;
            topic.gap = null;
            topic.status = 'INSUFFICIENT_DATA';
            topic.avg_time_seconds = null;
            topic.pyq_accuracy = null;
          }
        }
      }
    }

    return subjects;
  },

  /**
   * Get detailed data for a single topic, including full history.
   *
   * @description Returns a comprehensive view of a single topic for the
   *   topic detail page. Unlike getTopicsHierarchy (which annotates all topics
   *   with summary data), this method provides:
   *   - The topic's metadata with chapter/subject names
   *   - Full chronological confidence history (for trend charts)
   *   - All completed evaluations with per-eval accuracy (for progress tracking)
   *   - Combined practice + eval attempt count
   *   - Computed gap/status from the most recent evaluation
   *
   * @param {string} userId - The authenticated user's UUID
   * @param {string} topicId - The topic's UUID
   * @returns {Promise<Object|null>} Topic detail object, or null if topic
   *   doesn't exist. Shape:
   *   ```
   *   {
   *     topic: {
   *       ...topicFields,
   *       chapters: { name, subjects: { name } },
   *       confidence, questions_attempted, last_practiced_at,
   *       evaluation_accuracy, gap, status, avg_time_seconds,
   *       pyq_accuracy, difficulty_breakdown
   *     },
   *     confidence_history: [
   *       { id, user_id, topic_id, confidence, recorded_at }
   *     ],
   *     evaluation_history: [
   *       { id, started_at, ended_at, duration_seconds,
   *         total_questions, correct_count, accuracy }
   *     ]
   *   }
   *   ```
   */
  async getTopicDetail(userId, topicId) {
    /* ── Fetch topic metadata ──
     * Uses .single() to enforce exactly one result. Returns null if
     * the topic ID doesn't exist (handled as 404 by the controller). */
    // Get topic info
    const { data: topic, error: tErr } = await supabaseAdmin
      .from('topics')
      .select('*, chapters(name, subjects(name))')
      .eq('id', topicId)
      .single();

    if (tErr || !topic) return null;

    /* ── Fetch full confidence history (chronological) ──
     * Ordered ascending for chart rendering — oldest to newest.
     * The latest confidence is extracted from the last array element. */
    // Confidence history
    const { data: confidenceHistory } = await supabaseAdmin
      .from('confidence_assessments')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .order('recorded_at', { ascending: true });

    const latestConfidence = confidenceHistory && confidenceHistory.length > 0
      ? confidenceHistory[confidenceHistory.length - 1]
      : null;

    /* ── Fetch all completed evaluations for this topic ──
     * Ordered newest-first so the first iteration captures the latest
     * eval's attempts for gap computation (latestEvalData). */
    // All evaluations for this topic
    const { data: evaluations } = await supabaseAdmin
      .from('evaluations')
      .select('id, started_at, ended_at, duration_seconds')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false });

    /* ── Build evaluation history with per-eval accuracy ──
     * For each completed evaluation:
     *   1. Fetch its individual attempts (N+1 queries — acceptable for detail view)
     *   2. Compute accuracy as correct/total
     *   3. Capture the latest eval's raw attempts for gap computation
     *
     * latestEvalData is set only once (on the first iteration, which is
     * the newest eval due to descending order). */
    const evalHistory = [];
    let latestEvalData = null;

    if (evaluations) {
      for (const ev of evaluations) {
        const { data: attempts } = await supabaseAdmin
          .from('evaluation_attempts')
          .select('correct, time_spent_seconds, questions(difficulty, source_type)')
          .eq('evaluation_id', ev.id);

        const total = attempts?.length || 0;
        const correct = attempts?.filter(a => a.correct).length || 0;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        evalHistory.push({
          ...ev,
          total_questions: total,
          correct_count: correct,
          accuracy
        });

        if (!latestEvalData && attempts) {
          latestEvalData = attempts;
        }
      }
    }

    /* ── Count total practice attempts ──
     * Two-step query: first get all practice session IDs for this user+topic,
     * then count all attempts across those sessions.
     * Uses { count: 'exact', head: true } for an efficient COUNT-only query
     * (no row data transferred). */
    // Count total practice + evaluation attempts
    const { count: practiceCount } = await supabaseAdmin
      .from('practice_attempts')
      .select('id', { count: 'exact', head: true })
      .in('practice_session_id',
        (await supabaseAdmin
          .from('practice_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('topic_id', topicId)
        ).data?.map(s => s.id) || []
      );

    /* ── Count total evaluation attempts ──
     * Counts across ALL completed evaluations for this topic (not just the latest),
     * contributing to the aggregate questions_attempted stat. */
    const { count: evalAttemptCount } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('id', { count: 'exact', head: true })
      .in('evaluation_id',
        evaluations?.map(e => e.id) || []
      );

    /* ── Compute gap/status from the latest evaluation ──
     * Uses the same computeGapAndStatus() utility as the dashboard service,
     * ensuring consistent gap classification across all views. */
    const gapData = computeGapAndStatus(latestConfidence?.confidence, latestEvalData);

    /* ── Fetch last practice session date ──
     * Separate query with limit(1) for the most recent practice session start.
     * Used for the last_practiced_at field in the response. */
    const { data: lastPractice } = await supabaseAdmin
      .from('practice_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .order('started_at', { ascending: false })
      .limit(1);

    /* ── Assemble and return the response ──
     * Merges topic metadata, computed gap data, aggregate counts,
     * and historical data into a single cohesive response object. */
    return {
      topic: {
        ...topic,
        confidence: latestConfidence?.confidence || null,
        questions_attempted: (practiceCount || 0) + (evalAttemptCount || 0),
        last_practiced_at: lastPractice?.[0]?.started_at || null,
        ...gapData
      },
      confidence_history: confidenceHistory || [],
      evaluation_history: evalHistory
    };
  }
};
