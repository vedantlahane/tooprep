import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
import QuickDrillModal from '@/features/practice/components/QuickDrillModal';
import Icon, {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  HelpCircle,
  Flame,
  ListCheck,
  Zap,
  Play,
  Timer,
  ArrowRight,
  Info
} from '@/shared/components/Icon';

export default function InsightsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const navigate = useNavigate();
  const [drillTopic, setDrillTopic] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await dashboardService.getDashboard();
      setData(result || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Computed insights
  const insights = useMemo(() => {
    if (data.length === 0) return null;

    const withData = data.filter(d => d.status !== 'INSUFFICIENT_DATA');
    const overconfident = data.filter(d => d.status === 'OVERCONFIDENT').sort((a, b) => a.gap - b.gap);
    const underconfident = data.filter(d => d.status === 'UNDERCONFIDENT').sort((a, b) => b.gap - a.gap);
    const weakAligned = data.filter(d => d.status === 'WEAK_ALIGNED');
    const aligned = data.filter(d => d.status === 'ALIGNED');
    const noData = data.filter(d => d.status === 'INSUFFICIENT_DATA');

    // Subject-level summaries
    const bySubject = {};
    for (const topic of data) {
      if (!bySubject[topic.subject_name]) {
        bySubject[topic.subject_name] = { total: 0, attempted: 0, avgAccuracy: [], overconfident: 0, aligned: 0 };
      }
      const s = bySubject[topic.subject_name];
      s.total++;
      if (topic.questions_attempted > 0) s.attempted++;
      if (topic.evaluation_accuracy !== null) s.avgAccuracy.push(topic.evaluation_accuracy);
      if (topic.status === 'OVERCONFIDENT') s.overconfident++;
      if (topic.status === 'ALIGNED') s.aligned++;
    }

    for (const [name, s] of Object.entries(bySubject)) {
      s.avgAccuracyNum = s.avgAccuracy.length > 0
        ? Math.round(s.avgAccuracy.reduce((a, b) => a + b, 0) / s.avgAccuracy.length)
        : null;
    }

    return { withData, overconfident, underconfident, weakAligned, aligned, noData, bySubject };
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest text-xs font-mono">Analyzing Metacognitive Calibration...</div>
      </div>
    );
  }

  if (!insights || data.length === 0) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in py-12">
        <div className="acrylic-glass border border-white/10 p-12 text-center rounded-sm">
          <BarChart3 className="w-16 h-16 text-primary mx-auto mb-6 opacity-60" />
          <h3 className="text-2xl font-light text-white mb-2 lowercase">no calibration telemetry yet</h3>
          <p className="text-sm text-white/50 mb-8 max-w-md mx-auto font-mono">
            Rate your confidence on topics in the Knowledge Map and take your first timed evaluation to generate calibration signals.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3.5 bg-primary text-white text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all rounded-sm"
          >
            Open Knowledge Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl min-w-0 mx-auto animate-fade-in pb-20 space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Metacognitive Calibration &middot; Analysis
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight lowercase">
            metacognitive insights
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Real-time diagnostic comparing perceived self-confidence against verified exam performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface-container border border-white/10 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-primary" />
            {showLegend ? 'hide guide' : 'how calibration works'}
          </button>
          <button
            onClick={() => navigate('/evaluate')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:brightness-110 text-xs font-mono uppercase tracking-wider font-semibold rounded-sm transition-all"
          >
            <Timer className="w-3.5 h-3.5" />
            take mock test
          </button>
        </div>
      </div>

      {/* Educational Guide Card (Toggleable) */}
      {showLegend && (
        <div className="acrylic-glass border border-primary/30 p-6 rounded-sm animate-fade-in">
          <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Metacognitive Calibration Framework
          </h3>
          <p className="text-xs text-white/70 leading-relaxed font-sans mb-4">
            In competitive exams like JEE, knowing <em>what you do not know</em> is as crucial as knowing the formulas. Overconfidence leads to negative marking on tricky questions, while underconfidence causes wasted time and unattempted easy questions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-status-overconfident/10 border border-status-overconfident/30 rounded-sm">
              <div className="text-status-overconfident font-bold uppercase mb-1">OVERCONFIDENT (Gap &lt; -15%)</div>
              <p className="text-white/70 font-sans">High self-rating (7-10) but low mock score (&lt;50%). High danger of negative marks. Action: Reset with untimed foundation drill.</p>
            </div>
            <div className="p-3 bg-status-weak/10 border border-status-weak/30 rounded-sm">
              <div className="text-status-weak font-bold uppercase mb-1">WEAK ALIGNED (Score &lt; 50%)</div>
              <p className="text-white/70 font-sans">Low confidence matching low score. Accurate self-awareness of struggling topic. Action: Review theory before testing.</p>
            </div>
            <div className="p-3 bg-status-underconfident/10 border border-status-underconfident/30 rounded-sm">
              <div className="text-status-underconfident font-bold uppercase mb-1">UNDERCONFIDENT (Gap &gt; +15%)</div>
              <p className="text-white/70 font-sans">Low self-rating but high mock score (&gt;70%). Imposter syndrome. Action: Take timed mock to build speed and trust.</p>
            </div>
            <div className="p-3 bg-status-aligned/10 border border-status-aligned/30 rounded-sm">
              <div className="text-status-aligned font-bold uppercase mb-1">ALIGNED (Within ±15%)</div>
              <p className="text-white/70 font-sans">Perceived mastery matches empirical test data. Healthy calibration. Action: Maintain with periodic review.</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary Live Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'overconfident', count: insights.overconfident.length, bg: 'bg-status-overconfident', desc: 'Negative mark risk', icon: AlertTriangle },
          { label: 'weak aligned', count: insights.weakAligned.length, bg: 'bg-status-weak', desc: 'Needs foundation', icon: TrendingDown },
          { label: 'underconfident', count: insights.underconfident.length, bg: 'bg-status-underconfident', desc: 'Ready for mocks', icon: TrendingUp },
          { label: 'aligned', count: insights.aligned.length, bg: 'bg-status-aligned', desc: 'Calibrated mastery', icon: CheckCircle2 },
          { label: 'untested', count: insights.noData.length, bg: 'bg-surface-container', desc: 'Needs mock exam', icon: HelpCircle },
        ].map(s => {
          const TileIcon = s.icon;
          return (
            <div key={s.label} className={`p-5 rounded-sm flex flex-col justify-between relative overflow-hidden group border border-white/10 ${s.bg}`}>
              <TileIcon className="absolute top-3 right-3 opacity-25 w-7 h-7 group-hover:scale-125 transition-transform" />
              <div>
                <div className="text-3xl font-light font-mono text-white mb-1">{s.count}</div>
                <div className="text-xs font-mono uppercase tracking-widest text-white/90 font-semibold">{s.label}</div>
              </div>
              <div className="text-[10px] font-mono text-white/60 uppercase tracking-wider mt-3">{s.desc}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Subject Mastery Progress */}
        <div className="acrylic-glass border border-white/10 p-6 md:p-8 rounded-sm">
          <h3 className="text-xs font-mono text-white/60 uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            SUBJECT-LEVEL MASTERY AGGREGATE
          </h3>
          <div className="space-y-6">
            {Object.entries(insights.bySubject).map(([name, s]) => {
              const acc = s.avgAccuracyNum || 0;
              const barColor = acc >= 70 ? 'bg-status-aligned' : acc >= 40 ? 'bg-status-weak' : 'bg-status-overconfident';
              return (
                <div key={name} className="space-y-3 bg-surface-container/40 p-4 rounded-sm border border-white/5">
                  <div className="flex justify-between items-end">
                    <h4 className="text-lg font-light text-white capitalize">{name}</h4>
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">{s.attempted}/{s.total} tested</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden">
                    <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${acc}%` }}></div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                    <div className="bg-black/40 p-2 rounded-xs border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase mb-0.5">Accuracy</div>
                      <div className={`font-bold ${acc >= 70 ? 'text-status-aligned' : acc >= 40 ? 'text-status-weak' : 'text-status-overconfident'}`}>
                        {s.avgAccuracyNum !== null ? `${acc}%` : '—'}
                      </div>
                    </div>
                    <div className="bg-black/40 p-2 rounded-xs border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase mb-0.5">Overconfident</div>
                      <div className="font-bold text-status-overconfident">{s.overconfident}</div>
                    </div>
                    <div className="bg-black/40 p-2 rounded-xs border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase mb-0.5">Aligned</div>
                      <div className="font-bold text-status-aligned">{s.aligned}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-8">
          {/* Priority Critical Topics */}
          {insights.overconfident.length > 0 && (
            <div className="border border-error/40 bg-error/5 p-6 md:p-8 rounded-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Flame className="w-36 h-36 text-error" />
              </div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-xs font-mono text-error uppercase tracking-widest font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  High Priority &middot; Overconfidence Gaps
                </h3>
                <span className="text-[10px] font-mono text-error/80 px-2 py-0.5 bg-error/10 border border-error/20 rounded-xs">
                  {insights.overconfident.length} topics
                </span>
              </div>
              
              <div className="space-y-3 relative z-10">
                {insights.overconfident.slice(0, 5).map(t => (
                  <div
                    key={t.topic_id}
                    className="p-4 bg-surface-container/80 border-l-4 border-error border-y border-r border-white/5 rounded-r-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div
                      onClick={() => navigate(`/topics/${t.topic_id}`)}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="text-sm font-medium text-white group-hover:text-primary transition-colors">{t.topic_name}</div>
                      <div className="text-[11px] font-mono text-white/50 uppercase mt-0.5">
                        {t.subject_name} &rsaquo; {t.chapter_name}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 bg-black/40 border border-white/10 rounded-xs text-white/70">
                          Conf: <strong className="text-primary">{t.confidence}/10</strong>
                        </span>
                        <span className="px-2 py-0.5 bg-black/40 border border-white/10 rounded-xs text-white/70">
                          Eval: <strong className="text-white">{t.evaluation_accuracy}%</strong>
                        </span>
                        <span className="px-2 py-0.5 bg-error/20 border border-error/30 rounded-xs text-error font-bold">
                          Gap: {t.gap}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDrillTopic(t)}
                        className="px-3 py-1.5 bg-error/15 border border-error/40 text-error text-[11px] font-mono uppercase tracking-wider font-semibold hover:bg-error hover:text-white transition-colors rounded-sm"
                      >
                        drill
                      </button>
                      <button
                        onClick={() => navigate(`/evaluate?topic=${t.topic_id}`)}
                        className="px-3 py-1.5 bg-white/5 border border-white/15 text-white/80 text-[11px] font-mono uppercase tracking-wider hover:bg-white/10 hover:text-white transition-colors rounded-sm"
                      >
                        mock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Untested topics */}
          {insights.noData.length > 0 && (
            <div className="acrylic-glass border border-white/10 p-6 md:p-8 rounded-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono text-white/60 uppercase tracking-widest flex items-center gap-2">
                  <ListCheck className="w-4 h-4 text-primary" />
                  NEEDS EVALUATION EVIDENCE ({insights.noData.length})
                </h3>
                <span className="text-[10px] font-mono text-white/40">Untested topics</span>
              </div>
              <p className="text-xs text-white/50 mb-4 font-mono">
                Click any topic to view details or launch an evaluation to calibrate your score.
              </p>
              <div className="flex flex-wrap gap-2">
                {insights.noData.slice(0, 16).map(t => (
                  <button
                    key={t.topic_id}
                    onClick={() => navigate(`/topics/${t.topic_id}`)}
                    className="px-3 py-1.5 bg-surface-container border border-white/10 hover:border-primary hover:text-primary transition-colors text-xs font-mono rounded-xs text-white/80"
                  >
                    {t.topic_name}
                  </button>
                ))}
                {insights.noData.length > 16 && (
                  <span className="px-3 py-1.5 text-xs font-mono text-white/40 bg-surface-dim rounded-xs border border-dashed border-white/10">
                    +{insights.noData.length - 16} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <QuickDrillModal
        topicId={drillTopic?.topic_id}
        topicName={drillTopic?.topic_name}
        isOpen={!!drillTopic}
        onClose={() => setDrillTopic(null)}
        onComplete={() => loadData()}
      />
    </div>
  );
}
