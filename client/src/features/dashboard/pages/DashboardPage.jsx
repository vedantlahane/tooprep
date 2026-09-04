import { useState, useEffect, useMemo, useRef } from 'react';
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
  X,
  RefreshCw,
  Hash,
  Grid,
  LayoutGrid,
  Zap,
  RotateCcw,
  Calculator,
  ChevronUp
} from '@/shared/components/Icon';

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('tooprep_map_view') || 'sheet');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Excel-style sorting: column and direction
  const [sortCol, setSortCol] = useState('default'); // 'default', 'subject', 'chapter', 'topic', 'conf', 'acc', 'gap', 'status', 'attempts'
  const [sortDir, setSortDir] = useState('asc'); // 'asc', 'desc'

  // Excel-style active cell selection
  const [activeCell, setActiveCell] = useState({ coord: 'C1', col: 'C', row: 1, field: 'topic_name', value: '' });

  // In-cell confidence calibration popover
  const [inCellCalibrate, setInCellCalibrate] = useState(null); // { topicId, currentVal, topicName, x, y }
  const [savingConf, setSavingConf] = useState(false);

  // Full calibration modal (optional deep calibration)
  const [calibrateModal, setCalibrateModal] = useState(null);
  const [calibrateVal, setCalibrateVal] = useState(5);
  const [calibrating, setCalibrating] = useState(false);

  // Mobile compact toggle
  const [mobileExpandedTopic, setMobileExpandedTopic] = useState(null);

  const formulaInputRef = useRef(null);
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

  // Pre-calculated subject counts for workbook tabs
  const subjectCounts = useMemo(() => {
    const counts = { ALL: data.length, Physics: 0, Chemistry: 0, Mathematics: 0 };
    data.forEach(d => {
      const s = d.subject_name;
      if (s && counts[s] !== undefined) {
        counts[s]++;
      }
    });
    return counts;
  }, [data]);

  // Handle Excel column header click for sorting
  const handleSortHeader = (col) => {
    if (sortCol === col) {
      // Toggle direction or reset to default
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortCol('default');
        setSortDir('asc');
      }
    } else {
      setSortCol(col);
      // High-to-low makes more sense first for numeric columns
      setSortDir(['conf', 'acc', 'gap', 'attempts'].includes(col) ? 'desc' : 'asc');
    }
  };

  // Filtered & Sorted Dataset
  const filteredAndSorted = useMemo(() => {
    let list = [...data];

    // 1. Subject Tab filter
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

    // 3. Search / Formula bar query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.topic_name || '').toLowerCase().includes(q) ||
        (r.chapter_name || '').toLowerCase().includes(q) ||
        (r.subject_name || '').toLowerCase().includes(q)
      );
    }

    // 4. Excel Column Sorting
    list.sort((a, b) => {
      if (sortCol === 'subject') {
        const cmp = (a.subject_name || '').localeCompare(b.subject_name || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortCol === 'chapter') {
        const cmp = (a.chapter_name || '').localeCompare(b.chapter_name || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortCol === 'topic') {
        const cmp = (a.topic_name || '').localeCompare(b.topic_name || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortCol === 'conf') {
        const valA = a.confidence !== null ? a.confidence : -1;
        const valB = b.confidence !== null ? b.confidence : -1;
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      if (sortCol === 'acc') {
        const valA = a.evaluation_accuracy !== null ? a.evaluation_accuracy : -1;
        const valB = b.evaluation_accuracy !== null ? b.evaluation_accuracy : -1;
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      if (sortCol === 'gap') {
        const valA = a.gap !== null ? a.gap : 999;
        const valB = b.gap !== null ? b.gap : 999;
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      if (sortCol === 'status') {
        const cmp = (a.status || '').localeCompare(b.status || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortCol === 'attempts') {
        const valA = a.questions_attempted || 0;
        const valB = b.questions_attempted || 0;
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      // Default sorting: Natural JEE Syllabus order (Physics -> Chemistry -> Mathematics, Chapter, Topic)
      const subOrder = { 'Physics': 1, 'Chemistry': 2, 'Mathematics': 3 };
      const orderA = subOrder[a.subject_name] || 99;
      const orderB = subOrder[b.subject_name] || 99;
      if (orderA !== orderB) return orderA - orderB;

      const chCmp = (a.chapter_name || '').localeCompare(b.chapter_name || '');
      if (chCmp !== 0) return chCmp;

      return (a.topic_name || '').localeCompare(b.topic_name || '');
    });

    return list;
  }, [data, subjectFilter, statusFilter, searchQuery, sortCol, sortDir]);

  // Priority Gap Hero
  const biggestGapTopic = useMemo(() => {
    const overconfident = data
      .filter(d => d.status === 'OVERCONFIDENT')
      .sort((a, b) => a.gap - b.gap);
    return overconfident[0] || null;
  }, [data]);

  // Aggregate Metrics for Excel Sheet Telemetry
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
    const totalAttempts = data.reduce((sum, t) => sum + (t.questions_attempted || 0), 0);

    return {
      total,
      overconfident,
      underconfident,
      aligned,
      untested,
      avgConfidence: Number.isFinite(avgConfidence) ? avgConfidence.toFixed(1) : '0.0',
      avgAccuracy: Number.isFinite(avgAccuracy) ? Math.round(avgAccuracy) : 0,
      totalAttempts
    };
  }, [data]);

  // Quick In-Cell Confidence Calibration
  const handleQuickCalibrate = async (topicId, score) => {
    setSavingConf(true);
    try {
      await confidenceService.setConfidence(topicId, score, 'INITIAL');
      setData(prev => prev.map(t => {
        if (t.topic_id === topicId) {
          const newGap = t.evaluation_accuracy !== null ? Math.round(t.evaluation_accuracy - (score * 10)) : null;
          return { ...t, confidence: score, gap: newGap };
        }
        return t;
      }));
      setInCellCalibrate(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingConf(false);
    }
  };

  // Full Modal Confidence Calibration
  const handleSaveModalConfidence = async () => {
    if (!calibrateModal) return;
    setCalibrating(true);
    try {
      await confidenceService.setConfidence(calibrateModal.topicId, calibrateVal, 'INITIAL');
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

  // Metro Live Tiles group
  const groupedByChapter = useMemo(() => {
    const groups = {};
    filteredAndSorted.forEach(topic => {
      const groupName = `${topic.subject_name} › ${topic.chapter_name}`;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(topic);
    });
    return groups;
  }, [filteredAndSorted]);

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

  const renderSortIndicator = (col) => {
    if (sortCol !== col) {
      return <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-40 ml-1 shrink-0" />;
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-primary ml-1 shrink-0" strokeWidth={2.5} />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary ml-1 shrink-0" strokeWidth={2.5} />
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-36 space-y-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <div className="text-label-sm-mono text-primary uppercase tracking-[0.3em] text-xs">
          Loading TooPrep Excel Matrix // 130 Topics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* ─── Excel Application Title & Telemetry Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm shadow-sm">
            XLS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-light text-white tracking-tight lowercase">
                knowledge map
              </h1>
              <span className="text-[11px] font-mono text-white/40">// JEE_MAIN_2026_CURRICULUM.XLSX</span>
            </div>
            <div className="text-[11px] font-mono text-white/50 flex items-center gap-3 mt-0.5">
              <span>{summary.total} canonical syllabus topics</span>
              <span className="text-white/20">|</span>
              <span>avg confidence: <strong className="text-primary">{summary.avgConfidence}/10</strong></span>
              <span className="text-white/20">|</span>
              <span>avg accuracy: <strong className="text-white">{summary.avgAccuracy}%</strong></span>
            </div>
          </div>
        </div>

        {/* View Switcher: Excel Spreadsheet vs Metro Live Tiles */}
        <div className="flex items-center gap-2">
          <div className="bg-surface-container p-1 rounded-sm border border-outline-variant flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => handleSwitchView('sheet')}
              className={`px-3 py-1 rounded-sm transition-colors flex items-center gap-1.5 press-feedback ${
                viewMode === 'sheet'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>XLS Sheet</span>
            </button>
            <button
              onClick={() => handleSwitchView('tiles')}
              className={`px-3 py-1 rounded-sm transition-colors flex items-center gap-1.5 press-feedback ${
                viewMode === 'tiles'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Live Tiles</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Priority Overconfidence Alert Banner ─── */}
      {biggestGapTopic && (
        <div
          onClick={() => navigate(`/topics/${biggestGapTopic.topic_id}`)}
          className="relative cursor-pointer overflow-hidden px-4 py-3 rounded-sm bg-error/15 border border-error/50 hover:bg-error/25 transition-all text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 group animate-pulse-urgent press-feedback"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-error/30 border border-error/60 flex items-center justify-center text-error shrink-0 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-error font-bold flex items-center gap-2">
                <span>⚠️ Highest Overconfidence Risk Identified</span>
                <span className="text-white/50 text-[9px] font-normal">({biggestGapTopic.subject_name} › {biggestGapTopic.chapter_name})</span>
              </div>
              <div className="text-sm font-medium text-white flex items-baseline gap-2">
                <span>{biggestGapTopic.topic_name}</span>
                <span className="text-xs font-mono text-white/70">
                  Self-Rating: <strong className="text-error">{biggestGapTopic.confidence}/10</strong> vs Mock Score: <strong className="text-white">{biggestGapTopic.evaluation_accuracy}%</strong> (Gap: <strong className="text-error">{biggestGapTopic.gap}%</strong>)
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/evaluate?topic=${biggestGapTopic.topic_id}`);
              }}
              className="px-3 py-1.5 bg-error text-white font-mono text-[11px] font-bold uppercase tracking-wider rounded-sm hover:brightness-110 flex items-center gap-1"
            >
              <Timer className="w-3.5 h-3.5 stroke-[2]" />
              <span>Diagnostic Mock</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
       * VIEW MODE 1: AUTHENTIC EXCEL SPREADSHEET (XLS SHEET MATRIX)
       * ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'sheet' && (
        <div className="space-y-2">
          {/* ─── Excel Formula & Name Box Bar ─── */}
          <div className="acrylic-glass border border-white/10 rounded-sm p-1.5 flex items-center gap-2 bg-surface-container/90">
            {/* Name Box (Active Cell Coordinate) */}
            <div
              className="px-2.5 py-1 bg-black/60 border border-white/15 rounded text-primary font-mono text-xs font-bold min-w-[64px] text-center shrink-0 tracking-wider"
              title="Active Cell Coordinate"
            >
              {activeCell.coord}
            </div>

            {/* Excel Formula fx Button */}
            <div className="w-6 h-6 flex items-center justify-center font-serif italic text-white/50 text-sm border-r border-white/10 pr-2 shrink-0 select-none">
              fx
            </div>

            {/* Formula / Search Input Box */}
            <div className="flex-1 relative flex items-center">
              <input
                ref={formulaInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder='=FILTER(Syllabus, "search topic, chapter, or subject...")'
                className="w-full bg-transparent text-xs font-mono text-white placeholder:text-white/30 outline-none px-2 py-1"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-white/40 hover:text-white text-xs mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Status Pill Filter inside formula bar */}
            <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono border-l border-white/10 pl-2">
              <span className="text-white/40 uppercase mr-1">Status:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'OVERCONFIDENT', label: 'Over' },
                { id: 'ALIGNED', label: 'Aligned' },
                { id: 'UNTESTED', label: 'Untested' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    statusFilter === st.id
                      ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Excel Workbook Sheet Tabs Bar ─── */}
          <div className="flex items-center justify-between border-b border-white/10 pt-1 px-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 min-w-max">
              {/* Sheet 1: All Topics */}
              <button
                onClick={() => setSubjectFilter('ALL')}
                className={`px-3.5 py-1.5 text-xs font-mono rounded-t border-t border-x transition-all flex items-center gap-2 ${
                  subjectFilter === 'ALL'
                    ? 'bg-surface-container border-white/20 text-white font-bold border-b-2 border-b-primary shadow-sm'
                    : 'bg-black/40 border-transparent text-white/50 hover:text-white/80 hover:bg-surface-container/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Topics</span>
                <span className="px-1.5 py-0.2 bg-white/10 rounded-full text-[10px] font-normal">
                  {subjectCounts.ALL}
                </span>
              </button>

              {/* Sheet 2: Physics */}
              <button
                onClick={() => setSubjectFilter('Physics')}
                className={`px-3.5 py-1.5 text-xs font-mono rounded-t border-t border-x transition-all flex items-center gap-2 ${
                  subjectFilter === 'Physics'
                    ? 'bg-surface-container border-primary/30 text-primary font-bold border-b-2 border-b-primary shadow-sm'
                    : 'bg-black/40 border-transparent text-white/50 hover:text-white/80 hover:bg-surface-container/40'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Physics</span>
                <span className="px-1.5 py-0.2 bg-primary/20 text-primary rounded-full text-[10px] font-normal">
                  {subjectCounts.Physics}
                </span>
              </button>

              {/* Sheet 3: Chemistry */}
              <button
                onClick={() => setSubjectFilter('Chemistry')}
                className={`px-3.5 py-1.5 text-xs font-mono rounded-t border-t border-x transition-all flex items-center gap-2 ${
                  subjectFilter === 'Chemistry'
                    ? 'bg-surface-container border-amber-500/30 text-amber-400 font-bold border-b-2 border-b-amber-400 shadow-sm'
                    : 'bg-black/40 border-transparent text-white/50 hover:text-white/80 hover:bg-surface-container/40'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Chemistry</span>
                <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-400 rounded-full text-[10px] font-normal">
                  {subjectCounts.Chemistry}
                </span>
              </button>

              {/* Sheet 4: Mathematics */}
              <button
                onClick={() => setSubjectFilter('Mathematics')}
                className={`px-3.5 py-1.5 text-xs font-mono rounded-t border-t border-x transition-all flex items-center gap-2 ${
                  subjectFilter === 'Mathematics'
                    ? 'bg-surface-container border-emerald-500/30 text-emerald-400 font-bold border-b-2 border-b-emerald-400 shadow-sm'
                    : 'bg-black/40 border-transparent text-white/50 hover:text-white/80 hover:bg-surface-container/40'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Mathematics</span>
                <span className="px-1.5 py-0.2 bg-emerald-400/20 text-emerald-400 rounded-full text-[10px] font-normal">
                  {subjectCounts.Mathematics}
                </span>
              </button>
            </div>

            {/* Quick Spreadsheet Reset & Info */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-white/40 pr-2">
              <span>Showing <strong>{filteredAndSorted.length}</strong> rows</span>
              {(sortCol !== 'default' || searchQuery || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSortCol('default');
                    setSortDir('asc');
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Sheet</span>
                </button>
              )}
            </div>
          </div>

          {/* ─── The Master Excel Spreadsheet Grid ─── */}
          <div className="border border-neutral-800 rounded-sm bg-black overflow-hidden shadow-2xl">
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto no-scrollbar relative">
              <table className="w-full border-collapse text-left font-mono text-xs">
                {/* ─── Excel Column Header Row ─── */}
                <thead className="sticky top-0 z-20 bg-neutral-900/95 backdrop-blur-md text-white/70 border-b border-neutral-700">
                  <tr>
                    {/* Corner Box / Row Index */}
                    <th className="py-2 px-2.5 w-12 text-center text-white/40 border-r border-neutral-800 bg-neutral-950 font-mono text-[10px] select-none">
                      <Hash className="w-3 h-3 mx-auto text-white/40" />
                    </th>

                    {/* Column A: Subject */}
                    <th
                      onClick={() => handleSortHeader('subject')}
                      className="py-2 px-3 w-28 border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-white/30 text-[9px] font-bold">A</span>
                          <span className="font-semibold text-white/80">Subject</span>
                        </div>
                        {renderSortIndicator('subject')}
                      </div>
                    </th>

                    {/* Column B: Chapter */}
                    <th
                      onClick={() => handleSortHeader('chapter')}
                      className="py-2 px-3 w-56 border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-white/30 text-[9px] font-bold">B</span>
                          <span className="font-semibold text-white/80">Chapter</span>
                        </div>
                        {renderSortIndicator('chapter')}
                      </div>
                    </th>

                    {/* Column C: Topic Name */}
                    <th
                      onClick={() => handleSortHeader('topic')}
                      className="py-2 px-4 min-w-[240px] border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-white/30 text-[9px] font-bold">C</span>
                          <span className="font-semibold text-white/90">Topic Curriculum</span>
                        </div>
                        {renderSortIndicator('topic')}
                      </div>
                    </th>

                    {/* Column D: Confidence */}
                    <th
                      onClick={() => handleSortHeader('conf')}
                      className="py-2 px-3 w-32 text-center border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white/30 text-[9px] font-bold">D</span>
                        <span className="font-semibold text-white/80">Confidence</span>
                        {renderSortIndicator('conf')}
                      </div>
                    </th>

                    {/* Column E: Accuracy */}
                    <th
                      onClick={() => handleSortHeader('acc')}
                      className="py-2 px-3 w-28 text-center border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white/30 text-[9px] font-bold">E</span>
                        <span className="font-semibold text-white/80">Accuracy</span>
                        {renderSortIndicator('acc')}
                      </div>
                    </th>

                    {/* Column F: Gap */}
                    <th
                      onClick={() => handleSortHeader('gap')}
                      className="py-2 px-3 w-24 text-center border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white/30 text-[9px] font-bold">F</span>
                        <span className="font-semibold text-white/80">Gap</span>
                        {renderSortIndicator('gap')}
                      </div>
                    </th>

                    {/* Column G: Status */}
                    <th
                      onClick={() => handleSortHeader('status')}
                      className="py-2 px-3 w-36 text-center border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white/30 text-[9px] font-bold">G</span>
                        <span className="font-semibold text-white/80">Status</span>
                        {renderSortIndicator('status')}
                      </div>
                    </th>

                    {/* Column H: Questions Attempted */}
                    <th
                      onClick={() => handleSortHeader('attempts')}
                      className="py-2 px-3 w-20 text-center border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white/30 text-[9px] font-bold">H</span>
                        <span className="font-semibold text-white/80">Qs</span>
                        {renderSortIndicator('attempts')}
                      </div>
                    </th>

                    {/* Column I: Quick Actions */}
                    <th className="py-2 px-4 w-40 text-center bg-neutral-900/95 font-semibold text-white/80 select-none">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white/30 text-[9px] font-bold">I</span>
                        <span>Action</span>
                      </div>
                    </th>
                  </tr>
                </thead>

                {/* ─── Excel Spreadsheet Rows ─── */}
                <tbody className="divide-y divide-neutral-800/80 bg-black">
                  {filteredAndSorted.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-white/40 font-mono">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 text-white/20 mb-1" />
                          <span>No topics found matching formula filter: "{searchQuery || subjectFilter}"</span>
                          <button
                            onClick={() => { setSearchQuery(''); setSubjectFilter('ALL'); setStatusFilter('ALL'); }}
                            className="mt-2 text-xs text-primary underline"
                          >
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSorted.map((topic, idx) => {
                      const rowNum = idx + 1;
                      const isSelectedRow = activeCell.row === rowNum;
                      const gap = topic.gap;
                      const staggerClass = idx < 8 ? `animate-slide-up stagger-${idx + 1}` : '';

                      return (
                        <tr
                          key={topic.topic_id}
                          onClick={() => setActiveCell({
                            coord: `C${rowNum}`,
                            col: 'C',
                            row: rowNum,
                            field: 'topic_name',
                            value: topic.topic_name
                          })}
                          className={`transition-all duration-150 group hover:bg-neutral-900/80 ${staggerClass} ${
                            isSelectedRow ? 'bg-neutral-900/60' : ''
                          }`}
                        >
                          {/* Row Index Gutter */}
                          <td className="py-1.5 px-2 text-center text-white/30 font-mono text-[10px] bg-neutral-950/80 border-r border-neutral-800 select-none group-hover:text-primary">
                            {rowNum}
                          </td>

                          {/* Cell A: Subject */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `A${rowNum}`, col: 'A', row: rowNum, field: 'subject_name', value: topic.subject_name });
                            }}
                            className={`py-1.5 px-3 border-r border-neutral-800/80 text-[11px] truncate ${
                              activeCell.coord === `A${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''
                            }`}
                          >
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getSubjectColor(topic.subject_name)}`}>
                              {topic.subject_name}
                            </span>
                          </td>

                          {/* Cell B: Chapter */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `B${rowNum}`, col: 'B', row: rowNum, field: 'chapter_name', value: topic.chapter_name });
                            }}
                            className={`py-1.5 px-3 border-r border-neutral-800/80 text-white/60 text-[11px] truncate max-w-[220px] ${
                              activeCell.coord === `B${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5 text-white' : ''
                            }`}
                            title={topic.chapter_name}
                          >
                            {topic.chapter_name}
                          </td>

                          {/* Cell C: Topic Name (Clickable to Topic Detail) */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `C${rowNum}`, col: 'C', row: rowNum, field: 'topic_name', value: topic.topic_name });
                            }}
                            className={`py-1.5 px-4 border-r border-neutral-800/80 font-sans text-xs text-white/90 font-medium ${
                              activeCell.coord === `C${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5 text-primary' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => navigate(`/topics/${topic.topic_id}`)}
                                className="text-left hover:text-primary hover:underline truncate"
                                title="Click to view deep topic analytics"
                              >
                                {topic.topic_name}
                              </button>
                              <ChevronRight className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                          </td>

                          {/* Cell D: Confidence (with in-cell calibration) */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `D${rowNum}`, col: 'D', row: rowNum, field: 'confidence', value: topic.confidence });
                              setInCellCalibrate(inCellCalibrate?.topicId === topic.topic_id ? null : {
                                topicId: topic.topic_id,
                                currentVal: topic.confidence || 5,
                                topicName: topic.topic_name
                              });
                            }}
                            className={`py-1.5 px-2.5 text-center border-r border-neutral-800/80 cursor-pointer ${
                              activeCell.coord === `D${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''
                            }`}
                          >
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface border border-white/10 hover:border-primary transition-colors text-[11px] font-bold">
                              <span className={topic.confidence !== null ? 'text-primary' : 'text-white/30'}>
                                {topic.confidence !== null ? `${topic.confidence}/10` : '--'}
                              </span>
                              <Sliders className="w-2.5 h-2.5 text-white/40" />
                            </div>
                          </td>

                          {/* Cell E: Evaluation Accuracy (with mini data-bar) */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `E${rowNum}`, col: 'E', row: rowNum, field: 'evaluation_accuracy', value: topic.evaluation_accuracy });
                            }}
                            className={`py-1.5 px-3 text-center border-r border-neutral-800/80 ${
                              activeCell.coord === `E${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''
                            }`}
                          >
                            {topic.evaluation_accuracy !== null ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-[11px] text-white">{topic.evaluation_accuracy}%</span>
                                <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden mt-0.5">
                                  <div
                                    className={`h-full ${
                                      topic.evaluation_accuracy >= 70
                                        ? 'bg-status-aligned'
                                        : topic.evaluation_accuracy >= 40
                                        ? 'bg-status-weak'
                                        : 'bg-error'
                                    }`}
                                    style={{ width: `${topic.evaluation_accuracy}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-white/30 text-[11px]">--</span>
                            )}
                          </td>

                          {/* Cell F: Calibration Gap */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `F${rowNum}`, col: 'F', row: rowNum, field: 'gap', value: gap });
                            }}
                            className={`py-1.5 px-3 text-center font-bold border-r border-neutral-800/80 ${
                              activeCell.coord === `F${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''
                            }`}
                          >
                            {gap !== null ? (
                              <span className={`text-[11px] font-bold ${
                                gap < 0 ? 'text-error' : gap > 0 ? 'text-primary' : 'text-status-aligned'
                              }`}>
                                {gap > 0 ? `+${gap}%` : `${gap}%`}
                              </span>
                            ) : (
                              <span className="text-white/30 text-[11px]">--</span>
                            )}
                          </td>

                          {/* Cell G: Status Badge */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `G${rowNum}`, col: 'G', row: rowNum, field: 'status', value: topic.status });
                            }}
                            className={`py-1.5 px-3 text-center border-r border-neutral-800/80 ${
                              activeCell.coord === `G${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex justify-center">
                              {getStatusBadge(topic.status)}
                            </div>
                          </td>

                          {/* Cell H: Questions Attempted */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `H${rowNum}`, col: 'H', row: rowNum, field: 'questions_attempted', value: topic.questions_attempted });
                            }}
                            className={`py-1.5 px-3 text-center text-white/50 text-[11px] border-r border-neutral-800/80 ${
                              activeCell.coord === `H${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5 text-white' : ''
                            }`}
                          >
                            {topic.questions_attempted || 0}
                          </td>

                          {/* Cell I: Quick Action Buttons */}
                          <td className="py-1.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => navigate(`/practice?topic=${topic.topic_id}`)}
                                className="px-2 py-1 bg-surface-container border border-outline-variant hover:border-primary hover:text-primary text-white/80 rounded-xs uppercase tracking-wider text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Practice Questions"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>Drill</span>
                              </button>
                              <button
                                onClick={() => navigate(`/evaluate?topic=${topic.topic_id}`)}
                                className="px-2 py-1 bg-primary/15 border border-primary/40 hover:bg-primary hover:text-black text-primary rounded-xs uppercase tracking-wider text-[10px] font-bold flex items-center gap-1 transition-colors"
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

            {/* ─── In-Cell Calibration Micro-Drawer (if active) ─── */}
            {inCellCalibrate && (
              <div className="p-3 bg-neutral-900 border-t-2 border-primary flex flex-wrap items-center justify-between gap-3 animate-slide-down text-xs font-mono shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">CALIBRATE:</span>
                  <span className="text-white">{inCellCalibrate.topicName}</span>
                  <span className="text-white/40">// Select Confidence (1-10):</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <button
                      key={val}
                      onClick={() => handleQuickCalibrate(inCellCalibrate.topicId, val)}
                      disabled={savingConf}
                      className={`w-7 h-7 rounded text-xs font-bold font-mono transition-transform hover:scale-110 press-feedback ${
                        inCellCalibrate.currentVal === val
                          ? 'bg-primary text-black ring-2 ring-white'
                          : 'bg-neutral-800 text-white hover:bg-neutral-700'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                  <button
                    onClick={() => setInCellCalibrate(null)}
                    className="ml-2 text-white/50 hover:text-white p-1 press-feedback"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Excel Bottom Status Bar ─── */}
            <div className="px-3 py-2 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-white/50">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  READY
                </span>
                <span className="text-white/30">|</span>
                <span>SHEET: <strong className="text-white">{subjectFilter}</strong></span>
                <span className="text-white/30">|</span>
                <span>ROWS: <strong className="text-white">{filteredAndSorted.length}</strong> of {data.length}</span>
                <span className="text-white/30">|</span>
                <span>CELL: <strong className="text-primary">{activeCell.coord}</strong></span>
              </div>

              <div className="flex items-center gap-4">
                <span>AVG CONF: <strong className="text-primary">{summary.avgConfidence}/10</strong></span>
                <span>AVG ACC: <strong className="text-white">{summary.avgAccuracy}%</strong></span>
                <span>TOTAL QS: <strong className="text-white">{summary.totalAttempts}</strong></span>
                <span className="hidden sm:inline text-white/30">|</span>
                <span className="hidden sm:inline text-white/40">100% ZOOM</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
       * VIEW MODE 2: WINDOWS PHONE METRO LIVE TILES
       * ═══════════════════════════════════════════════════════════════════ */}
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
                {topics.map((topic, tileIdx) => (
                  <div
                    key={topic.topic_id}
                    onClick={() => navigate(`/topics/${topic.topic_id}`)}
                    className={`metro-tile relative cursor-pointer p-4 flex flex-col justify-between overflow-hidden rounded-sm select-none aspect-square bg-surface-container hover:border-primary border border-white/10 animate-tile-flip hover-lift ${tileIdx < 6 ? `stagger-${tileIdx + 1}` : ''}`}
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

      {/* ─── Modal Confidence Calibration (Fallback) ─── */}
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
                className="text-white/40 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
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
                onClick={handleSaveModalConfidence}
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
