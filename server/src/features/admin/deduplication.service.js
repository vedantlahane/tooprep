/***
 * Question Deduplication — Service Layer
 *
 * Feature domain : Administrative Platform Management & Quality Assurance
 * Architecture   : Service (database interaction, deduplication lifecycle, hybrid persistence)
 *
 * Manages full question bank scanning, duplicate detection, automated flagging,
 * and administrative resolution actions (deletion, merging, dismissal).
 *
 * Persistence Strategy:
 *   - Primary: Supabase SQL table `question_duplicates` (see migration 008)
 *   - Fallback: In-memory & file-backed store for immediate resilience if remote
 *     table migration hasn't been executed yet in a given environment.
 ***/

import { supabaseAdmin } from '../../lib/supabase.js';
import { questionsService } from '../questions/questions.service.js';
import { computeCompositeSimilarity } from './deduplication.utils.js';
import { logger } from '../../platform/logger.js';
import fs from 'node:fs';
import path from 'node:path';

// Local disk cache path for zero-setup fallback
const LOCAL_STORE_PATH = path.join(process.cwd(), '.duplicate_flags_store.json');

class FallbackStore {
  constructor() {
    this.records = new Map();
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(LOCAL_STORE_PATH)) {
        const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            this.records.set(item.id, item);
          }
        }
      }
    } catch (e) {
      // Non-fatal cache load error
    }
  }

  saveToDisk() {
    try {
      const arr = Array.from(this.records.values());
      fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(arr, null, 2), 'utf8');
    } catch (e) {
      // Non-fatal cache write error
    }
  }

  getAll(filterStatus = null, matchType = null) {
    let list = Array.from(this.records.values());
    if (filterStatus) list = list.filter(r => r.status === filterStatus);
    if (matchType) list = list.filter(r => r.match_type === matchType);
    return list.sort((a, b) => new Date(b.flagged_at) - new Date(a.flagged_at));
  }

  getById(id) {
    return this.records.get(id) || null;
  }

  upsert(record) {
    this.records.set(record.id, record);
    this.saveToDisk();
  }

  deleteByQuestionId(qId) {
    for (const [id, r] of this.records.entries()) {
      if (r.primary_question_id === qId || r.duplicate_question_id === qId) {
        this.records.delete(id);
      }
    }
    this.saveToDisk();
  }
}

const fallbackStore = new FallbackStore();

