import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeGapAndStatus } from '../routes/dashboard.js';

describe('TooPrep - Confidence Gap & Status Classification Unit Tests', () => {

  it('should return INSUFFICIENT_DATA when evalAttempts is empty or null', () => {
    const res1 = computeGapAndStatus(8, null);
    assert.equal(res1.status, 'INSUFFICIENT_DATA');
    assert.equal(res1.gap, null);
    assert.equal(res1.evaluation_accuracy, null);

    const res2 = computeGapAndStatus(8, []);
    assert.equal(res2.status, 'INSUFFICIENT_DATA');
    assert.equal(res2.gap, null);
  });

  it('should return INSUFFICIENT_DATA when total attempts < 5', () => {
    const attempts = [
      { correct: true, time_spent_seconds: 60, questions: { difficulty: 'easy', source_type: 'PYQ' } },
      { correct: false, time_spent_seconds: 90, questions: { difficulty: 'medium', source_type: 'ORIGINAL' } },
      { correct: true, time_spent_seconds: 45, questions: { difficulty: 'easy', source_type: 'PYQ' } },
      { correct: true, time_spent_seconds: 75, questions: { difficulty: 'hard', source_type: 'ORIGINAL' } }
    ]; // 4 attempts total

    const res = computeGapAndStatus(7, attempts);
    assert.equal(res.status, 'INSUFFICIENT_DATA');
    assert.equal(res.gap, null);
    assert.equal(res.evaluation_accuracy, 75); // 3/4 = 75%
  });

  it('should classify as PRELIMINARY when total attempts is between 5 and 9', () => {
    const attempts = Array(7).fill({ correct: true, time_spent_seconds: 60, questions: { difficulty: 'easy', source_type: 'PYQ' } });

    const res = computeGapAndStatus(8, attempts);
    assert.equal(res.status, 'PRELIMINARY');
    assert.equal(res.evaluation_accuracy, 100);
    assert.equal(res.gap, 20); // 100% - (8*10%) = +20%
  });

  it('should classify as OVERCONFIDENT when gap <= -20 with >=10 attempts', () => {
    // 10 questions, 5 correct = 50% accuracy. Confidence = 8 (80%). Gap = 50 - 80 = -30 <= -20
    const attempts = [
      ...Array(5).fill({ correct: true, time_spent_seconds: 60, questions: { difficulty: 'easy', source_type: 'PYQ' } }),
      ...Array(5).fill({ correct: false, time_spent_seconds: 60, questions: { difficulty: 'hard', source_type: 'ORIGINAL' } })
    ];

    const res = computeGapAndStatus(8, attempts);
    assert.equal(res.evaluation_accuracy, 50);
    assert.equal(res.gap, -30);
    assert.equal(res.status, 'OVERCONFIDENT');
  });

  it('should classify as UNDERCONFIDENT when gap >= 20 with >=10 attempts', () => {
    // 10 questions, 8 correct = 80% accuracy. Confidence = 4 (40%). Gap = 80 - 40 = +40 >= 20
    const attempts = [
      ...Array(8).fill({ correct: true, time_spent_seconds: 60, questions: { difficulty: 'easy', source_type: 'PYQ' } }),
      ...Array(2).fill({ correct: false, time_spent_seconds: 60, questions: { difficulty: 'hard', source_type: 'ORIGINAL' } })
    ];

    const res = computeGapAndStatus(4, attempts);
    assert.equal(res.evaluation_accuracy, 80);
    assert.equal(res.gap, 40);
    assert.equal(res.status, 'UNDERCONFIDENT');
  });

  it('should classify as WEAK_ALIGNED when |gap| < 20 and performance < 50%', () => {
    // 10 questions, 4 correct = 40% accuracy. Confidence = 4 (40%). Gap = 40 - 40 = 0. Performance 40% < 50%
    const attempts = [
      ...Array(4).fill({ correct: true, time_spent_seconds: 60, questions: { difficulty: 'medium', source_type: 'PYQ' } }),
      ...Array(6).fill({ correct: false, time_spent_seconds: 60, questions: { difficulty: 'hard', source_type: 'ORIGINAL' } })
    ];

    const res = computeGapAndStatus(4, attempts);
    assert.equal(res.evaluation_accuracy, 40);
    assert.equal(res.gap, 0);
    assert.equal(res.status, 'WEAK_ALIGNED');
  });

  it('should classify as ALIGNED when |gap| < 20 and performance >= 50%', () => {
    // 10 questions, 7 correct = 70% accuracy. Confidence = 7 (70%). Gap = 70 - 70 = 0. Performance 70% >= 50%
    const attempts = [
      ...Array(7).fill({ correct: true, time_spent_seconds: 60, questions: { difficulty: 'medium', source_type: 'PYQ' } }),
      ...Array(3).fill({ correct: false, time_spent_seconds: 60, questions: { difficulty: 'hard', source_type: 'ORIGINAL' } })
    ];

    const res = computeGapAndStatus(7, attempts);
    assert.equal(res.evaluation_accuracy, 70);
    assert.equal(res.gap, 0);
    assert.equal(res.status, 'ALIGNED');
  });

  it('should accurately compute difficulty breakdown and PYQ metrics', () => {
    const attempts = [
      { correct: true, time_spent_seconds: 30, questions: { difficulty: 'easy', source_type: 'PYQ' } },
      { correct: true, time_spent_seconds: 40, questions: { difficulty: 'easy', source_type: 'PYQ' } },
      { correct: false, time_spent_seconds: 50, questions: { difficulty: 'medium', source_type: 'PYQ' } },
      { correct: true, time_spent_seconds: 60, questions: { difficulty: 'medium', source_type: 'ORIGINAL' } },
      { correct: false, time_spent_seconds: 120, questions: { difficulty: 'hard', source_type: 'ORIGINAL' } }
    ];

    const res = computeGapAndStatus(5, attempts);
    assert.equal(res.avg_time_seconds, 60); // (30+40+50+60+120)/5 = 300/5 = 60
    assert.equal(res.pyq_accuracy, 67); // 3 PYQs: 2 correct = 67%
    assert.equal(res.difficulty_breakdown.easy.accuracy, 100);
    assert.equal(res.difficulty_breakdown.medium.accuracy, 50);
    assert.equal(res.difficulty_breakdown.hard.accuracy, 0);
  });

});
