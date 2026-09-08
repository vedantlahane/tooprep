import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { evaluationsService } from '../services/evaluationsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import { practiceService } from '@/features/practice/services/practiceService';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';
import { MathText } from '@/features/questions/components/QuestionCard';
import Icon, { Sparkles, CheckCircle2, AlertTriangle, RotateCcw, ArrowLeft, BookOpen, Timer, Play, ArrowRight } from '@/shared/components/Icon';

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
      <div className="w-full max-w-2xl mr-auto py-10 text-left">
        <div className="p-4 rounded-sm bg-error-container/20 border border-error/30 text-error text-body-md">{error}</div>
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
    <div className="w-full min-w-0 animate-fade-in pb-20 space-y-8 text-left">
      {/* Header Bar */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Evaluation Debrief &middot; Performance Analysis
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight">
            Evaluation Results
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Empirical accuracy analysis vs. perceived self-confidence baseline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-white/15 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-none transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            knowledge map
          </button>
          {topicId && (
            <button
              onClick={() => navigate(`/practice?topic=${topicId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-black text-xs font-mono uppercase tracking-wider font-bold rounded-none transition-all"
            >
              drill topic
            </button>
          )}
        </div>
      </div>

      {/* Main Dual-Pane Responsive Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Main Debrief, Mistakes, Solutions) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
          {/* Recommendation Banner */}
          {recommendation && (
            <div className={`p-6 border text-left ${
              recommendation.tone === 'error'
                ? 'border-error/40 bg-error/10 text-error'
                : recommendation.tone === 'primary'
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-status-aligned/40 bg-status-aligned/10 text-status-aligned'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="text-[10px] font-mono uppercase tracking-widest opacity-80">Next Tactical Step</div>
                  <div className="text-xl md:text-2xl font-light text-white">{recommendation.title}</div>
                  <p className="text-xs text-white/80 font-mono leading-relaxed mt-2">{recommendation.description}</p>
                </div>
                <button
                  onClick={() => navigate(recommendation.target, { state: topicId ? { topic: topicId } : undefined })}
                  className="px-5 py-2.5 bg-primary text-black font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all rounded-none self-start sm:self-center shrink-0 cursor-pointer shadow-md shadow-primary/20"
                >
                  {recommendation.cta}
                </button>
              </div>
            </div>
          )}

          {/* Unattempted Warning */}
          {summary && summary.attempt_rate < 100 && (
            <div className="px-4 py-3 bg-error/10 border border-error/30 text-error text-xs font-mono flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>You left {summary.total_questions - summary.answered} questions unattempted. In JEE Main, unattempted questions score 0 — pace yourself to at least review all solvable questions.</span>
            </div>
          )}

          {/* Missed Questions / Error Analysis */}
          {mistakes.length > 0 ? (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-error flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    ERROR ANALYSIS &amp; MISSED QUESTIONS ({mistakes.length})
                  </h3>
                  <p className="text-xs text-white/50 font-mono mt-1">Review step-by-step verified solutions or re-drill missed items.</p>
                </div>
                <button
                  onClick={handleReDrill}
                  disabled={reDrillLoading}
                  className="px-4 py-2 bg-error text-white text-xs font-mono uppercase tracking-widest font-semibold hover:bg-error/80 transition-colors rounded-none flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {reDrillLoading ? 'Starting Drill...' : 'Re-drill All Mistakes'}
                </button>
              </div>

              {/* Questions Stream */}
              <div className="space-y-6">
                {mistakes.map((m, i) => (
                  <div key={i} className="border-b border-white/10 pb-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-white/40">#{i + 1}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider font-bold border ${
                        m.difficulty === 'easy' ? 'bg-status-aligned/15 text-status-aligned border-status-aligned/30' :
                        m.difficulty === 'medium' ? 'bg-status-weak/15 text-status-weak border-status-weak/30' :
                        'bg-error/15 text-error border-error/30'
                      }`}>
                        {m.difficulty || 'MEDIUM'}
                      </span>
                      {m.source_type && (
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary uppercase">
                          {m.source_type}
                        </span>
                      )}
                    </div>

                    <div className="text-base text-white/95 leading-relaxed font-light max-w-3xl">
                      <MathText text={m.question_text} />
                    </div>

                    {/* Answer Comparison */}
                    <div className="flex flex-wrap gap-4 text-xs font-mono p-3 bg-white/[0.02] border border-white/10">
                      <span className="text-error">Your answer: <strong>{m.selected_answer || 'Skipped'}</strong></span>
                      <span className="text-status-aligned">Correct answer: <strong>{m.correct_answer}</strong></span>
                    </div>

                    {/* Step-by-step Solution */}
                    {m.solution_text && (
                      <div className="p-4 bg-white/[0.01] border border-primary/30 space-y-2 mt-3">
                        <div className="text-xs font-mono text-primary font-bold tracking-widest uppercase">VERIFIED STEP-BY-STEP DERIVATION</div>
                        <div className="text-sm text-white/80 leading-relaxed font-light max-w-3xl">
                          <MathText text={m.solution_text} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Re-drill CTA */}
              <button
                onClick={handleReDrill}
                disabled={reDrillLoading}
                className="w-full py-4 bg-error text-white text-xs font-mono font-bold uppercase tracking-widest hover:bg-error/80 transition-colors rounded-none flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <RotateCcw className="w-4 h-4" />
                {reDrillLoading ? 'Starting Targeted Drill...' : `Practice All ${mistakes.length} Missed Questions Now`}
              </button>
            </div>
          ) : (
            <div className="p-8 border border-status-aligned/40 bg-status-aligned/5 text-left space-y-2">
              <div className="flex items-center gap-2 text-status-aligned font-mono text-xs uppercase tracking-widest font-bold">
                <CheckCircle2 className="w-5 h-5" />
                Flawless Evaluation
              </div>
              <h3 className="text-2xl font-light text-white">100% Accuracy — All Questions Correct</h3>
              <p className="text-xs text-white/70 font-mono">
                No mistakes were recorded during this session. This topic demonstrates verified mastery.
              </p>
            </div>
          )}

          {/* Navigation Action Strip */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/10">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3.5 border border-white/20 text-white/80 hover:text-white hover:border-primary text-xs font-mono uppercase tracking-widest rounded-none transition-colors text-center cursor-pointer"
            >
              Return to Knowledge Map
            </button>
            {topicId && (
              <button
                onClick={() => navigate(`/topics/${topicId}`)}
                className="flex-1 py-3.5 bg-primary text-black text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 transition-all rounded-none text-center shadow-md shadow-primary/20 cursor-pointer"
              >
                View Topic Telemetry
              </button>
            )}
          </div>
        </div>

        {/* Right Column (Persistent Telemetry & Calibration Cockpit) */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4 space-y-6">
          {/* Live Scorecard Tiles */}
          {summary && (
            <div className="space-y-3">
              <div className="text-xs font-mono text-white/50 uppercase tracking-widest">
                SESSION TELEMETRY
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Total Score */}
                <div className="p-4 border border-primary/40 bg-primary/10 relative overflow-hidden text-left">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                  <div className="text-2xl md:text-3xl font-light text-primary font-sans mt-0.5">
                    {summary.correct}/{summary.total_questions}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">Total Score</div>
                </div>

                {/* Accuracy */}
                <div className="p-4 border border-white/10 bg-white/[0.02] relative overflow-hidden text-left">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    summary.accuracy >= 70 ? 'bg-status-aligned' : summary.accuracy >= 40 ? 'bg-status-weak' : 'bg-error'
                  }`} />
                  <div className={`text-2xl md:text-3xl font-light font-sans mt-0.5 ${
                    summary.accuracy >= 70 ? 'text-status-aligned' : summary.accuracy >= 40 ? 'text-status-weak' : 'text-error'
                  }`}>
                    {summary.accuracy}%
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">Accuracy</div>
                </div>

                {/* Attempt Rate */}
                <div className="p-4 border border-white/10 bg-white/[0.02] relative overflow-hidden text-left">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                  <div className="text-2xl md:text-3xl font-light text-white font-sans mt-0.5">
                    {summary.attempt_rate}%
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">Attempt Rate</div>
                </div>

                {/* Avg Time */}
                <div className="p-4 border border-white/10 bg-white/[0.02] relative overflow-hidden text-left">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                  <div className="text-2xl md:text-3xl font-light text-white font-sans mt-0.5">
                    {Math.floor(summary.avg_time_seconds / 60)}:{String(summary.avg_time_seconds % 60).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">Avg Time/Q</div>
                </div>

                {/* PYQ Accuracy */}
                <div className="p-4 border border-white/10 bg-white/[0.02] relative overflow-hidden text-left col-span-2">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                  <div className={`text-2xl md:text-3xl font-light font-sans mt-0.5 ${
                    summary.pyq_accuracy !== null && summary.pyq_accuracy >= 70 ? 'text-status-aligned' :
                    summary.pyq_accuracy !== null && summary.pyq_accuracy >= 40 ? 'text-status-weak' : 'text-white/50'
                  }`}>
                    {summary.pyq_accuracy !== null ? `${summary.pyq_accuracy}%` : '—'}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">JEE PYQ Accuracy</div>
                </div>
              </div>
            </div>
          )}

          {/* Calibration Check Prompt */}
          {showConfidencePrompt && !confidenceSubmitted && topicId && (
            <div className="border border-primary/40 bg-primary/[0.04] p-5 relative overflow-hidden text-left space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Calibration Check</div>
                  <h3 className="text-lg font-light text-white mt-0.5">Recalibrate Confidence</h3>
                  <p className="text-xs text-white/60 mt-1 font-mono">
                    Post-evaluation rating recalibrates your metacognitive knowledge map gap.
                  </p>
                </div>
              </div>
              <ConfidenceSlider value={newConfidence} onChange={setNewConfidence} />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfidenceSubmit}
                  disabled={confidenceLoading}
                  className="flex-1 py-2.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all rounded-none disabled:opacity-50 cursor-pointer"
                >
                  {confidenceLoading ? 'Saving...' : 'Save Rating'}
                </button>
                <button
                  onClick={() => setShowConfidencePrompt(false)}
                  className="px-4 py-2.5 border border-white/15 text-white/60 hover:text-white text-xs font-mono uppercase tracking-widest rounded-none transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {confidenceSubmitted && (
            <div className="p-4 bg-status-aligned/10 border border-status-aligned/40 text-xs text-white flex items-center gap-3 font-mono">
              <CheckCircle2 className="w-4 h-4 text-status-aligned shrink-0" />
              <span>Confidence recalibrated to <strong>{newConfidence}/10</strong>. Knowledge map updated.</span>
            </div>
          )}

          {/* Difficulty Accuracy Breakdown */}
          {diffBreakdown && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-mono text-white/50 uppercase tracking-widest">
                TIER ACCURACY BREAKDOWN
              </div>
              <div className="space-y-2">
                {['easy', 'medium', 'hard'].map(diff => {
                  const d = diffBreakdown[diff];
                  if (!d || d.total === 0) return null;
                  const colorClass = diff === 'easy' ? 'text-status-aligned' : diff === 'medium' ? 'text-status-weak' : 'text-error';
                  const barClass = diff === 'easy' ? 'bg-status-aligned' : diff === 'medium' ? 'bg-status-weak' : 'bg-error';

                  return (
                    <div key={diff} className="p-3 border border-white/10 bg-white/[0.01] space-y-2">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="uppercase text-white/80 font-bold">{diff}</span>
                        <span className={colorClass}>
                          <strong>{d.accuracy !== null ? `${d.accuracy}%` : '—'}</strong> ({d.correct}/{d.total})
                        </span>
                      </div>
                      <div className="w-full h-1 bg-white/10 overflow-hidden">
                        <div className={`h-full ${barClass}`} style={{ width: `${d.accuracy || 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions Rail */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-mono text-white/50 uppercase tracking-widest">
              NEXT ACTIONS
            </div>
            <button
              onClick={() => navigate(`/practice?topic=${topicId}`)}
              className="w-full py-3 bg-white/5 border border-white/15 hover:border-primary text-white/90 hover:text-white text-xs font-mono uppercase tracking-widest font-semibold transition-colors flex items-center justify-between px-4"
            >
              <span>Practice Questions In Topic</span>
              <ArrowRight className="w-4 h-4 text-primary" />
            </button>
            <button
              onClick={() => navigate(`/evaluate?topic=${topicId}`)}
              className="w-full py-3 bg-white/5 border border-white/15 hover:border-primary text-white/90 hover:text-white text-xs font-mono uppercase tracking-widest font-semibold transition-colors flex items-center justify-between px-4"
            >
              <span>Retake Timed Evaluation</span>
              <ArrowRight className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

