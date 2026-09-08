import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { questionsService } from '../src/features/questions/questions.service.js';

describe('TooPrep - Question Bank Enhancements Tests', () => {
  describe('bulkMoveQuestions', () => {
    it('rejects bulkMove without ids array', async () => {
      await assert.rejects(
        async () => questionsService.bulkMoveQuestions([], 'topic-123'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /ids array must not be empty/);
          return true;
        }
      );
    });

    it('rejects bulkMove without targetTopicId', async () => {
      await assert.rejects(
        async () => questionsService.bulkMoveQuestions(['q1', 'q2'], ''),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /targetTopicId is required/);
          return true;
        }
      );
    });
  });

  describe('bulkImportQuestions', () => {
    it('rejects bulkImport without questions array', async () => {
      await assert.rejects(
        async () => questionsService.bulkImportQuestions([], 'topic-123'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /questions must be a non-empty array/);
          return true;
        }
      );
    });

    it('rejects bulkImport when all items fail validation', async () => {
      const invalidItems = [
        { question_text: '', options: { A: '1' }, correct_answer: 'A' },
        { question_text: 'Sample', options: null, correct_answer: 'A' }
      ];
      await assert.rejects(
        async () => questionsService.bulkImportQuestions(invalidItems, 'topic-123'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /failed validation/);
          return true;
        }
      );
    });
  });

  describe('solution filtering', () => {
    it('handles has_solution parameter without throwing', async () => {
      // Test filter builder execution
      const list = await questionsService.getQuestions(
        { has_solution: 'true', difficulty: 'easy' },
        { includeAnswers: true }
      );
      assert.ok(Array.isArray(list));
    });
  });
});
