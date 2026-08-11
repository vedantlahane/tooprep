import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// GET /api/profile — own profile
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Profile not found' });
    return res.json(data);
  } catch (err) {
    console.error('GET /profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile — create/update own profile
router.post('/', async (req, res) => {
  try {
    const { display_name, target_exam_year } = req.body;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: req.user.id,
        display_name,
        target_exam_year
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Profile upsert error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    return res.json(data);
  } catch (err) {
    console.error('POST /profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
