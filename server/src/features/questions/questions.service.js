/***
 * Questions — Service Layer
 *
 * Feature domain : Question Bank Management
 * Architecture   : Service (business logic + data access)
 *
 * This module manages the application's question bank — a curated collection
 * of exam-style questions organised by topic, difficulty, and source.
 *
 * Two core operations:
 *
 *   getQuestions()   — Dynamic filtered retrieval. Uses a **query-builder
 *                      pattern** where optional filters (topic_id, difficulty,
 *                      source_type, verified) are chained onto the Supabase
 *                      query only when present, keeping the function flexible
 *                      without requiring multiple query variants.
 *
 *   createQuestion() — Admin-only insertion of a new question into the bank.
 *                      Validates required fields at the service level and
 *                      applies sensible defaults (question_type defaults to
 *                      'single_correct'; verified defaults to false).
 *
 * All database access uses the Supabase admin client (bypasses RLS).
 * Authorisation checks (e.g. admin role) are enforced at the route/middleware
 * layer, not here.
 *
 * Consumed by: questions.controller.js
 ***/

/* Supabase admin client — provides unrestricted access to the `questions`
   table. Auth and role checks are handled upstream by route middleware. */
import { supabaseAdmin } from '../../lib/supabase.js';
import { toStudentQuestion } from './question.dto.js';
import { createQuestionId } from '../content/content.contracts.js';
import { validateQuestionInput } from './question.validation.js';

