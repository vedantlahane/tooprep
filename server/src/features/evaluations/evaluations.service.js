import { supabaseAdmin } from '../../lib/supabase.js';

export const evaluationsService = {
  async startEvaluation(userId, { topic_id, question_count = 15, duration_seconds = 1800 }) {
    if (!topic_id) {
      const err = new Error('topic_id is required');
      err.statusCode = 400;
      throw err;
    }

    // Get all verified questions for this topic
    const { data: allQuestions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, difficulty, source_type')
      .eq('topic_id', topic_id)
      .eq('verified', true);

    if (qErr) throw new Error(qErr.message);
    if (!allQuestions || allQuestions.length === 0) {
      const err = new Error('No verified questions available for this topic');
      err.statusCode = 400;
      throw err;
    }

    // Get questions from the user's last 2 evaluations for this topic (to exclude)
    const { data: recentEvals } = await supabaseAdmin
      .from('evaluations')
      .select('id')
      .eq('user_id', userId)
      .eq('topic_id', topic_id)
      .order('started_at', { ascending: false })
      .limit(2);

    let excludeQuestionIds = new Set();
    if (recentEvals && recentEvals.length > 0) {
      const evalIds = recentEvals.map(e => e.id);
      const { data: recentAttempts } = await supabaseAdmin
        .from('evaluation_attempts')
        .select('question_id')
        .in('evaluation_id', evalIds);

      if (recentAttempts) {
        excludeQuestionIds = new Set(recentAttempts.map(a => a.question_id));
      }
    }

    // Filter out recently used questions (where possible)
    let availableQuestions = allQuestions.filter(q => !excludeQuestionIds.has(q.id));
    if (availableQuestions.length < question_count) {
      availableQuestions = allQuestions;
    }

    // Difficulty mix: ~20% easy, ~47% medium, ~33% hard (3/7/5 for 15)
    const targetCounts = {
      easy: Math.round(question_count * 0.2),
      medium: Math.round(question_count * 0.47),
      hard: question_count - Math.round(question_count * 0.2) - Math.round(question_count * 0.47)
    };

    const byDifficulty = { easy: [], medium: [], hard: [] };
    for (const q of availableQuestions) {
      if (byDifficulty[q.difficulty]) {
        byDifficulty[q.difficulty].push(q);
      }
    }

    // Bias toward PYQ within each difficulty
    for (const diff of ['easy', 'medium', 'hard']) {
      byDifficulty[diff].sort((a, b) => {
        if (a.source_type === 'PYQ' && b.source_type !== 'PYQ') return -1;
        if (a.source_type !== 'PYQ' && b.source_type === 'PYQ') return 1;
        return Math.random() - 0.5;
      });
    }

    // Select questions respecting difficulty targets
    let selected = [];
    for (const [diff, target] of Object.entries(targetCounts)) {
      const pool = byDifficulty[diff];
      selected.push(...pool.slice(0, target));
    }

    // If we didn't get enough, fill from remaining
    if (selected.length < question_count) {
      const selectedIds = new Set(selected.map(q => q.id));
      const remaining = availableQuestions.filter(q => !selectedIds.has(q.id));
      const shuffledRemaining = remaining.sort(() => Math.random() - 0.5);
      selected.push(...shuffledRemaining.slice(0, question_count - selected.length));
    }

    // Shuffle final selection
    selected.sort(() => Math.random() - 0.5);

    // Create evaluation record
    const { data: evaluation, error: eErr } = await supabaseAdmin
      .from('evaluations')
      .insert({
        user_id: userId,
        topic_id,
        eval_type: 'TOPIC_EVAL',
        duration_seconds
      })
      .select()
      .single();

    if (eErr) throw new Error(eErr.message);

    // Fetch full question data (WITHOUT correct_answer and solution_text)
    const selectedIds = selected.map(q => q.id);
    const { data: fullQuestions, error: fqErr } = await supabaseAdmin
      .from('questions')
      .select('id, topic_id, source_type, question_type, question_text, options, difficulty')
      .in('id', selectedIds);

    if (fqErr) throw new Error(fqErr.message);

    return {
      evaluation,
      questions: fullQuestions
    };
  },

  async getEvaluation(userId, evalId) {
    const { data: evaluation, error: eErr } = await supabaseAdmin
      .from('evaluations')
      .select('*, topics(name, chapters(name, subjects(name)))')
      .eq('id', evalId)
      .eq('user_id', userId)
      .single();

    if (eErr || !evaluation) return null;

    // Get attempts
    const { data: attempts, error: aErr } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('*')
      .eq('evaluation_id', evalId)
      .order('started_at', { ascending: true });

    if (aErr) throw new Error(aErr.message);

    // If evaluation is complete, include question details with solutions
    if (evaluation.ended_at) {
      const questionIds = attempts.map(a => a.question_id);
      const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('*')
        .in('id', questionIds);

      return { evaluation, attempts, questions };
    }

    // If still in progress, don't reveal answers
    return { evaluation, attempts, questions: [] };
  },

  async recordAttempt(userId, evalId, { question_id, selected_answer, time_spent_seconds }) {
    // Verify evaluation belongs to user and is not completed
    const { data: evaluation, error: eErr } = await supabaseAdmin
      .from('evaluations')
      .select('id, ended_at')
      .eq('id', evalId)
      .eq('user_id', userId)
      .single();

    if (eErr || !evaluation) {
      const err = new Error('Evaluation not found');
      err.statusCode = 404;
      throw err;
    }
    if (evaluation.ended_at) {
      const err = new Error('Evaluation already completed');
      err.statusCode = 400;
      throw err;
    }

    // Get correct answer (for grading, but don't reveal)
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

    // Check if attempt already exists (update instead of insert)
    const { data: existing } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('id')
      .eq('evaluation_id', evalId)
      .eq('question_id', question_id)
      .single();

    let attempt;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('evaluation_attempts')
        .update({
          answered_at: now,
          time_spent_seconds,
          selected_answer,
          correct
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      attempt = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('evaluation_attempts')
        .insert({
          evaluation_id: evalId,
          question_id,
          started_at: now,
          answered_at: now,
          time_spent_seconds,
          selected_answer,
          correct
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      attempt = data;
    }

    return attempt;
  },

  async completeEvaluation(userId, evalId) {
    const { data: evaluation, error: eErr } = await supabaseAdmin
      .from('evaluations')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', evalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (eErr) throw new Error(eErr.message);

    const { data: attempts, error: aErr } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('*, questions(difficulty, source_type, correct_answer, solution_text, question_text, options)')
      .eq('evaluation_id', evalId);

    if (aErr) throw new Error(aErr.message);

    const total = attempts.length;
    const answered = attempts.filter(a => a.selected_answer !== null).length;
    const correctCount = attempts.filter(a => a.correct).length;
    const accuracy = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
    const avgTime = total > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / total)
      : 0;

    const diffBreakdown = { easy: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } };
    const pyq = { total: 0, correct: 0 };

    for (const a of attempts) {
      const diff = a.questions?.difficulty;
      if (diff && diffBreakdown[diff]) {
        diffBreakdown[diff].total++;
        if (a.correct) diffBreakdown[diff].correct++;
      }
      if (a.questions?.source_type === 'PYQ') {
        pyq.total++;
        if (a.correct) pyq.correct++;
      }
    }

    const mistakes = attempts
      .filter(a => a.correct === false)
      .map(a => ({
        question_id: a.question_id,
        question_text: a.questions?.question_text,
        selected_answer: a.selected_answer,
        correct_answer: a.questions?.correct_answer,
        solution_text: a.questions?.solution_text,
        difficulty: a.questions?.difficulty,
        mistake_type: a.mistake_type
      }));

    return {
      evaluation,
      summary: {
        total_questions: total,
        answered,
        correct: correctCount,
        accuracy,
        attempt_rate: total > 0 ? Math.round((answered / total) * 100) : 0,
        avg_time_seconds: avgTime,
        difficulty_breakdown: {
          easy: { ...diffBreakdown.easy, accuracy: diffBreakdown.easy.total > 0 ? Math.round((diffBreakdown.easy.correct / diffBreakdown.easy.total) * 100) : null },
          medium: { ...diffBreakdown.medium, accuracy: diffBreakdown.medium.total > 0 ? Math.round((diffBreakdown.medium.correct / diffBreakdown.medium.total) * 100) : null },
          hard: { ...diffBreakdown.hard, accuracy: diffBreakdown.hard.total > 0 ? Math.round((diffBreakdown.hard.correct / diffBreakdown.hard.total) * 100) : null }
        },
        pyq_accuracy: pyq.total > 0 ? Math.round((pyq.correct / pyq.total) * 100) : null
      },
      mistakes,
      attempts
    };
  }
};
