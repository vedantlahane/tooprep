/***
 * ============================================================================
 * Module:  dashboard.service.js
 * Feature: Dashboard — Knowledge Map
 * Layer:   Service (Business Logic & Data Access)
 * ============================================================================
 *
 * Service layer for the Knowledge Map dashboard. This module is responsible
 * for all database access and business logic related to building the
 * dashboard view.
 *
 * Contains two public methods:
 *
 *   getDashboardData(userId)
 *     Executes an 8-step sequential data assembly pipeline to build the
 *     full Knowledge Map. Each step fetches a specific slice of data from
 *     Supabase, and the final step merges everything into a flat array of
 *     topic rows annotated with confidence, gap, status, and practice stats.
 *
 *   getBiggestGap(userId)
 *     Scans all topics with sufficient data (≥5 eval attempts + confidence
 *     rating) and returns the single topic with the largest absolute gap.
 *
 * Data Assembly Pipeline (getDashboardData):
 *   Step 1 — Fetch all topics with chapter/subject hierarchy
 *   Step 2 — Fetch latest confidence rating per topic for this user
 *   Step 3 — Fetch all completed evaluations, extract latest eval per topic
 *   Step 4 — Fetch evaluation attempts for those latest evals (for gap calc)
 *   Step 5 — Fetch practice sessions, extract last-practiced dates
 *   Step 6 — Fetch practice attempt counts per session
 *   Step 7 — Count total eval attempts per topic (across all evals, not just latest)
 *   Step 8 — Assemble final rows: merge all maps, compute gaps, sort by priority
 *
 * Sorting Rationale:
 *   Rows are sorted by status priority so the frontend's default view shows
 *   the most actionable topics first:
 *     OVERCONFIDENT (0) → WEAK_ALIGNED (1) → PRELIMINARY (2) →
 *     INSUFFICIENT_DATA (3) → UNDERCONFIDENT (4) → ALIGNED (5)
 *
 *   OVERCONFIDENT is highest priority because students who think they know
 *   more than they do are at the greatest risk in exams. ALIGNED is last
 *   because those topics need the least attention.
 *
 * Architecture:
 *   Controller (dashboard.controller.js) → Service (this file) →
 *   Supabase DB + Utils (dashboard.utils.js)
 *
 * ============================================================================
 ***/

/* Supabase admin client — uses service-role key for unrestricted DB access */
import { supabaseAdmin } from '../../lib/supabase.js';
/* Pure utility for gap computation — no side effects, shared with topics.service */
import { computeGapAndStatus } from './dashboard.utils.js';

