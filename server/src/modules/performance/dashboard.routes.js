import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

/**
 * Compute gap and status from confidence and evaluation attempts.
 * Exported for reuse in topics.js.
 *
 * @param {number|null} confidence - Latest confidence rating (1-10)
 * @param {Array|null} evalAttempts - Array of { correct, time_spent_seconds, questions: { source_type, difficulty } }
 * @returns {Object} - { evaluation_accuracy, gap, status, avg_time_seconds, pyq_accuracy, difficulty_breakdown }
 */
export function computeGapAndStatus(confidence, evalAttempts) {
  if (!evalAttempts || evalAttempts.length === 0) {
    return {
      evaluation_accuracy: null,
      gap: null,
      status: 'INSUFFICIENT_DATA',
      avg_time_seconds: null,
      pyq_accuracy: null,
      difficulty_breakdown: null
    };
  }

  const total = evalAttempts.length;
  const answered = evalAttempts.filter(a => a.correct !== null).length;
  const correct = evalAttempts.filter(a => a.correct === true).length;
  const performance = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  // Time metrics
  const avgTime = total > 0
    ? Math.round(evalAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / total)
    : null;

  // PYQ accuracy
  const pyqAttempts = evalAttempts.filter(a => a.questions?.source_type === 'PYQ');
  const pyqCorrect = pyqAttempts.filter(a => a.correct === true).length;
  const pyqAccuracy = pyqAttempts.length > 0 ? Math.round((pyqCorrect / pyqAttempts.length) * 100) : null;

  // Difficulty breakdown
  const diffBreakdown = {};
  for (const diff of ['easy', 'medium', 'hard']) {
    const diffAttempts = evalAttempts.filter(a => a.questions?.difficulty === diff);
    const diffCorrect = diffAttempts.filter(a => a.correct === true).length;
    diffBreakdown[diff] = {
      total: diffAttempts.length,
      correct: diffCorrect,
      accuracy: diffAttempts.length > 0 ? Math.round((diffCorrect / diffAttempts.length) * 100) : null
    };
  }

  // Gap calculation per §5.1
  let gap = null;
  let status = 'INSUFFICIENT_DATA';

  if (confidence !== null && confidence !== undefined) {
    const confidencePercentage = (confidence / 10) * 100;
    gap = performance - confidencePercentage;

    // Classification per §5.2
    if (total < 5) {
      status = 'INSUFFICIENT_DATA';
      gap = null; // Don't show gap with insufficient data
    } else if (total < 10) {
      status = 'PRELIMINARY';
    } else {
      if (gap >= 20) {
        status = 'UNDERCONFIDENT';
      } else if (gap <= -20) {
        status = 'OVERCONFIDENT';
      } else {
        // Check for weak-but-aligned
        if (performance < 50) {
          status = 'WEAK_ALIGNED';
        } else {
          status = 'ALIGNED';
        }
      }
    }
  }

  return {
    evaluation_accuracy: performance,
    gap,
    status,
    avg_time_seconds: avgTime,
    pyq_accuracy: pyqAccuracy,
    difficulty_breakdown: diffBreakdown
  };
}

// GET /api/dashboard — full knowledge map
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get all topics with hierarchy
    const { data: topics, error: tErr } = await supabaseAdmin
      .from('topics')
      .select('id, name, chapter_id, chapters(id, name, subject_id, subjects(id, name))')
      .order('name');

    if (tErr) return res.status(500).json({ error: tErr.message });

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
        // Map eval_id back to topic_id
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

      // Practice attempts for this topic
      const topicSessionIds = sessionIdsByTopic[topic.id] || [];
      const practiceAttemptCount = topicSessionIds.reduce((sum, sid) =>
        sum + (practiceAttemptCountBySession[sid] || 0), 0);

      const evalAttemptCount = evalAttemptCountByTopic[topic.id] || 0;

      // Also consider last eval as last practiced
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

    return res.json(rows);
  } catch (err) {
    console.error('GET /dashboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/insights/biggest-gap
router.get('/insights/biggest-gap', async (req, res) => {
  try {
    // Reuse dashboard logic but just return the single topic with largest |gap|
    // For efficiency, we'll do a simplified version
    const userId = req.user.id;

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

      if (!attempts || attempts.length < 5) continue; // Need minimum sample

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

    if (!biggestGapTopic) {
      return res.json({ message: 'No topics with sufficient data to compute gaps' });
    }

    return res.json(biggestGapTopic);
  } catch (err) {
    console.error('GET /insights/biggest-gap error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
