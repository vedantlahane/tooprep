import { supabaseAdmin } from '../../lib/supabase.js';

export const confidenceService = {
  async addConfidence(userId, topicId, confidence, trigger) {
    if (!confidence || confidence < 1 || confidence > 10) {
      throw new Error('Confidence must be between 1 and 10');
    }
    if (!trigger || !['INITIAL', 'POST_EVALUATION'].includes(trigger)) {
      throw new Error('Trigger must be INITIAL or POST_EVALUATION');
    }

    const { data, error } = await supabaseAdmin
      .from('confidence_assessments')
      .insert({
        user_id: userId,
        topic_id: topicId,
        confidence,
        trigger
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getConfidenceHistory(userId, topicId) {
    const { data, error } = await supabaseAdmin
      .from('confidence_assessments')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .order('recorded_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }
};
