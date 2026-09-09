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
    // ── Phase 1: Parallel fetch of curriculum, confidences, evaluations, practice, questions ──
    const [
      subjectsRaw,
      { data: confidences },
      { data: evaluations },
      { data: practiceSessions },
      { data: qList }
    ] = await Promise.all([
      getCurriculumTree(),
      supabaseAdmin
        .from('confidence_assessments')
        .select('topic_id, confidence, recorded_at')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false }),
      supabaseAdmin
        .from('evaluations')
        .select('id, topic_id, started_at, ended_at')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false }),
      supabaseAdmin
        .from('practice_sessions')
        .select('topic_id, started_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false }),
      supabaseAdmin
        .from('questions')
        .select('topic_id')
    ]);

    // Deep clone subjects so user-specific annotations don't pollute the cached tree
    const subjects = JSON.parse(JSON.stringify(subjectsRaw));

    // Map latest confidence per topic
    const confidenceMap = {};
    if (confidences) {
      for (const c of confidences) {
        if (!confidenceMap[c.topic_id]) {
          confidenceMap[c.topic_id] = c;
        }
      }
    }

    // Map latest evaluation per topic
    const latestEvalByTopic = {};
    if (evaluations) {
      for (const e of evaluations) {
        if (!latestEvalByTopic[e.topic_id]) {
          latestEvalByTopic[e.topic_id] = e;
        }
      }
    }

    // Map last practiced per topic
    const lastPracticedMap = {};
    if (practiceSessions) {
      for (const ps of practiceSessions) {
        if (!lastPracticedMap[ps.topic_id]) {
          lastPracticedMap[ps.topic_id] = ps.started_at;
        }
      }
    }

    // Available questions count per topic
    const availableQuestionsMap = {};
    if (qList) {
      for (const q of qList) {
        if (q.topic_id) {
          availableQuestionsMap[q.topic_id] = (availableQuestionsMap[q.topic_id] || 0) + 1;
        }
      }
    }

    // ── Phase 2: Batch fetch ALL evaluation attempts in ONE query (ELIMINATES N+1 LOOP) ──
    const latestEvalIds = Object.values(latestEvalByTopic).map(e => e.id);
    const evalAttemptsMap = {};
    if (latestEvalIds.length > 0) {
      const { data: allEvalAttempts } = await supabaseAdmin
        .from('evaluation_attempts')
        .select('evaluation_id, correct, time_spent_seconds, questions(source_type)')
        .in('evaluation_id', latestEvalIds);

      if (allEvalAttempts) {
        for (const a of allEvalAttempts) {
          if (!evalAttemptsMap[a.evaluation_id]) {
            evalAttemptsMap[a.evaluation_id] = [];
          }
          evalAttemptsMap[a.evaluation_id].push(a);
        }
      }
    }

    // ── Phase 3: Synchronously annotate hierarchy tree in memory (0ms) ──
    for (const subject of subjects) {
      for (const chapter of subject.chapters || []) {
        for (const topic of chapter.topics || []) {
          const conf = confidenceMap[topic.id];
          const latestEval = latestEvalByTopic[topic.id];

          topic.confidence = conf ? conf.confidence : null;
          topic.last_practiced_at = lastPracticedMap[topic.id] || null;
          topic.questions_available = availableQuestionsMap[topic.id] || 0;
          topic.question_count = availableQuestionsMap[topic.id] || 0;

          if (latestEval) {
            const evalAttempts = evalAttemptsMap[latestEval.id] || [];
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
   * High performance: parallelized queries and batched attempt aggregation.
   *
   * @param {string} userId - The authenticated user's UUID
   * @param {string} topicId - The topic UUID
   * @returns {Promise<Object|null>} Detailed topic object or null
   */
  async getTopicDetail(userId, topicId) {
    // ── Phase 1: Parallel fetch of topic info, confidence history, evaluations, practice sessions, questions count ──
    const [
      { data: topic, error: tErr },
      { data: confidenceHistory },
      { data: evaluations },
      { data: practiceSessions },
      { count: availableCount }
    ] = await Promise.all([
      supabaseAdmin
        .from('topics')
        .select('*, chapters(id, name, subjects(id, name))')
        .eq('id', topicId)
        .single(),
      supabaseAdmin
        .from('confidence_assessments')
        .select('*')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .order('recorded_at', { ascending: true }),
      supabaseAdmin
        .from('evaluations')
        .select('id, started_at, ended_at, duration_seconds')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false }),
      supabaseAdmin
        .from('practice_sessions')
        .select('id, started_at')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .order('started_at', { ascending: false }),
      supabaseAdmin
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId)
    ]);

    if (tErr || !topic) return null;

    const latestConfidence = confidenceHistory && confidenceHistory.length > 0
      ? confidenceHistory[confidenceHistory.length - 1]
      : null;

    const evalIds = evaluations?.map(e => e.id) || [];
    const practiceSessionIds = practiceSessions?.map(s => s.id) || [];

    // ── Phase 2: Parallel fetch of siblings, all evaluation attempts, and practice attempts count ──
    const [
      { data: siblingTopics },
      { data: allEvalAttempts },
      practiceCountRes
    ] = await Promise.all([
      supabaseAdmin
        .from('topics')
        .select('id, name')
        .eq('chapter_id', topic.chapter_id)
        .order('name'),
      evalIds.length > 0
        ? supabaseAdmin
            .from('evaluation_attempts')
            .select('evaluation_id, correct, time_spent_seconds, questions(difficulty, source_type)')
            .in('evaluation_id', evalIds)
        : Promise.resolve({ data: [] }),
      practiceSessionIds.length > 0
        ? supabaseAdmin
            .from('practice_attempts')
            .select('id', { count: 'exact', head: true })
            .in('practice_session_id', practiceSessionIds)
        : Promise.resolve({ count: 0 })
    ]);

    // Compute sibling navigation
    let prevTopic = null;
    let nextTopic = null;
    if (siblingTopics && siblingTopics.length > 0) {
      const idx = siblingTopics.findIndex(s => s.id === topicId);
      if (idx > 0) prevTopic = siblingTopics[idx - 1];
      if (idx !== -1 && idx < siblingTopics.length - 1) nextTopic = siblingTopics[idx + 1];
    }

    // Group eval attempts by evaluation_id in memory
    const attemptsByEval = {};
    if (allEvalAttempts) {
      for (const att of allEvalAttempts) {
        if (!attemptsByEval[att.evaluation_id]) {
          attemptsByEval[att.evaluation_id] = [];
        }
        attemptsByEval[att.evaluation_id].push(att);
      }
    }

    // Assemble evaluation history
    const evalHistory = [];
    let latestEvalData = null;
    if (evaluations) {
      for (const ev of evaluations) {
        const attempts = attemptsByEval[ev.id] || [];
        const total = attempts.length;
        const correct = attempts.filter(a => a.correct).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        evalHistory.push({
          ...ev,
          total_questions: total,
          correct_count: correct,
          accuracy
        });

        if (!latestEvalData && attempts.length > 0) {
          latestEvalData = attempts;
        }
      }
    }

    const gapData = computeGapAndStatus(latestConfidence?.confidence, latestEvalData);
    const lastPracticedAt = practiceSessions?.[0]?.started_at || null;
    const practiceCount = practiceCountRes?.count || 0;
    const evalAttemptCount = allEvalAttempts?.length || 0;

    /* ── Assemble and return the response ──
     * Merges topic metadata, computed gap data, aggregate counts,
     * and historical data into a single cohesive response object. */
    return {
      topic: {
        ...topic,
        confidence: latestConfidence?.confidence || null,
        question_count: availableCount || 0,
        questions_available: availableCount || 0,
        questions_attempted: (practiceCount || 0) + (evalAttemptCount || 0),
        last_practiced_at: lastPracticedAt,
        ...gapData
      },
      confidence_history: confidenceHistory || [],
      evaluation_history: evalHistory,
      chapter_topics: siblingTopics || [],
      prev_topic: prevTopic,
      next_topic: nextTopic
    };
  }
};
