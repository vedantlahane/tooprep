import { supabaseAdmin } from '../../lib/supabase.js';

export const profileService = {
  async getProfile(userId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message || 'Profile not found');
    return data;
  },

  async upsertProfile(userId, { display_name, target_exam_year }) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        display_name,
        target_exam_year
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(error.message || 'Failed to update profile');
    return data;
  }
};
