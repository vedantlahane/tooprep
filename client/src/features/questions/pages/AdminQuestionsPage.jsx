import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { topicsService } from '@/features/topics/services/topicsService';
import { questionsService } from '../services/questionsService';
import MathText from '@/features/questions/components/MathText';
import QuestionEditModal from '@/features/questions/components/QuestionEditModal';
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
  Sparkles
} from '@/shared/components/Icon';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

const DIFFICULTY_STYLES = {
  easy: 'bg-status-aligned/20 text-status-aligned border-status-aligned/40',
  medium: 'bg-status-weak/20 text-status-weak border-status-weak/40',
  hard: 'bg-error/20 text-error border-error/40',
};

function AdminQuestionCard({ q, onEdit, onDelete, onToggleVerify }) {
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

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
    <div className="border border-outline-variant bg-surface-container hover:border-primary/50 transition-colors">
      {/* Header Bar */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-outline-variant flex-wrap">
        {q.difficulty && (
          <span className={`px-2 py-0.5 border text-label-sm-mono uppercase tracking-widest text-xs ${diffStyle}`}>
            {q.difficulty}
          </span>
        )}
        {q.source_type && (
          <span className={`px-2 py-0.5 border text-label-sm-mono uppercase tracking-widest text-xs ${
            q.source_type === 'PYQ' ? 'bg-primary/15 text-primary border-primary/40' : 'bg-surface-dim text-on-surface-variant border-outline-variant'
          }`}>
            {q.source_type}
          </span>
        )}
        <button
          onClick={handleVerifyClick}
          disabled={toggling}
          title="Click to toggle publication verification"
          className={`px-2.5 py-0.5 border text-label-sm-mono uppercase tracking-widest text-xs transition-colors cursor-pointer hover:brightness-125 flex items-center gap-1 ${
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
            className="flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors text-label-sm-mono uppercase tracking-widest text-xs font-semibold"
            title="Edit question text, choices, answers, and solution"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => onDelete(q.id)}
            className="flex items-center gap-1 px-2.5 py-1 border border-error/40 text-error hover:bg-error hover:text-white transition-colors text-label-sm-mono uppercase tracking-widest text-xs"
            title="Delete this question from question bank"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyId}
            className="flex items-center gap-1 px-2.5 py-1 border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary transition-colors text-label-sm-mono uppercase tracking-widest text-xs"
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
                className={`flex items-start gap-3 px-4 py-2.5 border transition-colors ${
                  isCorrect
                    ? 'border-status-aligned bg-status-aligned/10 text-status-aligned'
                    : 'border-outline-variant bg-surface-dim text-on-surface'
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

      {/* Solution */}
      {q.solution_text && (
        <div className="px-5 pb-5">
          <div className="p-4 bg-status-aligned/5 border-l-4 border-status-aligned">
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1.5 flex items-center gap-1.5 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Step-by-Step Solution</span>
            </div>
            <div className="text-body-md text-on-surface font-light leading-relaxed">
              <MathText text={q.solution_text} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminQuestionsPage() {
  const [searchParams] = useSearchParams();
  const initialTopicFromUrl = searchParams.get('topic_id') || '';

  const [hierarchy, setHierarchy] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(initialTopicFromUrl);
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All'); // 'All' | 'Verified' | 'Draft'
  const [searchQuery, setSearchQuery] = useState('');

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal Editor state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null); // null = create mode

  useEffect(() => {
    topicsService.getTopics().then(setHierarchy).catch(() => {});
  }, []);

  const subjects = hierarchy;
  const chapters = selectedSubject
    ? (hierarchy.find((s) => s.id === selectedSubject || s.name === selectedSubject)?.chapters || [])
    : [];
  const topics = selectedChapter
    ? (chapters.find((c) => c.id === selectedChapter || c.name === selectedChapter)?.topics || [])
    : [];

  const handleSubjectChange = (val) => {
    setSelectedSubject(val);
    setSelectedChapter('');
    setSelectedTopic('');
  };

  const handleChapterChange = (val) => {
    setSelectedChapter(val);
    setSelectedTopic('');
  };

  const fetchQuestions = useCallback(async (topicId, difficulty) => {
    setLoading(true);
    setError('');
    try {
      const result = await questionsService.adminListQuestions({
        topic_id: topicId || undefined,
        difficulty: difficulty && difficulty !== 'All' ? difficulty.toLowerCase() : undefined,
      });
      setQuestions(Array.isArray(result) ? result : result?.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to load questions.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions(selectedTopic, selectedDifficulty);
  }, [selectedTopic, selectedDifficulty, fetchQuestions]);

  // Client-side filtering for search text and verification status
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Verification filter
      if (verificationFilter === 'Verified' && !q.verified) return false;
      if (verificationFilter === 'Draft' && q.verified) return false;

      // Text search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textMatch = (q.question_text || '').toLowerCase().includes(query);
        const solMatch = (q.solution_text || '').toLowerCase().includes(query);
        const idMatch = (q.id || '').toLowerCase().includes(query) || (q.canonical_question_id || '').toLowerCase().includes(query);
        if (!textMatch && !solMatch && !idMatch) return false;
      }
      return true;
    });
  }, [questions, verificationFilter, searchQuery]);

  // Actions
  const handleCreateNew = () => {
    setActiveQuestion(null);
    setModalOpen(true);
  };

  const handleEditQuestion = (q) => {
    setActiveQuestion(q);
    setModalOpen(true);
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm(`Permanently delete question ${id}? This cannot be undone.`)) return;
    try {
      await questionsService.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleToggleVerify = async (id, nextVerified) => {
    try {
      const updated = await questionsService.toggleVerify(id, nextVerified);
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, verified: updated.verified, publication_status: updated.publication_status } : q));
    } catch (err) {
      alert('Verification update failed: ' + err.message);
    }
  };

  const handleSavedQuestion = (saved) => {
    fetchQuestions(selectedTopic, selectedDifficulty);
  };

  const selectClass =
    'w-full px-4 py-3 border border-outline-variant bg-surface-dim text-body-md text-on-surface outline-none focus:border-primary uppercase transition-colors text-xs font-mono';

  const verifiedCount = questions.filter((q) => q.verified).length;
  const draftCount = questions.length - verifiedCount;
  const pyqCount = questions.filter((q) => q.source_type === 'PYQ').length;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6 pb-16">
      {/* Header and Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-label-sm-mono uppercase tracking-[0.2em] text-primary text-xs">
            ADMINISTRATION // QUESTION OPERATIONS
          </p>
          <h2 className="text-display text-on-surface mt-1 font-light lowercase">
            Question Bank Manager
          </h2>
          <p className="text-body-md text-on-surface-variant font-light mt-1">
            Browse, compose, edit, or remove questions with full LaTeX derivation and answer key control.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-6 py-3 bg-primary text-white text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 shadow-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Question</span>
        </button>
      </div>

      {/* Observability Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-outline-variant bg-surface-container p-4">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">Total in Scope</div>
          <div className="text-3xl font-light text-primary">{questions.length}</div>
        </div>
        <div className="border border-outline-variant bg-surface-container p-4">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">Verified (Live)</div>
          <div className="text-3xl font-light text-status-aligned">{verifiedCount}</div>
        </div>
        <div className="border border-outline-variant bg-surface-container p-4">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">Drafts (Hidden)</div>
          <div className="text-3xl font-light text-status-weak">{draftCount}</div>
        </div>
        <div className="border border-outline-variant bg-surface-container p-4">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs mb-1">PYQ Archives</div>
          <div className="text-3xl font-light text-primary">{pyqCount}</div>
        </div>
      </div>

      {/* Dynamic Filters & Search Command Bar */}
      <div className="border border-primary/30 bg-surface-container p-6 space-y-5">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by LaTeX, stem keywords, derivation, or ID..."
            className="w-full pl-11 pr-4 py-3 bg-black border border-white/15 text-white placeholder-white/40 outline-none focus:border-primary text-xs font-mono"
          />
        </div>

        {/* Curriculum Cascading Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1.5 text-xs">Subject</label>
            <select value={selectedSubject} onChange={(e) => handleSubjectChange(e.target.value)} className={selectClass}>
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id || s.name} value={s.id || s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1.5 text-xs">Chapter</label>
            <select
              value={selectedChapter}
              onChange={(e) => handleChapterChange(e.target.value)}
              disabled={!selectedSubject}
              className={`${selectClass} disabled:opacity-40`}
            >
              <option value="">All Chapters</option>
              {chapters.map((c) => (
                <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1.5 text-xs">Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={!selectedChapter}
              className={`${selectClass} disabled:opacity-40`}
            >
              <option value="">All Topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Difficulty & Verification Toggles */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2 border-t border-white/10">
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2 text-xs">Difficulty</label>
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`px-4 py-1.5 border text-label-sm-mono uppercase tracking-widest text-xs transition-colors ${
                    selectedDifficulty === d ? 'bg-primary border-primary text-white font-bold' : 'border-outline-variant text-on-surface hover:border-on-surface'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2 text-xs">Verification Status</label>
            <div className="flex gap-2 flex-wrap">
              {['All', 'Verified', 'Draft'].map((v) => (
                <button
                  key={v}
                  onClick={() => setVerificationFilter(v)}
                  className={`px-4 py-1.5 border text-label-sm-mono uppercase tracking-widest text-xs transition-colors ${
                    verificationFilter === v ? 'bg-primary border-primary text-white font-bold' : 'border-outline-variant text-on-surface hover:border-on-surface'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
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
          <div className="flex justify-between items-center text-xs font-mono text-white/50 px-1">
            <span>Showing {filteredQuestions.length} of {questions.length} questions</span>
            <button
              onClick={() => fetchQuestions(selectedTopic, selectedDifficulty)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {filteredQuestions.map((q) => (
            <AdminQuestionCard
              key={q.id}
              q={q}
              onEdit={handleEditQuestion}
              onDelete={handleDeleteQuestion}
              onToggleVerify={handleToggleVerify}
            />
          ))}
        </div>
      )}

      {/* Universal Question Editor Modal */}
      <QuestionEditModal
        isOpen={modalOpen}
        question={activeQuestion}
        initialTopicId={selectedTopic}
        onClose={() => setModalOpen(false)}
        onSaved={handleSavedQuestion}
        onDeleted={(deletedId) => setQuestions(prev => prev.filter(q => q.id !== deletedId))}
      />
    </div>
  );
}
