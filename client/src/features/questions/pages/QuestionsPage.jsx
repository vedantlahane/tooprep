import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { topicsService } from '@/features/topics/services/topicsService';
import { questionsService } from '../services/questionsService';
import MathText from '@/features/questions/components/MathText';
import { useAuth } from '@/features/auth/context/AuthContext';
import QuestionEditModal from '@/features/questions/components/QuestionEditModal';
import Icon, {
  CheckCircle2,
  BookOpen,
  Search,
  Filter,
  Play,
  Timer,
  ChevronDown,
  ChevronUp,
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

function QuestionBrowserCard({ q, onPracticeTopic, isAdmin, onEditQuestion }) {
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
}

export default function QuestionsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = Boolean(profile?.is_admin);

  const [hierarchy, setHierarchy] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
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

  const handleFetchQuestions = useCallback(async () => {
    if (!selectedTopic) return;
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const data = await questionsService.browseQuestions({
        topic_id: selectedTopic,
        difficulty: selectedDifficulty === 'All' ? undefined : selectedDifficulty,
      });
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTopic, selectedDifficulty]);

  const handleEditQuestion = (q) => {
    setActiveQuestion(q);
    setModalOpen(true);
  };

  const handleCreateNewQuestion = () => {
    setActiveQuestion(null);
    setModalOpen(true);
  };

  const handleSavedQuestion = () => {
    if (selectedTopic) {
      handleFetchQuestions();
    }
  };

  useEffect(() => {
    if (selectedTopic) {
      handleFetchQuestions();
    }
  }, [selectedTopic, selectedDifficulty, handleFetchQuestions]);

  const filteredQuestions = useMemo(() => {
    if (!searchFilter.trim()) return questions;
    const q = searchFilter.toLowerCase().trim();
    return questions.filter(item => {
      const text = (item.question_text || item.text || '').toLowerCase();
      const sol = (item.solution_text || '').toLowerCase();
      return text.includes(q) || sol.includes(q);
    });
  }, [questions, searchFilter]);

  return (
    <div className="w-full max-w-6xl min-w-0 mr-auto space-y-6 pb-20 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="text-xs text-primary font-semibold uppercase tracking-wider">
            Question Archive &middot; 110 Bank Questions
          </div>
          <h1 className="text-3xl md:text-5xl font-extralight text-white tracking-tight lowercase mt-1">
            question bank
          </h1>
          <p className="text-body-md text-white/60 font-light mt-1">
            Browse official JEE Main PYQ papers by subject, chapter, and curriculum topic.
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

          {selectedTopic && (
            <>
              <button
                onClick={() => navigate(`/practice?topic=${selectedTopic}`)}
                className="px-4 py-2 bg-surface-container border border-outline-variant hover:border-primary text-white rounded-sm text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current text-primary" />
                <span>Drill</span>
              </button>
              <button
                onClick={() => navigate(`/evaluate?topic=${selectedTopic}`)}
                className="px-4 py-2 bg-primary text-black rounded-sm text-xs font-mono uppercase tracking-wider font-bold hover:brightness-110 flex items-center gap-1.5 transition-colors"
              >
                <Timer className="w-3.5 h-3.5 stroke-[2]" />
                <span>Mock</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Matrix Card */}
      <div className="acrylic-glass p-5 rounded-sm border border-outline-variant space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Subject Dropdown */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-white/60 uppercase tracking-widest">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={e => handleSubjectChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-black/60 border border-outline-variant text-xs font-mono text-white outline-none focus:border-primary rounded-sm"
            >
              <option value="">Choose Subject...</option>
              {subjects.map(s => (
                <option key={s.id || s.name} value={s.id || s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Dropdown */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-white/60 uppercase tracking-widest">
              Chapter
            </label>
            <select
              value={selectedChapter}
              onChange={e => handleChapterChange(e.target.value)}
              disabled={!selectedSubject}
              className="w-full px-3 py-2.5 bg-black/60 border border-outline-variant text-xs font-mono text-white outline-none focus:border-primary rounded-sm disabled:opacity-40"
            >
              <option value="">Choose Chapter...</option>
              {chapters.map(c => (
                <option key={c.id || c.name} value={c.id || c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Dropdown */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-white/60 uppercase tracking-widest">
              Topic
            </label>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              disabled={!selectedChapter}
              className="w-full px-3 py-2.5 bg-black/60 border border-outline-variant text-xs font-mono text-white outline-none focus:border-primary rounded-sm disabled:opacity-40"
            >
              <option value="">Choose Topic...</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter: Difficulty Buttons & Search Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5">
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

          {questions.length > 0 && (
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filter questions by text..."
                className="w-full bg-black/50 border border-outline-variant rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-white/30 outline-none focus:border-primary"
              />
            </div>
          )}
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
      ) : !selectedTopic ? (
        <div className="acrylic-glass border border-white/10 rounded-sm p-16 text-center text-white/40 space-y-3">
          <BookOpen className="w-10 h-10 mx-auto opacity-30" />
          <div className="text-base font-light text-white">Select a curriculum topic to browse questions</div>
          <p className="text-xs text-white/50 font-light max-w-md mx-auto">
            Choose a subject and chapter above to load verified questions from the 2018 JEE Main question bank.
          </p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="acrylic-glass border border-white/10 rounded-sm p-16 text-center text-white/40 space-y-2">
          <div className="text-sm font-light text-white">No questions found for this filter</div>
          <p className="text-xs text-white/50 font-mono">Try selecting a different difficulty or clear your search term.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-white/50 px-1">
            <span>Showing {filteredQuestions.length} questions</span>
            <span>Click to reveal solutions</span>
          </div>

          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <QuestionBrowserCard
                key={q.id}
                q={q}
                isAdmin={isAdmin}
                onEditQuestion={handleEditQuestion}
                onPracticeTopic={(topicId) => navigate(`/practice?topic=${topicId}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Admin Question Editor Modal */}
      {isAdmin && (
        <QuestionEditModal
          isOpen={modalOpen}
          question={activeQuestion}
          initialTopicId={selectedTopic}
          onClose={() => setModalOpen(false)}
          onSaved={handleSavedQuestion}
          onDeleted={handleSavedQuestion}
        />
      )}
    </div>
  );
}
