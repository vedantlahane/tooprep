import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/questions?topic_id=&difficulty=&source_type=&verified=true
router.get('/', async (req, res) => {
  try {
    const { topic_id, difficulty, source_type, verified } = req.query;

    let query = supabaseAdmin.from('questions').select('*');

    if (topic_id) query = query.eq('topic_id', topic_id);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (source_type) query = query.eq('source_type', source_type);
    if (verified !== undefined) query = query.eq('verified', verified === 'true');

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json(data);
  } catch (err) {
    console.error('GET /questions error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/questions — admin-only
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      topic_id, source_type, provider, exam_year, exam_session, exam_shift,
      question_type, question_text, options, correct_answer, solution_text,
      difficulty, verified
    } = req.body;

    // Validate required fields
    if (!topic_id || !source_type || !question_text || !options || !correct_answer || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert({
        topic_id, source_type, provider, exam_year, exam_session, exam_shift,
        question_type: question_type || 'single_correct',
        question_text, options, correct_answer, solution_text,
        difficulty, verified: verified || false
      })
      .select()
      .single();

    if (error) {
      console.error('Question insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /questions error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
