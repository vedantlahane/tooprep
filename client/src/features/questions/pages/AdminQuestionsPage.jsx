import { useState, useEffect, useCallback } from 'react';
import { topicsService } from '@/features/topics/services/topicsService';
import { questionsService } from '../services/questionsService';
import MathText from '@/features/questions/components/MathText';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const DIFFICULTY_STYLES = {
  Easy: 'bg-status-aligned/20 text-status-aligned border-status-aligned/40',
  Medium: 'bg-status-weak/20 text-status-weak border-status-weak/40',
  Hard: 'bg-error/20 text-error border-error/40',
};

function AdminQuestionCard({ q }) {
  const [copied, setCopied] = useState(false);

  const options = ['A', 'B', 'C', 'D'];
  const diffStyle = DIFFICULTY_STYLES[q.difficulty] || 'bg-surface-container text-on-surface-variant border-outline-variant';

  const handleCopyId = () => {
    navigator.clipboard.writeText(q.id || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="border border-outline-variant bg-surface-container hover:border-primary/50 transition-colors">
      {/* Header */}
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
        <span className={`px-2 py-0.5 border text-label-sm-mono uppercase tracking-widest text-xs ${
          q.is_verified ? 'bg-status-aligned/15 text-status-aligned border-status-aligned/40' : 'bg-error/15 text-error border-error/40'
        }`}>
          {q.is_verified ? 'Verified' : 'Unverified'}
        </span>
        {q.sync_status && (
          <span className="px-2 py-0.5 border border-outline-variant bg-surface-dim text-on-surface-variant text-label-sm-mono uppercase tracking-widest text-xs">
            sync: {q.sync_status}
          </span>
        )}
        {q.year && (
          <span className="text-label-sm-mono text-on-surface-variant text-xs uppercase tracking-widest">
            {q.year}
          </span>
        )}
        <button
          onClick={handleCopyId}
          className="ml-auto flex items-center gap-1 px-3 py-1 border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary transition-colors text-label-sm-mono uppercase tracking-widest text-xs"
          title={q.id}
        >
          <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
          {copied ? 'Copied!' : 'Copy ID'}
        </button>
      </div>

      {/* Question text */}
      <div className="px-5 py-4">
        <div className="text-body-lg text-on-surface font-light leading-relaxed">
          <MathText text={q.question_text || q.text || ''} />
        </div>
      </div>

      {/* Options — always shown with correct answer highlighted */}
      {q.options && (
        <div className="px-5 pb-4 grid grid-cols-1 gap-2">
          {options.map((letter) => {
            const optionText = q.options[letter] ?? q.options[letter.toLowerCase()];
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
                  <span className="material-symbols-outlined text-status-aligned text-[18px] shrink-0 mt-0.5">check_circle</span>
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
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Solution</div>
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
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const result = await questionsService.adminListQuestions({
        topic_id: topicId || undefined,
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
    fetchQuestions(selectedTopic, selectedDifficulty);
  }, [selectedTopic, selectedDifficulty, fetchQuestions]);

  const selectClass =
    'w-full px-4 py-3 border border-outline-variant bg-surface-dim text-body-md text-on-surface outline-none focus:border-primary uppercase transition-colors';

  const verifiedCount = questions.filter((q) => q.is_verified).length;
  const pyqCount = questions.filter((q) => q.source_type === 'PYQ').length;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8 pb-12">
      <div>
        <p className="text-label-sm-mono uppercase tracking-[0.2em] text-primary">administration</p>
        <h2 className="text-display text-on-surface mt-1 font-light">question management</h2>
        <p className="text-body-lg text-on-surface-variant font-light mt-2">
          Admin view — all questions with answers, verification status, and lifecycle data.
        </p>
      </div>

      {/* Stats bar */}
      {hasSearched && !loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-outline-variant bg-surface-container p-4">
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1">Total Shown</div>
            <div className="text-display font-light text-primary">{questions.length}</div>
          </div>
          <div className="border border-outline-variant bg-surface-container p-4">
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1">Verified</div>
            <div className="text-display font-light text-status-aligned">{verifiedCount}</div>
          </div>
          <div className="border border-outline-variant bg-surface-container p-4">
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1">PYQ</div>
            <div className="text-display font-light text-primary">{pyqCount}</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="border border-primary/30 bg-surface-container p-6 space-y-5">
        <div className="text-label-sm-mono text-primary uppercase tracking-widest mb-1">Filters</div>
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
              <option value="">All Topics</option>
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

      {!loading && hasSearched && questions.length === 0 && (
        <div className="text-center py-20 border border-outline-variant bg-surface-container">
          <span className="material-symbols-outlined text-primary text-[64px] block opacity-40 mb-4">search_off</span>
          <h3 className="text-headline-lg text-on-surface font-light mb-2">No Questions Found</h3>
          <p className="text-body-lg text-on-surface-variant font-light">Adjust filters to find questions.</p>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <AdminQuestionCard key={q.id || i} q={q} />
          ))}
        </div>
      )}
    </div>
  );
}
