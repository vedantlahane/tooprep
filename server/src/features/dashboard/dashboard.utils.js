/***
 * ============================================================================
 * Module:  dashboard.utils.js
 * Feature: Dashboard — Knowledge Map
 * Layer:   Pure Utility (no I/O, no side effects)
 * ============================================================================
 *
 * Core algorithm for the TooPrep confidence-performance gap analysis.
 *
 * This module contains the single pure function `computeGapAndStatus()` which
 * is the heart of the Knowledge Map feature. It takes a student's self-reported
 * confidence rating and their actual evaluation attempt results, then computes:
 *
 *   1. The numerical gap between perceived and actual ability
 *   2. A human-readable status classification
 *   3. Supplementary metrics (PYQ accuracy, difficulty breakdown, avg time)
 *
 * Design Decisions:
 * - Kept as a pure function (no database access, no side effects) so it can
 *   be called from both dashboard.service.js and topics.service.js without
 *   creating circular dependencies.
 * - Thresholds (±20%, 5-attempt minimum, 10-attempt "preliminary" cutoff)
 *   are derived from the product spec §5.1 and §5.2.
 * - Returns null for gap when data is insufficient, preventing misleading
 *   visualizations on the frontend.
 *
 * Status Priority (used for sorting in dashboard.service.js):
 *   OVERCONFIDENT → WEAK_ALIGNED → PRELIMINARY → INSUFFICIENT_DATA →
 *   UNDERCONFIDENT → ALIGNED
 *
 * ============================================================================
 ***/

/**
 * Compute the confidence-performance gap and classify the student's status
 * for a single topic.
 *
 * @description
 * The gap is calculated as: `performance% - confidence%`
 * where `confidence%` is `(confidence / 10) * 100` and `performance%` is
 * the percentage of correctly answered evaluation questions.
 *
 * A positive gap means the student performs better than they think (underconfident).
 * A negative gap means the student overestimates their ability (overconfident).
 *
 * Status classification thresholds (per §5.2):
 *   - `INSUFFICIENT_DATA`: fewer than 5 total attempts, or no eval data at all
 *   - `PRELIMINARY`:       5–9 attempts (gap is computed but flagged as early)
 *   - `OVERCONFIDENT`:     gap ≤ -20  (student thinks they know more than they do)
 *   - `UNDERCONFIDENT`:    gap ≥ +20  (student underestimates their actual ability)
 *   - `WEAK_ALIGNED`:      |gap| < 20 AND performance < 50%  (aligned but both low)
 *   - `ALIGNED`:           |gap| < 20 AND performance ≥ 50%  (healthy state)
 *
 * @param {number|null} confidence - The student's latest self-reported confidence
 *   rating on a 1–10 scale. Null if the student has never rated this topic.
 * @param {Array|null} evalAttempts - Array of evaluation attempt objects, each
 *   shaped as:
 *   ```
 *   {
 *     correct: boolean|null,          // whether the answer was correct
 *     time_spent_seconds: number,     // seconds spent on this question
 *     questions: {                    // joined question metadata
 *       source_type: string,          // e.g. 'PYQ' (Previous Year Question)
 *       difficulty: 'easy'|'medium'|'hard'
 *     }
 *   }
 *   ```
 *
 * @returns {Object} Computed analytics object:
 *   - `evaluation_accuracy` {number|null} — Percentage score (0–100), null if no data
 *   - `gap` {number|null} — Signed gap value (performance% - confidence%), null when
 *     data is insufficient
 *   - `status` {string} — One of: INSUFFICIENT_DATA, PRELIMINARY, OVERCONFIDENT,
 *     UNDERCONFIDENT, WEAK_ALIGNED, ALIGNED
 *   - `avg_time_seconds` {number|null} — Mean time per question across all attempts
 *   - `pyq_accuracy` {number|null} — Accuracy on PYQ-sourced questions only, null
 *     if no PYQ attempts exist
 *   - `difficulty_breakdown` {Object|null} — Per-difficulty stats:
 *     ```
 *     {
 *       easy:   { total, correct, accuracy },
 *       medium: { total, correct, accuracy },
 *       hard:   { total, correct, accuracy }
 *     }
 *     ```
 */
export function computeGapAndStatus(confidence, evalAttempts) {
  /* ── Early exit: no evaluation data at all ── */
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

  /* ── Step 1: Core accuracy calculation ──
   * `total`    = all attempts (including unanswered/skipped where correct is null)
   * `answered` = only attempts with a definitive correct/incorrect result
   * `correct`  = subset of answered that were correct
   * Performance percentage is based on answered (not total) to avoid penalizing
   * skipped questions in the accuracy metric. */
  const total = evalAttempts.length;
  const answered = evalAttempts.filter(a => a.correct !== null).length;
  const correct = evalAttempts.filter(a => a.correct === true).length;
  const performance = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  /* ── Step 2: Average time per question ──
   * Includes all attempts (even unanswered) in the denominator, since time
   * was still spent on skipped questions. Null-coalesces time to 0 for
   * safety against missing fields. */
  // Time metrics
  const avgTime = total > 0
    ? Math.round(evalAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / total)
    : null;

  /* ── Step 3: PYQ (Previous Year Question) accuracy ──
   * Filtered subset — only questions sourced from actual past exams.
   * Returns null if no PYQ questions were attempted, so the frontend
   * can hide this metric gracefully. */
  // PYQ accuracy
  const pyqAttempts = evalAttempts.filter(a => a.questions?.source_type === 'PYQ');
  const pyqCorrect = pyqAttempts.filter(a => a.correct === true).length;
  const pyqAccuracy = pyqAttempts.length > 0 ? Math.round((pyqCorrect / pyqAttempts.length) * 100) : null;

  /* ── Step 4: Difficulty breakdown ──
   * Iterates over the three canonical difficulty levels and computes
   * per-level stats. Questions not matching any of these levels are
   * silently excluded (defensive against bad data). */
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

  /* ── Step 5: Gap calculation (per product spec §5.1) ──
   * Formula:  gap = performance% - confidence%
   *
   * The confidence is on a 1–10 scale, so we normalize to percentage first.
   * A positive gap means the student is better than they think (underconfident).
   * A negative gap means the student overestimates themselves (overconfident). */
  // Gap calculation per §5.1
  let gap = null;
  let status = 'INSUFFICIENT_DATA';

  if (confidence !== null && confidence !== undefined) {
    const confidencePercentage = (confidence / 10) * 100;
    gap = performance - confidencePercentage;

    /* ── Step 6: Status classification (per product spec §5.2) ──
     * Priority order matters here:
     *   1. Sample size gates first (< 5 = insufficient, < 10 = preliminary)
     *   2. Then gap magnitude thresholds (±20% boundary)
     *   3. Finally, within the "aligned" band, distinguish weak from healthy
     *
     * When total < 5, gap is also nullified to prevent unstable early
     * readings from being displayed. */
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