export const deduplicationService = {
  /**
   * Run full question bank audit scan or topic-scoped scan.
   *
   * @param {Object} options
   * @param {string} [options.topic_id] - Optional topic filter
   * @param {boolean} [options.force] - Rescan all pairs even if dismissed
   * @returns {Promise<Object>} Scan results summary and detected pairs
   */
  async scanQuestionBank({ topic_id = null, force = false } = {}) {
    logger.info('deduplication.scan.started', { topic_id, force });

    // 1. Fetch all candidate questions
    let query = supabaseAdmin
      .from('questions')
      .select(`
        id, canonical_question_id, topic_id, difficulty, source_type, verified,
        publication_status, exam_year, exam_session, exam_shift,
        question_text, options, correct_answer, solution_text, created_at,
        topics ( id, name, chapters ( id, name, subjects ( id, name ) ) )
      `)
      .order('created_at', { ascending: false });

    if (topic_id) {
      query = query.eq('topic_id', topic_id);
    }

    const { data: questions, error } = await query;
    if (error) throw new Error(error.message);

    const questionList = questions || [];
    const totalScanned = questionList.length;

    // 2. Pairwise comparison using composite similarity
    const detectedPairs = [];
    const dismissedKeySet = new Set();

    // Check existing dismissed records to avoid re-flagging
    try {
      const { data: existingRows } = await supabaseAdmin
        .from('question_duplicates')
        .select('primary_question_id, duplicate_question_id, status');

      if (existingRows) {
        for (const row of existingRows) {
          if (!force && row.status === 'DISMISSED') {
            dismissedKeySet.add(`${row.primary_question_id}:::${row.duplicate_question_id}`);
            dismissedKeySet.add(`${row.duplicate_question_id}:::${row.primary_question_id}`);
          }
        }
      }
    } catch (e) {
      // Fallback table check
      for (const r of fallbackStore.getAll()) {
        if (!force && r.status === 'DISMISSED') {
          dismissedKeySet.add(`${r.primary_question_id}:::${r.duplicate_question_id}`);
          dismissedKeySet.add(`${r.duplicate_question_id}:::${r.primary_question_id}`);
        }
      }
    }

    let exactCount = 0;
    let highConfCount = 0;
    let potentialCount = 0;

    for (let i = 0; i < questionList.length; i++) {
      const q1 = questionList[i];

      for (let j = i + 1; j < questionList.length; j++) {
        const q2 = questionList[j];

        const pairKey = `${q1.id}:::${q2.id}`;
        if (dismissedKeySet.has(pairKey)) continue;

        const sim = computeCompositeSimilarity(q1, q2);

        if (sim.matchType) {
          if (sim.matchType === 'EXACT') exactCount++;
          else if (sim.matchType === 'HIGH_CONFIDENCE') highConfCount++;
          else if (sim.matchType === 'POTENTIAL') potentialCount++;

          detectedPairs.push({
            id: `dup_${q1.id.slice(0, 8)}_${q2.id.slice(0, 8)}`,
            primary_question_id: q1.id,
            duplicate_question_id: q2.id,
            similarity_score: sim.score,
            match_type: sim.matchType,
            status: 'PENDING',
            details: {
              stem_similarity: sim.stemSimilarity,
              options_similarity: sim.optionsSimilarity,
              is_exact: sim.isExact
            },
            flagged_at: new Date().toISOString(),
            primary_question: q1,
            duplicate_question: q2
          });
        }
      }
    }

    // 3. Persist flagged records
    await this._persistDetectedPairs(detectedPairs);

    logger.info('deduplication.scan.completed', {
      total_scanned: totalScanned,
      duplicates_found: detectedPairs.length,
      exact_matches: exactCount,
      high_confidence: highConfCount,
      potential: potentialCount
    });

    return {
      total_scanned: totalScanned,
      total_duplicates_found: detectedPairs.length,
      exact_matches: exactCount,
      high_confidence: highConfCount,
      potential: potentialCount,
      pairs: detectedPairs
    };
  },

  /**
   * Internal helper to persist detected pairs to Supabase or fallback store.
   */
  async _persistDetectedPairs(pairs) {
    if (!pairs || pairs.length === 0) return;

    try {
      const rows = pairs.map(p => ({
        primary_question_id: p.primary_question_id,
        duplicate_question_id: p.duplicate_question_id,
        similarity_score: p.similarity_score,
        match_type: p.match_type,
        status: 'PENDING',
        details: p.details,
        flagged_at: p.flagged_at
      }));

      const { error } = await supabaseAdmin
        .from('question_duplicates')
        .upsert(rows, { onConflict: 'primary_question_id, duplicate_question_id' });

      if (error) throw error;
    } catch (dbErr) {
      // Save in fallback store
      for (const p of pairs) {
        fallbackStore.upsert(p);
      }
    }
  },

  /**
   * Retrieve flagged duplicate pairs with fully hydrated question payloads.
   *
   * @param {Object} filters
   * @param {string} [filters.status] - 'PENDING' (default), 'DISMISSED', 'RESOLVED', 'ALL'
   * @param {string} [filters.match_type] - 'EXACT', 'HIGH_CONFIDENCE', 'POTENTIAL'
   * @returns {Promise<Array<Object>>} Hydrated duplicate records
   */
  async getDuplicates({ status = 'PENDING', match_type = null } = {}) {
    let records = [];
    let isFromDb = false;

    try {
      let query = supabaseAdmin
        .from('question_duplicates')
        .select('*')
        .order('similarity_score', { ascending: false });

      if (status && status !== 'ALL') {
        query = query.eq('status', status);
      }
      if (match_type) {
        query = query.eq('match_type', match_type);
      }

      const { data, error } = await query;
      if (!error && data) {
        records = data;
        isFromDb = true;
      }
    } catch (e) {
      // Handled by fallback store
    }

    if (!isFromDb) {
      records = fallbackStore.getAll(status === 'ALL' ? null : status, match_type);
    }

    if (records.length === 0) return [];

    // Hydrate questions if not already hydrated
    const questionIds = new Set();
    for (const r of records) {
      if (!r.primary_question) questionIds.add(r.primary_question_id);
      if (!r.duplicate_question) questionIds.add(r.duplicate_question_id);
    }

    let questionsMap = new Map();
    if (questionIds.size > 0) {
      const { data: qRows } = await supabaseAdmin
        .from('questions')
        .select(`
          id, canonical_question_id, topic_id, difficulty, source_type, verified,
          publication_status, exam_year, exam_session, exam_shift,
          question_text, options, correct_answer, solution_text, created_at,
          topics ( id, name, chapters ( id, name, subjects ( id, name ) ) )
        `)
        .in('id', Array.from(questionIds));

      if (qRows) {
        for (const q of qRows) {
          questionsMap.set(q.id, q);
        }
      }
    }

    // Attach questions and filter out records where either question was already deleted
    const validPairs = [];
    for (const r of records) {
      const q1 = r.primary_question || questionsMap.get(r.primary_question_id);
      const q2 = r.duplicate_question || questionsMap.get(r.duplicate_question_id);

      if (q1 && q2) {
        validPairs.push({
          ...r,
          primary_question: q1,
          duplicate_question: q2
        });
      }
    }

    return validPairs;
  },

  /**
   * Resolve a duplicate pair by deleting the redundant question.
   *
   * @param {string} id - Duplicate record ID
   * @param {Object} params
   * @param {string} params.keep_id - Question ID to keep
   * @param {string} params.delete_id - Question ID to delete
   * @param {string} [params.admin_user_id] - Admin performing resolution
   * @returns {Promise<Object>} Resolution result
   */
  async resolveDuplicate(id, { keep_id, delete_id, admin_user_id = null }) {
    if (!delete_id) {
      const err = new Error('delete_id is required to resolve a duplicate');
      err.statusCode = 400;
      throw err;
    }

    logger.info('deduplication.resolve.requested', { id, keep_id, delete_id });

    // 1. Delete the redundant question from question bank
    await questionsService.deleteQuestion(delete_id);

    // 2. Mark this duplicate record as resolved
    const now = new Date().toISOString();
    const action = 'DELETED_DUPLICATE';

    try {
      await supabaseAdmin
        .from('question_duplicates')
        .update({
          status: 'RESOLVED',
          resolution_action: action,
          reviewed_at: now,
          reviewed_by: admin_user_id
        })
        .or(`id.eq.${id},primary_question_id.eq.${delete_id},duplicate_question_id.eq.${delete_id}`);
    } catch (e) {
      // Update fallback store
      const record = fallbackStore.getById(id);
      if (record) {
        record.status = 'RESOLVED';
        record.resolution_action = action;
        record.reviewed_at = now;
        record.reviewed_by = admin_user_id;
        fallbackStore.upsert(record);
      }
      fallbackStore.deleteByQuestionId(delete_id);
    }

    return {
      resolved: true,
      duplicate_id: id,
      deleted_question_id: delete_id,
      kept_question_id: keep_id
    };
  },

  /**
   * Dismiss a flagged duplicate pair as distinct / false positive.
   *
   * @param {string} id - Duplicate record ID
   * @param {string} [admin_user_id] - Admin user UUID
   * @returns {Promise<Object>}
   */
  async dismissDuplicate(id, admin_user_id = null) {
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabaseAdmin
        .from('question_duplicates')
        .update({
          status: 'DISMISSED',
          resolution_action: 'DISMISSED',
          reviewed_at: now,
          reviewed_by: admin_user_id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      const record = fallbackStore.getById(id);
      if (record) {
        record.status = 'DISMISSED';
        record.resolution_action = 'DISMISSED';
        record.reviewed_at = now;
        record.reviewed_by = admin_user_id;
        fallbackStore.upsert(record);
        return record;
      }
      return { id, status: 'DISMISSED' };
    }
  },

  /**
   * Merge two questions: updates target question with desired fields, then deletes source question.
   *
   * @param {string} id - Duplicate record ID
   * @param {Object} params
   * @param {string} params.target_id - Question to update and keep
   * @param {string} params.source_id - Question to delete
   * @param {Object} [params.merged_fields] - Overriding fields for target question
   * @param {string} [params.admin_user_id] - Admin user UUID
   * @returns {Promise<Object>}
   */
  async mergeQuestions(id, { target_id, source_id, merged_fields = {}, admin_user_id = null }) {
    if (!target_id || !source_id) {
      const err = new Error('Both target_id and source_id are required for merge');
      err.statusCode = 400;
      throw err;
    }

    logger.info('deduplication.merge.requested', { id, target_id, source_id });

    // 1. Update target question if merged fields supplied
    if (Object.keys(merged_fields).length > 0) {
      await questionsService.updateQuestion(target_id, merged_fields);
    }

    // 2. Delete the source question
    await questionsService.deleteQuestion(source_id);

    // 3. Mark duplicate record as resolved with MERGED action
    const now = new Date().toISOString();
    try {
      await supabaseAdmin
        .from('question_duplicates')
        .update({
          status: 'RESOLVED',
          resolution_action: 'MERGED',
          reviewed_at: now,
          reviewed_by: admin_user_id
        })
        .or(`id.eq.${id},primary_question_id.eq.${source_id},duplicate_question_id.eq.${source_id}`);
    } catch (e) {
      const record = fallbackStore.getById(id);
      if (record) {
        record.status = 'RESOLVED';
        record.resolution_action = 'MERGED';
        record.reviewed_at = now;
        record.reviewed_by = admin_user_id;
        fallbackStore.upsert(record);
      }
      fallbackStore.deleteByQuestionId(source_id);
    }

    return {
      merged: true,
      duplicate_id: id,
      target_id,
      deleted_id: source_id
    };
  }
};
