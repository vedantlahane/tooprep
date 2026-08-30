import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { evaluationsService } from '../services/evaluationsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import { practiceService } from '@/features/practice/services/practiceService';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';
import { MathText } from '@/features/questions/components/QuestionCard';

export default function ResultsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState(location.state?.result || null);
  const [topicId, setTopicId] = useState(location.state?.topicId || null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState('');

  // Confidence re-rating
  const [showConfidencePrompt, setShowConfidencePrompt] = useState(true);
  const [newConfidence, setNewConfidence] = useState(5);
  const [confidenceSubmitted, setConfidenceSubmitted] = useState(false);
  const [confidenceLoading, setConfidenceLoading] = useState(false);

  // Re-drill state
  const [reDrillLoading, setReDrillLoading] = useState(false);

  useEffect(() => {
    if (!result) {
      loadResults();
    }
  }, [id]);

  const loadResults = async () => {
    try {
      const data = await evaluationsService.getEvaluation(id);
      setResult(data);
      setTopicId(data.evaluation?.topic_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfidenceSubmit = async () => {
    if (!topicId) return;
    setConfidenceLoading(true);
    try {
      await confidenceService.setConfidence(topicId, newConfidence, 'POST_EVALUATION');
      setConfidenceSubmitted(true);
      setShowConfidencePrompt(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfidenceLoading(false);
    }
  };

  const handleReDrill = async () => {
    if (!topicId || mistakes.length === 0) return;
    setReDrillLoading(true);
    try {
      const data = await practiceService.startTargetedSession(
        topicId,
        mistakes.map(m => m.question_id)
      );
      navigate('/practice', { state: { session: data.session, questions: data.questions } });
    } catch (err) {
      setError(err.message);
    } finally {
      setReDrillLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse-soft text-primary text-headline-md">Loading results...</div>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="p-4 rounded-lg bg-error-container/20 border border-error/30 text-error text-body-md">{error}</div>
        <button onClick={() => navigate('/')} className="mt-4 text-primary hover:underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const summary = result?.summary;
  const mistakes = result?.mistakes || [];
  const diffBreakdown = summary?.difficulty_breakdown;

  const recommendation = (() => {
    if (!summary) return null;

    if (summary.accuracy < 45) {
      return {
        title: 'Reset fundamentals first',
        tone: 'error',
        description: 'This topic is currently weak. Start with short foundation practice and only return to timed tests after your accuracy climbs above 60%.',
        cta: 'Practice foundation',
        target: '/practice'
      };
    }

    if (summary.accuracy < 70) {
      return {
        title: 'Focus on consistency, not speed',
        tone: 'primary',
        description: 'You have enough base knowledge to improve quickly. Revisit the missed concepts with targeted practice and then re-evaluate in 24–48 hours.',
        cta: 'Take a targeted drill',
        target: '/practice'
      };
    }

    return {
      title: 'Strong grasp—tighten the edges',
      tone: 'success',
      description: 'Your scores indicate solid command. Use the next session to push speed and reduce silly mistakes, then schedule a timed check on the same topic.',
      cta: 'Re-test this topic',
      target: '/evaluate'
    };
  })();

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* POST_EVALUATION Confidence Re-Rating Prompt */}
      {showConfidencePrompt && !confidenceSubmitted && topicId && (
        <div className="mb-6 bg-primary-fixed/20 border-2 border-primary-fixed rounded-xl p-6 animate-fade-in">
          <div className="flex items-start gap-3 mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
            <div>
              <h3 className="text-headline-md text-on-surface">Re-rate Your Confidence</h3>
              <p className="text-body-md text-on-surface-variant mt-1">
                Now that you've completed this evaluation, how confident do you feel about this topic?
              </p>
            </div>
          </div>
          <ConfidenceSlider value={newConfidence} onChange={setNewConfidence} />
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleConfidenceSubmit}
              disabled={confidenceLoading}
              className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-body-md font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {confidenceLoading ? 'Saving...' : 'Save Confidence Rating'}
            </button>
            <button
              onClick={() => setShowConfidencePrompt(false)}
              className="px-4 py-2.5 rounded-lg border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {confidenceSubmitted && (
        <div className="mb-6 p-4 rounded-lg bg-tertiary-container/10 border border-tertiary-container text-body-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary-container">check_circle</span>
          Confidence updated to <strong>{newConfidence}/10</strong>. Your gap will be recalculated.
        </div>
      )}

      {/* Results Header */}
      <h2 className="text-display text-on-surface mb-6">Evaluation Results</h2>

      {recommendation && (
        <div className={`mb-6 rounded-xl border p-6 ${
          recommendation.tone === 'error'
            ? 'border-error bg-error/10 text-error'
            : recommendation.tone === 'primary'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-status-aligned bg-status-aligned/10 text-status-aligned'
        }`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-label-sm-mono uppercase tracking-widest">Next recommendation</div>
              <div className="mt-2 text-headline-md">{recommendation.title}</div>
              <p className="mt-2 text-body-md max-w-2xl">{recommendation.description}</p>
            </div>
            <button
              onClick={() => navigate(recommendation.target, { state: topicId ? { topic: topicId } : undefined })}
              className="px-4 py-3 rounded-lg border border-current bg-white/10 text-body-md font-semibold hover:opacity-90 transition-colors"
            >
              {recommendation.cta}
            </button>
          </div>
        </div>
      )}

      {/* Score Cards */}
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-center">
              <div className="text-headline-lg text-primary font-bold">{summary.correct}/{summary.total_questions}</div>
              <div className="text-label-sm-mono text-on-surface-variant mt-1">Score</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-center">
              <div className={`text-headline-lg font-bold ${
                summary.accuracy >= 70 ? 'text-tertiary-container' :
                summary.accuracy >= 40 ? 'text-status-weak' : 'text-error'
              }`}>
                {summary.accuracy}%
              </div>
              <div className="text-label-sm-mono text-on-surface-variant mt-1">Accuracy</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-center">
              <div className="text-headline-lg text-on-surface font-bold">{summary.attempt_rate}%</div>
              <div className="text-label-sm-mono text-on-surface-variant mt-1">Attempt Rate</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-center">
              <div className="text-headline-lg text-on-surface font-bold font-mono">
                {Math.floor(summary.avg_time_seconds / 60)}:{String(summary.avg_time_seconds % 60).padStart(2, '0')}
              </div>
              <div className="text-label-sm-mono text-on-surface-variant mt-1">Avg Time/Q</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-center">
              <div className={`text-headline-lg font-bold ${
                summary.pyq_accuracy !== null && summary.pyq_accuracy >= 70 ? 'text-tertiary-container' :
                summary.pyq_accuracy !== null && summary.pyq_accuracy >= 40 ? 'text-status-weak' : 'text-on-surface-variant'
              }`}>
                {summary.pyq_accuracy !== null ? `${summary.pyq_accuracy}%` : '—'}
              </div>
              <div className="text-label-sm-mono text-on-surface-variant mt-1">PYQ Accuracy</div>
            </div>
          </div>
          {summary.attempt_rate < 100 && (
            <div className="mb-6 px-4 py-2 bg-error/10 border-l-4 border-error text-error text-body-sm rounded-r-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>You left {summary.total_questions - summary.answered} questions unanswered. In real exams, unattempted questions yield 0 marks — practice pacing to attempt all questions.</span>
            </div>
          )}
        </>
      )}

      {/* Difficulty Breakdown */}
      {diffBreakdown && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5 mb-6">
          <h3 className="text-label-sm-mono text-on-surface-variant mb-4">DIFFICULTY BREAKDOWN</h3>
          <div className="grid grid-cols-3 gap-4">
            {['easy', 'medium', 'hard'].map(diff => {
              const d = diffBreakdown[diff];
              if (!d || d.total === 0) return null;
              return (
                <div key={diff} className="text-center">
                  <div className={`text-headline-md font-bold ${
                    diff === 'easy' ? 'text-tertiary-container' :
                    diff === 'medium' ? 'text-status-weak' : 'text-error'
                  }`}>
                    {d.accuracy !== null ? `${d.accuracy}%` : '—'}
                  </div>
                  <div className="text-body-md text-on-surface mt-1 capitalize">{diff}</div>
                  <div className="text-label-sm-mono text-on-surface-variant">{d.correct}/{d.total}</div>
                  {/* Mini progress bar */}
                  <div className="w-full h-1.5 bg-surface-container rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        diff === 'easy' ? 'bg-tertiary-container' :
                        diff === 'medium' ? 'bg-status-weak' : 'bg-error'
                      }`}
                      style={{ width: `${d.accuracy || 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mistakes List */}
      {mistakes.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-label-sm-mono text-on-surface-variant">
              MISTAKES ({mistakes.length})
            </h3>
            <button
              onClick={handleReDrill}
              disabled={reDrillLoading}
              className="px-4 py-2 bg-error text-white text-label-sm-mono uppercase tracking-widest font-semibold hover:bg-error/80 transition-colors rounded-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              {reDrillLoading ? 'Starting Drill...' : 'Re-drill Mistakes'}
            </button>
          </div>
          <div className="space-y-4">
            {mistakes.map((m, i) => (
              <div key={i} className="p-4 rounded-lg bg-error-container/5 border border-error/10">
                <div className="flex items-start gap-3 mb-2">
                  <span className={`text-label-sm-mono px-2 py-0.5 rounded border-l-2 ${
                    m.difficulty === 'easy' ? 'bg-tertiary-container/10 text-tertiary-container border-tertiary-container' :
                    m.difficulty === 'medium' ? 'bg-status-weak/10 text-status-weak border-status-weak' :
                    'bg-error-container/20 text-error border-error'
                  }`}>
                    {m.difficulty?.toUpperCase()}
                  </span>
                </div>
                <div className="text-body-md text-on-surface mb-2">
                  <MathText text={m.question_text} />
                </div>
                <div className="flex gap-4 text-body-md">
                  <span className="text-error">Your answer: <strong>{m.selected_answer || 'Skipped'}</strong></span>
                  <span className="text-tertiary-container">Correct: <strong>{m.correct_answer}</strong></span>
                </div>
                {m.solution_text && (
                  <div className="mt-3 p-3 rounded-lg bg-[#F0F7FF] border border-primary-fixed">
                    <div className="text-label-sm-mono text-primary font-bold mb-1">SOLUTION</div>
                    <div className="text-body-md text-on-surface">
                      <MathText text={m.solution_text} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleReDrill}
            disabled={reDrillLoading}
            className="w-full mt-6 py-3.5 bg-error text-white text-body-md font-semibold uppercase tracking-widest hover:bg-error/80 transition-colors rounded-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            {reDrillLoading ? 'Starting Targeted Session...' : `Practice All ${mistakes.length} Mistakes Now`}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-3 rounded-lg border border-outline-variant text-body-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          Back to Dashboard
        </button>
        {topicId && (
          <button
            onClick={() => navigate(`/topics/${topicId}`)}
            className="flex-1 py-3 rounded-lg bg-primary-container text-on-primary text-body-md font-semibold hover:bg-primary transition-colors"
          >
            View Topic Detail
          </button>
        )}
      </div>
    </div>
  );
}

