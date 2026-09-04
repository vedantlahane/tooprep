import { useState, useEffect, useCallback } from 'react';
import { topicsService } from '@/features/topics/services/topicsService';
import { questionsService } from '../services/questionsService';
import MathText from '@/features/questions/components/MathText';
import { CheckCircle2, BookOpen, SearchX } from 'lucide-react';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const DIFFICULTY_STYLES = {
  Easy: 'bg-status-aligned/20 text-status-aligned border-status-aligned/40',
  Medium: 'bg-status-weak/20 text-status-weak border-status-weak/40',
  Hard: 'bg-error/20 text-error border-error/40',
};

const SOURCE_STYLES = {
  PYQ: 'bg-primary/15 text-primary border-primary/40',
  default: 'bg-surface-container text-on-surface-variant border-outline-variant',
};

function QuestionBrowserCard({ q }) {
  const [showAnswer, setShowAnswer] = useState(false);

  const options = ['A', 'B', 'C', 'D'];
  const hasAnswer = q.correct_answer !== undefined && q.correct_answer !== null;

  const diffStyle = DIFFICULTY_STYLES[q.difficulty] || 'bg-surface-container text-on-surface-variant border-outline-variant';
  const srcStyle = q.source_type === 'PYQ' ? SOURCE_STYLES.PYQ : SOURCE_STYLES.default;

  return (
    <div className="border border-outline-variant bg-surface-container hover:border-primary/60 transition-colors">
      {/* Header badges */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-outline-variant flex-wrap">
        {q.difficulty && (
          <span className={`px-2 py-0.5 border text-label-sm-mono uppercase tracking-widest text-xs ${diffStyle}`}>
            {q.difficulty}
          </span>
        )}
        {q.source_type && (
          <span className={`px-2 py-0.5 border text-label-sm-mono uppercase tracking-widest text-xs ${srcStyle}`}>
            {q.source_type}
          </span>
        )}
        {q.year && (
          <span className="text-label-sm-mono text-on-surface-variant text-xs uppercase tracking-widest ml-auto">
            {q.year}
          </span>
        )}
      </div>

      {/* Question text */}
      <div className="px-5 py-4">
        <div className="text-body-lg text-on-surface font-light leading-relaxed">
          <MathText text={q.question_text || q.text || ''} />
        </div>
      </div>

      {/* Options */}
      {q.options && (
        <div className="px-5 pb-4 grid grid-cols-1 gap-2">
          {options.map((letter) => {
            const optionText = q.options[letter] ?? q.options[letter.toLowerCase()];
            if (!optionText) return null;
            const isCorrect = showAnswer && hasAnswer && q.correct_answer === letter;
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

      {/* Show Answer toggle */}
      <div className="px-5 pb-5">
        <button
          onClick={() => setShowAnswer((v) => !v)}
          className="text-label-sm-mono uppercase tracking-widest text-primary border border-primary px-4 py-2 hover:bg-primary hover:text-white transition-colors"
        >
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </button>

        {showAnswer && (
          <div className="mt-4 animate-fade-in">
            {!hasAnswer ? (
              <p className="text-body-md text-on-surface-variant italic font-light">
                Complete a practice session to see answers.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Correct Answer:</span>
                  <span className="text-body-lg font-bold text-status-aligned">{q.correct_answer}</span>
                </div>
                {q.solution_text && (
                  <div className="p-4 bg-status-aligned/5 border-l-4 border-status-aligned">
                    <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Solution</div>
                    <div className="text-body-md text-on-surface font-light leading-relaxed">
                      <MathText text={q.solution_text} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  const [hierarchy, setHierarchy] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

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
    if (!topicId) return;
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const result = await questionsService.browseQuestions({
        topic_id: topicId,
        difficulty: difficulty || undefined,
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
    if (selectedTopic) {
      fetchQuestions(selectedTopic, selectedDifficulty);
    } else {
      setQuestions([]);
      setHasSearched(false);
    }
  }, [selectedTopic, selectedDifficulty, fetchQuestions]);

  const selectClass =
    'w-full px-4 py-3 border border-outline-variant bg-surface-dim text-body-md text-on-surface outline-none focus:border-primary uppercase transition-colors';

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8 pb-12">
      <div>
        <p className="text-label-sm-mono uppercase tracking-[0.2em] text-primary">question bank</p>
        <h2 className="text-display text-on-surface mt-1 font-light">browse questions</h2>
        <p className="text-body-lg text-on-surface-variant font-light mt-2">
          Filter by topic and difficulty. Click a question to reveal the answer.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="border border-outline-variant bg-surface-container p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Subject</label>
            <select value={selectedSubject} onChange={(e) => handleSubjectChange(e.target.value)} className={selectClass}>
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id || s.name} value={s.id || s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Chapter</label>
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
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={!selectedChapter}
              className={`${selectClass} disabled:opacity-40`}
            >
              <option value="">Select a topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Difficulty</label>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setSelectedDifficulty('')}
              className={`px-5 py-2 border text-label-sm-mono uppercase tracking-widest transition-colors ${
                selectedDifficulty === '' ? 'bg-primary border-primary text-white' : 'border-outline-variant text-on-surface hover:border-on-surface'
              }`}
            >
              All
            </button>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(d)}
                className={`px-5 py-2 border text-label-sm-mono uppercase tracking-widest transition-colors ${
                  selectedDifficulty === d ? 'bg-primary border-primary text-white' : 'border-outline-variant text-on-surface hover:border-on-surface'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 border-l-4 border-error bg-error/10 text-error text-body-md">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-label-sm-mono text-primary uppercase tracking-widest">Loading questions...</span>
        </div>
      )}

      {!loading && !hasSearched && (
        <div className="text-center py-24 border border-outline-variant bg-surface-container">
          <BookOpen className="w-14 h-14 text-primary mx-auto mb-4 opacity-40" />
          <h3 className="text-headline-lg text-on-surface font-light mb-2">Select a Topic</h3>
          <p className="text-body-lg text-on-surface-variant font-light">Choose a subject, chapter, and topic above to browse questions.</p>
        </div>
      )}

      {!loading && hasSearched && questions.length === 0 && (
        <div className="text-center py-24 border border-outline-variant bg-surface-container">
          <SearchX className="w-14 h-14 text-primary mx-auto mb-4 opacity-40" />
          <h3 className="text-headline-lg text-on-surface font-light mb-2">No Questions Found</h3>
          <p className="text-body-lg text-on-surface-variant font-light">Try a different topic or remove the difficulty filter.</p>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </span>
          </div>
          {questions.map((q, i) => (
            <QuestionBrowserCard key={q.id || i} q={q} />
          ))}
        </div>
      )}
    </div>
  );
}
