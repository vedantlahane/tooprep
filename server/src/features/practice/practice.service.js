import { supabaseAdmin } from '../../lib/supabase.js';

export const practiceService = {
  async startSession(userId, topicId, questionCount = 15) {
    if (!topicId) {
      const err = new Error('topic_id is required');
      err.statusCode = 400;
      throw err;
    }

    // Fetch verified questions for this topic
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, difficulty, source_type')
      .eq('topic_id', topicId)
      .eq('verified', true);

    if (qErr) throw new Error(qErr.message);
    if (!questions || questions.length === 0) {
      const err = new Error('No verified questions available for this topic');
      err.statusCode = 400;
      throw err;
    }

    // Shuffle and pick up to questionCount
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    // Create session
    const { data: session, error: sErr } = await supabaseAdmin
      .from('practice_sessions')
      .insert({
        user_id: userId,
        topic_id: topicId
      })
      .select()
      .single();

    if (sErr) throw new Error(sErr.message);

    // Fetch full question data for selected questions
    const { data: fullQuestions, error: fqErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .in('id', selected.map(q => q.id));

    if (fqErr) throw new Error(fqErr.message);

    return {
      session,
      questions: fullQuestions
    };
  },

  async getSession(userId, sessionId) {
    const { data: session, error: sErr } = await supabaseAdmin
      .from('practice_sessions')
      .select('*, topics(name, chapters(name, subjects(name)))')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sErr || !session) return null;

    const { data: attempts, error: aErr } = await supabaseAdmin
      .from('practice_attempts')
      .select('*, questions(*)')
      .eq('practice_session_id', sessionId)
      .order('started_at', { ascending: true });

    if (aErr) throw new Error(aErr.message);

    return { session, attempts };
  },

  async recordAttempt(userId, sessionId, { question_id, selected_answer, time_spent_seconds, mistake_type }) {
    // Verify session belongs to user
    const { data: session, error: sErr } = await supabaseAdmin
      .from('practice_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sErr || !session) {
      const err = new Error('Session not found');
      err.statusCode = 404;
      throw err;
    }

    // Get correct answer
    const { data: question, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('correct_answer')
      .eq('id', question_id)
      .single();

    if (qErr || !question) {
      const err = new Error('Question not found');
      err.statusCode = 404;
      throw err;
    }

    const correct = selected_answer === question.correct_answer;
    const now = new Date().toISOString();

    const { data: attempt, error: aErr } = await supabaseAdmin
      .from('practice_attempts')
      .insert({
        practice_session_id: sessionId,
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

    if (aErr) throw new Error(aErr.message);

    return {
      ...attempt,
      correct_answer: question.correct_answer // Reveal in practice mode
    };
  },

  async completeSession(userId, sessionId) {
    const { data, error } = await supabaseAdmin
      .from('practice_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const { data: attempts } = await supabaseAdmin
      .from('practice_attempts')
      .select('correct, time_spent_seconds')
      .eq('practice_session_id', sessionId);

    const total = attempts?.length || 0;
    const correctCount = attempts?.filter(a => a.correct).length || 0;
    const avgTime = total > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / total)
      : 0;

    return {
      session: data,
      summary: {
        total_questions: total,
        correct: correctCount,
        accuracy: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        avg_time_seconds: avgTime
      }
    };
  }
};
