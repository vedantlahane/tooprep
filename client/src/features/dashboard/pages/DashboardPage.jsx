import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';
import Icon, {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Play,
  Timer,
  ArrowRight,
  Flame,
  Search,
  Filter,
  Sliders,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  Check,
  X
} from '@/shared/components/Icon';

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('tooprep_map_view') || 'sheet');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('gap_asc'); // gap_asc, acc_asc, conf_desc, name_asc
  const [calibrateModal, setCalibrateModal] = useState(null); // { topicId, name, currentConf }
  const [calibrateVal, setCalibrateVal] = useState(5);
  const [calibrating, setCalibrating] = useState(false);
  const [mobileExpandedTopic, setMobileExpandedTopic] = useState(null);

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

  const handleSwitchView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('tooprep_map_view', mode);
  };

  const subjects = useMemo(() => {
    const set = new Set(data.map(r => r.subject_name).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [data]);

  const filteredAndSorted = useMemo(() => {
    let list = [...data];

    // 1. Subject filter
    if (subjectFilter !== 'ALL') {
      list = list.filter(r => r.subject_name === subjectFilter);
    }

    // 2. Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'UNTESTED') {
        list = list.filter(r => r.status === 'INSUFFICIENT_DATA' || r.status === 'PRELIMINARY');
      } else {
        list = list.filter(r => r.status === statusFilter);
      }
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.topic_name || '').toLowerCase().includes(q) ||
        (r.chapter_name || '').toLowerCase().includes(q) ||
        (r.subject_name || '').toLowerCase().includes(q)
      );
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortBy === 'gap_asc') {
        // Most negative gap (overconfident) first
        const gapA = a.gap !== null ? a.gap : 999;
        const gapB = b.gap !== null ? b.gap : 999;
        return gapA - gapB;
      }
      if (sortBy === 'acc_asc') {
        const accA = a.evaluation_accuracy !== null ? a.evaluation_accuracy : 999;
        const accB = b.evaluation_accuracy !== null ? b.evaluation_accuracy : 999;
        return accA - accB;
      }
      if (sortBy === 'conf_desc') {
        const confA = a.confidence !== null ? a.confidence : -1;
        const confB = b.confidence !== null ? b.confidence : -1;
        return confB - confA;
      }
      if (sortBy === 'name_asc') {
        return (a.topic_name || '').localeCompare(b.topic_name || '');
      }
      return 0;
    });

    return list;
  }, [data, subjectFilter, statusFilter, searchQuery, sortBy]);

  const biggestGapTopic = useMemo(() => {
    const overconfident = data
      .filter(d => d.status === 'OVERCONFIDENT')
      .sort((a, b) => a.gap - b.gap);
    return overconfident[0] || null;
  }, [data]);

  const groupedByChapter = useMemo(() => {
    const groups = {};
    filteredAndSorted.forEach(topic => {
      const groupName = `${topic.subject_name} \u203A ${topic.chapter_name}`;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(topic);
    });
    return groups;
  }, [filteredAndSorted]);

  const summary = useMemo(() => {
    const total = data.length;
    const overconfident = data.filter(t => t.status === 'OVERCONFIDENT').length;
    const underconfident = data.filter(t => t.status === 'UNDERCONFIDENT').length;
    const aligned = data.filter(t => t.status === 'ALIGNED').length;
    const untested = data.filter(t => t.status === 'INSUFFICIENT_DATA' || t.status === 'PRELIMINARY').length;
    const rated = data.filter(t => t.confidence !== null);
    const avgConfidence = rated.reduce((sum, t) => sum + t.confidence, 0) / Math.max(1, rated.length);
    const evaluated = data.filter(t => t.evaluation_accuracy !== null);
    const avgAccuracy = evaluated.reduce((sum, t) => sum + t.evaluation_accuracy, 0) / Math.max(1, evaluated.length);

    return {
      total,
      overconfident,
      underconfident,
      aligned,
      untested,
      avgConfidence: Number.isFinite(avgConfidence) ? avgConfidence.toFixed(1) : '0.0',
      avgAccuracy: Number.isFinite(avgAccuracy) ? Math.round(avgAccuracy) : 0
    };
  }, [data]);

  const handleSaveConfidence = async () => {
    if (!calibrateModal) return;
    setCalibrating(true);
    try {
      await confidenceService.setConfidence(calibrateModal.topicId, calibrateVal, 'INITIAL');
      // Update locally
      setData(prev => prev.map(t => {
        if (t.topic_id === calibrateModal.topicId) {
          const newGap = t.evaluation_accuracy !== null ? Math.round(t.evaluation_accuracy - (calibrateVal * 10)) : null;
          return { ...t, confidence: calibrateVal, gap: newGap };
        }
        return t;
      }));
      setCalibrateModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setCalibrating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OVERCONFIDENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold bg-error/20 text-error border border-error/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Overconfident</span>
          </span>
        );
      case 'UNDERCONFIDENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold bg-primary/20 text-primary border border-primary/40 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 shrink-0" />
            <span>Underconfident</span>
          </span>
        );
      case 'ALIGNED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold bg-status-aligned/20 text-status-aligned border border-status-aligned/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Aligned</span>
          </span>
        );
      case 'WEAK_ALIGNED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold bg-status-weak/20 text-status-weak border border-status-weak/40 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 shrink-0" />
            <span>Weak Aligned</span>
          </span>
        );
      case 'PRELIMINARY':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/10 text-white/70 border border-white/20">
            Preliminary
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/5 text-white/40 border border-white/10">
            Untested
          </span>
        );
    }
  };

  const getSubjectColor = (subject) => {
    const s = (subject || '').toUpperCase();
    if (s.includes('PHYSIC')) return 'text-primary border-primary/40 bg-primary/10';
    if (s.includes('CHEMIS')) return 'text-amber-400 border-amber-400/40 bg-amber-400/10';
    if (s.includes('MATH')) return 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10';
    return 'text-white/60 border-white/20 bg-white/5';
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
    <div className="space-y-6 pb-20">
      {/* ─── Top Telemetry Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="text-label-sm-mono uppercase tracking-[0.25em] text-primary text-xs">
            Curriculum Telemetry &middot; Calibration Matrix
          </div>
          <h1 className="text-4xl md:text-5xl font-extralight text-white tracking-tight lowercase mt-1">
            knowledge map
          </h1>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="bg-surface-container p-1 rounded-sm border border-outline-variant flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => handleSwitchView('sheet')}
              className={`px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5 ${
                viewMode === 'sheet'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>⊞</span>
              <span>Sheet Matrix</span>
            </button>
            <button
              onClick={() => handleSwitchView('tiles')}
              className={`px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5 ${
                viewMode === 'tiles'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>▦</span>
              <span>Live Tiles</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Metric Telemetry Tiles ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="acrylic-glass p-3.5 rounded-sm border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Curriculum</div>
          <div className="text-xl font-mono font-bold text-white">{summary.total}</div>
          <div className="text-[10px] text-white/40 font-mono">total topics</div>
        </div>

        <div className="acrylic-glass p-3.5 rounded-sm border border-error/30 bg-error/5 space-y-1">
          <div className="text-[10px] font-mono text-error uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Overconfident</span>
          </div>
          <div className="text-xl font-mono font-bold text-error">{summary.overconfident}</div>
          <div className="text-[10px] text-error/60 font-mono">conf &gt; accuracy</div>
        </div>

        <div className="acrylic-glass p-3.5 rounded-sm border border-primary/30 bg-primary/5 space-y-1">
          <div className="text-[10px] font-mono text-primary uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Underconfident</span>
          </div>
          <div className="text-xl font-mono font-bold text-primary">{summary.underconfident}</div>
          <div className="text-[10px] text-primary/60 font-mono">accuracy &gt; conf</div>
        </div>

        <div className="acrylic-glass p-3.5 rounded-sm border border-status-aligned/30 bg-status-aligned/5 space-y-1">
          <div className="text-[10px] font-mono text-status-aligned uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Aligned</span>
          </div>
          <div className="text-xl font-mono font-bold text-status-aligned">{summary.aligned}</div>
          <div className="text-[10px] text-status-aligned/60 font-mono">calibrated &plusmn;20%</div>
        </div>

        <div className="acrylic-glass p-3.5 rounded-sm border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Avg Confidence</div>
          <div className="text-xl font-mono font-bold text-primary">{summary.avgConfidence}<span className="text-xs font-normal text-white/40">/10</span></div>
          <div className="text-[10px] text-white/40 font-mono">student rating</div>
        </div>

        <div className="acrylic-glass p-3.5 rounded-sm border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Avg Accuracy</div>
          <div className="text-xl font-mono font-bold text-white">{summary.avgAccuracy}%</div>
          <div className="text-[10px] text-white/40 font-mono">mock eval score</div>
        </div>
      </div>

      {/* ─── Hero Live Gap Banner ─── */}
      {biggestGapTopic && (
        <div
          onClick={() => navigate(`/topics/${biggestGapTopic.topic_id}`)}
          className="relative cursor-pointer overflow-hidden p-5 md:p-6 rounded-sm bg-gradient-to-r from-error/90 via-error to-rose-700 text-white shadow-xl shadow-error/20 border-2 border-error/80 group"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-label-sm-mono uppercase tracking-widest text-white/90 text-xs">
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>Priority Overconfidence Gap</span>
                <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono">
                  GAP: {biggestGapTopic.gap}%
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-light tracking-tight text-white">
                {biggestGapTopic.topic_name}
              </h2>
              <p className="text-white/80 text-xs font-light">
                {biggestGapTopic.subject_name} &rsaquo; {biggestGapTopic.chapter_name} &middot; Confidence {biggestGapTopic.confidence}/10 vs {biggestGapTopic.evaluation_accuracy}% accuracy
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2 md:pt-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/practice?topic=${biggestGapTopic.topic_id}`);
                }}
                className="px-4 py-2 bg-black text-white text-xs font-mono uppercase tracking-wider rounded-sm font-bold flex items-center gap-1.5 hover:bg-white hover:text-black transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Drill Now</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/evaluate?topic=${biggestGapTopic.topic_id}`);
                }}
                className="px-4 py-2 bg-white text-black text-xs font-mono uppercase tracking-wider rounded-sm font-bold flex items-center gap-1.5 hover:bg-black hover:text-white transition-colors"
              >
                <Timer className="w-3.5 h-3.5 stroke-[2]" />
                <span>Mock Test</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Search & Filter Controls Bar ─── */}
      <div className="acrylic-glass p-4 rounded-sm border border-outline-variant space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Real-time Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search topic or chapter by name..."
              className="w-full bg-black/50 border border-outline-variant rounded-sm pl-9 pr-8 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:border-primary outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/50 uppercase tracking-wider shrink-0">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-black/50 border border-outline-variant rounded-sm px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-primary"
            >
              <option value="gap_asc">⚠️ Overconfident Gap (Largest First)</option>
              <option value="acc_asc">Lowest Accuracy First</option>
              <option value="conf_desc">Highest Confidence First</option>
              <option value="name_asc">Topic Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Subject & Status Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
          {/* Subject Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {subjects.map(s => {
              const isSelected = subjectFilter === s;
              const count = s === 'ALL'
                ? data.length
                : data.filter(d => d.subject_name === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setSubjectFilter(s)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-primary text-black font-bold'
                      : 'bg-surface-container text-white/60 hover:text-white border border-white/10'
                  }`}
                >
                  <span>{s}</span>
                  <span className={`px-1 py-0.2 rounded text-[10px] ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {['ALL', 'OVERCONFIDENT', 'UNDERCONFIDENT', 'ALIGNED', 'UNTESTED'].map(st => {
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider transition-colors ${
                    isSelected
                      ? 'bg-white/20 text-white font-bold border border-white/40'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-sm rounded-r-sm">
          {error}
        </div>
      )}

      {/* ─── VIEW MODE 1: EXCEL SHEET MATRIX VIEW ─── */}
      {viewMode === 'sheet' && (
        <div className="space-y-4">
          {/* Desktop & Tablet High-Density Excel Matrix */}
          <div className="hidden md:block acrylic-glass rounded-sm border border-outline-variant overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container/80 text-white/60 uppercase tracking-widest text-[10px]">
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-3 w-28">Subject</th>
                    <th className="py-3 px-3 w-48">Chapter</th>
                    <th className="py-3 px-4 min-w-[220px]">Curriculum Topic</th>
                    <th className="py-3 px-3 w-28 text-center">Confidence</th>
                    <th className="py-3 px-3 w-28 text-center">Accuracy</th>
                    <th className="py-3 px-3 w-28 text-center">Gap</th>
                    <th className="py-3 px-3 w-36 text-center">Status</th>
                    <th className="py-3 px-4 w-44 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAndSorted.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-white/40 text-sm font-sans">
                        No topics match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSorted.map((topic, idx) => {
                      const gap = topic.gap;
                      const isOver = topic.status === 'OVERCONFIDENT';
                      const isUnder = topic.status === 'UNDERCONFIDENT';
                      const isAligned = topic.status === 'ALIGNED';

                      return (
                        <tr
                          key={topic.topic_id}
                          className="hover:bg-surface-container/50 transition-colors group"
                        >
                          {/* Row # */}
                          <td className="py-2.5 px-3 text-center text-white/30 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Subject Pill */}
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getSubjectColor(topic.subject_name)}`}>
                              {topic.subject_name}
                            </span>
                          </td>

                          {/* Chapter */}
                          <td className="py-2.5 px-3 text-white/60 text-[11px] truncate max-w-[200px]" title={topic.chapter_name}>
                            {topic.chapter_name}
                          </td>

                          {/* Topic Name (Clickable link) */}
                          <td className="py-2.5 px-4 font-sans font-medium text-white group-hover:text-primary transition-colors">
                            <button
                              onClick={() => navigate(`/topics/${topic.topic_id}`)}
                              className="text-left hover:underline flex items-center gap-1.5"
                            >
                              <span>{topic.topic_name}</span>
                              <ChevronRight className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>

                          {/* Confidence with in-place calibration click */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => {
                                setCalibrateModal({ topicId: topic.topic_id, name: topic.topic_name, currentConf: topic.confidence });
                                setCalibrateVal(topic.confidence || 5);
                              }}
                              className="px-2 py-1 rounded bg-surface border border-white/10 hover:border-primary hover:text-primary transition-colors font-bold text-[11px] inline-flex items-center gap-1"
                              title="Click to calibrate confidence"
                            >
                              <span>{topic.confidence !== null ? `${topic.confidence}/10` : '--'}</span>
                              <span className="text-[9px] text-white/30">✎</span>
                            </button>
                          </td>

                          {/* Accuracy with subtle mini-bar */}
                          <td className="py-2.5 px-3 text-center">
                            {topic.evaluation_accuracy !== null ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-[11px]">{topic.evaluation_accuracy}%</span>
                                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden mt-0.5">
                                  <div
                                    className={`h-full ${topic.evaluation_accuracy >= 70 ? 'bg-status-aligned' : topic.evaluation_accuracy >= 40 ? 'bg-status-weak' : 'bg-error'}`}
                                    style={{ width: `${topic.evaluation_accuracy}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-white/30">--</span>
                            )}
                          </td>

                          {/* Calibration Gap */}
                          <td className="py-2.5 px-3 text-center font-bold">
                            {gap !== null ? (
                              <span className={`text-[11px] ${gap < 0 ? 'text-error' : gap > 0 ? 'text-primary' : 'text-status-aligned'}`}>
                                {gap > 0 ? `+${gap}%` : `${gap}%`}
                              </span>
                            ) : (
                              <span className="text-white/30">--</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex justify-center">
                              {getStatusBadge(topic.status)}
                            </div>
                          </td>

                          {/* Quick Action Buttons */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => navigate(`/practice?topic=${topic.topic_id}`)}
                                className="px-2.5 py-1 bg-surface-container border border-outline-variant hover:border-primary hover:text-primary text-white/80 rounded-sm uppercase tracking-wider text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Practice Questions"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>Drill</span>
                              </button>
                              <button
                                onClick={() => navigate(`/evaluate?topic=${topic.topic_id}`)}
                                className="px-2.5 py-1 bg-primary/10 border border-primary/40 hover:bg-primary hover:text-black text-primary rounded-sm uppercase tracking-wider text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Timed Mock Test"
                              >
                                <Timer className="w-2.5 h-2.5 stroke-[2]" />
                                <span>Mock</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Sheet Footer Count */}
            <div className="p-3 bg-surface-container/60 border-t border-outline-variant flex items-center justify-between text-[11px] font-mono text-white/50">
              <span>Showing {filteredAndSorted.length} of {data.length} topics</span>
              <span className="text-white/40">Tip: Click any confidence score to calibrate on the fly</span>
            </div>
          </div>

          {/* Mobile Ultra-Dense Responsive Accordion List (< 768px) */}
          <div className="block md:hidden space-y-2">
            <div className="text-[11px] font-mono text-white/50 px-1 flex justify-between">
              <span>{filteredAndSorted.length} topics found</span>
              <span>Tap row to expand</span>
            </div>

            {filteredAndSorted.map((topic, idx) => {
              const isExpanded = mobileExpandedTopic === topic.topic_id;
              return (
                <div
                  key={topic.topic_id}
                  className="acrylic-glass border border-outline-variant rounded-sm overflow-hidden"
                >
                  {/* Compact Row (<50px height) */}
                  <div
                    onClick={() => setMobileExpandedTopic(isExpanded ? null : topic.topic_id)}
                    className="p-3 flex items-center justify-between gap-2 cursor-pointer select-none active:bg-surface-container"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-mono text-white/40 w-5 shrink-0 text-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate font-sans">
                          {topic.topic_name}
                        </div>
                        <div className="text-[10px] font-mono text-white/50 truncate">
                          {topic.subject_name} &rsaquo; {topic.chapter_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {topic.gap !== null ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${topic.gap < 0 ? 'bg-error/20 text-error' : topic.gap > 0 ? 'bg-primary/20 text-primary' : 'bg-status-aligned/20 text-status-aligned'}`}>
                          {topic.gap > 0 ? `+${topic.gap}%` : `${topic.gap}%`}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-white/30">untested</span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded Detail Drawer */}
                  {isExpanded && (
                    <div className="p-3 bg-surface-container/60 border-t border-white/5 space-y-3 animate-fade-in text-xs font-mono">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-black/40 rounded border border-white/10">
                          <div className="text-[10px] text-white/40">CONFIDENCE</div>
                          <div className="font-bold text-sm text-primary">{topic.confidence !== null ? `${topic.confidence}/10` : '--'}</div>
                        </div>
                        <div className="p-2 bg-black/40 rounded border border-white/10">
                          <div className="text-[10px] text-white/40">ACCURACY</div>
                          <div className="font-bold text-sm text-white">{topic.evaluation_accuracy !== null ? `${topic.evaluation_accuracy}%` : '--'}</div>
                        </div>
                        <div className="p-2 bg-black/40 rounded border border-white/10">
                          <div className="text-[10px] text-white/40">GAP</div>
                          <div className={`font-bold text-sm ${topic.gap < 0 ? 'text-error' : topic.gap > 0 ? 'text-primary' : 'text-status-aligned'}`}>
                            {topic.gap !== null ? (topic.gap > 0 ? `+${topic.gap}%` : `${topic.gap}%`) : '--'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/50 uppercase">Status:</span>
                        {getStatusBadge(topic.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          onClick={() => {
                            setCalibrateModal({ topicId: topic.topic_id, name: topic.topic_name, currentConf: topic.confidence });
                            setCalibrateVal(topic.confidence || 5);
                          }}
                          className="py-2 bg-surface-dim border border-white/20 text-white rounded-sm text-[11px] font-bold uppercase tracking-wider hover:border-primary"
                        >
                          Calibrate
                        </button>
                        <button
                          onClick={() => navigate(`/practice?topic=${topic.topic_id}`)}
                          className="py-2 bg-surface-container border border-outline-variant text-white rounded-sm text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Drill</span>
                        </button>
                        <button
                          onClick={() => navigate(`/evaluate?topic=${topic.topic_id}`)}
                          className="py-2 bg-primary text-black rounded-sm text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1"
                        >
                          <Timer className="w-3 h-3 stroke-[2]" />
                          <span>Mock</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── VIEW MODE 2: WINDOWS PHONE METRO LIVE TILES ─── */}
      {viewMode === 'tiles' && (
        <div className="space-y-8">
          {Object.entries(groupedByChapter).map(([groupName, topics]) => (
            <section key={groupName} className="space-y-3">
              <h3 className="text-label-sm-mono text-white/70 uppercase tracking-widest flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                {groupName}
                <span className="text-white/30 font-normal">({topics.length} topics)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {topics.map(topic => (
                  <div
                    key={topic.topic_id}
                    onClick={() => navigate(`/topics/${topic.topic_id}`)}
                    className="metro-tile relative cursor-pointer p-4 flex flex-col justify-between overflow-hidden rounded-sm select-none aspect-square bg-surface-container hover:border-primary border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">
                        {topic.subject_name.slice(0, 4)}
                      </span>
                      {getStatusBadge(topic.status)}
                    </div>

                    <div className="my-2">
                      <h4 className="font-medium text-xs leading-snug line-clamp-3 text-white">
                        {topic.topic_name}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-end justify-between text-xs font-mono">
                      <div>
                        {topic.confidence !== null ? (
                          <span>{topic.confidence}<span className="text-[10px] opacity-50">/10</span></span>
                        ) : (
                          <span className="text-[10px] opacity-40">UNRATED</span>
                        )}
                      </div>
                      <div>
                        {topic.evaluation_accuracy !== null ? (
                          <span className="font-bold">{topic.evaluation_accuracy}%</span>
                        ) : (
                          <span className="text-[10px] opacity-40">--</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ─── In-Place Quick Confidence Calibration Modal ─── */}
      {calibrateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCalibrateModal(null)}
        >
          <div
            className="bg-surface-dim border border-outline-variant p-6 rounded-md max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                  Quick Calibration &middot; 1–10 Scale
                </div>
                <h3 className="text-lg font-light text-white mt-0.5">
                  {calibrateModal.name}
                </h3>
              </div>
              <button
                onClick={() => setCalibrateModal(null)}
                className="text-white/40 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white/60 font-light">
              How confident do you feel about solving typical JEE Main / Advanced questions from this topic?
            </p>

            <div className="py-2">
              <ConfidenceSlider value={calibrateVal} onChange={setCalibrateVal} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveConfidence}
                disabled={calibrating}
                className="flex-1 py-2.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110 disabled:opacity-50"
              >
                {calibrating ? 'Saving...' : 'Save Rating'}
              </button>
              <button
                onClick={() => setCalibrateModal(null)}
                className="px-4 py-2.5 border border-outline-variant text-white/70 text-xs font-mono uppercase tracking-wider rounded-sm hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