export const questionsService = {

  /**
   * Retrieve questions with optional dynamic filtering.
   *
   * @description Builds a Supabase query incrementally by chaining `.eq()`
   *   filters for each provided parameter. This "dynamic query builder"
   *   pattern means callers can pass any combination of filters (including
   *   none) and receive a correctly scoped result set without maintaining
   *   separate query functions.
   *
   *   Filter chain flow:
   *     SELECT * FROM questions
   *       [WHERE topic_id = ?]      — if topic_id supplied
   *       [AND   difficulty = ?]    — if difficulty supplied
   *       [AND   source_type = ?]   — if source_type supplied
   *       [AND   verified = ?]      — if verified supplied (coerced to bool)
   *     ORDER BY created_at DESC
   *
   * @param {Object}  filters              - Destructured query-string params.
   * @param {string}  [filters.topic_id]   - UUID of the topic to filter by.
   * @param {string}  [filters.difficulty] - Difficulty level (e.g. 'easy',
   *                                         'medium', 'hard').
   * @param {string}  [filters.source_type]- Origin of the question (e.g.
   *                                         'PYQ', 'AI_GENERATED', 'CUSTOM').
   * @param {string}  [filters.verified]   - String 'true'/'false'; coerced to
   *                                         boolean before querying.
   * @returns {Promise<Array<Object>>} Array of matching question rows,
   *   newest first.
   * @throws  {Error} If the Supabase query fails.
   */
  async getQuestions({ topic_id, difficulty, source_type, verified }, { includeAnswers = false } = {}) {
    /* Start with a base query that selects every column. */
    const fields = includeAnswers
      ? '*'
      : 'id, canonical_question_id, topic_id, source_type, provider, exam_year, exam_session, exam_shift, question_type, question_text, options, difficulty, created_at';
    let query = supabaseAdmin.from('questions').select(fields);

    // The student bank is a projection of published content only. Admins use
    // the dedicated /api/questions/admin route when they need drafts too.
    if (!includeAnswers) query = query.eq('publication_status', 'PUBLISHED');

    /* ── Dynamic filter chaining ────────────────────────────────────────
     * Each filter is only appended when its value is truthy / defined.
     * The mutable `query` variable is reassigned on each chain so that
     * Supabase's immutable query builder produces the correct final query. */
    if (topic_id) query = query.eq('topic_id', topic_id);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (source_type) query = query.eq('source_type', source_type);
    /* `verified` arrives as a query-string value (always a string).
       Coerce to a real boolean so the equality check works correctly
       against the Postgres boolean column. */
    if (verified !== undefined) query = query.eq('verified', verified === 'true');

    /* Default sort: newest questions first (most recently added on top). */
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return includeAnswers ? data : data.map(toStudentQuestion);
  },

  /**
   * Insert a new question into the question bank (admin-only).
   *
   * @description Validates that all mandatory fields are present, applies
   *   defaults for optional fields, then persists the question to Supabase.
   *   The freshly inserted row is returned so the controller can echo it.
   *
   * Required fields : topic_id, source_type, question_text, options,
   *                   correct_answer, difficulty
   * Optional fields : provider, exam_year, exam_session, exam_shift,
   *                   question_type (default 'single_correct'),
   *                   solution_text, verified (default false)
   *
   * @param {Object}  questionData               - The full question payload.
   * @param {string}  questionData.topic_id      - UUID of the parent topic.
   * @param {string}  questionData.source_type   - Origin type of the question.
   * @param {string}  [questionData.provider]    - Provider/source name.
   * @param {number}  [questionData.exam_year]   - Year the question appeared.
   * @param {string}  [questionData.exam_session]- Exam session identifier.
   * @param {string}  [questionData.exam_shift]  - Exam shift identifier.
   * @param {string}  [questionData.question_type] - Defaults to 'single_correct'.
   * @param {string}  questionData.question_text - The question body/stem.
   * @param {Array}   questionData.options       - Array of answer choices.
   * @param {string}  questionData.correct_answer- The correct answer value.
   * @param {string}  [questionData.solution_text]- Detailed solution/explanation.
   * @param {string}  questionData.difficulty    - Difficulty level.
   * @param {boolean} [questionData.verified]    - Defaults to false.
   * @returns {Promise<Object>} The newly created question row.
   * @throws  {Error} With statusCode 400 if required fields are missing.
   * @throws  {Error} If the Supabase insert fails.
   */
  async createQuestion(questionData) {
    /* Destructure all possible fields from the incoming payload. */
    const {
      topic_id, source_type, provider, exam_year, exam_session, exam_shift,
      canonical_question_id, question_type, question_text, options, correct_answer, solution_text,
      difficulty, verified
    } = questionData;

    /* ── Required-field validation ──────────────────────────────────────
     * A 400-level error is thrown (with a custom statusCode property) so
     * the controller can distinguish validation failures from unexpected
     * server errors and respond with the correct HTTP status. */
    validateQuestionInput(questionData);

    /* ── Insert with sensible defaults ─────────────────────────────────
     * question_type defaults to 'single_correct' (most common format).
     * verified defaults to false — new questions need admin verification
     * before they appear in evaluated contexts. */
    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert({
        canonical_question_id: canonical_question_id || createQuestionId(),
        topic_id, source_type, provider, exam_year, exam_session, exam_shift,
        question_type: question_type || 'single_correct',
        question_text, options, correct_answer, solution_text,
        difficulty,
        verified: verified ?? false,
        publication_status: verified ? 'PUBLISHED' : 'DRAFT'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Update an existing question (admin-only).
   *
   * @param {string} id - Question UUID.
   * @param {Object} updateData - Partial or full question update payload.
   * @returns {Promise<Object>} Updated question row.
   */
  async updateQuestion(id, updateData) {
    if (!id) {
      const err = new Error('Question ID is required');
      err.statusCode = 400;
      throw err;
    }

    const allowed = [
      'topic_id', 'source_type', 'provider', 'exam_year', 'exam_session', 'exam_shift',
      'question_type', 'question_text', 'options', 'correct_answer', 'solution_text',
      'difficulty', 'verified', 'publication_status'
    ];
    const updatePayload = {};
    for (const key of allowed) {
      if (updateData[key] !== undefined) {
        updatePayload[key] = updateData[key];
      }
    }

    if (updatePayload.difficulty) {
      updatePayload.difficulty = String(updatePayload.difficulty).toLowerCase();
    }

    if (updatePayload.verified !== undefined && updatePayload.publication_status === undefined) {
      updatePayload.publication_status = updatePayload.verified ? 'PUBLISHED' : 'DRAFT';
    }

    const { data, error } = await supabaseAdmin
      .from('questions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) {
      const notFound = new Error('Question not found');
      notFound.statusCode = 404;
      throw notFound;
    }
    return data;
  },

  /**
   * Delete a question from the question bank (admin-only).
   * Cascades through attempts via DB foreign keys.
   *
   * @param {string} id - Question UUID.
   * @returns {Promise<{ deleted: boolean, id: string }>}
   */
  async deleteQuestion(id) {
    if (!id) {
      const err = new Error('Question ID is required');
      err.statusCode = 400;
      throw err;
    }

    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { deleted: true, id };
  },

  /**
   * Quick toggle or set verification status for a question (admin-only).
   *
   * @param {string} id - Question UUID.
   * @param {boolean} verified - Verification status.
   * @returns {Promise<Object>} Updated question.
   */
  async toggleVerifyQuestion(id, verified) {
    if (!id) {
      const err = new Error('Question ID is required');
      err.statusCode = 400;
      throw err;
    }

    const isVerified = Boolean(verified);
    const { data, error } = await supabaseAdmin
      .from('questions')
      .update({
        verified: isVerified,
        publication_status: isVerified ? 'PUBLISHED' : 'DRAFT'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
};
