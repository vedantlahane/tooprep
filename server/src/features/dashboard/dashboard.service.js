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

let cachedTopics = null;
let cachedTopicsTime = 0;
const TOPICS_CACHE_TTL = 15 * 60 * 1000; // 15 mins

async function getCachedTopics() {
  const now = Date.now();
  if (cachedTopics && (now - cachedTopicsTime < TOPICS_CACHE_TTL)) {
    return cachedTopics;
  }
  const { data: topics, error: tErr } = await supabaseAdmin
    .from('topics')
    .select('id, name, chapter_id, chapters(id, name, subject_id, subjects(id, name))')
    .order('name');

  if (tErr) throw new Error(tErr.message);
  cachedTopics = topics;
  cachedTopicsTime = now;
  return topics;
}

export const dashboardService = {
  /**
   * Build the full Knowledge Map dashboard for a user.
   * Optimized 2-phase parallel pipeline with in-memory curriculum caching.
   *
   * @param {string} userId - The authenticated user's UUID
   * @returns {Promise<Array<Object>>} Array of topic rows
   */
  async getDashboardData(userId) {
    // ── Phase 1: Parallel fetch of curriculum, confidences, completed evals, practice sessions, questions ──
    const [
      topics,
      { data: allConfidences },
      { data: allEvals },
      { data: practiceSessions },
      { data: qList }
    ] = await Promise.all([
      getCachedTopics(),
      supabaseAdmin
        .from('confidence_assessments')
        .select('topic_id, confidence, recorded_at')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false }),
      supabaseAdmin
        .from('evaluations')
        .select('id, topic_id, started_at')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false }),
      supabaseAdmin
        .from('practice_sessions')
        .select('id, topic_id, started_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false }),
      supabaseAdmin
        .from('questions')
        .select('topic_id, verified')
    ]);

    // 1. Latest confidence per topic
    const confidenceMap = {};
    if (allConfidences) {
      for (const c of allConfidences) {
        if (!confidenceMap[c.topic_id]) {
          confidenceMap[c.topic_id] = c.confidence;
        }
      }
    }

    // 2. Latest evaluation per topic
    const latestEvalIdByTopic = {};
    if (allEvals) {
      for (const e of allEvals) {
        if (!latestEvalIdByTopic[e.topic_id]) {
          latestEvalIdByTopic[e.topic_id] = e.id;
        }
      }
    }

    // 3. Practice sessions mapping
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

    // 4. Questions count mapping
    const availableQuestionsByTopic = {};
    const verifiedQuestionsByTopic = {};
    if (qList) {
      for (const q of qList) {
        if (q.topic_id) {
          availableQuestionsByTopic[q.topic_id] = (availableQuestionsByTopic[q.topic_id] || 0) + 1;
          if (q.verified) {
            verifiedQuestionsByTopic[q.topic_id] = (verifiedQuestionsByTopic[q.topic_id] || 0) + 1;
          }
        }
      }
    }

    const latestEvalIds = Object.values(latestEvalIdByTopic);
    const allSessionIds = practiceSessions?.map(s => s.id) || [];
    const allEvalIds = allEvals?.map(e => e.id) || [];

    // ── Phase 2: Parallel fetch of eval attempts, practice attempts, all eval attempt counts ──
    const [
      { data: evalAttempts },
      { data: practiceAttempts },
      { data: allEvalAttempts }
    ] = await Promise.all([
      latestEvalIds.length > 0
        ? supabaseAdmin
            .from('evaluation_attempts')
            .select('evaluation_id, correct, time_spent_seconds, questions(source_type, difficulty)')
            .in('evaluation_id', latestEvalIds)
        : Promise.resolve({ data: [] }),
      allSessionIds.length > 0
        ? supabaseAdmin
            .from('practice_attempts')
            .select('practice_session_id')
            .in('practice_session_id', allSessionIds)
        : Promise.resolve({ data: [] }),
      allEvalIds.length > 0
        ? supabaseAdmin
            .from('evaluation_attempts')
            .select('evaluation_id')
            .in('evaluation_id', allEvalIds)
        : Promise.resolve({ data: [] })
    ]);

    // Build evalAttemptsMap for gap computation
    const evalAttemptsMap = {};
    if (evalAttempts) {
      for (const a of evalAttempts) {
        if (!evalAttemptsMap[a.evaluation_id]) {
          evalAttemptsMap[a.evaluation_id] = [];
        }
        evalAttemptsMap[a.evaluation_id].push(a);
      }
    }

    // Build practice attempt counts
    const practiceAttemptCountBySession = {};
    if (practiceAttempts) {
      for (const pa of practiceAttempts) {
        practiceAttemptCountBySession[pa.practice_session_id] =
          (practiceAttemptCountBySession[pa.practice_session_id] || 0) + 1;
      }
    }

    // Count all eval attempts per topic
    const evalAttemptCountByTopic = {};
    if (allEvalAttempts && allEvals) {
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

    /* ════════════════════════════════════════════════════════════════════
     * STEP 8: Assemble final response rows
     * ════════════════════════════════════════════════════════════════════
     * Merges data from all preceding steps into a flat array of topic rows.
     * For each topic:
     *   - Look up confidence from confidenceMap (Step 2)
     *   - Look up latest eval attempts from evalAttemptsMap (Steps 3+4)
     *   - Compute gap & status via computeGapAndStatus()
     *   - Look up available question counts from question bank (Step 7b)
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
        questions_available: availableQuestionsByTopic[topic.id] || 0,
        verified_questions_count: verifiedQuestionsByTopic[topic.id] || 0,
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
