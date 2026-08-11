import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { computeGapAndStatus } from './dashboard.js';

const router = Router();

// GET /api/topics — hierarchy with user annotations
router.get('/', async (req, res) => {
  try {
    // Get full hierarchy
    const { data: subjects, error: sErr } = await supabaseAdmin
      .from('subjects')
      .select('id, name, chapters(id, name, topics(id, name))')
      .order('name');

    if (sErr) return res.status(500).json({ error: sErr.message });

    // Get user's latest confidence per topic
    const { data: confidences } = await supabaseAdmin
      .from('confidence_assessments')
      .select('topic_id, confidence, recorded_at')
      .eq('user_id', req.user.id)
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

    // Get user's evaluations
    const { data: evaluations } = await supabaseAdmin
      .from('evaluations')
      .select('id, topic_id, started_at, ended_at')
      .eq('user_id', req.user.id)
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

    // Get practice session last practiced dates
    const { data: practiceSessions } = await supabaseAdmin
      .from('practice_sessions')
      .select('topic_id, started_at')
      .eq('user_id', req.user.id)
      .order('started_at', { ascending: false });

    const lastPracticedMap = {};
    if (practiceSessions) {
      for (const ps of practiceSessions) {
        if (!lastPracticedMap[ps.topic_id]) {
          lastPracticedMap[ps.topic_id] = ps.started_at;
        }
      }
    }

    // Annotate hierarchy
    for (const subject of subjects) {
      for (const chapter of subject.chapters || []) {
        for (const topic of chapter.topics || []) {
          const conf = confidenceMap[topic.id];
          const latestEval = latestEvalByTopic[topic.id];

          topic.confidence = conf ? conf.confidence : null;
          topic.last_practiced_at = lastPracticedMap[topic.id] || null;

          if (latestEval) {
            // Get attempts for latest evaluation
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

    return res.json(subjects);
  } catch (err) {
    console.error('GET /topics error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/topics/:id — topic detail
router.get('/:id', async (req, res) => {
  try {
    const topicId = req.params.id;

    // Get topic info
    const { data: topic, error: tErr } = await supabaseAdmin
      .from('topics')
      .select('*, chapters(name, subjects(name))')
      .eq('id', topicId)
      .single();

    if (tErr || !topic) return res.status(404).json({ error: 'Topic not found' });

    // Confidence history
    const { data: confidenceHistory } = await supabaseAdmin
      .from('confidence_assessments')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('topic_id', topicId)
      .order('recorded_at', { ascending: true });

    // Latest confidence
    const latestConfidence = confidenceHistory && confidenceHistory.length > 0
      ? confidenceHistory[confidenceHistory.length - 1]
      : null;

    // All evaluations for this topic
    const { data: evaluations } = await supabaseAdmin
      .from('evaluations')
      .select('id, started_at, ended_at, duration_seconds')
      .eq('user_id', req.user.id)
      .eq('topic_id', topicId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false });

    // Evaluation history with accuracy
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

    // Count total practice + evaluation attempts
    const { count: practiceCount } = await supabaseAdmin
      .from('practice_attempts')
      .select('id', { count: 'exact', head: true })
      .in('practice_session_id',
        (await supabaseAdmin
          .from('practice_sessions')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('topic_id', topicId)
        ).data?.map(s => s.id) || []
      );

    const { count: evalAttemptCount } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('id', { count: 'exact', head: true })
      .in('evaluation_id',
        evaluations?.map(e => e.id) || []
      );

    // Compute gap
    const gapData = computeGapAndStatus(latestConfidence?.confidence, latestEvalData);

    // Last practiced
    const { data: lastPractice } = await supabaseAdmin
      .from('practice_sessions')
      .select('started_at')
      .eq('user_id', req.user.id)
      .eq('topic_id', topicId)
      .order('started_at', { ascending: false })
      .limit(1);

    return res.json({
      topic: {
        ...topic,
        confidence: latestConfidence?.confidence || null,
        questions_attempted: (practiceCount || 0) + (evalAttemptCount || 0),
        last_practiced_at: lastPractice?.[0]?.started_at || null,
        ...gapData
      },
      confidence_history: confidenceHistory || [],
      evaluation_history: evalHistory
    });
  } catch (err) {
    console.error('GET /topics/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
