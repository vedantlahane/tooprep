import { supabaseAdmin } from '../../lib/supabase.js';

export const questionsService = {
  async getQuestions({ topic_id, difficulty, source_type, verified }) {
    let query = supabaseAdmin.from('questions').select('*');

    if (topic_id) query = query.eq('topic_id', topic_id);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (source_type) query = query.eq('source_type', source_type);
    if (verified !== undefined) query = query.eq('verified', verified === 'true');

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },

  async createQuestion(questionData) {
    const {
      topic_id, source_type, provider, exam_year, exam_session, exam_shift,
      question_type, question_text, options, correct_answer, solution_text,
      difficulty, verified
    } = questionData;

    if (!topic_id || !source_type || !question_text || !options || !correct_answer || !difficulty) {
      const err = new Error('Missing required fields');
      err.statusCode = 400;
      throw err;
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

    if (error) throw new Error(error.message);
    return data;
  }
};
