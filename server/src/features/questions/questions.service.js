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
import { getMongoDb } from '../../lib/mongodb.js';
import { toStudentQuestion } from './question.dto.js';
import { createQuestionId } from '../content/content.contracts.js';
import { validateQuestionInput } from './question.validation.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  async getQuestions({ topic_id, topic_ids, chapter_id, chapter_ids, difficulty, source_type, verified, exam_year, sort, has_solution }, { includeAnswers = false } = {}) {
    /* Start with a base query that selects every column. */
    const fields = includeAnswers
      ? '*'
      : 'id, canonical_question_id, topic_id, source_type, provider, exam_year, exam_session, exam_shift, question_type, question_text, options, difficulty, created_at';
    let query = supabaseAdmin.from('questions').select(fields);

    // The student bank is a projection of published content only. Admins use
    // the dedicated /api/questions/admin route when they need drafts too.
    if (!includeAnswers) query = query.eq('publication_status', 'PUBLISHED');

    /* ── Dynamic filter chaining ────────────────────────────────────────
     * Supports single topic or multiple topics (via topic_ids array or comma-separated string) */
    const rawTopicIds = topic_ids || topic_id;
    if (rawTopicIds) {
      const ids = Array.isArray(rawTopicIds)
        ? rawTopicIds.filter(Boolean)
        : String(rawTopicIds).split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length === 1) {
        query = query.eq('topic_id', ids[0]);
      } else if (ids.length > 1) {
        query = query.in('topic_id', ids);
      }
    } else {
      /* If no specific topics provided, support chapter_ids filter */
      const rawChapterIds = chapter_ids || chapter_id;
      if (rawChapterIds) {
        const cids = Array.isArray(rawChapterIds)
          ? rawChapterIds.filter(Boolean)
          : String(rawChapterIds).split(',').map(s => s.trim()).filter(Boolean);
        if (cids.length > 0) {
          const { data: topicRows } = await supabaseAdmin
            .from('topics')
            .select('id')
            .in('chapter_id', cids);
          if (topicRows && topicRows.length > 0) {
            query = query.in('topic_id', topicRows.map(t => t.id));
          } else {
            return []; // No topics exist in selected chapters
          }
        }
      }
    }

    if (difficulty) query = query.eq('difficulty', difficulty);
    if (source_type) query = query.eq('source_type', source_type);
    if (exam_year) query = query.eq('exam_year', Number(exam_year));
    /* `verified` arrives as a query-string value (always a string).
       Coerce to a real boolean so the equality check works correctly
       against the Postgres boolean column. */
    if (verified !== undefined) query = query.eq('verified', verified === 'true');
    if (has_solution !== undefined) {
      if (has_solution === 'true' || has_solution === true) {
        query = query.not('solution_text', 'is', null);
      } else if (has_solution === 'false' || has_solution === false) {
        query = query.is('solution_text', null);
      }
    }

    /* Sorting */
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'difficulty_asc') {
      query = query.order('difficulty', { ascending: true });
    } else if (sort === 'difficulty_desc') {
      query = query.order('difficulty', { ascending: false });
    } else {
      /* Default sort: newest questions first (most recently added on top). */
      query = query.order('created_at', { ascending: false });
    }

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

    /* ── Automated Duplicate Check on Ingestion ─────────────────────────
     * Evaluates new question against existing bank and flags potential
     * duplicates for admin review without blocking the return. */
    (async () => {
      try {
        const { computeCompositeSimilarity } = await import('../admin/deduplication.utils.js');
        const { deduplicationService } = await import('../admin/deduplication.service.js');
        const { data: existingList } = await supabaseAdmin
          .from('questions')
          .select('id, question_text, options, topic_id')
          .neq('id', data.id)
          .limit(400);

        if (existingList) {
          const found = [];
          for (const ex of existingList) {
            const sim = computeCompositeSimilarity(data, ex);
            if (sim.matchType) {
              found.push({
                id: `dup_${ex.id.slice(0, 8)}_${data.id.slice(0, 8)}`,
                primary_question_id: ex.id,
                duplicate_question_id: data.id,
                similarity_score: sim.score,
                match_type: sim.matchType,
                status: 'PENDING',
                details: {
                  stem_similarity: sim.stemSimilarity,
                  options_similarity: sim.optionsSimilarity,
                  is_exact: sim.isExact
                },
                flagged_at: new Date().toISOString(),
                primary_question: ex,
                duplicate_question: data
              });
            }
          }
          if (found.length > 0) {
            await deduplicationService._persistDetectedPairs(found);
          }
        }
      } catch (err) {
        // Non-fatal background duplicate check error
      }
    })();

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

    const isUuid = UUID_REGEX.test(id);
    if (!isUuid) {
      const db = await getMongoDb();
      const candidateUpdates = {};
      if (updatePayload.question_text !== undefined) candidateUpdates.question_text = updatePayload.question_text;
      if (updatePayload.options !== undefined) candidateUpdates.options = updatePayload.options;
      if (updatePayload.correct_answer !== undefined) candidateUpdates.correct_answer = updatePayload.correct_answer;
      if (updatePayload.solution_text !== undefined) candidateUpdates.solution_text = updatePayload.solution_text;
      if (updatePayload.topic_id !== undefined) candidateUpdates.suggested_topic_id = updatePayload.topic_id;
      if (updatePayload.difficulty !== undefined) candidateUpdates.difficulty = updatePayload.difficulty;

      let candidateResult = await db.collection('extracted_candidates').findOneAndUpdate(
        { candidate_key: id },
        { $set: { ...candidateUpdates, updated_at: new Date().toISOString() } },
        { returnDocument: 'after' }
      );

      if (!candidateResult) {
        try {
          const { ObjectId } = await import('mongodb');
          if (ObjectId.isValid(id)) {
            candidateResult = await db.collection('extracted_candidates').findOneAndUpdate(
              { _id: new ObjectId(id) },
              { $set: { ...candidateUpdates, updated_at: new Date().toISOString() } },
              { returnDocument: 'after' }
            );
          }
        } catch {}
      }

      if (candidateResult) {
        return {
          id: candidateResult.candidate_key || String(candidateResult._id),
          ...candidateResult,
          ...updatePayload,
          is_candidate: true
        };
      }

      const notFound = new Error(`Question or candidate not found for ID: ${id}`);
      notFound.statusCode = 404;
      throw notFound;
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
   * @param {string} id - Question UUID or candidate key.
   * @returns {Promise<{ deleted: boolean, id: string }>}
   */
  async deleteQuestion(id) {
    if (!id) {
      const err = new Error('Question ID is required');
      err.statusCode = 400;
      throw err;
    }

    const isUuid = UUID_REGEX.test(id);
    if (!isUuid) {
      const db = await getMongoDb();
      let del = await db.collection('extracted_candidates').deleteOne({ candidate_key: id });
      if (del.deletedCount === 0) {
        try {
          const { ObjectId } = await import('mongodb');
          if (ObjectId.isValid(id)) {
            del = await db.collection('extracted_candidates').deleteOne({ _id: new ObjectId(id) });
          }
        } catch {}
      }
      return { deleted: del.deletedCount > 0, id, is_candidate: true };
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
  },

  /**
   * Bulk verify or unverify multiple questions (admin-only).
   *
   * @param {string[]} ids - Array of question UUIDs.
   * @param {boolean} verified - Verification status.
   * @returns {Promise<{ updated_count: number, verified: boolean }>}
   */
  async bulkVerifyQuestions(ids, verified) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const err = new Error('ids array must not be empty');
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
      .in('id', ids)
      .select('id');

    if (error) throw new Error(error.message);
    return { updated_count: data?.length || 0, verified: isVerified };
  },

  /**
   * Bulk delete multiple questions from the question bank (admin-only).
   *
   * @param {string[]} ids - Array of question UUIDs.
   * @returns {Promise<{ deleted_count: number, ids: string[] }>}
   */
  async bulkDeleteQuestions(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const err = new Error('ids array must not be empty');
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('questions')
      .delete()
      .in('id', ids)
      .select('id');

    if (error) throw new Error(error.message);
    return { deleted_count: data?.length || 0, ids: (data || []).map(d => d.id) };
  },

  /**
   * Bulk reassign/move multiple questions to a target topic (admin-only).
   *
   * @param {string[]} ids - Array of question UUIDs.
   * @param {string} targetTopicId - Destination topic UUID.
   * @returns {Promise<{ updated_count: number, topic_id: string, topic_name: string }>}
   */
  async bulkMoveQuestions(ids, targetTopicId) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const err = new Error('ids array must not be empty');
      err.statusCode = 400;
      throw err;
    }
    if (!targetTopicId) {
      const err = new Error('targetTopicId is required');
      err.statusCode = 400;
      throw err;
    }

    // Verify target topic exists
    const { data: topic, error: topicErr } = await supabaseAdmin
      .from('topics')
      .select('id, name')
      .eq('id', targetTopicId)
      .single();

    if (topicErr || !topic) {
      const err = new Error(`Target topic '${targetTopicId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('questions')
      .update({ topic_id: targetTopicId })
      .in('id', ids)
      .select('id');

    if (error) throw new Error(error.message);
    return { updated_count: data?.length || 0, topic_id: targetTopicId, topic_name: topic.name };
  },

  /**
   * Bulk import an array of questions (admin-only).
   * Validates each question, assigns canonical IDs, sets defaults, and inserts.
   *
   * @param {Array<Object>} questions - List of raw question objects.
   * @param {string} [defaultTopicId] - Fallback topic UUID if item lacks topic_id.
   * @returns {Promise<{ inserted_count: number, total_submitted: number, rejected_count: number, rejected_items: Array<Object>, questions: Array<Object> }>}
   */
  async bulkImportQuestions(questions, defaultTopicId) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      const err = new Error('questions must be a non-empty array');
      err.statusCode = 400;
      throw err;
    }

    const validItems = [];
    const rejectedItems = [];

    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      const assignedTopicId = item.topic_id || defaultTopicId;

      if (!assignedTopicId) {
        rejectedItems.push({ index: i, error: 'Missing topic_id and no default provided' });
        continue;
      }
      if (!item.question_text || typeof item.question_text !== 'string' || item.question_text.trim() === '') {
        rejectedItems.push({ index: i, error: 'Missing or empty question_text' });
        continue;
      }
      if (!item.options || typeof item.options !== 'object') {
        rejectedItems.push({ index: i, error: 'Missing or invalid options object/array' });
        continue;
      }
      if (!item.correct_answer) {
        rejectedItems.push({ index: i, error: 'Missing correct_answer' });
        continue;
      }

      let formattedOptions = item.options;
      if (Array.isArray(item.options)) {
        const optObj = {};
        for (const opt of item.options) {
          if (opt && opt.id && opt.text !== undefined) {
            optObj[opt.id.toUpperCase()] = String(opt.text);
          }
        }
        formattedOptions = optObj;
      }

      const canonicalId = item.canonical_question_id || createQuestionId({
        topic_id: assignedTopicId,
        difficulty: (item.difficulty || 'medium').toLowerCase(),
        source_type: item.source_type || 'PYQ',
        question_text: item.question_text
      });

      const isVerified = item.verified !== undefined ? Boolean(item.verified) : true;
      const pubStatus = item.publication_status || (isVerified ? 'PUBLISHED' : 'DRAFT');

      validItems.push({
        canonical_question_id: canonicalId,
        topic_id: assignedTopicId,
        source_type: item.source_type || 'PYQ',
        provider: item.provider || 'system_import',
        exam_year: item.exam_year ? Number(item.exam_year) : 2024,
        exam_session: item.exam_session || null,
        exam_shift: item.exam_shift || null,
        question_type: item.question_type || 'single_correct',
        question_text: item.question_text,
        options: formattedOptions,
        correct_answer: String(item.correct_answer).toUpperCase(),
        solution_text: item.solution_text || null,
        difficulty: (item.difficulty || 'medium').toLowerCase(),
        verified: isVerified,
        publication_status: pubStatus
      });
    }

    if (validItems.length === 0) {
      const err = new Error(`All ${questions.length} questions failed validation: ${rejectedItems.map(r => `Row ${r.index + 1}: ${r.error}`).join('; ')}`);
      err.statusCode = 400;
      err.details = rejectedItems;
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert(validItems)
      .select('id, canonical_question_id, topic_id, difficulty, verified');

    if (error) throw new Error(error.message);

    return {
      inserted_count: data?.length || 0,
      total_submitted: questions.length,
      rejected_count: rejectedItems.length,
      rejected_items: rejectedItems,
      questions: data || []
    };
  },

  /**
   * Submit a student or admin issue report for a question.
   */
  async reportQuestion(questionId, { reason, notes }, userId) {
    if (!questionId) throw Object.assign(new Error('questionId is required'), { statusCode: 400 });
    if (!reason) throw Object.assign(new Error('Reason is required'), { statusCode: 400 });

    const { data: qData } = await supabaseAdmin
      .from('questions')
      .select('id, question_text, options, correct_answer, solution_text, topic_id, difficulty')
      .or(`id.eq.${questionId},canonical_question_id.eq.${questionId}`)
      .maybeSingle();

    const db = await getMongoDb();
    const reportDoc = {
      report_id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      question_id: questionId,
      supabase_id: qData?.id || questionId,
      reporter_user_id: userId,
      reason,
      notes: notes || '',
      status: 'OPEN',
      question_snapshot: qData || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('question_reports').insertOne(reportDoc);
    return reportDoc;
  },

  /**
   * List reported questions (admin-only).
   */
  async listReports(status = null, limit = 50) {
    const db = await getMongoDb();
    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    return db.collection('question_reports')
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * Resolve or update status of a report (admin-only).
   */
  async updateReportStatus(reportId, status, resolutionNotes, actorId) {
    const db = await getMongoDb();
    const result = await db.collection('question_reports').findOneAndUpdate(
      { report_id: reportId },
      {
        $set: {
          status,
          resolution_notes: resolutionNotes || null,
          resolved_by: actorId,
          resolved_at: new Date(),
          updated_at: new Date()
        }
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!result) throw Object.assign(new Error(`Report ${reportId} not found`), { statusCode: 404 });
    return result;
  }
};
