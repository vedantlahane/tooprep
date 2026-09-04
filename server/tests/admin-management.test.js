import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { questionsService } from '../src/features/questions/questions.service.js';
import { adminService } from '../src/features/admin/admin.service.js';
import { closeMongoConnection } from '../src/lib/mongodb.js';

describe('TooPrep - Admin Management & Observability Tests', () => {
  after(async () => {
    await closeMongoConnection();
  });
  it('rejects updateQuestion without an id', async () => {
    await assert.rejects(
      async () => questionsService.updateQuestion('', { difficulty: 'hard' }),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Question ID is required/);
        return true;
      }
    );
  });

  it('rejects deleteQuestion without an id', async () => {
    await assert.rejects(
      async () => questionsService.deleteQuestion(''),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Question ID is required/);
        return true;
      }
    );
  });

  it('rejects toggleVerifyQuestion without an id', async () => {
    await assert.rejects(
      async () => questionsService.toggleVerifyQuestion('', true),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Question ID is required/);
        return true;
      }
    );
  });

  it('provides comprehensive system observability structure', async () => {
    const telemetry = await adminService.getSystemObservability();
    assert.ok(telemetry.timestamp);
    assert.ok(telemetry.students);
    assert.ok(telemetry.questions);
    assert.equal(typeof telemetry.questions.total, 'number');
    assert.ok(telemetry.questions.by_subject);
    assert.ok(telemetry.questions.by_difficulty);
    assert.ok(telemetry.evaluations);
    assert.ok(telemetry.runtime);
    assert.ok(telemetry.runtime.memory);
    assert.equal(typeof telemetry.runtime.uptime_seconds, 'number');
  });

  it('provides curriculum coverage analysis with zero and low coverage tracking', async () => {
    const curriculum = await adminService.getCurriculumCoverage();
    assert.ok(curriculum.summary);
    assert.equal(typeof curriculum.summary.total_topics, 'number');
    assert.equal(typeof curriculum.summary.low_coverage_topics, 'number');
    assert.ok(Array.isArray(curriculum.subjects));
    if (curriculum.subjects.length > 0) {
      const firstSubject = curriculum.subjects[0];
      assert.ok(firstSubject.name);
      assert.ok(Array.isArray(firstSubject.chapters));
    }
  });
});
