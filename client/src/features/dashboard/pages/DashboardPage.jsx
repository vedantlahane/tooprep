import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [data, setData] = useState(() => dashboardService.getCachedDashboard() || []);
  const [loading, setLoading] = useState(() => !dashboardService.getCachedDashboard());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('tooprep_map_view') || 'sheet');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Excel-style sorting: column and direction
  const [sortCol, setSortCol] = useState('default'); // 'default', 'subject', 'chapter', 'topic', 'conf', 'acc', 'gap', 'status', 'attempts'
  const [sortDir, setSortDir] = useState('asc'); // 'asc', 'desc'

  // Active cell selection
  const [activeCell, setActiveCell] = useState({ coord: 'C1', col: 'C', row: 1, field: 'topic_name', value: '' });
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
    loadDashboard(false);
  }, []);

  const loadDashboard = async (force = false) => {
    if (force) {
      setIsRefreshing(true);
    } else if (!dashboardService.getCachedDashboard()) {
      setLoading(true);
    }
    try {
      const result = await dashboardService.getDashboard(force);
      setData(result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
      setSortDir(['conf', 'acc', 'gap', 'available', 'attempts'].includes(col) ? 'desc' : 'asc');
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
      if (sortCol === 'available') {
        const valA = a.questions_available || 0;
        const valB = b.questions_available || 0;
        return sortDir === 'asc' ? valA - valB : valB - valA;
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
    const totalAvailable = data.reduce((sum, t) => sum + (t.questions_available || 0), 0);

    return {
      total,
      overconfident,
      underconfident,
      aligned,
      untested,
      avgConfidence: Number.isFinite(avgConfidence) ? avgConfidence.toFixed(1) : '0.0',
      avgAccuracy: Number.isFinite(avgAccuracy) ? Math.round(avgAccuracy) : 0,
      totalAttempts,
      totalAvailable
    };
  }, [data]);

  // Recompute status helper
  const classifyStatus = (accuracy, gap, attempts) => {
    if (!attempts && accuracy === null) return 'INSUFFICIENT_DATA';
    if (attempts < 3 && attempts > 0) return 'PRELIMINARY';
    if (gap === null) return 'INSUFFICIENT_DATA';
    if (gap <= -20) return 'OVERCONFIDENT';
    if (gap >= 20) return 'UNDERCONFIDENT';
    if (Math.abs(gap) <= 15 && accuracy >= 60) return 'ALIGNED';
    if (Math.abs(gap) <= 15) return 'WEAK_ALIGNED';
    return 'PRELIMINARY';
  };

  // Quick In-Cell Confidence Calibration
  const handleQuickCalibrate = async (topicId, score) => {
    setSavingConf(true);
    try {
      await confidenceService.setConfidence(topicId, score, 'INITIAL');
      let updatedObj = null;
      setData(prev => prev.map(t => {
        if (t.topic_id === topicId) {
          const newGap = t.evaluation_accuracy !== null ? Math.round(t.evaluation_accuracy - (score * 10)) : null;
          const newStatus = classifyStatus(t.evaluation_accuracy, newGap, t.eval_attempts || 0);
          updatedObj = { ...t, confidence: score, gap: newGap, status: newStatus };
          return updatedObj;
        }
        return t;
      }));
      if (updatedObj) {
        dashboardService.updateTopicInCache(topicId, {
          confidence: score,
          gap: updatedObj.gap,
          status: updatedObj.status
        });
      }
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
      let updatedObj = null;
      setData(prev => prev.map(t => {
        if (t.topic_id === calibrateModal.topicId) {
          const newGap = t.evaluation_accuracy !== null ? Math.round(t.evaluation_accuracy - (calibrateVal * 10)) : null;
          const newStatus = classifyStatus(t.evaluation_accuracy, newGap, t.eval_attempts || 0);
          updatedObj = { ...t, confidence: calibrateVal, gap: newGap, status: newStatus };
          return updatedObj;
        }
        return t;
      }));
      if (updatedObj) {
        dashboardService.updateTopicInCache(calibrateModal.topicId, {
          confidence: calibrateVal,
          gap: updatedObj.gap,
          status: updatedObj.status
        });
      }
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
    if (s.includes('PHYSIC')) return 'text-primary border-primary/30 bg-primary/10';
    if (s.includes('CHEMIS')) return 'text-status-weak border-status-weak/30 bg-status-weak/10';
    if (s.includes('MATH')) return 'text-status-aligned border-status-aligned/30 bg-status-aligned/10';
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
      {/* ─── Application Title & Summary Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight lowercase">
            knowledge map
          </h1>
          <div className="text-xs text-white/60 flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
            <span>{summary.total} topics</span>
            <span className="text-white/20">&middot;</span>
            <span>questions in bank: <strong className="text-primary font-semibold">{summary.totalAvailable}</strong></span>
            <span className="text-white/20">&middot;</span>
            <span>avg confidence: <strong className="text-primary font-semibold">{summary.avgConfidence}/10</strong></span>
            <span className="text-white/20">&middot;</span>
            <span>avg accuracy: <strong className="text-white font-semibold">{summary.avgAccuracy}%</strong></span>
          </div>
        </div>

        {/* View Switcher: Spreadsheet vs Metro Live Tiles & Manual Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadDashboard(true)}
            disabled={isRefreshing}
            className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-bright rounded-sm border border-outline-variant hover:border-primary/50 text-white/70 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono disabled:opacity-50"
            title="Force refresh knowledge map telemetry from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline text-[11px] font-sans uppercase tracking-wider">
              {isRefreshing ? 'Syncing...' : 'Sync'}
            </span>
          </button>

          <div className="bg-surface-container p-1 rounded-sm border border-outline-variant flex items-center gap-1 text-xs">
            <button
              onClick={() => handleSwitchView('sheet')}
              className={`px-3 py-1 rounded-sm transition-colors flex items-center gap-1.5 press-feedback ${
                viewMode === 'sheet'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Spreadsheet</span>
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
      <AnimatePresence>
        {biggestGapTopic && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            whileHover={{ scale: 1.004 }}
            whileTap={{ scale: 0.996 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={() => navigate(`/topics/${biggestGapTopic.topic_id}`)}
            className="relative cursor-pointer overflow-hidden px-4 py-3 rounded-sm bg-error/15 border border-error/50 hover:bg-error/25 transition-colors text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-error/30 border border-error/60 flex items-center justify-center text-error shrink-0 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-error font-semibold flex items-center gap-2">
                  <span>Priority Overconfidence Alert</span>
                  <span className="text-white/50 text-[9px]">({biggestGapTopic.subject_name} &rsaquo; {biggestGapTopic.chapter_name})</span>
                </div>
                <div className="text-sm font-medium text-white flex items-baseline gap-2">
                  <span>{biggestGapTopic.topic_name}</span>
                  <span className="text-xs text-white/70">
                    Confidence: <strong className="text-error">{biggestGapTopic.confidence}/10</strong> vs Accuracy: <strong className="text-white">{biggestGapTopic.evaluation_accuracy}%</strong> (Gap: <strong className="text-error">{biggestGapTopic.gap}%</strong>)
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
                className="px-3 py-1.5 bg-error text-white text-[11px] font-semibold uppercase tracking-wider rounded-sm hover:brightness-110 flex items-center gap-1 cursor-pointer"
              >
                <Timer className="w-3.5 h-3.5 stroke-[2]" />
                <span>Diagnostic Mock</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
       * VIEW MODE 1: SPREADSHEET & TOPIC CURRICULUM
       * ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'sheet' && (
        <div className="space-y-3">
          {/* ─── Search & Quick Status Filter Bar ─── */}
          <div className="acrylic-glass border border-white/10 rounded-sm p-1.5 flex items-center gap-2 bg-surface-container/90">
            {/* Name Box (Active Cell Coordinate) */}
            <div
              className="hidden sm:block px-2.5 py-1 bg-black/60 border border-white/15 rounded text-primary text-xs font-semibold min-w-[56px] text-center shrink-0 tracking-wider"
              title="Selected Cell"
            >
              {activeCell.coord}
            </div>

            {/* Formula / Search Input Box */}
            <div className="flex-1 relative flex items-center">
              <Search className="w-3.5 h-3.5 text-white/40 ml-1.5 shrink-0" />
              <input
                ref={formulaInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search topic, chapter, or subject..."
                className="w-full bg-transparent text-xs text-white placeholder:text-white/30 outline-none px-2.5 py-1"
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
                <span className={`px-1.5 py-0.2 rounded-xs text-[10px] font-mono ${
                  subjectFilter === 'ALL' ? 'bg-primary/20 text-primary font-semibold' : 'bg-white/10 text-white/50'
                }`}>
                  {subjectCounts.ALL}
                </span>
              </button>

              {/* Sheet 2: Physics */}
              <button
                onClick={() => setSubjectFilter('Physics')}
                className={`px-3.5 py-1.5 text-xs font-mono rounded-t border-t border-x transition-all flex items-center gap-2 ${
                  subjectFilter === 'Physics'
                    ? 'bg-surface-container border-white/20 text-white font-bold border-b-2 border-b-primary shadow-sm'
                    : 'bg-black/40 border-transparent text-white/50 hover:text-white/80 hover:bg-surface-container/40'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span>Physics</span>
                <span className={`px-1.5 py-0.2 rounded-xs text-[10px] font-mono ${
                  subjectFilter === 'Physics' ? 'bg-primary/20 text-primary font-semibold' : 'bg-white/10 text-white/50'
                }`}>
                  {subjectCounts.Physics}
                </span>
              </button>

              {/* Sheet 3: Chemistry */}
              <button
                onClick={() => setSubjectFilter('Chemistry')}
                className={`px-3.5 py-1.5 text-xs font-mono rounded-t border-t border-x transition-all flex items-center gap-2 ${
                  subjectFilter === 'Chemistry'
                    ? 'bg-surface-container border-white/20 text-white font-bold border-b-2 border-b-primary shadow-sm'
                    : 'bg-black/40 border-transparent text-white/50 hover:text-white/80 hover:bg-surface-container/40'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-status-weak" />
                <span>Chemistry</span>
                <span className={`px-1.5 py-0.2 rounded-xs text-[10px] font-mono ${
                  subjectFilter === 'Chemistry' ? 'bg-status-weak/20 text-status-weak font-semibold' : 'bg-white/10 text-white/50'
                }`}>
                  {subjectCounts.Chemistry}
                </span>
              </button>

              {/* Sheet 4: Mathematics */}
              <button
                onClick={() => setSubjectFilter('Mathematics')}
                className={`px-3.5 py-1.5 text-xs font-mono rounded-t border-t border-x transition-all flex items-center gap-2 ${
                  subjectFilter === 'Mathematics'
                    ? 'bg-surface-container border-white/20 text-white font-bold border-b-2 border-b-primary shadow-sm'
                    : 'bg-black/40 border-transparent text-white/50 hover:text-white/80 hover:bg-surface-container/40'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-status-aligned" />
                <span>Mathematics</span>
                <span className={`px-1.5 py-0.2 rounded-xs text-[10px] font-mono ${
                  subjectFilter === 'Mathematics' ? 'bg-status-aligned/20 text-status-aligned font-semibold' : 'bg-white/10 text-white/50'
                }`}>
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
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* ─── Mobile Topic Cards View (< md screens) ─── */}
          <div className="block md:hidden space-y-2.5">
            {filteredAndSorted.length === 0 ? (
              <div className="p-8 text-center bg-surface-container border border-outline-variant rounded-sm text-white/50 text-xs">
                No topics matching your filter criteria.
              </div>
            ) : (
              filteredAndSorted.map((topic, idx) => {
                const gap = topic.gap;

                return (
                  <div
                    key={topic.topic_id}
                    style={{ animationDelay: `${Math.min(idx * 25, 600)}ms` }}
                    className="animate-slide-up p-3.5 bg-surface-container border border-white/10 rounded-sm space-y-2.5 hover:border-primary/50 transition-colors"
                  >
                    {/* Top row: Subject, Chapter & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getSubjectColor(topic.subject_name)}`}>
                          {topic.subject_name}
                        </span>
                        <span className="text-[11px] text-white/50 truncate">
                          {topic.chapter_name}
                        </span>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(topic.status)}
                      </div>
                    </div>

                    {/* Topic Title */}
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => navigate(`/topics/${topic.topic_id}`)}
                        className="text-left font-medium text-sm text-white hover:text-primary transition-colors leading-snug"
                      >
                        {topic.topic_name}
                      </button>
                      <span className="text-[10px] text-primary bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded-xs shrink-0 font-semibold">
                        {topic.questions_available || 0} Qs
                      </span>
                    </div>

                    {/* Metrics Row: Confidence, Accuracy, Gap */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-black/40 border border-white/5 rounded-xs text-center text-xs">
                      <div>
                        <div className="text-[10px] text-white/50 uppercase">Confidence</div>
                        <button
                          type="button"
                          onClick={() => {
                            setCalibrateModal({
                              topicId: topic.topic_id,
                              name: topic.topic_name,
                              currentVal: topic.confidence || 5,
                              subject: topic.subject_name,
                              chapter: topic.chapter_name
                            });
                            setCalibrateVal(topic.confidence || 5);
                          }}
                          className="font-bold text-primary hover:underline cursor-pointer inline-flex items-center gap-1 mt-0.5"
                        >
                          <span>{topic.confidence !== null ? `${topic.confidence}/10` : 'Rate'}</span>
                          <Sliders className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      </div>

                      <div>
                        <div className="text-[10px] text-white/50 uppercase">Accuracy</div>
                        <div className="font-bold text-white mt-0.5">
                          {topic.evaluation_accuracy !== null ? `${topic.evaluation_accuracy}%` : '--'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-white/50 uppercase">Gap</div>
                        <div className={`font-bold mt-0.5 ${
                          gap === null ? 'text-white/40' : gap < 0 ? 'text-error' : gap > 0 ? 'text-primary' : 'text-status-aligned'
                        }`}>
                          {gap !== null ? (gap > 0 ? `+${gap}%` : `${gap}%`) : '--'}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => navigate(`/practice?topic=${topic.topic_id}`)}
                        className="flex-1 py-1.5 bg-surface border border-outline-variant hover:border-primary text-white/90 hover:text-white rounded-xs text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current text-primary" />
                        <span>Practice</span>
                      </button>
                      <button
                        onClick={() => navigate(`/evaluate?topic=${topic.topic_id}`)}
                        className="flex-1 py-1.5 bg-primary/15 border border-primary/40 hover:bg-primary hover:text-black text-primary rounded-xs text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Timer className="w-3 h-3 stroke-[2]" />
                        <span>Mock Test</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ─── The Master Spreadsheet Grid (Desktop Screens) ─── */}
          <div className="hidden md:block border border-neutral-800 rounded-sm bg-black overflow-hidden shadow-2xl">
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

                    {/* Column H: Questions Available in Bank */}
                    <th
                      onClick={() => handleSortHeader('available')}
                      className="py-2 px-3 w-28 text-center border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white/30 text-[9px] font-bold">H</span>
                        <span className="font-semibold text-white/80">Available</span>
                        {renderSortIndicator('available')}
                      </div>
                    </th>

                    {/* Column I: Questions Attempted */}
                    <th
                      onClick={() => handleSortHeader('attempts')}
                      className="py-2 px-3 w-24 text-center border-r border-neutral-800 cursor-pointer hover:bg-neutral-800/60 transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white/30 text-[9px] font-bold">I</span>
                        <span className="font-semibold text-white/80">Attempted</span>
                        {renderSortIndicator('attempts')}
                      </div>
                    </th>

                    {/* Column J: Quick Actions */}
                    <th className="py-2 px-4 w-40 text-center bg-neutral-900/95 font-semibold text-white/80 select-none">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white/30 text-[9px] font-bold">J</span>
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

                      return (
                        <tr
                          key={topic.topic_id}
                          style={{ animationDelay: `${Math.min(idx * 20, 600)}ms` }}
                          onClick={() => setActiveCell({
                            coord: `C${rowNum}`,
                            col: 'C',
                            row: rowNum,
                            field: 'topic_name',
                            value: topic.topic_name
                          })}
                          className={`animate-slide-up transition-all duration-150 group hover:bg-neutral-900/80 ${
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

                          {/* Cell D: Confidence (with Quick Calibration modal) */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `D${rowNum}`, col: 'D', row: rowNum, field: 'confidence', value: topic.confidence });
                              setCalibrateModal({
                                topicId: topic.topic_id,
                                name: topic.topic_name,
                                currentVal: topic.confidence || 5,
                                subject: topic.subject_name,
                                chapter: topic.chapter_name
                              });
                              setCalibrateVal(topic.confidence || 5);
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
                                <div className="w-14 h-1 bg-white/10 rounded-none overflow-hidden mt-0.5">
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

                          {/* Cell H: Questions Available in Bank */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `H${rowNum}`, col: 'H', row: rowNum, field: 'questions_available', value: topic.questions_available });
                            }}
                            className={`py-1.5 px-3 text-center border-r border-neutral-800/80 ${
                              activeCell.coord === `H${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''
                            }`}
                          >
                            {topic.questions_available > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-mono font-bold bg-primary/15 text-primary border border-primary/30">
                                <span>{topic.questions_available}</span>
                                <span className="text-[9px] font-normal opacity-70">Qs</span>
                              </span>
                            ) : (
                              <span className="text-white/20 text-[11px] font-mono">0</span>
                            )}
                          </td>

                          {/* Cell I: Questions Attempted */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCell({ coord: `I${rowNum}`, col: 'I', row: rowNum, field: 'questions_attempted', value: topic.questions_attempted });
                            }}
                            className={`py-1.5 px-3 text-center text-white/60 text-[11px] font-mono border-r border-neutral-800/80 ${
                              activeCell.coord === `I${rowNum}` ? 'ring-2 ring-primary ring-inset bg-primary/5 text-white' : ''
                            }`}
                          >
                            {topic.questions_attempted || 0}
                          </td>

                          {/* Cell J: Quick Action Buttons */}
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

            {/* ─── Bottom Status Bar ─── */}
            <div className="px-4 py-2.5 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between text-xs text-white/60 gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span>Showing <strong className="text-white">{filteredAndSorted.length}</strong> topics</span>
                <span className="text-white/20">&middot;</span>
                <span>Bank Questions: <strong className="text-primary">{summary.totalAvailable}</strong></span>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span>Attempted: <strong className="text-white">{summary.totalAttempts}</strong></span>
                <span className="text-white/20">&middot;</span>
                <span>Avg Confidence: <strong className="text-primary">{summary.avgConfidence}/10</strong></span>
                <span className="text-white/20">&middot;</span>
                <span>Avg Accuracy: <strong className="text-white">{summary.avgAccuracy}%</strong></span>
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                {topics.map((topic, tileIdx) => (
                  <motion.div
                    key={topic.topic_id}
                    style={{ animationDelay: `${Math.min(tileIdx * 30, 600)}ms` }}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    onClick={() => navigate(`/topics/${topic.topic_id}`)}
                    className="animate-slide-up metro-tile relative cursor-pointer p-4 flex flex-col justify-between overflow-hidden rounded-sm select-none aspect-square bg-surface-container hover:border-primary border border-white/10 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">
                        {topic.subject_name.slice(0, 4)}
                      </span>
                      {getStatusBadge(topic.status)}
                    </div>

                    <div className="my-2">
                      <h4 className="font-medium text-xs leading-snug line-clamp-2 text-white">
                        {topic.topic_name}
                      </h4>
                      <div className="mt-1">
                        <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded-xs inline-block">
                          {topic.questions_available || 0} Qs in bank
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-end justify-between text-xs font-mono">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCalibrateModal({
                            topicId: topic.topic_id,
                            name: topic.topic_name,
                            currentVal: topic.confidence || 5,
                            subject: topic.subject_name,
                            chapter: topic.chapter_name
                          });
                          setCalibrateVal(topic.confidence || 5);
                        }}
                        className="hover:text-primary transition-colors cursor-pointer group/conf flex items-center gap-1 text-left"
                        title="Click to calibrate confidence"
                      >
                        {topic.confidence !== null ? (
                          <span>{topic.confidence}<span className="text-[10px] opacity-50">/10</span></span>
                        ) : (
                          <span className="text-[10px] text-primary underline">RATE</span>
                        )}
                        <Sliders className="w-2.5 h-2.5 opacity-40 group-hover/conf:opacity-100 group-hover/conf:text-primary transition-opacity" />
                      </button>
                      <div>
                        {topic.evaluation_accuracy !== null ? (
                          <span className="font-bold">{topic.evaluation_accuracy}%</span>
                        ) : (
                          <span className="text-[10px] opacity-40">--</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ─── Modal Confidence Calibration (Fallback) with Spring Pop ─── */}
      <AnimatePresence>
        {calibrateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setCalibrateModal(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="bg-surface-dim border border-outline-variant p-6 rounded-sm max-w-md w-full shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  {calibrateModal.subject && (
                    <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                      {calibrateModal.subject} &rsaquo; {calibrateModal.chapter} &middot; 1–10 Scale
                    </div>
                  )}
                  {!calibrateModal.subject && (
                    <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                      Quick Calibration &middot; 1–10 Scale
                    </div>
                  )}
                  <h3 className="text-lg font-light text-white mt-0.5">
                    {calibrateModal.name}
                  </h3>
                </div>
                <button
                  onClick={() => setCalibrateModal(null)}
                  className="text-white/40 hover:text-white p-1 cursor-pointer"
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

              {/* Quick Number Selector (1–10) Buttons */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider flex justify-between">
                  <span>Quick Select</span>
                  <span className="text-primary font-bold">{calibrateVal} / 10</span>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCalibrateVal(val)}
                      className={`py-1.5 text-xs font-mono font-bold rounded-xs transition-colors cursor-pointer ${
                        calibrateVal === val
                          ? 'bg-primary text-black ring-1 ring-white'
                          : 'bg-neutral-800 text-white/80 hover:bg-neutral-700'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveModalConfidence}
                  disabled={calibrating}
                  className="flex-1 py-2.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {calibrating ? 'Saving...' : 'Save Rating'}
                </button>
                <button
                  onClick={() => setCalibrateModal(null)}
                  className="px-4 py-2.5 border border-outline-variant text-white/70 text-xs font-mono uppercase tracking-wider rounded-sm hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
