import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// POST /api/practice-sessions — create session, select questions
router.post('/', async (req, res) => {
  try {
    const { topic_id, question_count = 15 } = req.body;

    if (!topic_id) {
      return res.status(400).json({ error: 'topic_id is required' });
    }

    // Fetch verified questions for this topic
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, difficulty, source_type')
      .eq('topic_id', topic_id)
      .eq('verified', true);

    if (qErr) return res.status(500).json({ error: qErr.message });
    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: 'No verified questions available for this topic' });
    }

    // Shuffle and pick up to question_count
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(question_count, shuffled.length));

    // Create session
    const { data: session, error: sErr } = await supabaseAdmin
      .from('practice_sessions')
      .insert({
        user_id: req.user.id,
        topic_id
      })
      .select()
      .single();

    if (sErr) return res.status(500).json({ error: sErr.message });

    // Fetch full question data for selected questions
    const { data: fullQuestions, error: fqErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .in('id', selected.map(q => q.id));

    if (fqErr) return res.status(500).json({ error: fqErr.message });

    return res.status(201).json({
      session,
      questions: fullQuestions
    });
  } catch (err) {
    console.error('POST /practice-sessions error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/practice-sessions/:id
router.get('/:id', async (req, res) => {
  try {
    const { data: session, error: sErr } = await supabaseAdmin
      .from('practice_sessions')
      .select('*, topics(name, chapters(name, subjects(name)))')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (sErr || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get attempts for this session
    const { data: attempts, error: aErr } = await supabaseAdmin
      .from('practice_attempts')
      .select('*, questions(*)')
      .eq('practice_session_id', req.params.id)
      .order('started_at', { ascending: true });

    if (aErr) return res.status(500).json({ error: aErr.message });

    return res.json({ session, attempts });
  } catch (err) {
    console.error('GET /practice-sessions/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/practice-sessions/:id/attempts — record attempt
router.post('/:id/attempts', async (req, res) => {
  try {
    const { question_id, selected_answer, time_spent_seconds, mistake_type } = req.body;

    // Verify session belongs to user
    const { data: session, error: sErr } = await supabaseAdmin
      .from('practice_sessions')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (sErr || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get correct answer
    const { data: question, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('correct_answer')
      .eq('id', question_id)
      .single();

    if (qErr || !question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const correct = selected_answer === question.correct_answer;
    const now = new Date().toISOString();

    const { data: attempt, error: aErr } = await supabaseAdmin
      .from('practice_attempts')
      .insert({
        practice_session_id: req.params.id,
        question_id,
        started_at: now,
        answered_at: now,
        time_spent_seconds,
        selected_answer,
        correct,
        mistake_type: correct ? null : (mistake_type || null)
      })
      .select()
      .single();

    if (aErr) return res.status(500).json({ error: aErr.message });

    return res.status(201).json({
      ...attempt,
      correct_answer: question.correct_answer  // Reveal in practice mode
    });
  } catch (err) {
    console.error('POST /practice-sessions/:id/attempts error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/practice-sessions/:id/complete
router.post('/:id/complete', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('practice_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Get summary
    const { data: attempts } = await supabaseAdmin
      .from('practice_attempts')
      .select('correct, time_spent_seconds')
      .eq('practice_session_id', req.params.id);

    const total = attempts?.length || 0;
    const correctCount = attempts?.filter(a => a.correct).length || 0;
    const avgTime = total > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / total)
      : 0;

    return res.json({
      session: data,
      summary: {
        total_questions: total,
        correct: correctCount,
        accuracy: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        avg_time_seconds: avgTime
      }
    });
  } catch (err) {
    console.error('POST /practice-sessions/:id/complete error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
