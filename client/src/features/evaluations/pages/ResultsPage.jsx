import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { evaluationsService } from '../services/evaluationsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import { practiceService } from '@/features/practice/services/practiceService';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';
import { MathText } from '@/features/questions/components/QuestionCard';
import Icon, { Sparkles, CheckCircle2, AlertTriangle, RotateCcw, ArrowLeft, BookOpen } from '@/shared/components/Icon';

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
    <div className="max-w-4xl mx-auto animate-fade-in pb-16 space-y-8">
      {/* Telemetry Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            EVALUATION // PERFORMANCE DEBRIEF & METRIC CALIBRATION
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight lowercase">
            evaluation results
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Empirical accuracy analysis vs. perceived self-confidence baseline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-white/10 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            knowledge map
          </button>
          {topicId && (
            <button
              onClick={() => navigate(`/practice?topic=${topicId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors"
            >
              drill topic
            </button>
          )}
        </div>
      </div>

      {/* POST_EVALUATION Confidence Re-Rating Prompt */}
      {showConfidencePrompt && !confidenceSubmitted && topicId && (
        <div className="acrylic-glass border border-primary/40 rounded-md p-6 animate-fade-in relative overflow-hidden">
          <div className="flex items-start gap-4 mb-4">
            <Sparkles className="w-7 h-7 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Calibration Check</div>
              <h3 className="text-xl font-light text-white">Re-rate Your Confidence</h3>
              <p className="text-sm text-white/60 mt-1">
                Now that you have completed this timed evaluation, how confident do you feel about this topic?
              </p>
            </div>
          </div>
          <ConfidenceSlider value={newConfidence} onChange={setNewConfidence} />
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleConfidenceSubmit}
              disabled={confidenceLoading}
              className="flex-1 py-3 bg-primary text-white text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all rounded-sm disabled:opacity-50"
            >
              {confidenceLoading ? 'Saving...' : 'Save Updated Rating'}
            </button>
            <button
              onClick={() => setShowConfidencePrompt(false)}
              className="px-6 py-3 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-mono uppercase tracking-widest rounded-sm transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {confidenceSubmitted && (
        <div className="p-4 bg-status-aligned/10 border border-status-aligned/30 text-sm text-white flex items-center gap-3 rounded-sm font-mono">
          <CheckCircle2 className="w-5 h-5 text-status-aligned flex-shrink-0" />
          <span>Confidence recalibrated to <strong>{newConfidence}/10</strong>. Knowledge map gap score will update immediately.</span>
        </div>
      )}

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="p-4 bg-surface-container border border-white/10 rounded-sm text-center">
              <div className="text-2xl md:text-3xl font-light text-primary font-mono">{summary.correct}/{summary.total_questions}</div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-white/50 mt-1">Score</div>
            </div>
            <div className="p-4 bg-surface-container border border-white/10 rounded-sm text-center">
              <div className={`text-2xl md:text-3xl font-light font-mono ${
                summary.accuracy >= 70 ? 'text-status-aligned' :
                summary.accuracy >= 40 ? 'text-status-weak' : 'text-error'
              }`}>
                {summary.accuracy}%
              </div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-white/50 mt-1">Accuracy</div>
            </div>
            <div className="p-4 bg-surface-container border border-white/10 rounded-sm text-center">
              <div className="text-2xl md:text-3xl font-light text-white font-mono">{summary.attempt_rate}%</div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-white/50 mt-1">Attempt Rate</div>
            </div>
            <div className="p-4 bg-surface-container border border-white/10 rounded-sm text-center">
              <div className="text-2xl md:text-3xl font-light text-white font-mono">
                {Math.floor(summary.avg_time_seconds / 60)}:{String(summary.avg_time_seconds % 60).padStart(2, '0')}
              </div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-white/50 mt-1">Avg Time/Q</div>
            </div>
            <div className="p-4 bg-surface-container border border-white/10 rounded-sm text-center col-span-2 sm:col-span-1">
              <div className={`text-2xl md:text-3xl font-light font-mono ${
                summary.pyq_accuracy !== null && summary.pyq_accuracy >= 70 ? 'text-status-aligned' :
                summary.pyq_accuracy !== null && summary.pyq_accuracy >= 40 ? 'text-status-weak' : 'text-white/50'
              }`}>
                {summary.pyq_accuracy !== null ? `${summary.pyq_accuracy}%` : '—'}
              </div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-white/50 mt-1">PYQ Accuracy</div>
            </div>
          </div>

          {summary.attempt_rate < 100 && (
            <div className="px-4 py-3 bg-error/10 border border-error/30 text-error text-xs font-mono rounded-sm flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>You left {summary.total_questions - summary.answered} questions unattempted. In JEE Main, unattempted questions yield 0 marks — practice pacing to attempt every solvable question.</span>
            </div>
          )}
        </>
      )}

      {/* Difficulty Breakdown */}
      {diffBreakdown && (
        <div className="acrylic-glass border border-white/10 rounded-md p-6">
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            DIFFICULTY ACCURACY BREAKDOWN
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {['easy', 'medium', 'hard'].map(diff => {
              const d = diffBreakdown[diff];
              if (!d || d.total === 0) return null;
              const colorClass = diff === 'easy' ? 'text-status-aligned' : diff === 'medium' ? 'text-status-weak' : 'text-error';
              const barClass = diff === 'easy' ? 'bg-status-aligned' : diff === 'medium' ? 'bg-status-weak' : 'bg-error';

              return (
                <div key={diff} className="bg-surface-container/60 border border-white/5 rounded-sm p-4 text-center">
                  <div className={`text-2xl font-light font-mono ${colorClass}`}>
                    {d.accuracy !== null ? `${d.accuracy}%` : '—'}
                  </div>
                  <div className="text-xs font-mono uppercase tracking-wider text-white mt-1 capitalize">{diff}</div>
                  <div className="text-[11px] font-mono text-white/40 mt-0.5">{d.correct}/{d.total} correct</div>
                  {/* Mini progress bar */}
                  <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full ${barClass} transition-all duration-500`}
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
        <div className="acrylic-glass border border-white/10 rounded-md p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-error flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                ERROR ANALYSIS & MISSED QUESTIONS ({mistakes.length})
              </h3>
              <p className="text-xs text-white/50 font-mono mt-1">Review the step-by-step verified solutions or re-drill missed items.</p>
            </div>
            <button
              onClick={handleReDrill}
              disabled={reDrillLoading}
              className="px-4 py-2 bg-error text-white text-xs font-mono uppercase tracking-widest font-semibold hover:bg-error/80 transition-colors rounded-sm flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {reDrillLoading ? 'Starting Drill...' : 'Re-drill Mistakes'}
            </button>
          </div>

          <div className="space-y-4">
            {mistakes.map((m, i) => (
              <div key={i} className="p-5 rounded-sm bg-surface-container/40 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-xs uppercase tracking-wider ${
                    m.difficulty === 'easy' ? 'bg-status-aligned/15 text-status-aligned border border-status-aligned/30' :
                    m.difficulty === 'medium' ? 'bg-status-weak/15 text-status-weak border border-status-weak/30' :
                    'bg-error/15 text-error border border-error/30'
                  }`}>
                    {m.difficulty || 'MEDIUM'}
                  </span>
                  {m.source_type && (
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-xs uppercase">
                      {m.source_type}
                    </span>
                  )}
                </div>

                <div className="text-sm md:text-base text-white/90 mb-4 leading-relaxed font-sans">
                  <MathText text={m.question_text} />
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-mono p-3 bg-black/40 border border-white/5 rounded-sm">
                  <span className="text-error">Your answer: <strong>{m.selected_answer || 'Skipped'}</strong></span>
                  <span className="text-status-aligned">Correct answer: <strong>{m.correct_answer}</strong></span>
                </div>

                {m.solution_text && (
                  <div className="mt-4 p-4 rounded-sm bg-surface-elevated/50 border border-primary/30">
                    <div className="text-xs font-mono text-primary font-bold tracking-widest uppercase mb-2">VERIFIED STEP-BY-STEP SOLUTION</div>
                    <div className="text-sm text-white/90 leading-relaxed font-sans">
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
            className="w-full mt-6 py-3.5 bg-error text-white text-xs font-mono font-bold uppercase tracking-widest hover:bg-error/80 transition-colors rounded-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {reDrillLoading ? 'Starting Targeted Session...' : `Practice All ${mistakes.length} Mistakes Now`}
          </button>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-3.5 border border-white/15 text-white/80 hover:text-white hover:border-white/30 text-xs font-mono uppercase tracking-widest rounded-sm transition-colors text-center"
        >
          Return to Knowledge Map
        </button>
        {topicId && (
          <button
            onClick={() => navigate(`/topics/${topicId}`)}
            className="flex-1 py-3.5 bg-primary text-white text-xs font-mono uppercase tracking-widest font-semibold hover:brightness-110 transition-all rounded-sm text-center"
          >
            View Full Topic Telemetry
          </button>
        )}
      </div>
    </div>
  );
}

