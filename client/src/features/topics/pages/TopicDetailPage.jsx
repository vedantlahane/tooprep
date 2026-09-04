import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicsService } from '../services/topicsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';
import QuickDrillModal from '@/features/practice/components/QuickDrillModal';
import Icon, { ArrowLeft, BookOpen, Zap, Play, Timer, ArrowRight } from '@/shared/components/Icon';

export default function TopicDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showConfidenceInput, setShowConfidenceInput] = useState(false);
  const [newConfidence, setNewConfidence] = useState(5);
  const [confidenceLoading, setConfidenceLoading] = useState(false);
  
  const [showDrill, setShowDrill] = useState(false);

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
    <div className="animate-fade-in max-w-5xl space-y-8 pb-16">
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

      <div>
        <p className="text-body-md text-on-surface-variant uppercase tracking-widest mb-1">
          {topic.chapters?.subjects?.name} &rsaquo; {topic.chapters?.name}
        </p>
        <h2 className="text-display text-on-surface font-light">{topic.name}</h2>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-6 bg-primary text-white rounded-md flex flex-col justify-between">
          <div className="text-display font-light mb-1">
            {topic.confidence ? `${topic.confidence}` : '—'}
          </div>
          <div className="text-label-sm-mono uppercase tracking-widest text-white/80">CONFIDENCE</div>
        </div>
        <div className="p-6 bg-surface-container text-on-surface rounded-md border border-outline-variant flex flex-col justify-between">
          <div className="text-display font-light mb-1">
            {topic.evaluation_accuracy !== null ? `${topic.evaluation_accuracy}%` : '—'}
          </div>
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">EVAL ACCURACY</div>
        </div>
        <div className="p-6 bg-surface-container text-on-surface rounded-md border border-outline-variant flex flex-col justify-between">
          <div className={`text-display font-light ${getStatusColor(topic.status)}`}>
            {topic.gap !== null ? (topic.gap >= 0 ? `+${topic.gap}` : topic.gap) : '—'}
          </div>
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">PERFORMANCE GAP</div>
        </div>
        <div className="p-6 bg-surface-container text-on-surface rounded-md border border-outline-variant flex flex-col justify-between">
          <div className={`text-headline-md mt-2 font-semibold uppercase tracking-wider ${getStatusColor(topic.status)}`}>
            {topic.status?.replace('_', ' ')}
          </div>
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mt-2">STATUS</div>
        </div>
      </div>

      {showConfidenceInput && (
        <div className="bg-primary/20 border-l-4 border-primary p-6 rounded-r-md">
          <h3 className="text-headline-md text-on-surface mb-2 font-light">Rate Your Baseline Confidence</h3>
          <p className="text-body-md text-on-surface-variant mb-6">
            Set your initial self-assessment before starting practice.
          </p>
          <ConfidenceSlider value={newConfidence} onChange={setNewConfidence} />
          <button
            onClick={handleSetConfidence}
            disabled={confidenceLoading}
            className="mt-6 px-8 py-3 bg-primary text-white text-label-sm-mono font-semibold uppercase tracking-wider hover:bg-primary-fixed-dim transition-colors rounded-sm disabled:opacity-50"
          >
            {confidenceLoading ? 'Saving...' : 'Set Confidence'}
          </button>
        </div>
      )}

      {/* Recommendation Card */}
      <div className="rounded-md border border-outline-variant bg-surface-container p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-label-sm-mono uppercase tracking-[0.18em] text-on-surface-variant">Study Recommendation</h3>
          <span className={`text-label-sm-mono uppercase tracking-[0.18em] font-bold ${getStatusColor(topic.status)}`}>
            {topic.status?.replace('_', ' ')}
          </span>
        </div>
        <p className="text-body-lg text-on-surface leading-relaxed">{getRecommendation(topic.status)}</p>
      </div>

      {/* Action Hub */}
      <div className="flex gap-4 flex-wrap md:flex-nowrap">
        <button
          onClick={() => setShowDrill(true)}
          className="flex-1 py-4 border-2 border-status-aligned text-status-aligned text-label-sm-mono font-semibold uppercase tracking-widest hover:bg-status-aligned/10 transition-colors rounded-sm flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Quick Drill
        </button>
        <button
          onClick={() => navigate(`/practice?topic=${id}`)}
          className="flex-1 py-4 border-2 border-primary text-primary text-label-sm-mono font-semibold uppercase tracking-widest hover:bg-primary/10 transition-colors rounded-sm flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          Practice Mode
        </button>
        <button
          onClick={() => navigate(`/evaluate?topic=${id}`)}
          className="flex-1 py-4 bg-primary text-white text-label-sm-mono font-semibold uppercase tracking-widest hover:brightness-110 transition-colors rounded-sm flex items-center justify-center gap-2"
        >
          <Timer className="w-4 h-4" />
          Timed Evaluation
        </button>
      </div>

      <QuickDrillModal
        topicId={id}
        topicName={data?.topic?.name}
        isOpen={showDrill}
        onClose={() => setShowDrill(false)}
        onComplete={() => loadTopic()}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confidence Trend */}
        <div className="border border-outline-variant bg-surface-container rounded-md p-6">
          <h3 className="text-headline-md font-light mb-4 text-on-surface">Confidence Trend</h3>
          {confidenceTrend.length > 0 ? (
            <div className="flex h-36 items-end gap-2 pt-4">
              {confidenceTrend.map((point, index) => (
                <div key={point.id || index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full h-full flex items-end justify-center">
                    <div
                      className="w-full rounded-t-sm bg-primary/80"
                      style={{ height: `${Math.max(12, (point.confidence / maxTrend) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">
                    {new Date(point.recorded_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-md text-on-surface-variant">No confidence history yet.</p>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="border border-outline-variant bg-surface-container rounded-md p-6">
          <h3 className="text-headline-md font-light mb-4 text-on-surface">Engagement Metrics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-surface-dim rounded-sm">
              <div className="text-headline-md font-light text-on-surface">{topic.questions_attempted || 0}</div>
              <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mt-1">QUESTIONS ATTEMPTED</div>
            </div>
            <div className="p-4 bg-surface-dim rounded-sm">
              <div className="text-headline-md font-light text-on-surface">
                {topic.pyq_accuracy !== null ? `${topic.pyq_accuracy}%` : '—'}
              </div>
              <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mt-1">PYQ ACCURACY</div>
            </div>
            <div className="p-4 bg-surface-dim rounded-sm col-span-2">
              <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1">LAST PRACTICED</div>
              <div className="text-body-md text-on-surface">{formatDate(topic.last_practiced_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation History Chart & List */}
      <div className="border border-outline-variant bg-surface-container rounded-md p-6">
        <h3 className="text-headline-md font-light mb-4 text-on-surface">Evaluation Accuracy Progression</h3>
        
        {/* SVG Sparkline Chart */}
        {chronEvals.length >= 2 && (
          <div className="mb-6 bg-surface-dim p-4 rounded-sm border border-outline-variant">
            <svg viewBox="0 0 400 90" className="w-full h-24 overflow-visible">
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
                  <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#4A90E2" stopOpacity="0" />
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
                    <path d={linePath} stroke="#4A90E2" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="4.5" fill="#4A90E2" stroke="#121212" strokeWidth="1.5" />
                        <text x={p.x} y={Math.max(12, p.y - 8)} textAnchor="middle" fill="#A0A0A0" fontSize="9" fontFamily="monospace">
                          {p.accuracy}%
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        )}

        {/* History List */}
        {evaluation_history && evaluation_history.length > 0 ? (
          <div className="space-y-2">
            {evaluation_history.map((ev, i) => (
              <div
                key={ev.id || i}
                onClick={() => navigate(`/results/${ev.id}`)}
                className="flex items-center justify-between p-4 bg-surface-dim hover:bg-surface-bright cursor-pointer transition-colors rounded-sm border border-outline-variant group"
              >
                <div className="flex items-center gap-4">
                  <div className={`text-headline-md font-light w-16 ${
                    ev.accuracy >= 70 ? 'text-status-aligned' : ev.accuracy >= 40 ? 'text-status-weak' : 'text-error'
                  }`}>
                    {ev.accuracy}%
                  </div>
                  <div>
                    <div className="text-body-md font-semibold text-on-surface">
                      {ev.correct_count}/{ev.total_questions} Questions Correct
                    </div>
                    {ev.pyq_accuracy !== null && (
                      <div className="text-label-sm-mono text-on-surface-variant">
                        PYQ Accuracy: {ev.pyq_accuracy}%
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-label-sm-mono text-on-surface-variant uppercase">{formatDate(ev.started_at)}</span>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-md text-on-surface-variant">No evaluations recorded yet. Complete a timed evaluation to track results here.</p>
        )}
      </div>
    </div>
  );
}
