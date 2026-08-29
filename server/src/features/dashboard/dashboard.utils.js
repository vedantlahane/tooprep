/**
 * Compute gap and status from confidence and evaluation attempts.
 *
 * @param {number|null} confidence - Latest confidence rating (1-10)
 * @param {Array|null} evalAttempts - Array of { correct, time_spent_seconds, questions: { source_type, difficulty } }
 * @returns {Object} - { evaluation_accuracy, gap, status, avg_time_seconds, pyq_accuracy, difficulty_breakdown }
 */
export function computeGapAndStatus(confidence, evalAttempts) {
  if (!evalAttempts || evalAttempts.length === 0) {
    return {
      evaluation_accuracy: null,
      gap: null,
      status: 'INSUFFICIENT_DATA',
      avg_time_seconds: null,
      pyq_accuracy: null,
      difficulty_breakdown: null
    };
  }

  const total = evalAttempts.length;
  const answered = evalAttempts.filter(a => a.correct !== null).length;
  const correct = evalAttempts.filter(a => a.correct === true).length;
  const performance = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  // Time metrics
  const avgTime = total > 0
    ? Math.round(evalAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / total)
    : null;

  // PYQ accuracy
  const pyqAttempts = evalAttempts.filter(a => a.questions?.source_type === 'PYQ');
  const pyqCorrect = pyqAttempts.filter(a => a.correct === true).length;
  const pyqAccuracy = pyqAttempts.length > 0 ? Math.round((pyqCorrect / pyqAttempts.length) * 100) : null;

  // Difficulty breakdown
  const diffBreakdown = {};
  for (const diff of ['easy', 'medium', 'hard']) {
    const diffAttempts = evalAttempts.filter(a => a.questions?.difficulty === diff);
    const diffCorrect = diffAttempts.filter(a => a.correct === true).length;
    diffBreakdown[diff] = {
      total: diffAttempts.length,
      correct: diffCorrect,
      accuracy: diffAttempts.length > 0 ? Math.round((diffCorrect / diffAttempts.length) * 100) : null
    };
  }

  // Gap calculation per §5.1
  let gap = null;
  let status = 'INSUFFICIENT_DATA';

  if (confidence !== null && confidence !== undefined) {
    const confidencePercentage = (confidence / 10) * 100;
    gap = performance - confidencePercentage;

    // Classification per §5.2
    if (total < 5) {
      status = 'INSUFFICIENT_DATA';
      gap = null; // Don't show gap with insufficient data
    } else if (total < 10) {
      status = 'PRELIMINARY';
    } else {
      if (gap >= 20) {
        status = 'UNDERCONFIDENT';
      } else if (gap <= -20) {
        status = 'OVERCONFIDENT';
      } else {
        // Check for weak-but-aligned
        if (performance < 50) {
          status = 'WEAK_ALIGNED';
        } else {
          status = 'ALIGNED';
        }
      }
    }
  }

  return {
    evaluation_accuracy: performance,
    gap,
    status,
    avg_time_seconds: avgTime,
    pyq_accuracy: pyqAccuracy,
    difficulty_breakdown: diffBreakdown
  };
}
