import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicsService } from '../services/topicsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';
import QuickDrillModal from '@/features/practice/components/QuickDrillModal';
import QuestionEditModal from '@/features/questions/components/QuestionEditModal';
import { useAuth } from '@/features/auth/context/AuthContext';
import Icon, { ArrowLeft, BookOpen, Zap, Play, Timer, ArrowRight, Shield, Plus } from '@/shared/components/Icon';

export default function TopicDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showConfidenceInput, setShowConfidenceInput] = useState(false);
  const [newConfidence, setNewConfidence] = useState(5);
  const [confidenceLoading, setConfidenceLoading] = useState(false);
  
  const [showDrill, setShowDrill] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  useEffect(() => {
    loadTopic();
  }, [id]);

  const loadTopic = async () => {
    try {
      const result = await topicsService.getTopicDetail(id);
      setData(result);
      if (!result.topic.confidence) {
        setShowConfidenceInput(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetConfidence = async () => {
    setConfidenceLoading(true);
    try {
      await confidenceService.setConfidence(id, newConfidence, 'INITIAL');
      setShowConfidenceInput(false);
      loadTopic();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfidenceLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OVERCONFIDENT': return 'text-status-overconfident';
      case 'UNDERCONFIDENT': return 'text-status-underconfident';
      case 'WEAK_ALIGNED': return 'text-status-weak';
      case 'ALIGNED': return 'text-status-aligned';
      default: return 'text-on-surface';
    }
  };

  const getRecommendation = (status) => {
    if (status === 'OVERCONFIDENT') return 'Your confidence is higher than your actual performance. Do a short foundation practice set before your next evaluation.';
    if (status === 'WEAK_ALIGNED') return 'You are close, but inconsistent. Focus on the weakest subtopics and retest at the same chapter level.';
    if (status === 'UNDERCONFIDENT') return 'You are stronger than you think. Use one timed eval to confirm the feeling and then move on.';
    if (status === 'ALIGNED') return 'This topic is stable. Keep a maintenance cycle and review one mixed set every few days.';
    if (status === 'INSUFFICIENT_DATA') return 'Not enough evidence yet. Start with a small practice round and then take a timed evaluation to calibrate.';
    return 'Increase exposure to this topic with a focused practice block and a short evaluation.';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-display text-primary font-light animate-pulse-soft">loading...</div>
      </div>
    );
  }

  if (error && !data) {
    return <div className="p-4 bg-error text-on-error text-body-md">{error}</div>;
  }

  const { topic, confidence_history, evaluation_history } = data;
  const confidenceTrend = confidence_history || [];
  const maxTrend = Math.max(10, ...confidenceTrend.map(item => item.confidence || 0), topic.confidence || 0);

  // Chronological evaluation history for the trend chart
  const chronEvals = [...(evaluation_history || [])].reverse();

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-8 pb-16 text-left">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-body-md text-on-surface-variant hover:text-on-surface uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Map
        </button>

        <button
          onClick={() => navigate(`/questions?topic=${id}`)}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant hover:border-primary text-label-sm-mono text-primary uppercase tracking-widest rounded-sm transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Browse Topic Questions
        </button>
      </div>

      {profile?.is_admin && (
        <div className="border border-status-weak/40 bg-status-weak/10 p-4 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-status-weak shrink-0" />
            <span className="text-white font-bold uppercase tracking-wider">Staff Controls:</span>
            <span className="text-white/60">Topic ID: {id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/admin/questions?topic_id=${id}`)}
              className="px-3 py-1.5 bg-status-weak text-black font-bold uppercase tracking-wider hover:brightness-110 transition-all text-[11px]"
            >
              Manage Questions &rarr;
            </button>
            <button
              onClick={() => setAdminModalOpen(true)}
              className="px-3 py-1.5 bg-primary text-white font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1 text-[11px]"
            >
              <Plus className="w-3 h-3" />
              <span>+ Add Question</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            {topic.chapters?.subjects?.name} &middot; {topic.chapters?.name}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extralight text-white tracking-tight">
            {topic.name}
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Diagnostic alignment, empirical calibration history, and targeted drills.
          </p>
        </div>
      </div>

      {/* Recommendation Block */}
      <div className="border-l-4 border-primary/60 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Study Recommendation</h3>
          <span className={`text-xs font-mono uppercase tracking-widest font-bold ${getStatusColor(topic.status)}`}>
            {topic.status?.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-white/90 font-light leading-relaxed max-w-4xl">{getRecommendation(topic.status)}</p>
      </div>

      {/* Main Dual-Pane Responsive Continuum Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Evaluation Accuracy Progression & History */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6 text-left">
          {/* SVG Sparkline Progression */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-primary">
                EVALUATION ACCURACY PROGRESSION
              </h3>
              <span className="text-[10px] font-mono text-white/40 uppercase">
                {evaluation_history?.length || 0} evaluations
              </span>
            </div>

            {chronEvals.length >= 2 ? (
              <div className="py-2">
                <svg viewBox="0 0 400 90" className="w-full h-28 overflow-visible">
                  {[0, 25, 50, 75, 100].map(y => (
                    <line
                      key={y}
                      x1="0"
                      y1={90 - y * 0.85}
                      x2="400"
                      y2={90 - y * 0.85}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="1"
                    />
                  ))}
                  <defs>
                    <linearGradient id="evalChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00D2FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const pts = chronEvals.map((ev, i) => ({
                      x: (i / (chronEvals.length - 1)) * 380 + 10,
                      y: 90 - ((ev.accuracy || 0) * 0.85),
                      accuracy: ev.accuracy || 0
                    }));
                    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                    const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},90 L${pts[0].x.toFixed(1)},90 Z`;
                    return (
                      <>
                        <path d={areaPath} fill="url(#evalChartGrad)" />
                        <path d={linePath} stroke="#00D2FF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="3.5" fill="#00D2FF" stroke="#000000" strokeWidth="1.5" />
                            <text x={p.x} y={Math.max(10, p.y - 7)} textAnchor="middle" fill="#A0A0A0" fontSize="8.5" fontFamily="'Segoe UI', monospace">
                              {p.accuracy}%
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            ) : (
              <p className="text-xs font-mono text-white/40 py-4 border-l-2 border-white/10 bg-white/[0.01]">
                Complete at least 2 timed evaluations on this topic to generate an empirical trajectory chart.
              </p>
            )}
          </div>

          {/* History List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-white/70">
                EVALUATION ATTEMPTS ARCHIVE
              </h3>
              <span className="text-[10px] font-mono text-white/40 uppercase">Review Sessions</span>
            </div>

            {evaluation_history && evaluation_history.length > 0 ? (
              <div className="space-y-1">
                {evaluation_history.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    onClick={() => navigate(`/results/${ev.id}`)}
                    className="flex items-center justify-between p-3.5 border-b border-white/10 hover:border-primary/50 cursor-pointer transition-colors group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl font-light font-mono w-16 ${
                        ev.accuracy >= 70 ? 'text-status-aligned' : ev.accuracy >= 40 ? 'text-status-weak' : 'text-error'
                      }`}>
                        {ev.accuracy}%
                      </div>
                      <div>
                        <div className="text-sm font-light text-white">
                          {ev.correct_count}/{ev.total_questions} Solved Correctly
                        </div>
                        {ev.pyq_accuracy !== null && (
                          <div className="text-[10px] font-mono text-white/50">
                            PYQ Accuracy: {ev.pyq_accuracy}%
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-white/40 uppercase">{formatDate(ev.started_at)}</span>
                      <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-white/40 py-4 border-l-2 border-white/10 bg-white/[0.01]">
                No evaluations recorded yet. Complete a timed evaluation to track results here.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Telemetry & Actions Cockpit */}
        <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-4 space-y-6 text-left">
          {/* KPI Live Tiles */}
          <div className="space-y-3">
            <div className="text-xs font-mono text-white/50 uppercase tracking-widest">
              DIAGNOSTIC TELEMETRY
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 border border-primary/40 bg-primary/10 relative overflow-hidden text-left">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                <div className="text-3xl font-light text-primary font-sans mt-0.5">
                  {topic.confidence ? `${topic.confidence}/10` : '—'}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">CONFIDENCE</div>
              </div>

              <div className="p-4 border border-white/15 bg-white/[0.02] relative overflow-hidden text-left">
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                <div className="text-3xl font-light text-white font-sans mt-0.5">
                  {topic.evaluation_accuracy !== null ? `${topic.evaluation_accuracy}%` : '—'}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">EVAL ACCURACY</div>
              </div>

              <div className="p-4 border border-white/15 bg-white/[0.02] relative overflow-hidden text-left">
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                <div className={`text-3xl font-light font-sans mt-0.5 ${getStatusColor(topic.status)}`}>
                  {topic.gap !== null ? (topic.gap >= 0 ? `+${topic.gap}%` : `${topic.gap}%`) : '—'}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">PERFORMANCE GAP</div>
              </div>

              <div className="p-4 border border-white/15 bg-white/[0.02] relative overflow-hidden text-left">
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                <div className={`text-lg font-light font-sans uppercase tracking-wider mt-1 ${getStatusColor(topic.status)}`}>
                  {topic.status?.replace('_', ' ')}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">CALIBRATION</div>
              </div>
            </div>
          </div>

          {/* Action Hub */}
          <div className="space-y-2">
            <div className="text-xs font-mono text-white/50 uppercase tracking-widest">
              LAUNCH WORKFLOW
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDrill(true)}
                className="flex-1 py-3 border border-status-aligned/40 bg-status-aligned/10 text-status-aligned text-xs font-mono font-bold uppercase tracking-wider hover:bg-status-aligned hover:text-black transition-all rounded-none flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Quick Drill</span>
              </button>
              <button
                onClick={() => navigate(`/practice?topic=${id}`)}
                className="flex-1 py-3 border border-primary/40 bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-all rounded-none flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Practice</span>
              </button>
              <button
                onClick={() => navigate(`/evaluate?topic=${id}`)}
                className="flex-1 py-3 bg-primary text-black text-xs font-mono font-bold uppercase tracking-wider hover:brightness-110 shadow-md shadow-primary/20 transition-all rounded-none flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Mock Eval</span>
              </button>
            </div>
          </div>

          {/* Baseline Confidence Input */}
          {showConfidenceInput && (
            <div className="border-l-4 border-primary bg-white/[0.02] p-5 space-y-4">
              <div>
                <h3 className="text-base font-light text-white">Rate Baseline Confidence</h3>
                <p className="text-xs text-white/60 font-mono mt-0.5">
                  Set initial self-assessment to compute your metacognitive knowledge gap.
                </p>
              </div>
              <ConfidenceSlider value={newConfidence} onChange={setNewConfidence} />
              <button
                onClick={handleSetConfidence}
                disabled={confidenceLoading}
                className="w-full py-2.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-wider hover:brightness-110 shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer rounded-none"
              >
                {confidenceLoading ? 'Saving...' : 'Set Confidence Rating'}
              </button>
            </div>
          )}

          {/* Engagement Telemetry */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-mono text-white/50 uppercase tracking-widest">
              ENGAGEMENT TELEMETRY
            </div>
            <div className="space-y-2">
              <div className="p-3 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-white/60 uppercase">Questions Attempted</span>
                <span className="text-white font-bold text-base font-sans">{topic.questions_attempted || 0}</span>
              </div>
              <div className="p-3 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-white/60 uppercase">JEE PYQ Accuracy</span>
                <span className={`text-base font-sans font-bold ${
                  topic.pyq_accuracy !== null && topic.pyq_accuracy >= 70 ? 'text-status-aligned' :
                  topic.pyq_accuracy !== null && topic.pyq_accuracy >= 40 ? 'text-status-weak' : 'text-white/50'
                }`}>
                  {topic.pyq_accuracy !== null ? `${topic.pyq_accuracy}%` : '—'}
                </span>
              </div>
              <div className="p-3 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-white/60 uppercase">Last Activity</span>
                <span className="text-white/80">{formatDate(topic.last_practiced_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Question Composer Modal */}
      {profile?.is_admin && (
        <QuestionEditModal
          isOpen={adminModalOpen}
          question={null}
          initialTopicId={id}
          onClose={() => setAdminModalOpen(false)}
          onSaved={() => loadTopic()}
        />
      )}
    </div>
  );
}
