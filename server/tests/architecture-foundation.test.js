import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { toStudentQuestion } from '../src/features/questions/question.dto.js';
import {
  CONTENT_LIFECYCLE,
  INGESTION_STAGES,
  assertLifecycleStatus,
  assertIngestionStage,
  createQuestionId,
  createSyncKey,
  createVectorPointId
} from '../src/features/content/content.contracts.js';
import { assertIngestionTransition, nextRetryAt } from '../src/features/content/ingestion-state.js';
import { validateQuestionInput } from '../src/features/questions/question.validation.js';
import { buildContentDraft, buildIngestionJob } from '../src/features/content/content.service.js';
import { extractQuestionCandidates } from '../src/features/content/question-extraction.js';
import { assertContentTransition } from '../src/features/content/content-lifecycle.js';
import { buildVectorDocument } from '../src/features/content/embedding.provider.js';

describe('TooPrep - architecture foundation contracts', () => {
  it('never returns an answer or solution in the student question DTO', () => {
    const question = {
      id: 'legacy-id',
      canonical_question_id: 'q_01',
      topic_id: 'topic-id',
      source_type: 'PYQ',
      question_type: 'single_correct',
      question_text: 'What is 2 + 2?',
      options: [{ id: 'A', text: '4' }],
      difficulty: 'easy',
      correct_answer: 'A',
      solution_text: '2 + 2 equals 4'
    };

    const studentQuestion = toStudentQuestion(question);
    assert.equal(studentQuestion.question_text, question.question_text);
    assert.equal('correct_answer' in studentQuestion, false);
    assert.equal('solution_text' in studentQuestion, false);
  });

  it('defines guarded content and ingestion states', () => {
    assert.ok(CONTENT_LIFECYCLE.includes('PUBLISHED'));
    assert.ok(INGESTION_STAGES.includes('AWAITING_REVIEW'));
    assert.equal(assertLifecycleStatus('VERIFIED'), 'VERIFIED');
    assert.equal(assertIngestionStage('PARSING'), 'PARSING');
    assert.throws(() => assertLifecycleStatus('AUTO_PUBLISHED'));
    assert.throws(() => assertIngestionStage('DONE'));
  });

  it('creates storage-independent question and idempotent sync identities', () => {
    const questionId = createQuestionId();
    assert.match(questionId, /^q_[a-f0-9]{32}$/);
    assert.equal(createSyncKey(questionId, 2, 'VECTOR'), `${questionId}:v2:VECTOR`);
    assert.equal(createVectorPointId(questionId), createVectorPointId(questionId));
    assert.match(createVectorPointId(questionId), /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    assert.throws(() => createSyncKey(questionId, 0, 'VECTOR'));
  });

  it('builds a search document without leaking the answer or solution', () => {
    const text = buildVectorDocument({
      content: { question_text: 'What is 2 + 2?', options: [{ id: 'A', text: '4' }], correct_answer: 'A', solution_text: 'Add them.' },
      curriculum: { subject: 'Mathematics', topic: 'Arithmetic' },
      provenance: { exam: 'JEE Main' }
    });
    assert.match(text, /What is 2 \+ 2/);
    assert.match(text, /A: 4/);
    assert.equal(text.includes('Add them.'), false);
  });

  it('allows only resumable ingestion job transitions with bounded retry delays', () => {
    assert.equal(assertIngestionTransition('PARSING', 'STRUCTURING'), 'STRUCTURING');
    assert.equal(assertIngestionTransition('PAUSED', 'PARSING'), 'PARSING');
    assert.throws(() => assertIngestionTransition('COMPLETED', 'PARSING'));
    assert.equal(nextRetryAt(1, new Date('2026-01-01T00:00:00Z')).toISOString(), '2026-01-01T00:01:00.000Z');
    assert.equal(nextRetryAt(20, new Date('2026-01-01T00:00:00Z')).toISOString(), '2026-01-01T01:00:00.000Z');
  });

  it('validates admin question payloads before persistence', () => {
    const valid = {
      topic_id: 'topic-id',
      source_type: 'PYQ',
      question_text: 'What is 2 + 2?',
      options: [{ id: 'A', text: '4' }, { id: 'B', text: '5' }],
      correct_answer: 'A',
      difficulty: 'easy',
      verified: false
    };
    assert.doesNotThrow(() => validateQuestionInput(valid));
    assert.throws(() => validateQuestionInput({ ...valid, correct_answer: 'C' }));
    assert.throws(() => validateQuestionInput({ ...valid, options: [{ id: 'A', text: '4' }] }));
  });

  it('builds canonical drafts and resumable ingestion jobs without storage-specific ids', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const draft = buildContentDraft({
      question_text: 'Find x',
      options: [{ id: 'A', text: '1' }],
      correct_answer: 'A',
      source_pages: [3, 4],
      exam: 'JEE Main',
      curriculum: { subject: 'Mathematics' }
    }, 'admin-id', now);
    assert.match(draft.question_id, /^q_[a-f0-9]{32}$/);
    assert.equal(draft.lifecycle.status, 'RAW');
    assert.equal(draft.provenance.source_pages[0], 3);
    assert.equal(draft.synchronization.vector.status, 'NOT_REQUESTED');

    const job = buildIngestionJob({
      source_storage_path: 'papers/jee-main-2025.pdf',
      source_sha256: 'a'.repeat(64),
      filename: 'jee-main-2025.pdf'
    }, 'admin-id', now);
    assert.match(job.job_id, /^ing_[a-f0-9]{32}$/);
    assert.equal(job.stage, 'CREATED');
    assert.equal(job.progress.processed_pages, 0);
  });

  it('extracts only numbered parser blocks as review-required candidates', () => {
    const candidates = extractQuestionCandidates('ing_123', [{
      page_number: 2,
      success: true,
      markdown: '1. Solve $x + 1 = 2$.\n\n2) What is the SI unit of force?\n\nA note, not a question.'
    }]);
    assert.equal(candidates.length, 2);
    assert.equal(candidates[0].status, 'REVIEW_REQUIRED');
    assert.deepEqual(candidates[0].source_pages, [2]);
    assert.match(candidates[0].candidate_key, /^[a-f0-9]{64}$/);
  });

  it('requires explicit content verification before publication', () => {
    assert.equal(assertContentTransition('REVIEW_REQUIRED', 'VERIFIED'), 'VERIFIED');
    assert.equal(assertContentTransition('VERIFIED', 'PUBLISHED'), 'PUBLISHED');
    assert.throws(() => assertContentTransition('RAW', 'PUBLISHED'));
  });

  it('includes the additive architecture migration with RLS protection', async () => {
    const migration = await readFile(new URL('../../supabase/migrations/004_architecture_hardening.sql', import.meta.url), 'utf8');
    assert.match(migration, /add column if not exists canonical_question_id/i);
    assert.match(migration, /alter column canonical_question_id set not null/i);
    assert.match(migration, /create table if not exists content_sync_events/i);
    assert.match(migration, /alter table content_sync_events enable row level security/i);
  });
});