export const dashboardService = {
  /**
   * Build the full Knowledge Map dashboard for a user.
   *
   * @description Executes an 8-step sequential pipeline that queries Supabase
   *   for topics, confidence ratings, evaluations, eval attempts, practice
   *   sessions, and practice attempts, then merges everything into a flat
   *   array of annotated topic rows sorted by action priority.
   *
   * @param {string} userId - The authenticated user's UUID
   * @returns {Promise<Array<Object>>} Array of topic rows, each containing:
   *   - topic_id, topic_name, chapter_name, subject_name, subject_id
   *   - confidence (1–10 or null)
   *   - evaluation_accuracy, gap, status (from computeGapAndStatus)
   *   - avg_time_seconds, pyq_accuracy, difficulty_breakdown
   *   - questions_attempted (practice + eval combined)
   *   - last_practiced_at (most recent of practice session or evaluation)
   * @throws {Error} If the initial topics query fails (other query failures
   *   are handled gracefully with empty/null fallbacks)
   */
  async getDashboardData(userId) {
    /* ════════════════════════════════════════════════════════════════════
     * STEP 1: Fetch all topics with hierarchy metadata
     * ════════════════════════════════════════════════════════════════════
     * Query joins through the foreign keys: topics → chapters → subjects
     * to get the full navigation breadcrumb for each topic.
     * This is the only query that throws on error, since the entire
     * dashboard is meaningless without the topic list. */
    // 1. Get all topics with hierarchy
    const { data: topics, error: tErr } = await supabaseAdmin
      .from('topics')
      .select('id, name, chapter_id, chapters(id, name, subject_id, subjects(id, name))')
      .order('name');

    if (tErr) throw new Error(tErr.message);

    /* ════════════════════════════════════════════════════════════════════
     * STEP 2: Fetch latest confidence per topic
     * ════════════════════════════════════════════════════════════════════
     * Confidence assessments are ordered newest-first. We iterate once
     * and keep only the first (most recent) entry per topic_id — this
     * is more efficient than a GROUP BY + MAX subquery in Supabase's
     * PostgREST API, which doesn't support window functions. */
    // 2. Get latest confidence per topic for this user
    const { data: allConfidences } = await supabaseAdmin
      .from('confidence_assessments')
      .select('topic_id, confidence, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });

    const confidenceMap = {};
    if (allConfidences) {
      for (const c of allConfidences) {
        if (!confidenceMap[c.topic_id]) {
          confidenceMap[c.topic_id] = c.confidence;
        }
      }
    }

    /* ════════════════════════════════════════════════════════════════════
     * STEP 3: Fetch completed evaluations, extract latest per topic
     * ════════════════════════════════════════════════════════════════════
     * Only completed evaluations (ended_at IS NOT NULL) are considered —
     * in-progress evaluations would give incomplete accuracy data.
     * Ordered newest-first so the first-seen per topic_id is the latest. */
    // 3. Get all completed evaluations for this user
    const { data: allEvals } = await supabaseAdmin
      .from('evaluations')
      .select('id, topic_id, started_at')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false });

    /* Build a map of topic_id → latest evaluation ID.
     * The gap is always computed against the most recent evaluation only,
     * giving students credit for improvement over time. */
    // Build latest eval ID per topic
    const latestEvalIdByTopic = {};
    if (allEvals) {
      for (const e of allEvals) {
        if (!latestEvalIdByTopic[e.topic_id]) {
          latestEvalIdByTopic[e.topic_id] = e.id;
        }
      }
    }

    /* ════════════════════════════════════════════════════════════════════
     * STEP 4: Fetch evaluation attempts for the latest evaluations
     * ════════════════════════════════════════════════════════════════════
     * These attempts are the raw data fed into computeGapAndStatus().
     * Joins to the `questions` table to get source_type and difficulty
     * metadata needed for PYQ accuracy and difficulty breakdown.
     *
     * Uses `.in()` to batch-fetch all attempts in a single query rather
     * than N+1 queries per topic. Results are grouped into a map keyed
     * by evaluation_id. */
    // 4. Get all evaluation attempts for latest evals
    const latestEvalIds = Object.values(latestEvalIdByTopic);
    let evalAttemptsMap = {};
    if (latestEvalIds.length > 0) {
      const { data: evalAttempts } = await supabaseAdmin
        .from('evaluation_attempts')
        .select('evaluation_id, correct, time_spent_seconds, questions(source_type, difficulty)')
        .in('evaluation_id', latestEvalIds);

      if (evalAttempts) {
        for (const a of evalAttempts) {
          if (!evalAttemptsMap[a.evaluation_id]) {
            evalAttemptsMap[a.evaluation_id] = [];
          }
          evalAttemptsMap[a.evaluation_id].push(a);
        }
      }
    }

    /* ════════════════════════════════════════════════════════════════════
     * STEP 5: Fetch practice sessions — last practiced dates & session IDs
     * ════════════════════════════════════════════════════════════════════
     * Practice sessions contribute to:
     *   1. `last_practiced_at` — showing when the student last engaged
     *   2. `questions_attempted` — combined count of practice + eval attempts
     *
     * Two maps are built:
     *   lastPracticedMap  — topic_id → most recent started_at
     *   sessionIdsByTopic — topic_id → [session_id, ...] (for attempt counting) */
    // 5. Get practice session counts per topic
    const { data: practiceSessions } = await supabaseAdmin
      .from('practice_sessions')
      .select('id, topic_id, started_at')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    // Last practiced per topic
    const lastPracticedMap = {};
    const sessionIdsByTopic = {};
    if (practiceSessions) {
      for (const ps of practiceSessions) {
        if (!lastPracticedMap[ps.topic_id]) {
          lastPracticedMap[ps.topic_id] = ps.started_at;
        }
        if (!sessionIdsByTopic[ps.topic_id]) {
          sessionIdsByTopic[ps.topic_id] = [];
        }
        sessionIdsByTopic[ps.topic_id].push(ps.id);
      }
    }

    /* ════════════════════════════════════════════════════════════════════
     * STEP 6: Fetch practice attempt counts per session
     * ════════════════════════════════════════════════════════════════════
     * We only need the count, not the attempt data itself. However,
     * Supabase's PostgREST `.select('id', { count: 'exact' })` with
     * `.in()` returns a single aggregate count, not per-session counts.
     * So we fetch the session IDs and count client-side. */
    // 6. Get all practice attempt counts per session
    const allSessionIds = practiceSessions?.map(s => s.id) || [];
    let practiceAttemptCountBySession = {};
    if (allSessionIds.length > 0) {
      const { data: practiceAttempts } = await supabaseAdmin
        .from('practice_attempts')
        .select('practice_session_id')
        .in('practice_session_id', allSessionIds);

      if (practiceAttempts) {
        for (const pa of practiceAttempts) {
          practiceAttemptCountBySession[pa.practice_session_id] =
            (practiceAttemptCountBySession[pa.practice_session_id] || 0) + 1;
        }
      }
    }

    /* ════════════════════════════════════════════════════════════════════
     * STEP 7: Count evaluation attempts per topic (across ALL evaluations)
     * ════════════════════════════════════════════════════════════════════
     * Unlike Step 4 (which only fetches attempts for the *latest* eval
     * per topic for gap calculation), this step counts attempts across
     * ALL completed evaluations — used for the `questions_attempted`
     * aggregate stat on the dashboard.
     *
     * Requires a reverse lookup map (evalToTopic) to attribute each
     * attempt back to its topic, since evaluation_attempts only
     * reference evaluation_id, not topic_id directly. */
    // 7. Count eval attempts per topic
    let evalAttemptCountByTopic = {};
    if (allEvals && allEvals.length > 0) {
      const allEvalIds = allEvals.map(e => e.id);
      const { data: allEvalAttempts } = await supabaseAdmin
        .from('evaluation_attempts')
        .select('evaluation_id')
        .in('evaluation_id', allEvalIds);

      if (allEvalAttempts) {
        const evalToTopic = {};
        for (const e of allEvals) {
          evalToTopic[e.id] = e.topic_id;
        }
        for (const a of allEvalAttempts) {
          const topicId = evalToTopic[a.evaluation_id];
          if (topicId) {
            evalAttemptCountByTopic[topicId] = (evalAttemptCountByTopic[topicId] || 0) + 1;
          }
        }
      }
    }

    /* ════════════════════════════════════════════════════════════════════
     * STEP 8: Assemble final response rows
     * ════════════════════════════════════════════════════════════════════
     * Merges data from all 7 preceding steps into a flat array of topic rows.
     * For each topic:
     *   - Look up confidence from confidenceMap (Step 2)
     *   - Look up latest eval attempts from evalAttemptsMap (Steps 3+4)
     *   - Compute gap & status via computeGapAndStatus()
     *   - Sum practice + eval attempt counts (Steps 6+7)
     *   - Determine last_practiced_at as the more recent of:
     *     practice session start or evaluation start (whichever is later) */
    // 8. Build response
    const rows = topics.map(topic => {
      const confidence = confidenceMap[topic.id] || null;
      const latestEvalId = latestEvalIdByTopic[topic.id];
      const evalAttempts = latestEvalId ? evalAttemptsMap[latestEvalId] || [] : [];

      const gapData = computeGapAndStatus(confidence, evalAttempts);

      const topicSessionIds = sessionIdsByTopic[topic.id] || [];
      const practiceAttemptCount = topicSessionIds.reduce((sum, sid) =>
        sum + (practiceAttemptCountBySession[sid] || 0), 0);

      const evalAttemptCount = evalAttemptCountByTopic[topic.id] || 0;

      /* Determine last_practiced_at: take the more recent timestamp
       * between the latest practice session and the latest evaluation.
       * Evaluations count as "practice" for recency purposes. */
      let lastPracticed = lastPracticedMap[topic.id] || null;
      if (allEvals) {
        const latestEval = allEvals.find(e => e.topic_id === topic.id);
        if (latestEval && (!lastPracticed || latestEval.started_at > lastPracticed)) {
          lastPracticed = latestEval.started_at;
        }
      }

      return {
        topic_id: topic.id,
        topic_name: topic.name,
        chapter_name: topic.chapters?.name,
        subject_name: topic.chapters?.subjects?.name,
        subject_id: topic.chapters?.subjects?.id,
        confidence,
        questions_attempted: practiceAttemptCount + evalAttemptCount,
        last_practiced_at: lastPracticed,
        ...gapData
      };
    });

    /* ── Sort by status priority ──
     * The status priority ordering is intentionally designed to surface
     * the most "dangerous" gaps first:
     *
     *   0 — OVERCONFIDENT:     Highest risk — student will be blindsided on exam
     *   1 — WEAK_ALIGNED:      Aligned but performing poorly — needs work
     *   2 — PRELIMINARY:       Early data, worth monitoring
     *   3 — INSUFFICIENT_DATA: Not enough info to act on
     *   4 — UNDERCONFIDENT:    Low risk — student is better than they think
     *   5 — ALIGNED:           Healthy — no action needed
     *
     * Unknown statuses fall to position 99 (defensive). */
    // Default sort: weakest/most-overconfident first
    rows.sort((a, b) => {
      const statusOrder = {
        'OVERCONFIDENT': 0,
        'WEAK_ALIGNED': 1,
        'PRELIMINARY': 2,
        'INSUFFICIENT_DATA': 3,
        'UNDERCONFIDENT': 4,
        'ALIGNED': 5
      };
      return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    });

    return rows;
  },

  /**
   * Find the topic with the largest absolute confidence-performance gap.
   *
   * @description Iterates over all topics that have both a confidence rating
   *   and a completed evaluation with ≥5 attempts, computes the gap for each,
   *   and returns the topic with the largest |gap|.
   *
   *   This is an N+1 query pattern (one query per topic for attempts), which
   *   is acceptable here because:
   *   1. It's called infrequently (insights endpoint, not main dashboard)
   *   2. The number of topics with sufficient data is typically small
   *   3. It only fetches topic metadata for the current winner, not all topics
   *
   * @param {string} userId - The authenticated user's UUID
   * @returns {Promise<Object|null>} The topic with the biggest gap, containing:
   *   - id, name, chapters.name, chapters.subjects.name (topic metadata)
   *   - confidence (1–10)
   *   - evaluation_accuracy, gap, status, avg_time_seconds, pyq_accuracy,
   *     difficulty_breakdown (from computeGapAndStatus)
   *   Returns null if no topics have sufficient data (< 5 attempts or no
   *   confidence rating).
   */
  async getBiggestGap(userId) {
    /* Fetch all confidence ratings for this user (newest first) */
    const { data: allConfidences } = await supabaseAdmin
      .from('confidence_assessments')
      .select('topic_id, confidence, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });

    /* Build latest-confidence-per-topic map (same pattern as getDashboardData Step 2) */
    const confidenceMap = {};
    if (allConfidences) {
      for (const c of allConfidences) {
        if (!confidenceMap[c.topic_id]) confidenceMap[c.topic_id] = c.confidence;
      }
    }

    /* Fetch completed evaluations and extract the latest per topic */
    const { data: allEvals } = await supabaseAdmin
      .from('evaluations')
      .select('id, topic_id, started_at')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false });

    const latestEvalByTopic = {};
    if (allEvals) {
      for (const e of allEvals) {
        if (!latestEvalByTopic[e.topic_id]) latestEvalByTopic[e.topic_id] = e;
      }
    }

    /* ── Iterate candidates and track the winner ──
     * For each topic with both confidence + eval data:
     *   1. Fetch the attempt details for the latest evaluation
     *   2. Skip if fewer than 5 attempts (insufficient data threshold)
     *   3. Compute gap and compare absolute value to current best
     *   4. If this is the new winner, fetch full topic metadata
     *
     * The topic metadata query (subjects/chapters join) is only executed
     * when a new winner is found, avoiding unnecessary joins for losers. */
    let biggestGapTopic = null;
    let biggestGap = -1;

    for (const [topicId, evalData] of Object.entries(latestEvalByTopic)) {
      const confidence = confidenceMap[topicId];
      if (!confidence) continue;

      const { data: attempts } = await supabaseAdmin
        .from('evaluation_attempts')
        .select('correct, time_spent_seconds, questions(source_type, difficulty)')
        .eq('evaluation_id', evalData.id);

      if (!attempts || attempts.length < 5) continue;

      const gapData = computeGapAndStatus(confidence, attempts);
      const absGap = Math.abs(gapData.gap || 0);

      if (absGap > biggestGap) {
        biggestGap = absGap;

        const { data: topic } = await supabaseAdmin
          .from('topics')
          .select('id, name, chapters(name, subjects(name))')
          .eq('id', topicId)
          .single();

        biggestGapTopic = {
          ...topic,
          confidence,
          ...gapData
        };
      }
    }

    return biggestGapTopic;
  }
};
