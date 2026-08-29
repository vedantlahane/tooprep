import { supabaseAdmin } from '../../lib/supabase.js';
import { computeGapAndStatus } from './dashboard.utils.js';

export const dashboardService = {
  async getDashboardData(userId) {
    // 1. Get all topics with hierarchy
    const { data: topics, error: tErr } = await supabaseAdmin
      .from('topics')
      .select('id, name, chapter_id, chapters(id, name, subject_id, subjects(id, name))')
      .order('name');

    if (tErr) throw new Error(tErr.message);

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

    // 3. Get all completed evaluations for this user
    const { data: allEvals } = await supabaseAdmin
      .from('evaluations')
      .select('id, topic_id, started_at')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false });

    // Build latest eval ID per topic
    const latestEvalIdByTopic = {};
    if (allEvals) {
      for (const e of allEvals) {
        if (!latestEvalIdByTopic[e.topic_id]) {
          latestEvalIdByTopic[e.topic_id] = e.id;
        }
      }
    }

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

  async getBiggestGap(userId) {
    const { data: allConfidences } = await supabaseAdmin
      .from('confidence_assessments')
      .select('topic_id, confidence, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });

    const confidenceMap = {};
    if (allConfidences) {
      for (const c of allConfidences) {
        if (!confidenceMap[c.topic_id]) confidenceMap[c.topic_id] = c.confidence;
      }
    }

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
