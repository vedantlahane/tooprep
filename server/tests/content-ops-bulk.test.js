import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { contentService } from '../src/features/content/content.service.js';

describe('TooPrep - Content Ops Bulk Operations Tests', () => {
  describe('bulkAcceptCandidates', () => {
    it('rejects empty candidateItems array with 400', async () => {
      await assert.rejects(
        async () => contentService.bulkAcceptCandidates('job_test_1', [], 'user_1'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /array of candidates/i);
          return true;
        }
      );
    });

    it('rejects null candidateItems with 400', async () => {
      await assert.rejects(
        async () => contentService.bulkAcceptCandidates('job_test_1', null, 'user_1'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /array of candidates/i);
          return true;
        }
      );
    });
  });

  describe('bulkRejectCandidates', () => {
    it('rejects empty candidateKeys array with 400', async () => {
      await assert.rejects(
        async () => contentService.bulkRejectCandidates('job_test_1', [], 'Duplicate', 'user_1'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /candidateKeys to reject is required/i);
          return true;
        }
      );
    });

    it('rejects empty reason string with 400', async () => {
      await assert.rejects(
        async () => contentService.bulkRejectCandidates('job_test_1', ['cand_1'], '', 'user_1'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /rejection reason is required/i);
          return true;
        }
      );
    });
  });

  describe('bulkAssignTopic', () => {
    it('rejects empty candidateKeys array with 400', async () => {
      await assert.rejects(
        async () => contentService.bulkAssignTopic('job_test_1', [], 'topic_shm', {}, 'user_1'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /array of candidateKeys is required/i);
          return true;
        }
      );
    });

    it('rejects empty topicId with 400', async () => {
      await assert.rejects(
        async () => contentService.bulkAssignTopic('job_test_1', ['cand_1'], '', {}, 'user_1'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /target topicId is required/i);
          return true;
        }
      );
    });
  });

  describe('deleteIngestionJob', () => {
    it('rejects empty jobId with 400', async () => {
      await assert.rejects(
        async () => contentService.deleteIngestionJob('', 'user_1'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /jobId is required/i);
          return true;
        }
      );
    });
  });
});
