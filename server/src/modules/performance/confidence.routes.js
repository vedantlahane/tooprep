import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// POST /api/topics/:id/confidence
router.post('/:id/confidence', async (req, res) => {
  try {
    const { confidence, trigger } = req.body;

    if (!confidence || confidence < 1 || confidence > 10) {
      return res.status(400).json({ error: 'Confidence must be between 1 and 10' });
    }
    if (!trigger || !['INITIAL', 'POST_EVALUATION'].includes(trigger)) {
      return res.status(400).json({ error: 'Trigger must be INITIAL or POST_EVALUATION' });
    }

    const { data, error } = await supabaseAdmin
      .from('confidence_assessments')
      .insert({
        user_id: req.user.id,
        topic_id: req.params.id,
        confidence,
        trigger
      })
      .select()
      .single();

    if (error) {
      console.error('Confidence insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('POST confidence error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/topics/:id/confidence-history
router.get('/:id/confidence-history', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('confidence_assessments')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('topic_id', req.params.id)
      .order('recorded_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    console.error('GET confidence-history error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
