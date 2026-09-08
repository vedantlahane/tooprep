import { useState, useEffect, useCallback, useMemo, useDeferredValue, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { topicsService } from '@/features/topics/services/topicsService';
import { questionsService } from '../services/questionsService';
import MathText from '@/features/questions/components/MathText';
import { useAuth } from '@/features/auth/context/AuthContext';
import QuestionEditModal from '@/features/questions/components/QuestionEditModal';
import CurriculumMultiPicker from '@/shared/components/CurriculumMultiPicker';
import Icon, {
  CheckCircle2,
  BookOpen,
  Search,
  Filter,
  Play,
  Timer,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Edit3,
  Plus,
  Shield
} from '@/shared/components/Icon';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

const DIFFICULTY_STYLES = {
  Easy: 'bg-status-aligned/20 text-status-aligned border-status-aligned/40',
  Medium: 'bg-status-weak/20 text-status-weak border-status-weak/40',
  Hard: 'bg-error/20 text-error border-error/40',
};

const SOURCE_STYLES = {
  PYQ: 'bg-primary/15 text-primary border-primary/40',
  default: 'bg-surface-container text-white/60 border-outline-variant',
};

const QuestionBrowserCard = memo(function QuestionBrowserCard({ q, onPracticeTopic, isAdmin, onEditQuestion }) {
  const [showAnswer, setShowAnswer] = useState(false);

  const options = ['A', 'B', 'C', 'D'];
  const hasAnswer = q.correct_answer !== undefined && q.correct_answer !== null;

  const diffStyle = DIFFICULTY_STYLES[q.difficulty] || 'bg-surface-container text-white/60 border-outline-variant';
  const srcStyle = q.source_type === 'PYQ' ? SOURCE_STYLES.PYQ : SOURCE_STYLES.default;

  return (
    <div className="acrylic-glass border border-outline-variant rounded-sm overflow-hidden hover:border-primary/50 transition-all duration-200 space-y-0 shadow-lg animate-slide-up hover-lift">
      {/* Header badges */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 flex-wrap bg-surface-container/60 text-xs font-mono">
        {q.difficulty && (
          <span className={`px-2 py-0.5 border rounded-sm uppercase tracking-wider text-[10px] font-bold ${diffStyle}`}>
            {q.difficulty}
          </span>
        )}
        {q.source_type && (
          <span className={`px-2 py-0.5 border rounded-sm uppercase tracking-wider text-[10px] font-bold ${srcStyle}`}>
            {q.source_type}
          </span>
        )}
        {q.year && (
          <span className="text-white/40 uppercase tracking-widest text-[10px]">
            JEE {q.year}
          </span>
        )}
        {q.has_diagram && (
          <span className="px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/30 text-primary uppercase text-[10px]">
            Diagram
          </span>
        )}

        {isAdmin && (
          <button
            onClick={() => onEditQuestion(q)}
            className="ml-auto flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors text-[10px] uppercase tracking-wider font-bold rounded-none"
            title="Edit this question in Admin Editor"
          >
            <Edit3 className="w-3 h-3" />
            <span>Admin Edit</span>
          </button>
        )}
      </div>

      {/* Question stem */}
      <div className="px-5 py-4">
        <div className="text-body-lg text-white font-light leading-relaxed">
          <MathText text={q.question_text || q.text || ''} />
        </div>
      </div>

      {/* Options grid */}
      {q.options && (
        <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {options.map((letter) => {
            const optionText = Array.isArray(q.options)
              ? q.options.find(o => o.id === letter)?.text
              : (q.options?.[letter] ?? q.options?.[letter.toLowerCase()]);
            if (!optionText) return null;
            const isCorrect = showAnswer && hasAnswer && q.correct_answer === letter;
            return (
              <div
                key={letter}
                className={`flex items-start gap-3 px-4 py-2.5 rounded-sm border transition-colors ${
                  isCorrect
                    ? 'border-status-aligned bg-status-aligned/10 text-status-aligned'
                    : 'border-outline-variant/60 bg-surface-dim/70 text-white'
                }`}
              >
                <span className={`text-xs font-mono font-bold uppercase shrink-0 mt-0.5 ${isCorrect ? 'text-status-aligned' : 'text-primary'}`}>
                  {letter}.
                </span>
                <div className="text-sm font-light flex-1 min-w-0">
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

      {/* Show Answer Toggle & Solution Accordion */}
      <div className="px-5 pb-4 pt-1 border-t border-white/5 flex items-center justify-between">
        <button
          onClick={() => setShowAnswer(v => !v)}
          className="text-xs font-mono uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5"
        >
          {showAnswer ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide Answer & Solution</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Reveal Answer & Solution</span>
            </>
          )}
        </button>

        {q.topic_id && onPracticeTopic && (
          <button
            onClick={() => onPracticeTopic(q.topic_id)}
            className="text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-primary flex items-center gap-1"
          >
            <span>Practice Topic</span>
            <Play className="w-3 h-3 fill-current" />
          </button>
        )}
      </div>

      {showAnswer && (
        <div className="px-5 pb-5 pt-2 border-t border-outline-variant bg-surface-container/40 space-y-3 animate-slide-down">
          {!hasAnswer ? (
            <p className="text-xs font-mono text-white/50 italic font-light">
              Answer is withheld for evaluation integrity. Complete a practice drill on this topic to view full solution steps.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white/50 uppercase tracking-widest">Correct Option:</span>
                <span className="text-sm font-bold text-status-aligned px-2 py-0.5 rounded bg-status-aligned/10 border border-status-aligned/30">
                  Option ({q.correct_answer})
                </span>
              </div>
              {q.solution_text && (
                <div className="p-4 bg-black/40 rounded border border-outline-variant space-y-2">
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest font-bold">
                    Step-by-Step LaTeX Derivation
                  </div>
                  <div className="text-sm font-light leading-relaxed text-white/90">
                    <MathText text={q.solution_text} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default function QuestionsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = Boolean(profile?.is_admin);

  const [hierarchy, setHierarchy] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Admin Question Editor Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);

  useEffect(() => {
    topicsService.getTopics().then(setHierarchy).catch(() => {});
  }, []);

  const handleFetchQuestions = useCallback(async () => {
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
    setHasSearched(true);
    try {
      const data = await questionsService.browseQuestions({
        topic_ids: topicIds.length > 0 ? topicIds : undefined,
        difficulty: selectedDifficulty === 'All' ? undefined : selectedDifficulty,
      });
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTopics, selectedChapters, selectedSubject, selectedDifficulty, hierarchy]);

  const handleEditQuestion = (q) => {
    setActiveQuestion(q);
    setModalOpen(true);
  };

  const handleCreateNewQuestion = () => {
    setActiveQuestion(null);
    setModalOpen(true);
  };

  const handleSavedQuestion = () => {
    handleFetchQuestions();
  };

  useEffect(() => {
    handleFetchQuestions();
  }, [selectedTopics, selectedChapters, selectedSubject, selectedDifficulty, handleFetchQuestions]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const deferredSearchFilter = useDeferredValue(searchFilter);

  const filteredQuestions = useMemo(() => {
    if (!deferredSearchFilter.trim()) return questions;
    const q = deferredSearchFilter.toLowerCase().trim();
    return questions.filter(item => {
      const text = (item.question_text || item.text || '').toLowerCase();
      const sol = (item.solution_text || '').toLowerCase();
      return text.includes(q) || sol.includes(q);
    });
  }, [questions, deferredSearchFilter]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubject, selectedChapters, selectedTopics, selectedDifficulty, deferredSearchFilter]);

  return (
    <div className="w-full min-w-0 space-y-6 pb-20 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="text-xs text-primary font-semibold uppercase tracking-wider">
            Question Archive &middot; Verified Curriculum Pool
          </div>
          <h1 className="text-3xl md:text-5xl font-extralight text-white tracking-tight mt-1">
            Question Bank
          </h1>
          <p className="text-body-md text-white/60 font-light mt-1">
            Browse official JEE Main PYQ papers across multiple chapters and curriculum topics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <button
                onClick={handleCreateNewQuestion}
                className="px-4 py-2 bg-primary text-white text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-1.5 hover:brightness-110 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Question</span>
              </button>
              <button
                onClick={() => navigate('/admin/questions')}
                className="px-4 py-2 border border-status-weak/50 text-status-weak hover:bg-status-weak hover:text-black text-xs font-mono uppercase tracking-wider font-bold transition-colors"
              >
                Admin Manager
              </button>
            </>
          )}

          {selectedTopics.length > 0 && (
            <>
              <button
                onClick={() => navigate(`/practice?topic=${selectedTopics[0]}`)}
                className="px-4 py-2 bg-surface-container border border-outline-variant hover:border-primary text-white rounded-sm text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current text-primary" />
                <span>Drill Selected</span>
              </button>
              <button
                onClick={() => navigate(`/evaluate?topic=${selectedTopics[0]}`)}
                className="px-4 py-2 bg-primary text-black rounded-sm text-xs font-mono uppercase tracking-wider font-bold hover:brightness-110 flex items-center gap-1.5 transition-colors"
              >
                <Timer className="w-3.5 h-3.5 stroke-[2]" />
                <span>Mock Test</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Multi-Curriculum Filter Card */}
      <div className="acrylic-glass p-5 rounded-sm border border-outline-variant space-y-4">
        <CurriculumMultiPicker
          hierarchy={hierarchy}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          selectedChapters={selectedChapters}
          onChaptersChange={setSelectedChapters}
          selectedTopics={selectedTopics}
          onTopicsChange={setSelectedTopics}
        />

        {/* Secondary Filter: Difficulty Buttons & Search Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider mr-1">Difficulty:</span>
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(d)}
                className={`px-3 py-1 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors ${
                  selectedDifficulty === d
                    ? 'bg-primary text-black font-bold'
                    : 'bg-surface border border-outline-variant text-white/60 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search in questions or derivations..."
              className="w-full bg-black/50 border border-outline-variant rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-white/30 outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-xs font-mono rounded-r-sm">
          {error}
        </div>
      )}

      {/* Results / List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div className="text-xs font-mono text-primary uppercase tracking-widest">
            Loading Questions...
          </div>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="acrylic-glass border border-white/10 rounded-sm p-16 text-center text-white/40 space-y-2">
          <div className="text-sm font-light text-white">No questions found for this filter combination</div>
          <p className="text-xs text-white/50 font-mono">Try selecting different chapters/topics or clear your search term.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Pagination Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border border-outline-variant bg-surface-dim text-xs font-mono">
            <div className="flex items-center gap-2 text-on-surface-variant flex-wrap">
              <span className="text-white/50 uppercase tracking-widest text-[11px]">Per page:</span>
              {[10, 20, 50, 100].map(size => (
                <button
                  key={size}
                  onClick={() => { setPageSize(size); setCurrentPage(1); }}
                  className={`px-2.5 py-1 border transition-colors cursor-pointer text-xs ${
                    pageSize === size ? 'bg-primary border-primary text-black font-bold' : 'border-outline-variant hover:border-primary text-white/70'
                  }`}
                >
                  {size}
                </button>
              ))}
              <span className="text-white/30 ml-2">|</span>
              <span className="text-white/70 ml-1">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredQuestions.length)} of {filteredQuestions.length}
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 border border-outline-variant text-white/70 disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="First Page"
                >
                  &laquo;
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 border border-outline-variant text-white/70 disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-0.5"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2.5 py-1 bg-surface-container border border-outline-variant text-primary font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 border border-outline-variant text-white/70 disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-0.5"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 border border-outline-variant text-white/70 disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Last Page"
                >
                  &raquo;
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {paginatedQuestions.map((q) => (
              <QuestionBrowserCard
                key={q.id}
                q={q}
                isAdmin={isAdmin}
                onEditQuestion={handleEditQuestion}
                onPracticeTopic={(topicId) => navigate(`/practice?topic=${topicId}`)}
              />
            ))}
          </div>

          {/* Bottom Pagination Toolbar if multiple pages */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border border-outline-variant bg-surface-dim text-xs font-mono">
              <span className="text-white/50">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-outline-variant text-white/70 disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="px-3 py-1.5 bg-surface-container border border-outline-variant text-primary font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => {
                    setCurrentPage(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-outline-variant text-white/70 disabled:opacity-20 hover:border-primary transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Question Editor Modal */}
      {isAdmin && (
        <QuestionEditModal
          isOpen={modalOpen}
          question={activeQuestion}
          initialTopicId={selectedTopics[0] || ''}
          onClose={() => setModalOpen(false)}
          onSaved={handleSavedQuestion}
          onDeleted={handleSavedQuestion}
        />
      )}
    </div>
  );
}
