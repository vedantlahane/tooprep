import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import QuestionEditModal from '@/features/questions/components/QuestionEditModal';
import Icon, {
  LayoutGrid,
  BookOpen,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ArrowRight,
  FileText,
  Layers
} from '@/shared/components/Icon';

export default function AdminCurriculumPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Target question depth per topic for JEE readiness
  const [targetBenchmark, setTargetBenchmark] = useState(5); // 5 or 10 Qs

  // Filters
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Expanded chapter tracking
  const [expandedChapters, setExpandedChapters] = useState({});
  const [allExpanded, setAllExpanded] = useState(true);

  // Question modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [targetTopicId, setTargetTopicId] = useState('');

  const loadCurriculum = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getCurriculumCoverage();
      setData(res);

      // Expand all chapters initially
      const initialExpanded = {};
      for (const s of (res.subjects || [])) {
        for (const c of (s.chapters || [])) {
          initialExpanded[c.id] = true;
        }
      }
      setExpandedChapters(initialExpanded);
      setAllExpanded(true);
    } catch (err) {
      setError(err.message || 'Failed to load curriculum coverage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, []);

  const toggleChapter = (cId) => {
    setExpandedChapters(prev => ({ ...prev, [cId]: !prev[cId] }));
  };

  const handleToggleExpandAll = () => {
    const nextVal = !allExpanded;
    const nextState = {};
    if (data?.subjects) {
      for (const s of data.subjects) {
        for (const c of (s.chapters || [])) {
          nextState[c.id] = nextVal;
        }
      }
    }
    setExpandedChapters(nextState);
    setAllExpanded(nextVal);
  };

  const handleAddQuestionForTopic = (tId) => {
    setTargetTopicId(tId);
    setModalOpen(true);
  };

  const handleExportCsv = () => {
    if (!data?.subjects) return;
    const rows = [
      ['Subject', 'Chapter', 'Topic ID', 'Topic Name', 'Total Questions', 'Verified', 'PYQ', 'Easy', 'Medium', 'Hard', 'Target', 'Deficit', 'Status']
    ];

    for (const s of data.subjects) {
      for (const c of (s.chapters || [])) {
        for (const t of (c.topics || [])) {
          const count = t.stats?.total || 0;
          const deficit = Math.max(0, targetBenchmark - count);
          const status = count === 0 ? 'ZERO_COVERAGE' : count < targetBenchmark ? 'LOW_COVERAGE' : 'READY';
          rows.push([
            `"${s.name}"`,
            `"${c.name.replace(/"/g, '""')}"`,
            `"${t.id}"`,
            `"${t.name.replace(/"/g, '""')}"`,
            count,
            t.stats?.verified || 0,
            t.stats?.pyq || 0,
            t.stats?.easy || 0,
            t.stats?.medium || 0,
            t.stats?.hard || 0,
            targetBenchmark,
            deficit,
            status
          ]);
        }
      }
    }

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tooprep-syllabus-gap-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered tree
  const filteredSubjects = useMemo(() => {
    if (!data?.subjects) return [];

    return data.subjects
      .filter(s => selectedSubject === 'All' || s.name === selectedSubject)
      .map(s => {
        const chapters = (s.chapters || []).map(c => {
          const topics = (c.topics || []).filter(t => {
            if (onlyGaps && t.stats.total >= targetBenchmark) return false;
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return t.name.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
            }
            return true;
          });

          return {
            ...c,
            topics,
            filteredOut: topics.length === 0
          };
        }).filter(c => !c.filteredOut);

        return {
          ...s,
          chapters,
          filteredOut: chapters.length === 0
        };
      }).filter(s => !s.filteredOut);
  }, [data, selectedSubject, onlyGaps, searchQuery, targetBenchmark]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Curriculum Coverage
          </p>
          <h1 className="text-display text-on-surface mt-1 font-light lowercase">
            Question Coverage Matrix
          </h1>
          <p className="text-body-md text-on-surface-variant font-light mt-1">
            Detect preparation blind spots and ensure complete question depth across all JEE topics.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 border border-white/15 bg-surface-container hover:border-primary text-white text-xs font-mono uppercase tracking-wider transition-colors"
            title="Download CSV audit of all curriculum gaps"
          >
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Export Gaps (.CSV)</span>
          </button>

          <button
            onClick={handleToggleExpandAll}
            className="px-3.5 py-2 border border-white/15 bg-surface-container hover:border-primary text-white text-xs font-mono uppercase tracking-wider transition-colors"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>

          <button
            onClick={loadCurriculum}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-white/15 bg-surface-container hover:border-primary text-white text-xs font-mono uppercase tracking-widest transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Observability Summary Metrics */}
      {data?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="border border-outline-variant bg-surface-container p-4">
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">Total Topics</div>
            <div className="text-3xl font-light text-white font-mono">{data.summary.total_topics}</div>
          </div>

          <div className="border border-error/40 bg-error/5 p-4">
            <div className="text-label-sm-mono text-error uppercase tracking-widest text-xs mb-1 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Zero Questions</span>
            </div>
            <div className="text-3xl font-light text-error font-mono">{data.summary.zero_coverage_topics}</div>
          </div>

          <div className="border border-status-weak/40 bg-status-weak/5 p-4">
            <div className="text-label-sm-mono text-status-weak uppercase tracking-widest text-xs mb-1 font-bold">
              Under Target (&lt; {targetBenchmark} Qs)
            </div>
            <div className="text-3xl font-light text-status-weak font-mono">
              {data.summary.zero_coverage_topics + data.summary.low_coverage_topics}
            </div>
          </div>

          <div className="border border-outline-variant bg-surface-container p-4">
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">Total Questions</div>
            <div className="text-3xl font-light text-primary font-mono">{data.summary.total_questions}</div>
          </div>

          <div className="border border-status-aligned/40 bg-status-aligned/5 p-4 col-span-2 sm:col-span-1">
            <div className="text-label-sm-mono text-status-aligned uppercase tracking-widest text-xs mb-1 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Readiness</span>
            </div>
            <div className="text-3xl font-light text-status-aligned font-mono">
              {data.summary.readiness_percentage ?? (data.summary.total_topics > 0 ? Math.round(((data.summary.total_topics - data.summary.zero_coverage_topics) / data.summary.total_topics) * 100) : 0)}%
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="border border-primary/30 bg-surface-container p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics or chapters..."
              className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/15 text-white placeholder-white/40 outline-none focus:border-primary text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Target benchmark toggle */}
            <div className="flex items-center border border-white/15 bg-black text-xs font-mono">
              <span className="px-2.5 py-1.5 text-white/40 text-[10px] uppercase border-r border-white/10">
                Target:
              </span>
              {[3, 5, 10, 15].map((b) => (
                <button
                  key={b}
                  onClick={() => setTargetBenchmark(b)}
                  className={`px-2.5 py-1.5 transition-colors ${
                    targetBenchmark === b
                      ? 'bg-primary text-white font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title={`Target depth: ${b} questions per topic`}
                >
                  {b} Qs
                </button>
              ))}
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-black border border-white/15 px-3 py-2 text-white text-xs font-mono uppercase outline-none focus:border-primary"
            >
              <option value="All">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
            </select>

            <button
              onClick={() => setOnlyGaps(!onlyGaps)}
              className={`px-3.5 py-2 border text-xs font-mono uppercase tracking-widest font-bold transition-colors shrink-0 ${
                onlyGaps ? 'bg-error border-error text-white' : 'border-white/15 text-white/70 hover:border-white'
              }`}
            >
              {onlyGaps ? '⚠️ Showing Gaps Only' : `Filter Gaps (< ${targetBenchmark} Qs)`}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 border-l-4 border-error bg-error/10 text-error text-xs font-mono">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-label-sm-mono text-primary uppercase tracking-widest">Auditing curriculum coverage...</span>
        </div>
      )}

      {/* Curriculum Hierarchy Tree */}
      {!loading && filteredSubjects.length > 0 && (
        <div className="space-y-6">
          {filteredSubjects.map((subj) => (
            <div key={subj.id} className="border border-white/15 bg-surface-container overflow-hidden">
              {/* Subject Title Bar */}
              <div className="bg-black px-6 py-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    subj.name === 'Physics' ? 'bg-[#00BFFF]' : subj.name === 'Chemistry' ? 'bg-[#FF8C00]' : 'bg-[#107C10]'
                  }`}></span>
                  <h2 className="text-lg font-light text-white lowercase tracking-wide">{subj.name}</h2>
                </div>
                <span className="text-xs font-mono text-white/50">
                  {subj.total_questions} Questions in Subject
                </span>
              </div>

              {/* Chapters & Topics */}
              <div className="p-5 space-y-4">
                {subj.chapters.map((chap) => {
                  const isExpanded = expandedChapters[chap.id] !== false;
                  const readyCount = chap.topics.filter(t => t.stats.total >= targetBenchmark).length;
                  const chapPct = chap.topics.length > 0 ? Math.round((readyCount / chap.topics.length) * 100) : 0;
                  return (
                    <div key={chap.id} className="border border-white/10 bg-black/50">
                      {/* Chapter Header */}
                      <div
                        onClick={() => toggleChapter(chap.id)}
                        className="px-4 py-3 bg-surface-dim hover:bg-surface-container cursor-pointer flex items-center justify-between transition-colors border-b border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-primary" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white/40" />
                          )}
                          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                            {chap.name}
                          </span>
                          <span className="text-[11px] font-mono text-white/40">
                            ({chap.topics.length} topics)
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-white/50">{readyCount}/{chap.topics.length} ready</span>
                            <div className="w-16 bg-white/10 h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${chapPct === 100 ? 'bg-status-aligned' : chapPct >= 50 ? 'bg-[#FF8C00]' : 'bg-error'}`}
                                style={{ width: `${chapPct}%` }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/questions?chapter_id=${chap.id}`);
                            }}
                            className="text-xs font-mono text-primary font-bold hover:underline"
                            title="Open all questions in this chapter in Question Bank"
                          >
                            {chap.total_questions} Qs
                          </button>
                        </div>
                      </div>

                      {/* Topics Table */}
                      {isExpanded && (
                        <div className="divide-y divide-white/5">
                          {chap.topics.map((t) => (
                            <div
                              key={t.id}
                              className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  t.stats.total === 0 ? 'bg-error' : t.stats.total < targetBenchmark ? 'bg-status-weak' : 'bg-status-aligned'
                                }`}></span>
                                <span className="text-xs font-mono text-white font-medium">
                                  {t.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                {/* Visual progress bar towards target */}
                                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                                  <div className="w-16 bg-white/10 h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        t.stats.total >= targetBenchmark
                                          ? 'bg-status-aligned'
                                          : t.stats.total > 0
                                          ? 'bg-status-weak'
                                          : 'bg-error'
                                      }`}
                                      style={{ width: `${Math.min(100, (t.stats.total / targetBenchmark) * 100)}%` }}
                                    />
                                  </div>
                                  <span>{Math.min(100, Math.round((t.stats.total / targetBenchmark) * 100))}%</span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] font-mono">
                                  <span className={`px-2 py-0.5 border font-bold ${
                                    t.stats.total === 0
                                      ? 'bg-error/20 border-error text-error'
                                      : t.stats.total < targetBenchmark
                                      ? 'bg-status-weak/20 border-status-weak text-status-weak'
                                      : 'bg-status-aligned/15 border-status-aligned text-status-aligned'
                                  }`}>
                                    {t.stats.total} Qs
                                  </span>

                                  {t.stats.pyq > 0 && (
                                    <span className="text-white/40">
                                      {t.stats.pyq} PYQ
                                    </span>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleAddQuestionForTopic(t.id)}
                                  className="px-2.5 py-1 bg-primary/10 border border-primary/40 hover:bg-primary hover:text-white text-primary text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors"
                                  title="Add new question for this topic"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add</span>
                                </button>

                                <button
                                  onClick={() => navigate(`/admin/questions?topic_id=${t.id}`)}
                                  className="px-2.5 py-1 border border-white/15 hover:border-primary text-white/60 hover:text-white text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors"
                                  title="View questions for this topic in Question Bank"
                                >
                                  <span>Bank</span>
                                  <ArrowRight className="w-3 h-3 text-primary" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question Composer Modal */}
      <QuestionEditModal
        isOpen={modalOpen}
        question={null}
        initialTopicId={targetTopicId}
        onClose={() => setModalOpen(false)}
        onSaved={loadCurriculum}
      />
    </div>
  );
}
