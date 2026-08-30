/***
 * Evaluations Service
 * ===================
 * Feature: Timed Evaluations (Assessment Mode)
 * Layer:   Service (Business Logic)
 *
 * This service encapsulates all business logic for timed evaluation sessions.
 * Unlike practice mode (which is low-stakes and reveals answers immediately),
 * evaluations simulate real exam conditions:
 *   - Questions are assembled using an intelligent selection algorithm
 *   - A configurable time limit is enforced (default: 30 minutes)
 *   - Correct answers are WITHHELD until the evaluation is completed
 *   - Answers can be revised (upsert) during the evaluation
 *
 * Lifecycle: startEvaluation() → recordAttempt() (repeated) → completeEvaluation()
 *
 * Architecture:
 *   Routes (evaluations.routes.js)
 *     → Controller (evaluations.controller.js)
 *       → Service (this file)
 *         → Database (Supabase: evaluations, evaluation_attempts, questions)
 *
 * Key Design Decisions:
 *   - ANSWER WITHHOLDING (Security): Correct answers and solution text are
 *     never sent to the client during an active evaluation. The questions
 *     query explicitly selects only non-sensitive columns. Solutions are
 *     revealed only after completeEvaluation() is called.
 *   - DIFFICULTY DISTRIBUTION: Questions target a 20/47/33 split across
 *     easy/medium/hard (3/7/5 for a 15-question evaluation). This mirrors
 *     real competitive exam patterns where medium questions dominate.
 *   - PYQ BIAS: Within each difficulty tier, Previous Year Questions are
 *     sorted first, giving students exposure to actual exam questions.
 *   - RECENT-QUESTION EXCLUSION: Questions from the user's last 2 evaluations
 *     on the same topic are excluded to prevent repetition and encourage
 *     breadth of coverage. Falls back to full pool if insufficient unique
 *     questions remain.
 *   - UPSERT ATTEMPTS: Unlike practice (insert-only), evaluation attempts
 *     support update-if-exists, allowing users to revise answers before
 *     submission — reflecting real exam-taking behavior.
 ***/

/* Supabase admin client — bypasses RLS for server-side operations */
import { supabaseAdmin } from '../../lib/supabase.js';

