/***
 * Practice Session Service
 * ========================
 * Feature: Practice Mode
 * Layer:   Service (Business Logic)
 *
 * This service encapsulates all business logic for untimed practice sessions.
 * Practice mode is designed for low-stakes learning — users answer questions at
 * their own pace and receive immediate feedback including the correct answer.
 *
 * Lifecycle: startSession() → recordAttempt() (repeated) → completeSession()
 *
 * Architecture:
 *   Routes (practice.routes.js)
 *     → Controller (practice.controller.js)
 *       → Service (this file)
 *         → Database (Supabase: practice_sessions, practice_attempts, questions)
 *
 * Key Design Decisions:
 *   - Questions are randomly shuffled (no difficulty targeting, unlike evaluations)
 *   - Only verified questions are served to ensure content quality
 *   - Correct answers are revealed immediately after each attempt (practice mode)
 *     This is a critical difference from evaluations, which withhold answers until
 *     the evaluation is completed
 *   - No time limit is enforced; sessions are open-ended
 *   - Each attempt is a fresh insert (no upsert); users cannot revise answers
 ***/

/* Supabase admin client — bypasses RLS for server-side operations */
import { supabaseAdmin } from '../../lib/supabase.js';

export const practiceService = {
  /**
   * Start a new practice session for a user on a given topic.
   *
   * @description Creates a practice session record and selects a random set of
   *   verified questions from the specified topic. Questions are shuffled using
   *   a simple Fisher–Yates-style random comparator and capped at the requested
   *   count. The full question data (including correct answers) is returned
   *   because practice mode allows immediate feedback.
   *
   * @param {string} userId - The authenticated user's UUID (from JWT / auth middleware)
   * @param {string} topicId - UUID of the topic to pull questions from
   * @param {number} [questionCount=15] - Maximum number of questions to include
   * @returns {Promise<{ session: Object, questions: Object[] }>}
   *   session  — the newly created practice_sessions row
   *   questions — full question objects (with correct_answer visible)
   * @throws {Error} statusCode=400 if topicId is missing or no verified questions exist
   * @throws {Error} on any Supabase query failure
   */
  async startSession(userId, topicId, questionCount = 15) {
    if (!topicId) {
      const err = new Error('topic_id is required');
      err.statusCode = 400;
      throw err;
    }

    /* Step 1: Fetch all verified questions for the requested topic.
     * Only verified questions are eligible — this ensures that draft or
     * unreviewed content never reaches users. We select minimal columns
     * here because we only need IDs for shuffling; full data is fetched later. */
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, difficulty, source_type')
      .eq('topic_id', topicId)
      .eq('verified', true)
      .eq('publication_status', 'PUBLISHED');

    if (qErr) throw new Error(qErr.message);
    if (!questions || questions.length === 0) {
      const err = new Error('No verified questions available for this topic');
      err.statusCode = 400;
      throw err;
    }

    /* Step 2: Shuffle and pick up to questionCount.
     * Uses Array.sort with a random comparator — not cryptographically secure,
     * but acceptable for practice question ordering. If fewer questions exist
     * than requested, all available questions are used. */
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    /* Step 3: Create the practice session record in the database.
     * The session stores user_id and topic_id. ended_at is left NULL until
     * completeSession() is called. */
    const { data: session, error: sErr } = await supabaseAdmin
      .from('practice_sessions')
      .insert({
        user_id: userId,
        topic_id: topicId
      })
      .select()
      .single();

    if (sErr) throw new Error(sErr.message);

    /* Step 4: Fetch full question data for the selected question IDs.
     * This second query retrieves all columns (including correct_answer)
     * because practice mode allows users to see answers immediately. */
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

  /**
   * Retrieve an existing practice session with all its attempts.
   *
   * @description Fetches the session record (with nested topic → chapter → subject
   *   hierarchy) and all associated attempts ordered chronologically. Returns null
   *   if the session doesn't exist or doesn't belong to the user (ownership check).
   *
   * @param {string} userId - The authenticated user's UUID
   * @param {string} sessionId - UUID of the practice session to retrieve
   * @returns {Promise<{ session: Object, attempts: Object[] } | null>}
   *   null if session not found or not owned by user
   * @throws {Error} on attempt query failure
   */
  async getSession(userId, sessionId) {
    const { data: session, error: sErr } = await supabaseAdmin
      .from('practice_sessions')
      .select('*, topics(name, chapters(name, subjects(name)))')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sErr || !session) return null;

    /* Fetch all attempts for this session, joined with full question data.
     * Ordered by started_at so the client can display them chronologically. */
    const { data: attempts, error: aErr } = await supabaseAdmin
      .from('practice_attempts')
      .select('*, questions(*)')
      .eq('practice_session_id', sessionId)
      .order('started_at', { ascending: true });

    if (aErr) throw new Error(aErr.message);

    return { session, attempts };
  },

  /**
   * Record an answer attempt for a question within a practice session.
   *
   * @description Grades the answer immediately by comparing against the stored
   *   correct_answer, inserts a practice_attempts row, and returns the result
   *   INCLUDING the correct answer. This immediate reveal is a core feature of
   *   practice mode — users learn from each question before moving on.
   *
   *   SECURITY NOTE: Unlike evaluations, practice mode reveals the correct
   *   answer in the response payload. This is intentional — practice is for
   *   learning, not assessment.
   *
   * @param {string} userId - The authenticated user's UUID
   * @param {string} sessionId - UUID of the practice session
   * @param {Object} attemptData - The attempt details
   * @param {string} attemptData.question_id - UUID of the question being answered
   * @param {string} attemptData.selected_answer - The user's chosen answer (e.g. 'A', 'B', 'C', 'D')
   * @param {number} attemptData.time_spent_seconds - Time the user spent on this question
   * @param {string} [attemptData.mistake_type] - Optional self-reported mistake category (only stored if answer is wrong)
   * @returns {Promise<Object>} The attempt record with an additional correct_answer field
   * @throws {Error} statusCode=404 if session not found or question not found
   * @throws {Error} on any Supabase insert failure
   */
  async recordAttempt(userId, sessionId, { question_id, selected_answer, time_spent_seconds, mistake_type }) {
    /* Verify session ownership — ensures users can only record attempts
     * against their own sessions. */
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

    /* Fetch the correct answer for grading.
     * We grade server-side to prevent client tampering. */
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

    /* Insert the attempt record.
     * started_at and answered_at are set to the same timestamp because
     * the client tracks timing locally and sends the elapsed time via
     * time_spent_seconds. mistake_type is only stored for incorrect answers. */
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

    /* PRACTICE MODE: Reveal the correct answer in the response.
     * This allows the frontend to show immediate feedback with the
     * right answer, enabling a learn-as-you-go experience. */
    return {
      ...attempt,
      correct_answer: question.correct_answer // Reveal in practice mode
    };
  },

  /**
   * Complete a practice session and compute summary statistics.
   *
   * @description Marks the session as finished by setting ended_at, then
   *   aggregates all attempts to produce a performance summary with total
   *   questions answered, correct count, accuracy percentage, and average
   *   time per question.
   *
   * @param {string} userId - The authenticated user's UUID
   * @param {string} sessionId - UUID of the practice session to complete
   * @returns {Promise<{ session: Object, summary: Object }>}
   *   session  — the updated session record (with ended_at set)
   *   summary  — { total_questions, correct, accuracy (%), avg_time_seconds }
   * @throws {Error} on any Supabase query/update failure
   */
  async completeSession(userId, sessionId) {
    /* Mark the session as complete by setting ended_at timestamp.
     * The user_id filter ensures ownership — users can only complete
     * their own sessions. */
    const { data, error } = await supabaseAdmin
      .from('practice_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    /* Fetch all attempts for this session to compute summary statistics.
     * We only need the correct flag and time_spent for the calculations. */
    const { data: attempts } = await supabaseAdmin
      .from('practice_attempts')
      .select('correct, time_spent_seconds')
      .eq('practice_session_id', sessionId);

    /* Compute summary metrics:
     * - total: number of questions attempted
     * - correctCount: number answered correctly
     * - accuracy: percentage (0–100), 0 if no attempts
     * - avgTime: average seconds per question, rounded to nearest integer */
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
