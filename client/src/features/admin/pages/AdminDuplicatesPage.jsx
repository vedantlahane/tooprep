import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../services/adminService';
import MathText from '@/features/questions/components/MathText';
import Icon, {
  Copy,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Filter,
  ShieldAlert,
  GitMerge,
  ArrowRight
} from '@/shared/components/Icon';

export default function AdminDuplicatesPage() {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [activeMatchType, setActiveMatchType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [scanSummary, setScanSummary] = useState(null);
  const [actionInProgress, setActionInProgress] = useState({});
  const [expandedSolutions, setExpandedSolutions] = useState({});

  // Load duplicates on mount and status/type filter changes
  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const data = await adminService.getDuplicates({
        status: activeStatus,
        match_type: activeMatchType !== 'ALL' ? activeMatchType : null
      });
      setDuplicates(data || []);
    } catch (err) {
      console.error('Failed to load duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, [activeStatus, activeMatchType]);

  // Run full question bank audit scan
  const handleTriggerScan = async (force = false) => {
    setScanning(true);
    setScanSummary(null);
    try {
      const result = await adminService.scanDuplicates({ force });
      setScanSummary(result);
      await fetchDuplicates();
    } catch (err) {
      console.error('Failed to run duplicate scan:', err);
      alert('Scan error: ' + (err.message || 'Server error'));
    } finally {
      setScanning(false);
    }
  };

  // Resolve duplicate: Keep one question and delete the other
  const handleResolve = async (pairId, keepId, deleteId) => {
    if (!window.confirm('Are you sure you want to delete the duplicate question? This action will permanently remove it from the Question Bank.')) {
      return;
    }

    setActionInProgress(prev => ({ ...prev, [pairId]: 'resolving' }));
    try {
      await adminService.resolveDuplicate(pairId, { keep_id: keepId, delete_id: deleteId });
      // Optimistic update: remove pair from view
      setDuplicates(prev => prev.filter(p => p.id !== pairId));
    } catch (err) {
      console.error('Failed to resolve duplicate:', err);
      alert('Resolution error: ' + (err.message || 'Server error'));
    } finally {
      setActionInProgress(prev => ({ ...prev, [pairId]: null }));
    }
  };

  // Dismiss pair as false positive
  const handleDismiss = async (pairId) => {
    setActionInProgress(prev => ({ ...prev, [pairId]: 'dismissing' }));
    try {
      await adminService.dismissDuplicate(pairId);
      setDuplicates(prev => prev.filter(p => p.id !== pairId));
    } catch (err) {
      console.error('Failed to dismiss duplicate:', err);
      alert('Dismiss error: ' + (err.message || 'Server error'));
    } finally {
      setActionInProgress(prev => ({ ...prev, [pairId]: null }));
    }
  };

  // Merge questions: keep target and copy missing fields
  const handleMerge = async (pairId, q1, q2) => {
    if (!window.confirm(`Merge Question 2 into Question 1? Question 1 will receive missing solution/diagrams and Question 2 will be deleted.`)) {
      return;
    }

    setActionInProgress(prev => ({ ...prev, [pairId]: 'merging' }));
    try {
      const mergedFields = {};
      if (!q1.solution_text && q2.solution_text) mergedFields.solution_text = q2.solution_text;
      if (!q1.verified && q2.verified) mergedFields.verified = true;

      await adminService.mergeDuplicates(pairId, {
        target_id: q1.id,
        source_id: q2.id,
        merged_fields: mergedFields
      });
      setDuplicates(prev => prev.filter(p => p.id !== pairId));
    } catch (err) {
      console.error('Failed to merge duplicates:', err);
      alert('Merge error: ' + (err.message || 'Server error'));
    } finally {
      setActionInProgress(prev => ({ ...prev, [pairId]: null }));
    }
  };

  const toggleSolution = (key) => {
    setExpandedSolutions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // KPI calculations
  const stats = useMemo(() => {
    const total = duplicates.length;
    const exact = duplicates.filter(d => d.match_type === 'EXACT').length;
    const high = duplicates.filter(d => d.match_type === 'HIGH_CONFIDENCE').length;
    const potential = duplicates.filter(d => d.match_type === 'POTENTIAL').length;
    return { total, exact, high, potential };
  }, [duplicates]);

  // Client search filtering
  const filteredDuplicates = useMemo(() => {
    if (!deferredSearch.trim()) return duplicates;
    const q = deferredSearch.toLowerCase();
    return duplicates.filter(d => {
      const text1 = d.primary_question?.question_text?.toLowerCase() || '';
      const text2 = d.duplicate_question?.question_text?.toLowerCase() || '';
      const topic1 = d.primary_question?.topics?.name?.toLowerCase() || '';
      const topic2 = d.duplicate_question?.topics?.name?.toLowerCase() || '';
      return text1.includes(q) || text2.includes(q) || topic1.includes(q) || topic2.includes(q);
    });
  }, [duplicates, deferredSearch]);

  const getMatchBadge = (type, score) => {
    if (type === 'EXACT' || score >= 98) {
      return {
        bg: 'bg-error/15 text-error border-error/40',
        label: 'EXACT DUPLICATE (100%)',
        desc: 'Identical stem and options'
      };
    }
    if (type === 'HIGH_CONFIDENCE' || score >= 88) {
      return {
        bg: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
        label: `HIGH CONFIDENCE (${score}%)`,
        desc: 'Minor OCR/formatting variation'
      };
    }
    return {
      bg: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      label: `POTENTIAL MATCH (${score}%)`,
      desc: 'High text resemblance'
    };
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* ─── Top Panoramic Header ─── */}
      <div className="border-b border-white/10 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-mono tracking-widest uppercase mb-1">
              <Copy className="w-3.5 h-3.5" />
              <span>QUALITY & INTEGRITY CONTROL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white uppercase">
              Question Deduplication
            </h1>
            <p className="text-xs text-white/50 mt-1 max-w-2xl">
              Automated mathematical & text similarity engine continuously audits the question bank, detects duplicates, and provides side-by-side inspection for 1-click removal or merging.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleTriggerScan(false)}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-semibold text-xs tracking-wider uppercase hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Auditing Question Bank...' : 'Run Full Bank Scan'}</span>
            </button>
          </div>
        </div>

        {/* Scan Summary Banner */}
        {scanSummary && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-surface-container border border-primary/40 rounded-sm flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>
                Scan finished: Audited <strong>{scanSummary.total_scanned}</strong> questions. Found <strong>{scanSummary.total_duplicates_found}</strong> flagged pairs ({scanSummary.exact_matches} exact, {scanSummary.high_confidence} high confidence, {scanSummary.potential} potential).
              </span>
            </div>
            <button onClick={() => setScanSummary(null)} className="text-white/40 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </div>

      {/* ─── Metric KPI Tiles ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface-container border border-white/10 p-3.5 sm:p-4">
          <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider block">FLAGGED PAIRS</span>
          <div className="text-2xl sm:text-3xl font-light mt-1 text-white">{stats.total}</div>
          <span className="text-[10px] text-white/40 mt-1 block">Awaiting admin review</span>
        </div>

        <div className="bg-surface-container border border-error/30 p-3.5 sm:p-4">
          <span className="text-[11px] font-mono text-error uppercase tracking-wider block">EXACT MATCHES</span>
          <div className="text-2xl sm:text-3xl font-light mt-1 text-error">{stats.exact}</div>
          <span className="text-[10px] text-white/40 mt-1 block">100% duplicate candidates</span>
        </div>

        <div className="bg-surface-container border border-amber-500/30 p-3.5 sm:p-4">
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block">HIGH CONFIDENCE</span>
          <div className="text-2xl sm:text-3xl font-light mt-1 text-amber-400">{stats.high}</div>
          <span className="text-[10px] text-white/40 mt-1 block">88% – 97% similarity</span>
        </div>

        <div className="bg-surface-container border border-yellow-500/30 p-3.5 sm:p-4">
          <span className="text-[11px] font-mono text-yellow-300 uppercase tracking-wider block">POTENTIAL</span>
          <div className="text-2xl sm:text-3xl font-light mt-1 text-yellow-300">{stats.potential}</div>
          <span className="text-[10px] text-white/40 mt-1 block">78% – 87% similarity</span>
        </div>
      </div>

      {/* ─── Filter Bar & Search ─── */}
      <div className="bg-surface-container border border-white/10 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {['PENDING', 'DISMISSED', 'RESOLVED', 'ALL'].map(st => (
              <button
                key={st}
                onClick={() => setActiveStatus(st)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                  activeStatus === st
                    ? 'bg-primary text-black font-semibold'
                    : 'bg-surface-container-high/60 text-white/60 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by question text or topic..."
              className="w-full bg-black/60 border border-white/15 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Match Type Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs text-white/60 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-mono uppercase text-white/40 shrink-0">MATCH TYPE:</span>
          {['ALL', 'EXACT', 'HIGH_CONFIDENCE', 'POTENTIAL'].map(mt => (
            <button
              key={mt}
              onClick={() => setActiveMatchType(mt)}
              className={`px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer border ${
                activeMatchType === mt
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-white/10 text-white/50 hover:text-white hover:border-white/25'
              }`}
            >
              {mt.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Duplicates List / Comparison Feed ─── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-mono text-primary uppercase tracking-widest">
            Scanning and hydrating duplicate records...
          </div>
        </div>
      ) : filteredDuplicates.length === 0 ? (
        <div className="bg-surface-container border border-white/10 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-light text-white uppercase tracking-wider">No Duplicate Questions Found</h3>
            <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
              {activeStatus === 'PENDING'
                ? 'Your question bank is clean! No unresolved duplicates match the current filters.'
                : `No records found under status "${activeStatus}".`}
            </p>
          </div>
          <button
            onClick={() => handleTriggerScan(false)}
            disabled={scanning}
            className="px-4 py-2 bg-surface-container-high border border-white/20 hover:border-primary text-xs uppercase tracking-wider text-white transition-colors cursor-pointer"
          >
            Run Audit Scan Now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredDuplicates.map((pair) => {
            const q1 = pair.primary_question;
            const q2 = pair.duplicate_question;
            if (!q1 || !q2) return null;

            const badge = getMatchBadge(pair.match_type, pair.similarity_score);
            const isProcessing = actionInProgress[pair.id];
            const q1SolOpen = expandedSolutions[`${pair.id}_q1`];
            const q2SolOpen = expandedSolutions[`${pair.id}_q2`];

            return (
              <div
                key={pair.id}
                className="bg-surface-container border border-white/15 overflow-hidden transition-colors"
              >
                {/* ── Header Comparison Gauge ── */}
                <div className="bg-black/80 px-4 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider uppercase border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-white/50 hidden sm:inline">&middot;</span>
                    <span className="text-[11px] text-white/60 font-mono hidden sm:inline">
                      Stem: {pair.details?.stem_similarity || 0}% | Options: {pair.details?.options_similarity || 0}%
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-white/40">
                    Flagged: {new Date(pair.flagged_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* ── Side-by-Side Question Columns ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                  {/* Left: Question 1 (Primary) */}
                  <div className="p-4 sm:p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Meta Tags */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/40">
                          QUESTION 1 (KEEP CANDIDATE A)
                        </span>
                        <span className="text-white/40">&middot;</span>
                        <span className="text-white/70">{q1.topics?.chapters?.subjects?.name || 'Subject'}</span>
                        <span className="text-white/40">&gt;</span>
                        <span className="text-white/70">{q1.topics?.name || 'Topic'}</span>
                        {q1.exam_year && (
                          <span className="text-white/50 ml-auto">
                            PYQ {q1.exam_year} {q1.exam_shift ? `Shift ${q1.exam_shift}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Question Stem */}
                      <div className="text-sm text-white/90 leading-relaxed font-sans pt-1">
                        <MathText text={q1.question_text} />
                      </div>

                      {/* Options Grid */}
                      <div className="space-y-1.5 pt-2">
                        {Array.isArray(q1.options) && q1.options.map((opt, idx) => {
                          const optKey = typeof opt === 'string' ? String.fromCharCode(65 + idx) : (opt.id || String.fromCharCode(65 + idx));
                          const optText = typeof opt === 'string' ? opt : (opt.text || '');
                          const isCorrect = optKey === q1.correct_answer;

                          return (
                            <div
                              key={optKey}
                              className={`p-2 border text-xs flex items-start gap-2.5 ${
                                isCorrect
                                  ? 'border-status-aligned/50 bg-status-aligned/10 text-status-aligned font-medium'
                                  : 'border-white/10 bg-black/40 text-white/80'
                              }`}
                            >
                              <span className={`w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-mono border ${
                                isCorrect ? 'border-status-aligned text-status-aligned' : 'border-white/20 text-white/50'
                              }`}>
                                {optKey}
                              </span>
                              <div className="flex-1 min-w-0">
                                <MathText text={optText} />
                              </div>
                              {isCorrect && <Check className="w-3.5 h-3.5 text-status-aligned shrink-0 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Solution Accordion */}
                      {q1.solution_text && (
                        <div className="pt-2 border-t border-white/10">
                          <button
                            onClick={() => toggleSolution(`${pair.id}_q1`)}
                            className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            {q1SolOpen ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{q1SolOpen ? 'Hide Solution' : 'View Solution'}</span>
                          </button>
                          {q1SolOpen && (
                            <div className="mt-2 p-3 bg-black/60 border border-white/10 text-xs text-white/80 space-y-2 font-mono">
                              <MathText text={q1.solution_text} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Left Keep Button */}
                    <div className="pt-3 border-t border-white/10">
                      <button
                        onClick={() => handleResolve(pair.id, q1.id, q2.id)}
                        disabled={Boolean(isProcessing)}
                        className="w-full py-2 bg-surface-container-high hover:bg-error/20 hover:border-error/50 border border-white/20 text-xs font-mono uppercase tracking-wider text-white hover:text-error transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Keep Q1 & Delete Q2</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Question 2 (Duplicate Candidate) */}
                  <div className="p-4 sm:p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Meta Tags */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          QUESTION 2 (KEEP CANDIDATE B)
                        </span>
                        <span className="text-white/40">&middot;</span>
                        <span className="text-white/70">{q2.topics?.chapters?.subjects?.name || 'Subject'}</span>
                        <span className="text-white/40">&gt;</span>
                        <span className="text-white/70">{q2.topics?.name || 'Topic'}</span>
                        {q2.exam_year && (
                          <span className="text-white/50 ml-auto">
                            PYQ {q2.exam_year} {q2.exam_shift ? `Shift ${q2.exam_shift}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Question Stem */}
                      <div className="text-sm text-white/90 leading-relaxed font-sans pt-1">
                        <MathText text={q2.question_text} />
                      </div>

                      {/* Options Grid */}
                      <div className="space-y-1.5 pt-2">
                        {Array.isArray(q2.options) && q2.options.map((opt, idx) => {
                          const optKey = typeof opt === 'string' ? String.fromCharCode(65 + idx) : (opt.id || String.fromCharCode(65 + idx));
                          const optText = typeof opt === 'string' ? opt : (opt.text || '');
                          const isCorrect = optKey === q2.correct_answer;

                          return (
                            <div
                              key={optKey}
                              className={`p-2 border text-xs flex items-start gap-2.5 ${
                                isCorrect
                                  ? 'border-status-aligned/50 bg-status-aligned/10 text-status-aligned font-medium'
                                  : 'border-white/10 bg-black/40 text-white/80'
                              }`}
                            >
                              <span className={`w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-mono border ${
                                isCorrect ? 'border-status-aligned text-status-aligned' : 'border-white/20 text-white/50'
                              }`}>
                                {optKey}
                              </span>
                              <div className="flex-1 min-w-0">
                                <MathText text={optText} />
                              </div>
                              {isCorrect && <Check className="w-3.5 h-3.5 text-status-aligned shrink-0 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Solution Accordion */}
                      {q2.solution_text && (
                        <div className="pt-2 border-t border-white/10">
                          <button
                            onClick={() => toggleSolution(`${pair.id}_q2`)}
                            className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            {q2SolOpen ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{q2SolOpen ? 'Hide Solution' : 'View Solution'}</span>
                          </button>
                          {q2SolOpen && (
                            <div className="mt-2 p-3 bg-black/60 border border-white/10 text-xs text-white/80 space-y-2 font-mono">
                              <MathText text={q2.solution_text} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Keep Button */}
                    <div className="pt-3 border-t border-white/10">
                      <button
                        onClick={() => handleResolve(pair.id, q2.id, q1.id)}
                        disabled={Boolean(isProcessing)}
                        className="w-full py-2 bg-surface-container-high hover:bg-error/20 hover:border-error/50 border border-white/20 text-xs font-mono uppercase tracking-wider text-white hover:text-error transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Keep Q2 & Delete Q1</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Action Toolbar Bottom Rail ── */}
                <div className="bg-black/60 px-4 py-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleMerge(pair.id, q1, q2)}
                      disabled={Boolean(isProcessing)}
                      className="px-3.5 py-1.5 bg-primary/15 border border-primary/40 hover:bg-primary/25 text-primary text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>Merge (Keep Best of Both)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDismiss(pair.id)}
                      disabled={Boolean(isProcessing)}
                      className="px-3 py-1.5 text-white/60 hover:text-white border border-transparent hover:border-white/20 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Dismiss (Not a Duplicate)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
