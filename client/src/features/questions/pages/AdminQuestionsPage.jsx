import { useState, useEffect, useCallback, useMemo, useDeferredValue, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { topicsService } from '@/features/topics/services/topicsService';
import { questionsService } from '../services/questionsService';
import MathText from '@/features/questions/components/MathText';
import QuestionEditModal from '@/features/questions/components/QuestionEditModal';
import BulkMoveModal from '@/features/questions/components/BulkMoveModal';
import QuestionImportModal from '@/features/questions/components/QuestionImportModal';
import AdminQuestionsTableView from '@/features/questions/components/AdminQuestionsTableView';
import CurriculumMultiPicker from '@/shared/components/CurriculumMultiPicker';
import Icon, {
  Check,
  Copy,
  CheckCircle2,
  Search,
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Filter,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Layers,
  Table,
  LayoutList,
  UploadCloud,
  AlertTriangle,
  Download
} from '@/shared/components/Icon';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

const DIFFICULTY_STYLES = {
  easy: 'bg-status-aligned/20 text-status-aligned border-status-aligned/40',
  medium: 'bg-status-weak/20 text-status-weak border-status-weak/40',
  hard: 'bg-error/20 text-error border-error/40',
};

const AdminQuestionCard = memo(function AdminQuestionCard({ q, isSelected, onToggleSelect, onEdit, onClone, onDelete, onToggleVerify }) {
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const options = ['A', 'B', 'C', 'D'];
  const diff = (q.difficulty || 'medium').toLowerCase();
  const diffStyle = DIFFICULTY_STYLES[diff] || 'bg-surface-container text-on-surface-variant border-outline-variant';

  const handleCopyId = () => {
    navigator.clipboard.writeText(q.id || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleVerifyClick = async () => {
    setToggling(true);
    try {
      await onToggleVerify(q.id, !q.verified);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className={`acrylic-glass border rounded-sm transition-all duration-150 shadow-xl overflow-hidden ${
      isSelected ? 'border-primary bg-primary/[0.05] ring-1 ring-primary/40 shadow-primary/10' : 'border-white/10 hover:border-primary/40'
    }`}>
      {/* Header Bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 flex-wrap bg-surface-container/70 text-xs font-mono">
        <input
          type="checkbox"
          checked={Boolean(isSelected)}
          onChange={() => onToggleSelect(q.id)}
          className="w-3.5 h-3.5 accent-primary cursor-pointer mr-1.5 rounded-xs"
          title="Select question for bulk action"
        />
        {q.difficulty && (
          <span className={`px-2 py-0.5 border text-label-sm-mono uppercase tracking-widest text-xs rounded-xs font-bold ${diffStyle}`}>
            {q.difficulty}
          </span>
        )}
        {q.source_type && (
          <span className={`px-2 py-0.5 border text-label-sm-mono uppercase tracking-widest text-xs ${
            q.source_type === 'PYQ' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface-container text-white/60 border-white/10'
          }`}>
            {q.source_type}
          </span>
        )}
        <button
          onClick={handleVerifyClick}
          disabled={toggling}
          title="Click to toggle publication verification"
          className={`px-2.5 py-0.5 border rounded-xs text-label-sm-mono uppercase tracking-widest text-xs transition-colors cursor-pointer hover:brightness-125 flex items-center gap-1.5 ${
            q.verified
              ? 'bg-status-aligned/15 text-status-aligned border-status-aligned/40 hover:bg-status-aligned/25'
              : 'bg-error/15 text-error border-error/40 hover:bg-error/25'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${q.verified ? 'bg-status-aligned' : 'bg-error'}`}></span>
          <span>{q.verified ? 'Verified (Live)' : 'Draft (Hidden)'}</span>
        </button>

        {q.exam_year && (
          <span className="text-label-sm-mono text-on-surface-variant text-xs uppercase tracking-widest">
            {q.exam_year}
          </span>
        )}

        {/* Action buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => onEdit(q)}
            className="flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-black transition-all text-label-sm-mono uppercase tracking-widest text-xs font-semibold rounded-sm cursor-pointer"
            title="Edit question text, choices, answers, and solution"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => onClone(q)}
            className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/15 text-white/80 hover:border-white/40 hover:text-white transition-all text-label-sm-mono uppercase tracking-widest text-xs font-semibold rounded-sm cursor-pointer"
            title="Clone / Author variant"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Clone</span>
          </button>

          <button
            onClick={() => onDelete(q.id)}
            className="flex items-center gap-1 px-2.5 py-1 border border-error/40 text-error hover:bg-error hover:text-white transition-all text-label-sm-mono uppercase tracking-widest text-xs rounded-sm cursor-pointer"
            title="Delete this question from question bank"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyId}
            className="flex items-center gap-1 px-2.5 py-1 border border-white/10 hover:border-primary text-white/60 hover:text-primary transition-all text-label-sm-mono uppercase tracking-widest text-xs rounded-sm cursor-pointer"
            title={`Copy UUID: ${q.id}`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-status-aligned" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Question text */}
      <div className="px-5 py-4">
        <div className="text-body-lg text-on-surface font-light leading-relaxed">
          <MathText text={q.question_text || q.text || ''} />
        </div>
      </div>

      {/* Options */}
      {q.options && (
        <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {options.map((letter) => {
            const optionText = Array.isArray(q.options)
              ? q.options.find(o => o.id === letter)?.text
              : (q.options?.[letter] ?? q.options?.[letter.toLowerCase()]);
            if (!optionText) return null;
            const isCorrect = q.correct_answer === letter;
            return (
              <div
                key={letter}
                className={`flex items-start gap-3 px-4 py-2.5 rounded-sm border transition-all ${
                  isCorrect
                    ? 'border-status-aligned/60 bg-status-aligned/10 text-white ring-1 ring-status-aligned/40'
                    : 'border-white/10 bg-black/40 text-white/90'
                }`}
              >
                <span className={`text-label-sm-mono font-bold uppercase shrink-0 mt-0.5 ${isCorrect ? 'text-status-aligned' : 'text-on-surface-variant'}`}>
                  {letter}.
                </span>
                <div className="text-body-md font-light flex-1">
                  <MathText text={String(optionText)} />
                </div>
                {isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-status-aligned shrink-0 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Solution Section (Lazy Rendered on Demand) */}
      {q.solution_text && (
        <div className="px-5 pb-4">
          <div className="border border-outline-variant bg-surface-dim/60">
            <button
              type="button"
              onClick={() => setShowSolution(v => !v)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-label-sm-mono text-on-surface-variant hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>{showSolution ? 'Hide Step-by-Step Solution' : 'View Step-by-Step Solution'}</span>
              </div>
              {showSolution ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showSolution && (
              <div className="p-4 border-t border-outline-variant bg-status-aligned/5 border-l-4 border-l-status-aligned animate-fade-in">
                <div className="text-body-md text-on-surface font-light leading-relaxed">
                  <MathText text={q.solution_text} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

const QUALITY_PRESETS = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified (Live)' },
  { id: 'draft', label: 'Drafts (Hidden)' },
  { id: 'missing_solution', label: '⚠️ Missing Solutions' },
  { id: 'has_solution', label: 'Has Solutions' },
  { id: 'pyq_only', label: 'PYQ Only' }
];

export default function AdminQuestionsPage() {
  const [searchParams] = useSearchParams();
  const initialTopicFromUrl = searchParams.get('topic_id') || '';

  const [hierarchy, setHierarchy] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState(
    initialTopicFromUrl ? [initialTopicFromUrl] : []
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [qualityPreset, setQualityPreset] = useState('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('All'); // 'All' | 'PYQ' | 'ORIGINAL'
  const [examYearFilter, setExamYearFilter] = useState('All');
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'oldest' | 'difficulty_asc' | 'difficulty_desc'
  const [searchQuery, setSearchQuery] = useState('');

  // View mode state (Cards vs Table)
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('tooprep_admin_questions_view') || 'cards';
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('tooprep_admin_questions_view', mode);
  };

  // Multi-question bulk selection state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal Editor state
  const [modalOpen, setModalOpen] = useState(false);
  const [isCloneMode, setIsCloneMode] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null); // null = create mode

  // Bulk Move and Import Modals state
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    topicsService.getTopics().then((tree) => {
      setHierarchy(tree || []);
      if (initialTopicFromUrl && tree) {
        for (const s of tree) {
          for (const c of s.chapters || []) {
            if ((c.topics || []).some(t => t.id === initialTopicFromUrl)) {
              setSelectedSubject(s.id || s.name);
              setSelectedChapters([c.id || c.name]);
              break;
            }
          }
        }
      }
    }).catch(() => {});
  }, [initialTopicFromUrl]);

  const fetchQuestions = useCallback(async () => {
    let topicIds = [...selectedTopics];

    if (topicIds.length === 0) {
      if (selectedChapters.length > 0) {
        for (const s of hierarchy) {
          for (const c of s.chapters || []) {
            if (selectedChapters.includes(c.id || c.name)) {
              (c.topics || []).forEach(t => {
                if (!topicIds.includes(t.id)) topicIds.push(t.id);
              });
            }
          }
        }
      } else if (selectedSubject) {
        const s = hierarchy.find(subj => subj.id === selectedSubject || subj.name === selectedSubject);
        if (s) {
          for (const c of s.chapters || []) {
            (c.topics || []).forEach(t => {
              if (!topicIds.includes(t.id)) topicIds.push(t.id);
            });
          }
        }
      }
    }

    setLoading(true);
    setError('');
    try {
      const result = await questionsService.adminListQuestions({
        topic_ids: topicIds.length > 0 ? topicIds : undefined,
        difficulty: selectedDifficulty && selectedDifficulty !== 'All' ? selectedDifficulty.toLowerCase() : undefined,
        source_type: sourceTypeFilter && sourceTypeFilter !== 'All' ? sourceTypeFilter : undefined,
        exam_year: examYearFilter && examYearFilter !== 'All' ? examYearFilter : undefined,
        sort: sortOption
      });
      setQuestions(Array.isArray(result) ? result : result?.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to load questions.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTopics, selectedChapters, selectedSubject, selectedDifficulty, sourceTypeFilter, examYearFilter, sortOption, hierarchy]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Client-side filtering for search text and quality presets using deferred search value
  const filteredQuestions = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return questions.filter((q) => {
      // Quality Preset filter
      if (qualityPreset === 'verified' && !q.verified) return false;
      if (qualityPreset === 'draft' && q.verified) return false;
      if (qualityPreset === 'missing_solution' && (q.solution_text && q.solution_text.trim())) return false;
      if (qualityPreset === 'has_solution' && (!q.solution_text || !q.solution_text.trim())) return false;
      if (qualityPreset === 'pyq_only' && q.source_type !== 'PYQ') return false;

      // Text search filter
      if (query) {
        const textMatch = (q.question_text || '').toLowerCase().includes(query);
        const solMatch = (q.solution_text || '').toLowerCase().includes(query);
        const idMatch = (q.id || '').toLowerCase().includes(query) || (q.canonical_question_id || '').toLowerCase().includes(query);
        if (!textMatch && !solMatch && !idMatch) return false;
      }
      return true;
    });
  }, [questions, qualityPreset, deferredSearchQuery]);

  // Reset pagination to page 1 whenever any filter criteria changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubject, selectedChapters, selectedTopics, selectedDifficulty, qualityPreset, deferredSearchQuery, pageSize]);

  // Compute pagination window
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(startIndex, startIndex + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  // Actions wrapped in useCallback for referential stability with memoized cards
  const handleCreateNew = useCallback(() => {
    setActiveQuestion(null);
    setIsCloneMode(false);
    setModalOpen(true);
  }, []);

  const handleEditQuestion = useCallback((q) => {
    setActiveQuestion(q);
    setIsCloneMode(false);
    setModalOpen(true);
  }, []);

  const handleCloneQuestion = useCallback((q) => {
    setActiveQuestion(q);
    setIsCloneMode(true);
    setModalOpen(true);
  }, []);

  const handleBulkMoveConfirm = async (targetTopicId) => {
    setBulkActionInProgress(true);
    try {
      await questionsService.bulkMove(selectedQuestionIds, targetTopicId);
      setSelectedQuestionIds([]);
      await fetchQuestions();
    } catch (err) {
      alert('Bulk move failed: ' + err.message);
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const handleDeleteQuestion = useCallback(async (id) => {
    if (!window.confirm(`Permanently delete question ${id}? This cannot be undone.`)) return;
    try {
      await questionsService.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }, []);

  const handleToggleVerify = useCallback(async (id, nextVerified) => {
    try {
      const updated = await questionsService.toggleVerify(id, nextVerified);
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, verified: updated.verified, publication_status: updated.publication_status } : q));
    } catch (err) {
      alert('Verification update failed: ' + err.message);
    }
  }, []);

  const handleSavedQuestion = useCallback(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Bulk Selection Handlers
  const handleToggleSelectOne = useCallback((id) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAllOnPage = useCallback(() => {
    const pageIds = paginatedQuestions.map(q => q.id);
    const allSelected = pageIds.every(id => selectedQuestionIds.includes(id));
    if (allSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  }, [paginatedQuestions, selectedQuestionIds]);

  const handleBulkVerify = async (targetVerified) => {
    if (selectedQuestionIds.length === 0) return;
    setBulkActionInProgress(true);
    try {
      await questionsService.bulkVerify(selectedQuestionIds, targetVerified);
      setQuestions(prev => prev.map(q =>
        selectedQuestionIds.includes(q.id)
          ? { ...q, verified: targetVerified, publication_status: targetVerified ? 'PUBLISHED' : 'DRAFT' }
          : q
      ));
      setSelectedQuestionIds([]);
    } catch (err) {
      alert('Bulk verify failed: ' + err.message);
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestionIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedQuestionIds.length} question(s)? This cannot be undone.`)) return;
    setBulkActionInProgress(true);
    try {
      await questionsService.bulkDelete(selectedQuestionIds);
      setQuestions(prev => prev.filter(q => !selectedQuestionIds.includes(q.id)));
      setSelectedQuestionIds([]);
    } catch (err) {
      alert('Bulk delete failed: ' + err.message);
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const handleExportJson = () => {
    const subset = selectedQuestionIds.length > 0
      ? questions.filter(q => selectedQuestionIds.includes(q.id))
      : questions;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(subset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tooprep-questions-export-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    const subset = selectedQuestionIds.length > 0
      ? questions.filter(q => selectedQuestionIds.includes(q.id))
      : questions;
    const headers = ['id', 'subject', 'chapter', 'topic', 'difficulty', 'source_type', 'exam_year', 'verified', 'question_text', 'correct_answer'];
    const csvRows = [
      headers.join(','),
      ...subset.map(q => {
        const row = [
          q.id || '',
          `"${(q.topics?.chapters?.subjects?.name || '').replace(/"/g, '""')}"`,
          `"${(q.topics?.chapters?.name || '').replace(/"/g, '""')}"`,
          `"${(q.topics?.name || '').replace(/"/g, '""')}"`,
          q.difficulty || '',
          q.source_type || '',
          q.exam_year || '',
          q.verified ? 'true' : 'false',
          `"${(q.question_text || '').replace(/"/g, '""')}"`,
          q.correct_answer || ''
        ];
        return row.join(',');
      })
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `tooprep-questions-export-${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const selectClass =
    'w-full px-4 py-3 border border-outline-variant bg-surface-dim text-body-md text-on-surface outline-none focus:border-primary uppercase transition-colors text-xs font-mono';

  const verifiedCount = questions.filter((q) => q.verified).length;
  const draftCount = questions.length - verifiedCount;
  const pyqCount = questions.filter((q) => q.source_type === 'PYQ').length;
  const missingSolutionCount = questions.filter((q) => !q.solution_text || !q.solution_text.trim()).length;

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-6 pb-16 text-left">
      {/* Header and Create / Import Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary font-bold">
            Question Operations
          </p>
          <h2 className="text-3xl md:text-5xl font-light text-white tracking-tight mt-1">
            Question Bank Manager
          </h2>
          <p className="text-sm md:text-base text-white/60 font-light mt-1">
            Browse, compose, edit, or remove questions with full LaTeX derivation and answer key control.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-4 py-2.5 border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-black text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2 transition-all rounded-sm cursor-pointer"
            title="Batch Import Questions from JSON"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="px-5 py-2.5 bg-primary text-black text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 shadow-lg shadow-primary/20 flex items-center gap-2 transition-all rounded-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Question</span>
          </button>
        </div>
      </div>

      {/* Observability Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="acrylic-glass border border-white/10 rounded-sm p-4 shadow-md">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">Total in Scope</div>
          <div className="text-3xl font-light text-primary">{questions.length}</div>
        </div>
        <div className="acrylic-glass border border-white/10 rounded-sm p-4 shadow-md">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">Verified (Live)</div>
          <div className="text-3xl font-light text-status-aligned">{verifiedCount}</div>
        </div>
        <div className="acrylic-glass border border-white/10 rounded-sm p-4 shadow-md">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">Drafts (Hidden)</div>
          <div className="text-3xl font-light text-status-weak">{draftCount}</div>
        </div>
        <div
          onClick={() => setQualityPreset(qualityPreset === 'missing_solution' ? 'all' : 'missing_solution')}
          className={`acrylic-glass border rounded-sm p-4 cursor-pointer transition-colors shadow-md ${
            missingSolutionCount > 0
              ? 'border-status-weak/50 bg-status-weak/10 hover:border-status-weak'
              : 'border-white/10 hover:border-primary/50'
          }`}
          title="Click to toggle filter for questions missing explanations"
        >
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">Missing Solutions</div>
          <div className={`text-3xl font-light ${missingSolutionCount > 0 ? 'text-status-weak font-normal' : 'text-on-surface-variant'}`}>
            {missingSolutionCount}
          </div>
        </div>
        <div className="acrylic-glass border border-white/10 rounded-sm p-4 shadow-md">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">PYQ Archives</div>
          <div className="text-3xl font-light text-primary">{pyqCount}</div>
        </div>
      </div>

      {/* Dynamic Filters & Search Command Bar */}
      <div className="acrylic-glass border border-white/10 rounded-sm p-5 md:p-6 space-y-5 shadow-xl">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by LaTeX, stem keywords, derivation, or ID..."
            className="w-full pl-11 pr-4 py-2.5 bg-black/50 border border-white/10 rounded-sm text-white placeholder-white/30 outline-none focus:border-primary/60 text-xs font-mono transition-colors"
          />
        </div>

        {/* Curriculum Multi-Picker */}
        <CurriculumMultiPicker
          hierarchy={hierarchy}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          selectedChapters={selectedChapters}
          onChaptersChange={setSelectedChapters}
          selectedTopics={selectedTopics}
          onTopicsChange={setSelectedTopics}
        />

        {/* Filter Controls Row: Difficulty, Quality Audit, Source, Year, Sort */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-white/10 text-xs font-mono">
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1.5 text-[11px]">Difficulty</label>
            <div className="flex gap-1.5 flex-wrap">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`px-3 py-1.5 border rounded-sm uppercase tracking-wider text-xs transition-all cursor-pointer ${
                    selectedDifficulty === d ? 'bg-primary border-primary text-black font-bold shadow-sm' : 'border-white/10 bg-surface-container text-white/60 hover:text-white hover:border-white/30'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1.5 text-[11px]">Quality Audit & Status</label>
            <div className="flex gap-1.5 flex-wrap">
              {QUALITY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setQualityPreset(p.id)}
                  className={`px-3 py-1.5 border rounded-sm uppercase tracking-wider text-xs transition-all cursor-pointer ${
                    qualityPreset === p.id ? 'bg-primary border-primary text-black font-bold shadow-sm' : 'border-white/10 bg-surface-container text-white/60 hover:text-white hover:border-white/30'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1.5 text-[11px]">Source Type</label>
            <div className="flex gap-1.5 flex-wrap">
              {['All', 'PYQ', 'ORIGINAL'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSourceTypeFilter(s)}
                  className={`px-3 py-1.5 border rounded-sm uppercase tracking-wider text-xs transition-all cursor-pointer ${
                    sourceTypeFilter === s ? 'bg-primary border-primary text-black font-bold shadow-sm' : 'border-white/10 bg-surface-container text-white/60 hover:text-white hover:border-white/30'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1.5 text-[11px]">Sort By</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-sm px-3 py-1.5 text-white outline-none focus:border-primary/60 uppercase text-xs font-mono"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="difficulty_asc">Difficulty (Easy &rarr; Hard)</option>
              <option value="difficulty_desc">Difficulty (Hard &rarr; Easy)</option>
            </select>
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1.5 text-[11px]">Exam Year</label>
            <select
              value={examYearFilter}
              onChange={(e) => setExamYearFilter(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-sm px-3 py-1.5 text-white outline-none focus:border-primary/60 uppercase text-xs font-mono"
            >
              <option value="All">All Years</option>
              {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleExportJson}
              className="flex-1 py-2 border border-white/10 hover:border-primary text-white text-xs font-mono uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Export filtered questions as JSON"
            >
              <span>JSON {selectedQuestionIds.length > 0 ? `(${selectedQuestionIds.length})` : ''}</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="flex-1 py-2 border border-white/10 hover:border-primary text-white text-xs font-mono uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Export filtered questions as CSV spreadsheet"
            >
              <span>CSV {selectedQuestionIds.length > 0 ? `(${selectedQuestionIds.length})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 border-l-4 border-error bg-error/10 text-error text-body-md font-mono">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-label-sm-mono text-primary uppercase tracking-widest">Loading questions...</span>
        </div>
      )}

      {!loading && filteredQuestions.length === 0 && (
        <div className="text-center py-20 border border-outline-variant bg-surface-container">
          <Search className="w-12 h-12 text-primary mx-auto mb-4 opacity-40" />
          <h3 className="text-headline-lg text-on-surface font-light mb-2">No Matching Questions</h3>
          <p className="text-body-lg text-on-surface-variant font-light mb-4">
            Try adjusting your search query, status filter, or curriculum scope.
          </p>
          <button
            onClick={handleCreateNew}
            className="px-6 py-2.5 bg-primary text-white text-xs font-mono uppercase tracking-widest font-semibold"
          >
            + Add New Question
          </button>
        </div>
      )}

      {!loading && filteredQuestions.length > 0 && (
        <div className="space-y-4">
          {/* Top Pagination Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border border-white/10 acrylic-glass rounded-sm text-xs font-mono shadow-md">
            <div className="flex items-center gap-3 text-on-surface-variant flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer text-white hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestionIds.includes(q.id))}
                  onChange={handleSelectAllOnPage}
                  className="w-4 h-4 accent-[#00BFFF] cursor-pointer"
                />
                <span className="text-[11px] uppercase tracking-wider">Select Page</span>
              </label>
              {selectedQuestionIds.length > 0 && (
                <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 text-[10px] font-bold">
                  {selectedQuestionIds.length} SELECTED
                </span>
              )}
              <span className="text-white/30">|</span>
              <span className="text-white/50 uppercase tracking-widest text-[11px]">Rows per page:</span>
              {[10, 20, 50, 100].map(size => (
                <button
                  key={size}
                  onClick={() => { setPageSize(size); setCurrentPage(1); }}
                  className={`px-2.5 py-1 border transition-colors cursor-pointer text-xs ${
                    pageSize === size ? 'bg-primary border-primary text-black font-bold shadow-sm' : 'border-white/10 hover:border-primary text-white/70'
                  }`}
                >
                  {size}
                </button>
              ))}
              <span className="text-white/30 ml-2">|</span>
              <span className="text-on-surface ml-1">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredQuestions.length)} of {filteredQuestions.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Dual View Modes Switcher */}
              <div className="flex items-center bg-surface-container p-1 rounded-sm border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => handleSetViewMode('cards')}
                  className={`px-3 py-1 rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'cards' ? 'bg-primary text-black font-bold shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                  title="Detailed Cards View"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline uppercase text-[11px] tracking-wider">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode('table')}
                  className={`px-3 py-1 rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'table' ? 'bg-primary text-black font-bold shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                  title="Dense Table Matrix View"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline uppercase text-[11px] tracking-wider">Table</span>
                </button>
              </div>

              <button
                onClick={() => fetchQuestions()}
                className="flex items-center gap-1 text-white/60 hover:text-primary transition-colors cursor-pointer"
                title="Refresh Question Bank"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 border border-white/10 rounded-sm text-white/70 disabled:opacity-20 hover:border-primary hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="First Page"
                  >
                    &laquo;
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 border border-white/10 rounded-sm text-white/70 disabled:opacity-20 hover:border-primary hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-0.5"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2.5 py-1 bg-surface-container border border-white/10 rounded-sm text-primary font-bold">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 border border-white/10 rounded-sm text-white/70 disabled:opacity-20 hover:border-primary hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-0.5"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 border border-white/10 rounded-sm text-white/70 disabled:opacity-20 hover:border-primary hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Last Page"
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Questions Content: Table or Cards View */}
          {viewMode === 'table' ? (
            <AdminQuestionsTableView
              questions={paginatedQuestions}
              selectedQuestionIds={selectedQuestionIds}
              onToggleSelect={handleToggleSelectOne}
              onSelectAll={handleSelectAllOnPage}
              allSelected={paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestionIds.includes(q.id))}
              onEdit={handleEditQuestion}
              onClone={handleCloneQuestion}
              onDelete={handleDeleteQuestion}
              onToggleVerify={handleToggleVerify}
            />
          ) : (
            <div className="space-y-4">
              {paginatedQuestions.map((q) => (
                <AdminQuestionCard
                  key={q.id}
                  q={q}
                  isSelected={selectedQuestionIds.includes(q.id)}
                  onToggleSelect={handleToggleSelectOne}
                  onEdit={handleEditQuestion}
                  onClone={handleCloneQuestion}
                  onDelete={handleDeleteQuestion}
                  onToggleVerify={handleToggleVerify}
                />
              ))}
            </div>
          )}

          {/* Floating Metro Bulk Actions Command Bar */}
          {selectedQuestionIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/95 border-2 border-primary shadow-2xl p-4 flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono backdrop-blur-md animate-fade-in max-w-[95vw]">
              <div className="flex items-center gap-2 border-r border-white/20 pr-3">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span className="text-white font-bold">{selectedQuestionIds.length} Selected</span>
              </div>

              <button
                onClick={() => setBulkMoveOpen(true)}
                disabled={bulkActionInProgress}
                className="px-3.5 py-1.5 bg-primary/20 border border-primary text-primary hover:bg-primary hover:text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                title="Reassign selected questions to another topic"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Move to Topic</span>
              </button>

              <button
                onClick={() => handleBulkVerify(true)}
                disabled={bulkActionInProgress}
                className="px-3.5 py-1.5 bg-status-aligned/20 border border-status-aligned text-status-aligned hover:bg-status-aligned hover:text-black font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bulk Verify</span>
              </button>

              <button
                onClick={() => handleBulkVerify(false)}
                disabled={bulkActionInProgress}
                className="px-3.5 py-1.5 bg-status-weak/20 border border-status-weak text-status-weak hover:bg-status-weak hover:text-black font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Draft All</span>
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={bulkActionInProgress}
                className="px-3.5 py-1.5 bg-error/20 border border-error text-error hover:bg-error hover:text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bulk Delete</span>
              </button>

              <button
                onClick={() => setSelectedQuestionIds([])}
                className="px-2.5 py-1.5 border border-white/20 text-white/60 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Deselect
              </button>
            </div>
          )}

          {/* Bottom Pagination Toolbar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border border-outline-variant bg-surface-dim text-xs font-mono">
              <span className="text-on-surface-variant">
                Page {currentPage} of {totalPages} ({filteredQuestions.length} total questions)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setCurrentPage(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-outline-variant text-on-surface disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  &laquo; First
                </button>
                <button
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-outline-variant text-on-surface disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="px-3 py-1 bg-primary text-white font-bold">
                  {currentPage}
                </span>
                <button
                  onClick={() => {
                    setCurrentPage(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-outline-variant text-on-surface disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setCurrentPage(totalPages);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-outline-variant text-on-surface disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Last &raquo;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Universal Question Editor Modal */}
      <QuestionEditModal
        isOpen={modalOpen}
        question={activeQuestion}
        isClone={isCloneMode}
        initialTopicId={selectedTopics[0] || ''}
        onClose={() => setModalOpen(false)}
        onSaved={handleSavedQuestion}
        onDeleted={(deletedId) => setQuestions(prev => prev.filter(q => q.id !== deletedId))}
      />

      {/* Bulk Syllabus Move Modal */}
      <BulkMoveModal
        isOpen={bulkMoveOpen}
        selectedCount={selectedQuestionIds.length}
        hierarchy={hierarchy}
        initialTopicId={selectedTopics[0] || ''}
        onClose={() => setBulkMoveOpen(false)}
        onConfirm={handleBulkMoveConfirm}
      />

      {/* Batch JSON Question Importer Modal */}
      <QuestionImportModal
        isOpen={importModalOpen}
        hierarchy={hierarchy}
        initialTopicId={selectedTopics[0] || ''}
        onClose={() => setImportModalOpen(false)}
        onImported={() => {
          fetchQuestions();
        }}
      />
    </div>
  );
}
