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
      <div className="w-full max-w-4xl mr-auto animate-fade-in py-12 text-left">
        <div className="border border-white/10 p-12 text-left rounded-sm bg-black/30">
          <BarChart3 className="w-16 h-16 text-primary mb-6 opacity-60" />
          <h3 className="text-2xl font-light text-white mb-2">No calibration telemetry yet</h3>
          <p className="text-sm text-white/50 mb-8 max-w-md font-mono">
            Rate your confidence on topics in the Knowledge Map and take your first timed evaluation to generate calibration signals.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all rounded-sm shadow-md shadow-primary/20 cursor-pointer"
          >
            Open Knowledge Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 animate-fade-in pb-20 space-y-8 text-left">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Metacognitive Calibration &middot; Analysis
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight">
            Metacognitive Insights
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
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black hover:brightness-110 text-xs font-mono uppercase tracking-wider font-bold rounded-sm transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            <Timer className="w-3.5 h-3.5" />
            take mock test
          </button>
        </div>
      </div>

      {/* Educational Guide Card (Toggleable) */}
      {showLegend && (
        <div className="border-l-2 border-primary bg-white/[0.02] p-5 text-left space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-widest font-bold">
            <Info className="w-4 h-4" />
            Metacognitive Calibration Framework
          </div>
          <p className="text-xs text-white/70 leading-relaxed font-mono">
            In competitive exams like JEE, knowing <em>what you do not know</em> is as crucial as knowing formulas. Overconfidence leads to negative marking on tricky questions, while underconfidence causes wasted time and unattempted easy questions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono pt-1">
            <div className="p-3 border-l-2 border-status-overconfident bg-status-overconfident/5">
              <div className="text-status-overconfident font-bold uppercase mb-1">OVERCONFIDENT (&lt; -15%)</div>
              <p className="text-white/60 font-sans text-[11px]">High self-rating (7-10) but low mock score (&lt;50%). High risk of negative marks. Action: Reset with foundation drill.</p>
            </div>
            <div className="p-3 border-l-2 border-status-weak bg-status-weak/5">
              <div className="text-status-weak font-bold uppercase mb-1">WEAK ALIGNED (&lt; 50%)</div>
              <p className="text-white/60 font-sans text-[11px]">Low confidence matching low score. Accurate self-awareness. Action: Review theory before testing.</p>
            </div>
            <div className="p-3 border-l-2 border-status-underconfident bg-status-underconfident/5">
              <div className="text-status-underconfident font-bold uppercase mb-1">UNDERCONFIDENT (&gt; +15%)</div>
              <p className="text-white/60 font-sans text-[11px]">Low self-rating but high mock score (&gt;70%). Imposter syndrome. Action: Take timed mocks to build trust.</p>
            </div>
            <div className="p-3 border-l-2 border-status-aligned bg-status-aligned/5">
              <div className="text-status-aligned font-bold uppercase mb-1">ALIGNED (±15%)</div>
              <p className="text-white/60 font-sans text-[11px]">Perceived mastery matches empirical test data. Healthy calibration. Action: Maintain periodic review.</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary Live Tiles - Flat Lumia Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'overconfident', count: insights.overconfident.length, accent: 'bg-status-overconfident', textAccent: 'text-status-overconfident', borderAccent: 'border-status-overconfident/40 bg-status-overconfident/5', desc: 'Negative mark risk', icon: AlertTriangle },
          { label: 'weak aligned', count: insights.weakAligned.length, accent: 'bg-status-weak', textAccent: 'text-status-weak', borderAccent: 'border-status-weak/40 bg-status-weak/5', desc: 'Needs foundation', icon: TrendingDown },
          { label: 'underconfident', count: insights.underconfident.length, accent: 'bg-status-underconfident', textAccent: 'text-status-underconfident', borderAccent: 'border-status-underconfident/40 bg-status-underconfident/5', desc: 'Ready for mocks', icon: TrendingUp },
          { label: 'aligned', count: insights.aligned.length, accent: 'bg-status-aligned', textAccent: 'text-status-aligned', borderAccent: 'border-status-aligned/40 bg-status-aligned/5', desc: 'Calibrated mastery', icon: CheckCircle2 },
          { label: 'untested', count: insights.noData.length, accent: 'bg-white/30', textAccent: 'text-white/60', borderAccent: 'border-white/15 bg-white/[0.02]', desc: 'Needs mock exam', icon: HelpCircle },
        ].map(s => {
          const TileIcon = s.icon;
          return (
            <div key={s.label} className={`p-4 flex flex-col justify-between relative overflow-hidden text-left border ${s.borderAccent}`}>
              <div className={`absolute top-0 left-0 right-0 h-1 ${s.accent}`} />
              <div>
                <div className={`text-3xl font-light font-sans mb-0.5 tracking-tight ${s.textAccent}`}>{s.count}</div>
                <div className="text-xs font-mono uppercase tracking-widest text-white/90 font-semibold">{s.label}</div>
              </div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-3">{s.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Responsive Widescreen Dual-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Subject Mastery Progress */}
        <div className="lg:col-span-6 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest flex items-center gap-2 font-bold">
              <BarChart3 className="w-4 h-4" />
              SUBJECT-LEVEL MASTERY AGGREGATE
            </h3>
            <span className="text-[10px] font-mono text-white/40 uppercase">Curriculum Overview</span>
          </div>

          <div className="space-y-4">
            {Object.entries(insights.bySubject).map(([name, s]) => {
              const acc = s.avgAccuracyNum || 0;
              const barColor = acc >= 70 ? 'bg-status-aligned' : acc >= 40 ? 'bg-status-weak' : 'bg-status-overconfident';
              return (
                <div key={name} className="border-b border-white/10 pb-5 pt-2 space-y-2.5">
                  <div className="flex justify-between items-end">
                    <h4 className="text-base font-light text-white capitalize">{name}</h4>
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">{s.attempted}/{s.total} tested</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-white/10 overflow-hidden">
                    <div className={`h-full ${barColor} transition-all duration-700`} style={{ width: `${acc}%` }}></div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                    <div className="p-2 bg-white/[0.01] border-l-2 border-white/20 text-left">
                      <div className="text-[9px] text-white/40 uppercase">Accuracy</div>
                      <div className={`font-bold ${acc >= 70 ? 'text-status-aligned' : acc >= 40 ? 'text-status-weak' : 'text-status-overconfident'}`}>
                        {s.avgAccuracyNum !== null ? `${acc}%` : '—'}
                      </div>
                    </div>
                    <div className="p-2 bg-white/[0.01] border-l-2 border-status-overconfident text-left">
                      <div className="text-[9px] text-white/40 uppercase">Overconfident</div>
                      <div className="font-bold text-status-overconfident">{s.overconfident}</div>
                    </div>
                    <div className="p-2 bg-white/[0.01] border-l-2 border-status-aligned text-left">
                      <div className="text-[9px] text-white/40 uppercase">Aligned</div>
                      <div className="font-bold text-status-aligned">{s.aligned}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Overconfidence Gaps & Needs Evidence */}
        <div className="lg:col-span-6 space-y-6 text-left">
          {/* Priority Critical Topics */}
          {insights.overconfident.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-mono text-status-overconfident uppercase tracking-widest font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  OVERCONFIDENCE GAPS ({insights.overconfident.length})
                </h3>
                <span className="text-[10px] font-mono text-status-overconfident/80 uppercase">
                  Negative Mark Risk
                </span>
              </div>
              
              <div className="space-y-2">
                {insights.overconfident.slice(0, 5).map(t => (
                  <div
                    key={t.topic_id}
                    className="p-3 border-b border-white/10 hover:border-status-overconfident/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                  >
                    <div
                      onClick={() => navigate(`/topics/${t.topic_id}`)}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="text-sm font-light text-white hover:text-primary transition-colors">{t.topic_name}</div>
                      <div className="text-[10px] font-mono text-white/40 uppercase mt-0.5">
                        {t.subject_name} &rsaquo; {t.chapter_name}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono">
                        <span className="text-white/60">
                          Conf: <strong className="text-primary">{t.confidence}/10</strong>
                        </span>
                        <span className="text-white/30">&middot;</span>
                        <span className="text-white/60">
                          Eval: <strong className="text-white">{t.evaluation_accuracy}%</strong>
                        </span>
                        <span className="text-white/30">&middot;</span>
                        <span className="text-status-overconfident font-bold">
                          Gap: {t.gap}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDrillTopic(t)}
                        className="px-2.5 py-1 bg-status-overconfident/15 border border-status-overconfident/40 text-status-overconfident text-[11px] font-mono uppercase tracking-wider font-semibold hover:bg-status-overconfident hover:text-white transition-colors rounded-none"
                      >
                        drill
                      </button>
                      <button
                        onClick={() => navigate(`/evaluate?topic=${t.topic_id}`)}
                        className="px-2.5 py-1 bg-white/5 border border-white/15 text-white/80 text-[11px] font-mono uppercase tracking-wider hover:border-primary hover:text-white transition-colors rounded-none"
                      >
                        mock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Untested Topics (Needs Evidence) */}
          {insights.noData.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-mono text-primary uppercase tracking-widest flex items-center gap-2 font-bold">
                  <ListCheck className="w-4 h-4" />
                  NEEDS EVALUATION EVIDENCE ({insights.noData.length})
                </h3>
                <span className="text-[10px] font-mono text-white/40 uppercase">Untested Topics</span>
              </div>
              <p className="text-xs text-white/50 font-mono">
                Click any topic to view diagnostic history or launch a timed mock test.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {insights.noData.slice(0, 16).map(t => (
                  <button
                    key={t.topic_id}
                    onClick={() => navigate(`/topics/${t.topic_id}`)}
                    className="px-3 py-1.5 bg-transparent border border-white/15 hover:border-primary hover:text-primary transition-colors text-xs font-mono rounded-none text-white/80"
                  >
                    {t.topic_name}
                  </button>
                ))}
                {insights.noData.length > 16 && (
                  <span className="px-3 py-1.5 text-xs font-mono text-white/40 border border-dashed border-white/15">
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
