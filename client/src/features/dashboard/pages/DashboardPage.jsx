import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import Icon, {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Play,
  Timer,
  Activity,
  ArrowRight,
  Flame,
  Layers,
  HelpCircle,
  Zap,
  Sparkles
} from '@/shared/components/Icon';

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await dashboardService.getDashboard();
      setData(result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subjects = useMemo(() => {
    const set = new Set(data.map(r => r.subject_name).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    if (subjectFilter === 'ALL') return data;
    return data.filter(r => r.subject_name === subjectFilter);
  }, [data, subjectFilter]);

  const biggestGapTopic = useMemo(() => {
    const overconfident = data
      .filter(d => d.status === 'OVERCONFIDENT')
      .sort((a, b) => a.gap - b.gap);
    return overconfident[0] || null;
  }, [data]);

  const groupedByChapter = useMemo(() => {
    const groups = {};
    filtered.forEach(topic => {
      const groupName = `${topic.subject_name} \u203A ${topic.chapter_name}`;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(topic);
    });
    return groups;
  }, [filtered]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const priority = filtered.filter(t => ['OVERCONFIDENT', 'WEAK_ALIGNED', 'UNDERCONFIDENT'].includes(t.status)).length;
    const evaluated = filtered.filter(t => t.evaluation_attempts_count > 0).length;
    const rated = filtered.filter(t => t.confidence !== null);
    const avgConfidence = rated.reduce((sum, t) => sum + t.confidence, 0) / Math.max(1, rated.length);

    return {
      total,
      priority,
      evaluated,
      avgConfidence: Number.isFinite(avgConfidence) ? avgConfidence.toFixed(1) : '0.0'
    };
  }, [filtered]);

  const getTileSize = (topic) => {
    if (topic.status === 'OVERCONFIDENT') return 'col-span-2 row-span-2 aspect-square';
    if (topic.status === 'UNDERCONFIDENT') return 'col-span-2 row-span-1 aspect-[2/1]';
    return 'col-span-1 row-span-1 aspect-square';
  };

  const getTileClasses = (status) => {
    switch (status) {
      case 'OVERCONFIDENT':
        return 'bg-gradient-to-br from-error/90 to-error border-2 border-error/80 text-white shadow-lg shadow-error/20';
      case 'UNDERCONFIDENT':
        return 'bg-gradient-to-br from-primary/90 to-primary-container border-2 border-primary/80 text-white shadow-lg shadow-primary/20';
      case 'ALIGNED':
        return 'bg-gradient-to-br from-status-aligned/90 to-emerald-700 border-2 border-status-aligned/80 text-white';
      case 'WEAK_ALIGNED':
        return 'bg-gradient-to-br from-status-weak/90 to-amber-700 border-2 border-status-weak/80 text-white';
      case 'INSUFFICIENT_DATA':
        return 'acrylic-glass hover:bg-white/5 border border-white/10 text-white';
      case 'PRELIMINARY':
        return 'acrylic-primary border border-primary/40 text-white';
      default:
        return 'bg-surface-container text-white border border-white/10';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OVERCONFIDENT':
        return <AlertTriangle className="w-5 h-5 text-white/90" />;
      case 'UNDERCONFIDENT':
        return <TrendingUp className="w-5 h-5 text-white/90" />;
      case 'ALIGNED':
        return <CheckCircle2 className="w-5 h-5 text-white/90" />;
      case 'WEAK_ALIGNED':
        return <TrendingDown className="w-5 h-5 text-white/90" />;
      default:
        return <HelpCircle className="w-4 h-4 text-white/40" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-36 space-y-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <div className="text-label-sm-mono text-primary uppercase tracking-[0.3em] text-xs">
          Loading Windows Phone Knowledge Map...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* ─── Top Telemetry Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="text-label-sm-mono uppercase tracking-[0.25em] text-primary text-xs">
            Start Screen &middot; Knowledge Grid
          </div>
          <h1 className="text-4xl md:text-5xl font-extralight text-white tracking-tight lowercase mt-1">
            knowledge map
          </h1>
        </div>

        {/* Telemetry Stat Badges */}
        <div className="flex flex-wrap items-center gap-4 text-label-sm-mono uppercase text-xs">
          <div className="acrylic-glass px-4 py-2 rounded-sm border border-white/10 flex items-center gap-2">
            <span className="text-white/50">TOPICS:</span>
            <span className="font-mono text-white font-bold">{summary.total}</span>
          </div>

          {summary.priority > 0 && (
            <div className="bg-error/20 border border-error/40 px-4 py-2 rounded-sm flex items-center gap-2 text-error">
              <Flame className="w-3.5 h-3.5" />
              <span>PRIORITY:</span>
              <span className="font-mono font-bold">{summary.priority}</span>
            </div>
          )}

          <div className="acrylic-glass px-4 py-2 rounded-sm border border-white/10 flex items-center gap-2">
            <span className="text-white/50">AVG CONFIDENCE:</span>
            <span className="font-mono text-primary font-bold">{summary.avgConfidence}/10</span>
          </div>
        </div>
      </div>

      {/* ─── Hero Live Tile: Priority Focus Topic ─── */}
      {biggestGapTopic && (
        <div
          onClick={() => navigate(`/topics/${biggestGapTopic.topic_id}`)}
          className="metro-tile relative cursor-pointer overflow-hidden p-6 md:p-8 rounded-sm bg-gradient-to-r from-error/95 via-error to-rose-700 text-white shadow-2xl shadow-error/20 border-2 border-error/80 group"
        >
          {/* Subtle live pulse accent background */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-label-sm-mono uppercase tracking-widest text-white/90 text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Primary Gap &middot; Immediate Focus</span>
                <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono">
                  GAP: {biggestGapTopic.gap}%
                </span>
              </div>

              <h2 className="text-2xl md:text-4xl font-light tracking-tight text-white">
                {biggestGapTopic.topic_name}
              </h2>

              <p className="text-white/80 text-sm font-light">
                {biggestGapTopic.subject_name} &rsaquo; {biggestGapTopic.chapter_name}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-8">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/70">Metrics</div>
                <div className="text-xl font-mono font-bold">
                  Conf: {biggestGapTopic.confidence}/10 &middot; Acc: {biggestGapTopic.evaluation_accuracy}%
                </div>
              </div>

              <button
                className="px-6 py-3 bg-white text-black text-xs font-mono uppercase tracking-widest rounded-sm font-bold flex items-center justify-center gap-2 group-hover:bg-black group-hover:text-white transition-colors"
              >
                <span>Calibrate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Start Screen Quick Action Tiles ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/practice')}
          className="metro-tile cursor-pointer acrylic-glass p-5 rounded-sm border border-white/10 hover:border-primary/50 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="text-label-sm-mono text-primary uppercase tracking-widest text-[10px]">
              Instant Training
            </div>
            <div className="text-xl font-light text-white lowercase">rapid drill</div>
            <div className="text-xs text-white/50">Random questions with immediate LaTeX solutions</div>
          </div>
          <div className="w-12 h-12 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-current" />
          </div>
        </div>

        <div
          onClick={() => navigate('/evaluate')}
          className="metro-tile cursor-pointer acrylic-glass p-5 rounded-sm border border-white/10 hover:border-primary/50 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="text-label-sm-mono text-primary uppercase tracking-widest text-[10px]">
              Timed Assessment
            </div>
            <div className="text-xl font-light text-white lowercase">mock test</div>
            <div className="text-xs text-white/50">Strict timed evaluation with answers withheld</div>
          </div>
          <div className="w-12 h-12 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Timer className="w-5 h-5 stroke-[1.8]" />
          </div>
        </div>

        <div
          onClick={() => navigate('/questions')}
          className="metro-tile cursor-pointer acrylic-glass p-5 rounded-sm border border-white/10 hover:border-primary/50 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="text-label-sm-mono text-primary uppercase tracking-widest text-[10px]">
              Question Bank
            </div>
            <div className="text-xl font-light text-white lowercase">110 verified pyqs</div>
            <div className="text-xs text-white/50">Browse all 2018 JEE questions by topic & difficulty</div>
          </div>
          <div className="w-12 h-12 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5 stroke-[1.8]" />
          </div>
        </div>
      </div>

      {/* ─── Subject Panorama Pivot Navigation ─── */}
      <div className="border-b border-white/10 overflow-x-auto no-scrollbar pt-2">
        <div className="flex gap-8 min-w-max pb-2">
          {subjects.map(s => {
            const isSelected = subjectFilter === s;
            return (
              <button
                key={s}
                onClick={() => setSubjectFilter(s)}
                className={`text-2xl lowercase transition-all pb-2 border-b-2 ${
                  isSelected
                    ? 'text-primary font-normal border-primary'
                    : 'text-white/40 hover:text-white/80 border-transparent font-extralight'
                }`}
              >
                {s.toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-sm rounded-r-sm">
          {error}
        </div>
      )}

      {/* ─── Grouped Panoramic Live Tile Grids ─── */}
      <div className="space-y-10">
        {Object.entries(groupedByChapter).map(([groupName, topics]) => (
          <section key={groupName} className="space-y-4">
            <h3 className="text-label-sm-mono text-white/70 uppercase tracking-widest flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              {groupName}
              <span className="text-white/30 font-normal">({topics.length} topics)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {topics.map(topic => (
                <div
                  key={topic.topic_id}
                  onClick={() => navigate(`/topics/${topic.topic_id}`)}
                  className={`metro-tile relative cursor-pointer p-4 flex flex-col justify-between overflow-hidden rounded-sm select-none ${getTileSize(topic)} ${getTileClasses(topic.status)}`}
                >
                  {/* Status Indicator Icon */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-80">
                      {topic.status.replace(/_/g, ' ')}
                    </span>
                    {getStatusIcon(topic.status)}
                  </div>

                  {/* Topic Title */}
                  <div className="my-2">
                    <h4 className="font-semibold text-sm leading-snug line-clamp-3">
                      {topic.topic_name}
                    </h4>
                  </div>

                  {/* Metrics Bar */}
                  <div className="pt-2 border-t border-white/10 flex items-end justify-between text-xs">
                    <div>
                      {topic.confidence ? (
                        <div className="font-mono">
                          <span className="text-base font-bold">{topic.confidence}</span>
                          <span className="opacity-60 text-[10px]">/10</span>
                        </div>
                      ) : (
                        <div className="text-[10px] opacity-50 font-mono">NO RATING</div>
                      )}
                    </div>

                    {topic.evaluation_accuracy !== null ? (
                      <div className="font-mono font-bold text-sm">
                        {topic.evaluation_accuracy}%
                      </div>
                    ) : (
                      <div className="text-[10px] opacity-40 font-mono">UNTESTED</div>
                    )}
                  </div>

                  {/* Hover Gap Glance Overlay */}
                  {topic.gap !== null && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 p-3 text-center">
                      <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest mb-1">
                        CALIBRATION GAP
                      </span>
                      <span className={`text-3xl font-light font-mono ${topic.gap < 0 ? 'text-error font-bold' : 'text-status-aligned'}`}>
                        {topic.gap > 0 ? `+${topic.gap}` : topic.gap}%
                      </span>
                      <span className="text-[10px] text-primary uppercase tracking-wider mt-2">
                        Inspect Topic &rarr;
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="acrylic-glass border border-white/10 rounded-sm p-16 text-center text-white/50 flex flex-col items-center gap-4">
            <BookOpen className="w-12 h-12 opacity-30" />
            <div className="text-lg font-light">No curriculum topics found for this subject filter.</div>
          </div>
        )}
      </div>
    </div>
  );
}
