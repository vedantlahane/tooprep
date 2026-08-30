import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { evaluationsService } from '../services/evaluationsService';
import { topicsService } from '@/features/topics/services/topicsService';
import QuestionCard from '@/features/questions/components/QuestionCard';
import Timer from '@/shared/components/Timer';

export default function EvaluationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Setup state
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(searchParams.get('topic') || '');
  const [questionCount, setQuestionCount] = useState(15);
  const [durationMinutes, setDurationMinutes] = useState(30);

  // Evaluation state
  const [evaluation, setEvaluation] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const startTimesRef = useRef({});

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const hierarchy = await topicsService.getTopics();
      const allTopics = [];
      for (const subject of hierarchy) {
        for (const chapter of subject.chapters || []) {
          for (const topic of chapter.topics || []) {
            allTopics.push({
              id: topic.id,
              name: topic.name,
              chapter: chapter.name,
              subject: subject.name,
            });
          }
        }
      }
      setTopics(allTopics);
    } catch (err) {
      setError(err.message);
    }
  };

  const startEvaluation = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await evaluationsService.startEvaluation(
        selectedTopic,
        questionCount,
        durationMinutes * 60
      );
      setEvaluation(result.evaluation);
      setQuestions(result.questions);
      setCurrentIndex(0);
      setAnswers({});
      setMarkedForReview(new Set());
      startTimesRef.current = {};
      startTimesRef.current[result.questions[0]?.id] = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (optionId) => {
    const qId = questions[currentIndex].id;
    setAnswers(prev => ({ ...prev, [qId]: optionId }));
  };

  const handleNavigateQuestion = (index) => {
    setCurrentIndex(index);
    const newQId = questions[index].id;
    if (!startTimesRef.current[newQId]) {
      startTimesRef.current[newQId] = Date.now();
    }
  };

  const toggleMarkForReview = () => {
    const qId = questions[currentIndex].id;
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleSubmitEvaluation = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      // Submit all answers
      for (const q of questions) {
        const answer = answers[q.id];
        const startTime = startTimesRef.current[q.id];
        const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

        if (answer) {
          await evaluationsService.submitEvalAttempt(evaluation.id, {
            question_id: q.id,
            selected_answer: answer,
            time_spent_seconds: Math.min(timeSpent, durationMinutes * 60)
          });
        }
      }

      // Complete evaluation
      const result = await evaluationsService.completeEvaluation(evaluation.id);

      // Navigate to results
      navigate(`/results/${evaluation.id}`, {
        state: { result, topicId: evaluation.topic_id }
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }, [answers, evaluation, questions, navigate, submitting, durationMinutes]);

  const handleTimerExpire = useCallback(() => {
    handleSubmitEvaluation();
  }, [handleSubmitEvaluation]);

  // Setup screen
  if (!evaluation) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h2 className="text-display text-on-surface mb-2 font-light">timed evaluation</h2>
        <p className="text-body-lg text-on-surface-variant mb-10 font-light">
          test under exam conditions â€” no hints, no solutions until the end.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-error text-white text-body-md">{error}</div>
        )}

        <div className="space-y-8">
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-3">select topic</label>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="w-full px-4 py-4 border-2 border-outline-variant text-body-lg bg-surface-dim outline-none focus:ring-0 focus:border-primary uppercase"
            >
              <option value="">choose a topic...</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.subject} / {t.chapter} / {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-3">questions</label>
            <div className="flex gap-4">
              {[10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 py-4 border-2 text-body-lg font-light transition-all ${
                    questionCount === n
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-dim border-outline-variant text-on-surface hover:border-on-surface'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-3">duration</label>
            <div className="flex gap-4">
              {[15, 20, 30, 45].map(m => (
                <button
                  key={m}
                  onClick={() => setDurationMinutes(m)}
                  className={`flex-1 py-4 border-2 text-body-lg font-light transition-all ${
                    durationMinutes === m
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-dim border-outline-variant text-on-surface hover:border-on-surface'
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-error/20 border-l-4 border-error">
            <div className="text-body-md text-white font-light">
              <strong className="font-bold">Evaluation mode:</strong> No hints or solutions until you finish.
              Your answers will be used to calculate your confidence gap.
              The timer auto-submits when it expires.
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={startEvaluation}
              disabled={!selectedTopic || loading}
              className="w-full py-4 bg-error text-white text-headline-md font-semibold uppercase tracking-widest hover:bg-error/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'assembling...' : 'start timed evaluation'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active evaluation
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
      {/* Top bar with timer */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md py-4 mb-8">
        <div className="flex items-center justify-between">
          <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">
            evaluation / q{currentIndex + 1} of {questions.length}
          </span>
          <Timer
            durationSeconds={durationMinutes * 60}
            onExpire={handleTimerExpire}
            running={true}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error text-white text-body-md">{error}</div>
      )}

      <div className="flex gap-8 flex-col lg:flex-row">
        {/* Question area */}
        <div className="flex-1 min-w-0">
          <QuestionCard
            question={currentQuestion}
            selectedAnswer={answers[currentQuestion?.id]}
            onSelectAnswer={handleSelectAnswer}
            showResult={false}
            showSolution={false}
            disabled={false}
            questionNumber={currentIndex + 1}
            markedForReview={markedForReview.has(currentQuestion?.id)}
            onMarkForReview={toggleMarkForReview}
          />

          {/* Navigation buttons */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => handleNavigateQuestion(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="flex-1 py-4 border-2 border-outline-variant text-body-md font-semibold text-on-surface uppercase tracking-widest hover:border-on-surface transition-colors disabled:opacity-30"
            >
              previous
            </button>
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => handleNavigateQuestion(currentIndex + 1)}
                className="flex-1 py-4 bg-primary text-white text-body-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors"
              >
                next
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmSubmit(true)}
                className="flex-1 py-4 bg-error text-white text-body-md font-semibold uppercase tracking-widest hover:bg-error/80 transition-colors"
              >
                submit
              </button>
            )}
          </div>
        </div>

        {/* Question navigator */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-surface-dim border-2 border-outline-variant p-6 lg:sticky lg:top-24">
            <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-4">navigator</h3>
            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isReview = markedForReview.has(q.id);
                const isCurrent = i === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigateQuestion(i)}
                    className={`w-full aspect-square text-label-mono font-bold transition-all duration-150 border-2 ${
                      isCurrent
                        ? 'border-primary bg-primary text-white scale-110'
                        : isReview
                        ? 'border-status-weak bg-status-weak/20 text-status-weak'
                        : isAnswered
                        ? 'border-primary/50 bg-primary/20 text-white'
                        : 'border-outline-variant bg-transparent text-on-surface-variant hover:border-on-surface'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-3 text-label-sm-mono uppercase tracking-widest">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-primary/20 border-2 border-primary/50" />
                <span className="text-on-surface-variant">answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-status-weak/20 border-2 border-status-weak" />
                <span className="text-on-surface-variant">review ({markedForReview.size})</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-transparent border-2 border-outline-variant" />
                <span className="text-on-surface-variant">unanswered ({unansweredCount})</span>
              </div>
            </div>

            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="w-full mt-8 py-4 bg-error text-white text-body-md font-semibold uppercase tracking-widest hover:bg-error/80 transition-colors"
            >
              finish test
            </button>
          </div>
        </div>
      </div>

      {/* Confirm submit modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-surface-dim border-2 border-outline-variant p-8 max-w-sm w-full animate-fade-in">
            <h3 className="text-headline-md text-on-surface font-light mb-6">submit evaluation?</h3>
            <div className="space-y-3 mb-8 text-body-lg text-on-surface-variant font-light">
              <p>answered: <span className="font-bold text-white">{answeredCount}/{questions.length}</span></p>
              {unansweredCount > 0 && (
                <p className="text-error uppercase tracking-widest text-sm font-bold">âš  {unansweredCount} unanswered</p>
              )}
              {markedForReview.size > 0 && (
                <p className="text-status-weak uppercase tracking-widest text-sm font-bold">ðŸ“Œ {markedForReview.size} marked for review</p>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => { setShowConfirmSubmit(false); handleSubmitEvaluation(); }}
                disabled={submitting}
                className="w-full py-4 bg-error text-white text-body-md font-semibold uppercase tracking-widest hover:bg-error/80 transition-colors disabled:opacity-50"
              >
                {submitting ? 'submitting...' : 'submit now'}
              </button>
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="w-full py-4 border-2 border-outline-variant text-body-md font-semibold text-on-surface uppercase tracking-widest hover:border-on-surface transition-colors"
              >
                resume test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

