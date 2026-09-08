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
  Easy: 'bg-status-aligned/15 text-status-aligned border-status-aligned/30',
  Medium: 'bg-status-weak/15 text-status-weak border-status-weak/30',
  Hard: 'bg-error/15 text-error border-error/30',
};

const SOURCE_STYLES = {
  PYQ: 'bg-primary/10 text-primary border-primary/30',
  default: 'bg-surface-container text-white/60 border-white/10',
};

const QuestionBrowserCard = memo(function QuestionBrowserCard({ q, onPracticeTopic, isAdmin, onEditQuestion }) {
  const [showAnswer, setShowAnswer] = useState(false);

  const options = ['A', 'B', 'C', 'D'];
  const hasAnswer = q.correct_answer !== undefined && q.correct_answer !== null;

  const diffStyle = DIFFICULTY_STYLES[q.difficulty] || 'bg-surface-container text-white/60 border-outline-variant';
  const srcStyle = q.source_type === 'PYQ' ? SOURCE_STYLES.PYQ : SOURCE_STYLES.default;

  return (
    <div className="border-b border-white/10 pb-8 pt-4 space-y-3 text-left animate-slide-up">
      {/* Header badges */}
      <div className="flex items-center gap-2 flex-wrap text-xs font-mono pb-2 border-b border-white/5">
        {q.difficulty && (
          <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${diffStyle}`}>
            {q.difficulty}
          </span>
        )}
        {q.source_type && (
          <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${srcStyle}`}>
            {q.source_type}
          </span>
        )}
        {q.year && (
          <span className="text-white/40 uppercase tracking-widest text-[10px]">
            JEE {q.year}
          </span>
        )}
        {q.has_diagram && (
          <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary uppercase text-[10px]">
            Diagram
          </span>
        )}

        {isAdmin && (
          <button
            onClick={() => onEditQuestion(q)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-black transition-all text-[10px] uppercase tracking-wider font-bold cursor-pointer"
            title="Edit this question in Admin Editor"
          >
            <Edit3 className="w-3 h-3" />
            <span>Admin Edit</span>
          </button>
        )}
      </div>

      {/* Question stem */}
      <div className="py-2 text-lg md:text-xl text-white font-light leading-relaxed tracking-tight">
        <MathText text={q.question_text || q.text || ''} />
      </div>

      {/* Options grid */}
      {q.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {options.map((letter) => {
            const optionText = Array.isArray(q.options)
              ? q.options.find(o => o.id === letter)?.text
              : (q.options?.[letter] ?? q.options?.[letter.toLowerCase()]);
            if (!optionText) return null;
            const isCorrect = showAnswer && hasAnswer && q.correct_answer === letter;
            return (
              <div
                key={letter}
                className={`flex items-start gap-3 px-3.5 py-3 border transition-all ${
                  isCorrect
                    ? 'border-status-aligned/60 bg-status-aligned/10 text-white ring-1 ring-status-aligned/40 shadow-sm'
                    : 'border-white/10 bg-white/[0.02] text-white/90 hover:border-white/25'
                }`}
              >
                <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold uppercase shrink-0 mt-0.5 ${
                    isCorrect ? 'bg-status-aligned text-black' : 'bg-white/5 border border-white/10 text-primary'
                  }`}>
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
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={() => setShowAnswer(v => !v)}
          className="text-xs font-mono uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
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
            className="text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-primary flex items-center gap-1 cursor-pointer"
          >
            <span>Practice Topic</span>
            <Play className="w-3 h-3 fill-current" />
          </button>
        )}
      </div>

      {showAnswer && (
        <div className="mt-3 p-5 border border-primary/30 bg-white/[0.02] space-y-3 animate-slide-down">
          {!hasAnswer ? (
            <p className="text-xs font-mono text-white/50 italic font-light">
              Answer is withheld for evaluation integrity. Complete a practice drill on this topic to view full solution steps.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white/50 uppercase tracking-widest">Correct Option:</span>
                <span className="text-sm font-bold text-status-aligned px-2 py-0.5 bg-status-aligned/10 border border-status-aligned/30">
                  Option ({q.correct_answer})
                </span>
              </div>
              {q.solution_text && (
                <div className="space-y-2 pt-2 border-t border-white/5">
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
  const [filtersOpen, setFiltersOpen] = useState(true);

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
          <div className="text-xs text-primary font-mono uppercase tracking-[0.2em] font-bold">
            Question Archive &middot; Verified Curriculum Pool
          </div>
          <h1 className="text-3xl md:text-5xl font-light text-white tracking-tight mt-1">
            Question Bank
          </h1>
          <p className="text-sm md:text-base text-white/60 font-light mt-1">
            Browse official JEE Main PYQ papers across multiple chapters and curriculum topics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <button
                onClick={handleCreateNewQuestion}
                className="px-4 py-2 bg-primary text-black text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-1.5 hover:brightness-110 shadow-md shadow-primary/20 rounded-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Question</span>
              </button>
              <button
                onClick={() => navigate('/admin/questions')}
                className="px-4 py-2 border border-status-weak/50 text-status-weak hover:bg-status-weak hover:text-black text-xs font-mono uppercase tracking-wider font-bold transition-colors rounded-sm cursor-pointer"
              >
                Admin Manager
              </button>
            </>
          )}

          {selectedTopics.length > 0 && (
            <>
              <button
                onClick={() => navigate(`/practice?topic=${selectedTopics[0]}`)}
                className="px-4 py-2 bg-surface-container border border-white/15 hover:border-primary text-white rounded-sm text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-primary" />
                <span>Drill Selected</span>
              </button>
              <button
                onClick={() => navigate(`/evaluate?topic=${selectedTopics[0]}`)}
                className="px-4 py-2 bg-primary text-black rounded-sm text-xs font-mono uppercase tracking-wider font-bold hover:brightness-110 flex items-center gap-1.5 transition-colors shadow-md shadow-primary/20 cursor-pointer"
              >
                <Timer className="w-3.5 h-3.5 stroke-[2]" />
                <span>Mock Test</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Multi-Curriculum Filter Area */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
              Curriculum Filter &amp; Scope
            </span>
            {filteredQuestions.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary">
                {filteredQuestions.length} in archive
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(v => !v)}
            className="text-xs font-mono uppercase tracking-wider text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <span>{filtersOpen ? 'Minimize Filter' : 'Expand Filter'}</span>
            {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {filtersOpen && (
          <div className="space-y-4 animate-fade-in">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider mr-1">Difficulty:</span>
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setSelectedDifficulty(d)}
                    className={`px-3.5 py-1.5 border text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      selectedDifficulty === d
                        ? 'bg-primary border-primary text-black font-bold shadow-sm'
                        : 'bg-transparent border-white/15 text-white/60 hover:text-white hover:border-white/40'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Search in questions or derivations..."
                  className="w-full bg-white/[0.03] border-b border-white/20 focus:border-primary pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-white/30 outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/30 text-error text-xs font-mono">
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
        <div className="border border-white/10 p-16 text-center text-white/40 space-y-2 bg-black/30">
          <div className="text-sm font-light text-white">No questions found for this filter combination</div>
          <p className="text-xs text-white/50 font-mono">Try selecting different chapters/topics or clear your search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Main Question Stream (Left 8 or 9 cols on xl) */}
          <div className="xl:col-span-8 2xl:col-span-9 space-y-4 min-w-0">
            {/* Top Pagination Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2 px-3 border-t border-b border-white/10 text-xs font-mono bg-white/[0.02]">
              <div className="flex items-center gap-2 text-white/70 flex-wrap">
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
              <div className="flex items-center justify-between py-2 px-3 border-t border-b border-white/10 text-xs font-mono bg-white/[0.02]">
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
                    className="px-3 py-1.5 border border-white/10 rounded-sm text-white/70 disabled:opacity-20 hover:border-primary hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="px-3 py-1.5 bg-surface-container border border-white/10 rounded-sm text-primary font-bold">
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

          {/* Sticky Side Cockpit (Right on xl only) */}
          <div className="hidden xl:block xl:col-span-4 2xl:col-span-3 xl:sticky xl:top-4 space-y-4">
            {/* Archive Telemetry & Summary */}
            <div className="border border-white/10 bg-black/40 p-4 space-y-3.5 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-mono uppercase tracking-widest text-white/80 font-bold">
                  Archive Telemetry
                </span>
                <span className="text-[10px] font-mono text-primary font-bold">
                  {filteredQuestions.length} Found
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-white/5 text-white/60">
                  <span>Discipline:</span>
                  <span className="text-white font-medium">{selectedSubject || 'All Subjects'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-white/60">
                  <span>Difficulty:</span>
                  <span className="text-primary font-bold">{selectedDifficulty}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-white/60">
                  <span>Active Page:</span>
                  <span className="text-white">{currentPage} / {totalPages}</span>
                </div>
              </div>

              {selectedTopics.length > 0 && (
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => navigate(`/practice?topic=${selectedTopics[0]}`)}
                    className="w-full py-2.5 bg-primary text-black text-xs font-mono uppercase tracking-wider font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Drill Selected Topic</span>
                  </button>
                  <button
                    onClick={() => navigate(`/evaluate?topic=${selectedTopics[0]}`)}
                    className="w-full py-2.5 bg-transparent border border-white/20 hover:border-primary text-white hover:text-primary text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Timer className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Mock Test</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Page Jump Navigation */}
            {totalPages > 1 && (
              <div className="border border-white/10 bg-black/40 p-4 space-y-3 text-left">
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/50 border-b border-white/10 pb-2">
                  Jump To Page
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: Math.min(25, totalPages) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`py-1.5 text-center text-xs font-mono border transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-primary border-primary text-black font-bold shadow'
                          : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:border-white/30'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