export const evaluationsService = {
  /**
   * Start a new timed evaluation for a user on a given topic.
   *
   * @description Assembles an evaluation using an intelligent multi-step
   *   question selection algorithm:
   *   1. Fetch all verified questions for the topic
   *   2. Exclude questions from the user's last 2 evaluations (freshness)
   *   3. Partition by difficulty and sort PYQs first within each tier
   *   4. Select according to the target difficulty distribution
   *   5. Backfill from remaining pool if any tier is short
   *   6. Shuffle the final selection for presentation order
   *
   *   CRITICAL SECURITY: The returned questions intentionally EXCLUDE
   *   correct_answer and solution_text columns to prevent cheating.
   *
   * @param {string} userId - The authenticated user's UUID
   * @param {Object} options - Evaluation configuration
   * @param {string} options.topic_id - UUID of the topic to evaluate
   * @param {number} [options.question_count=15] - Number of questions to include
   * @param {number} [options.duration_seconds=1800] - Time limit in seconds (default: 30 min)
   * @returns {Promise<{ evaluation: Object, questions: Object[] }>}
   *   evaluation — the newly created evaluations row
   *   questions  — question objects WITHOUT correct_answer or solution_text
   * @throws {Error} statusCode=400 if topic_id is missing or no verified questions exist
   * @throws {Error} on any Supabase query failure
   */
  async startEvaluation(userId, { topic_id, question_count = 15, duration_seconds = 1800 }) {
    if (!topic_id) {
      const err = new Error('topic_id is required');
      err.statusCode = 400;
      throw err;
    }

    /* ─── Step 1: Fetch all verified questions for this topic ─── */
    /* Only verified questions are eligible for evaluations, ensuring
     * content quality. We select minimal columns for the selection
     * algorithm; full (safe) data is fetched later. */
    const { data: allQuestions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, difficulty, source_type')
      .eq('topic_id', topic_id)
      .eq('verified', true)
      .eq('publication_status', 'PUBLISHED');

    if (qErr) throw new Error(qErr.message);
    if (!allQuestions || allQuestions.length === 0) {
      const err = new Error('No verified questions available for this topic');
      err.statusCode = 400;
      throw err;
    }

    /* ─── Step 2: Exclude recently-used questions ─── */
    /* To prevent question repetition across consecutive evaluations, we look
     * up the user's last 2 completed evaluations on this same topic and
     * collect all question IDs that appeared in those evaluations. These
     * questions are excluded from the candidate pool.
     *
     * Why last 2? This provides a reasonable freshness window without being
     * so aggressive that we run out of unique questions on smaller topics. */
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

    /* Apply the exclusion filter. If filtering leaves us with fewer questions
     * than needed, fall back to the full pool — availability takes priority
     * over freshness. */
    let availableQuestions = allQuestions.filter(q => !excludeQuestionIds.has(q.id));
    if (availableQuestions.length < question_count) {
      availableQuestions = allQuestions;
    }

    /* ─── Step 3: Compute target difficulty distribution ─── */
    /* Target mix: ~20% easy, ~47% medium, ~33% hard.
     * For a standard 15-question evaluation, this yields:
     *   easy:   Math.round(15 × 0.20) = 3 questions
     *   medium: Math.round(15 × 0.47) = 7 questions
     *   hard:   15 - 3 - 7            = 5 questions
     *
     * This distribution mirrors competitive exam patterns where the bulk
     * of questions are medium difficulty, with fewer easy "confidence builders"
     * and a challenging hard segment to differentiate top performers. */
    const targetCounts = {
      easy: Math.round(question_count * 0.2),
      medium: Math.round(question_count * 0.47),
      hard: question_count - Math.round(question_count * 0.2) - Math.round(question_count * 0.47)
    };

    /* ─── Step 4: Partition questions by difficulty ─── */
    const byDifficulty = { easy: [], medium: [], hard: [] };
    for (const q of availableQuestions) {
      if (byDifficulty[q.difficulty]) {
        byDifficulty[q.difficulty].push(q);
      }
    }

    /* ─── Step 5: Apply PYQ (Previous Year Questions) bias ─── */
    /* Within each difficulty tier, sort so that PYQ-sourced questions come
     * first. Among questions of the same source type, random ordering is
     * applied. This ensures students get maximum exposure to real exam
     * questions while still including original content when PYQs are scarce. */
    for (const diff of ['easy', 'medium', 'hard']) {
      byDifficulty[diff].sort((a, b) => {
        if (a.source_type === 'PYQ' && b.source_type !== 'PYQ') return -1;
        if (a.source_type !== 'PYQ' && b.source_type === 'PYQ') return 1;
        return Math.random() - 0.5;
      });
    }

    /* ─── Step 6: Select questions per difficulty target ─── */
    /* Take up to the target count from each difficulty tier. If a tier
     * has fewer questions than the target, we take all available and
     * backfill in the next step. */
    let selected = [];
    for (const [diff, target] of Object.entries(targetCounts)) {
      const pool = byDifficulty[diff];
      selected.push(...pool.slice(0, target));
    }

    /* ─── Step 7: Backfill if selection is short ─── */
    /* If any difficulty tier didn't have enough questions (e.g., not enough
     * hard questions exist), fill the remaining slots from the overall pool
     * using random selection, avoiding duplicates. */
    if (selected.length < question_count) {
      const selectedIds = new Set(selected.map(q => q.id));
      const remaining = availableQuestions.filter(q => !selectedIds.has(q.id));
      const shuffledRemaining = remaining.sort(() => Math.random() - 0.5);
      selected.push(...shuffledRemaining.slice(0, question_count - selected.length));
    }

    /* ─── Step 8: Shuffle final selection ─── */
    /* Randomize presentation order so questions don't appear grouped by
     * difficulty (which could affect test-taking strategy). */
    selected.sort(() => Math.random() - 0.5);

    /* ─── Step 9: Create the evaluation record ─── */
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

    /* ─── Step 10: Fetch question data WITHOUT sensitive fields ─── */
    /* SECURITY: We explicitly list the columns to select, intentionally
     * EXCLUDING correct_answer and solution_text. This prevents the client
     * from seeing answers during the evaluation. Solutions are only revealed
     * via getEvaluation() or completeEvaluation() after the eval ends. */
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

  /**
   * Retrieve an existing evaluation with its attempts and (conditionally) solutions.
   *
   * @description Fetches the evaluation record and all attempts. The key
   *   security behavior here is conditional answer visibility:
   *   - If the evaluation is COMPLETE (ended_at is set): returns full question
   *     data including correct_answer and solution_text for review.
   *   - If the evaluation is IN PROGRESS: returns an empty questions array,
   *     preventing the client from accessing answers prematurely.
   *
   * @param {string} userId - The authenticated user's UUID
   * @param {string} evalId - UUID of the evaluation to retrieve
   * @returns {Promise<{ evaluation: Object, attempts: Object[], questions: Object[] } | null>}
   *   null if evaluation not found or not owned by user
   *   questions is empty array when evaluation is still in progress
   * @throws {Error} on attempt query failure
   */
  async getEvaluation(userId, evalId) {
    const { data: evaluation, error: eErr } = await supabaseAdmin
      .from('evaluations')
      .select('*, topics(name, chapters(name, subjects(name)))')
      .eq('id', evalId)
      .eq('user_id', userId)
      .single();

    if (eErr || !evaluation) return null;

    /* Fetch all attempts for this evaluation, ordered chronologically */
    const { data: attempts, error: aErr } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('*')
      .eq('evaluation_id', evalId)
      .order('started_at', { ascending: true });

    if (aErr) throw new Error(aErr.message);

    /* CONDITIONAL ANSWER REVEAL:
     * Only include full question details (with solutions) if the evaluation
     * has been completed. This prevents data leakage during active evaluations. */
    if (evaluation.ended_at) {
      const questionIds = attempts.map(a => a.question_id);
      const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('*')
        .in('id', questionIds);

      return { evaluation, attempts, questions };
    }

    /* Evaluation still in progress — don't reveal any answers */
    return { evaluation, attempts, questions: [] };
  },

  /**
   * Record or update an answer attempt within an active evaluation.
   *
   * @description Handles answer submission with upsert semantics:
   *   - If the user has NOT previously answered this question → INSERT
   *   - If the user HAS previously answered this question → UPDATE
   *
   *   This upsert behavior allows users to revise their answers during the
   *   evaluation, which mirrors real exam conditions where you can go back
   *   and change answers before final submission.
   *
   *   SECURITY: The correct answer is fetched server-side for grading but
   *   is NOT included in the response. The client only receives the attempt
   *   record (with the `correct` boolean) — no answer leakage.
   *
   *   Contrast with practice mode: practice recordAttempt() always inserts
   *   (no revision) and reveals the correct answer in the response.
   *
   * @param {string} userId - The authenticated user's UUID
   * @param {string} evalId - UUID of the evaluation
   * @param {Object} attemptData - The attempt details
   * @param {string} attemptData.question_id - UUID of the question being answered
   * @param {string} attemptData.selected_answer - The user's chosen answer
   * @param {number} attemptData.time_spent_seconds - Time spent on this question
   * @returns {Promise<Object>} The attempt record (WITHOUT correct_answer)
   * @throws {Error} statusCode=404 if evaluation or question not found
   * @throws {Error} statusCode=400 if evaluation is already completed
   * @throws {Error} on any Supabase query failure
   */
  async recordAttempt(userId, evalId, { question_id, selected_answer, time_spent_seconds }) {
    /* Verify evaluation ownership and active status.
     * We check both user_id match AND that ended_at is not set. */
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
    /* Reject attempts on completed evaluations — no post-submission changes */
    if (evaluation.ended_at) {
      const err = new Error('Evaluation already completed');
      err.statusCode = 400;
      throw err;
    }

    /* Fetch the correct answer for server-side grading.
     * The answer is used only to compute the `correct` boolean and is
     * NOT returned to the client (unlike practice mode). */
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

    /* Grade the answer by direct string comparison */
    const correct = selected_answer === question.correct_answer;
    const now = new Date().toISOString();

    /* ─── Upsert Logic: Check if an attempt already exists ─── */
    /* Query for an existing attempt for this (evaluation, question) pair.
     * If found, we update it; otherwise we insert a new row.
     * This allows users to change their answers during the evaluation. */
    const { data: existing } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('id')
      .eq('evaluation_id', evalId)
      .eq('question_id', question_id)
      .single();

    let attempt;
    if (existing) {
      /* UPDATE path: User is revising a previously submitted answer.
       * We update the answered_at timestamp, the selected answer, time spent,
       * and the re-computed correctness flag. started_at is preserved from
       * the original insert. */
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
      /* INSERT path: First time answering this question.
       * Both started_at and answered_at are set to now; the client tracks
       * actual timing via time_spent_seconds. */
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

    /* Return the attempt record WITHOUT the correct answer.
     * The client sees only whether the attempt was saved, not the solution. */
    return attempt;
  },

  /**
   * Complete an evaluation and compute detailed performance analytics.
   *
   * @description Finalizes the evaluation by setting ended_at, then computes
   *   a comprehensive results summary including:
   *   - Overall accuracy and attempt rate
   *   - Average time per question
   *   - Per-difficulty breakdown (easy/medium/hard accuracy)
   *   - PYQ-specific accuracy (how well the user handles real exam questions)
   *   - Detailed mistake list with correct answers and solutions
   *
   *   This is the moment when solutions become visible to the user — all
   *   answer withholding ends upon completion.
   *
   * @param {string} userId - The authenticated user's UUID
   * @param {string} evalId - UUID of the evaluation to complete
   * @returns {Promise<Object>} Detailed results:
   *   {
   *     evaluation: Object,          — updated evaluation record
   *     summary: {
   *       total_questions: number,    — total questions in the evaluation
   *       answered: number,           — how many the user actually answered
   *       correct: number,            — number answered correctly
   *       accuracy: number,           — percentage (0–100), based on answered questions
   *       attempt_rate: number,       — percentage (0–100), answered / total
   *       avg_time_seconds: number,   — average time per question
   *       difficulty_breakdown: {     — per-difficulty accuracy stats
   *         easy: { total, correct, accuracy },
   *         medium: { total, correct, accuracy },
   *         hard: { total, correct, accuracy }
   *       },
   *       pyq_accuracy: number|null   — accuracy on PYQ questions only
   *     },
   *     mistakes: Object[],           — list of incorrectly answered questions with solutions
   *     attempts: Object[]            — all attempt records with joined question data
   *   }
   * @throws {Error} on any Supabase query/update failure
   */
  async completeEvaluation(userId, evalId) {
    /* Mark the evaluation as complete by setting ended_at.
     * The user_id filter ensures ownership — users can only complete
     * their own evaluations. */
    const { data: evaluation, error: eErr } = await supabaseAdmin
      .from('evaluations')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', evalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (eErr) throw new Error(eErr.message);

    /* Fetch all attempts with full question data (including solutions).
     * Now that the evaluation is complete, we can safely join with sensitive
     * columns (correct_answer, solution_text) for the results review. */
    const { data: attempts, error: aErr } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('*, questions(difficulty, source_type, correct_answer, solution_text, question_text, options)')
      .eq('evaluation_id', evalId);

    if (aErr) throw new Error(aErr.message);

    /* ─── Compute Overall Statistics ─── */
    const total = attempts.length;
    const answered = attempts.filter(a => a.selected_answer !== null).length;
    const correctCount = attempts.filter(a => a.correct).length;
    /* Accuracy is based on answered questions (not total), so unanswered
     * questions don't unfairly deflate the score */
    const accuracy = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
    const avgTime = total > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / total)
      : 0;

    /* ─── Per-Difficulty Breakdown ─── */
    /* Tracks total and correct counts for each difficulty level to help
     * users identify which difficulty tiers they struggle with most. */
    const diffBreakdown = { easy: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } };
    const pyq = { total: 0, correct: 0 };

    for (const a of attempts) {
      const diff = a.questions?.difficulty;
      if (diff && diffBreakdown[diff]) {
        diffBreakdown[diff].total++;
        if (a.correct) diffBreakdown[diff].correct++;
      }
      /* Track PYQ performance separately — helps users gauge readiness
       * for actual exam questions specifically */
      if (a.questions?.source_type === 'PYQ') {
        pyq.total++;
        if (a.correct) pyq.correct++;
      }
    }

    /* ─── Build Mistake List ─── */
    /* Extract all incorrect attempts with full question details so the
     * user can review what they got wrong, see the correct answer, and
     * read the solution explanation. */
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
