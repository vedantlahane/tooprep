import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/shared/lib/api';
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
      const hierarchy = await api.getTopics();
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
      const result = await api.startEvaluation(
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
          await api.submitEvalAttempt(evaluation.id, {
            question_id: q.id,
            selected_answer: answer,
            time_spent_seconds: Math.min(timeSpent, durationMinutes * 60)
          });
        }
      }

      // Complete evaluation
      const result = await api.completeEvaluation(evaluation.id);

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
        <h2 className="text-display text-on-surface mb-2">Timed Evaluation</h2>
        <p className="text-body-lg text-on-surface-variant mb-6">
          Test under exam conditions — no hints, no solutions until the end.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-body-md">{error}</div>
        )}

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant mb-2">Select Topic</label>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-bright outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a topic...</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.subject} › {t.chapter} › {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant mb-2">Questions</label>
            <div className="flex gap-2">
              {[10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`px-4 py-2 rounded-lg border text-body-md font-semibold transition-all ${
                    questionCount === n
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-primary'
                  }`}
                >
                  {n} Qs
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant mb-2">Duration</label>
            <div className="flex gap-2">
              {[15, 20, 30, 45].map(m => (
                <button
                  key={m}
                  onClick={() => setDurationMinutes(m)}
                  className={`px-4 py-2 rounded-lg border text-body-md font-semibold transition-all ${
                    durationMinutes === m
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-primary'
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-error-container/10 border border-error/20">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-error mt-0.5">warning</span>
              <div className="text-body-md text-on-surface">
                <strong>Evaluation mode:</strong> No hints or solutions until you finish.
                Your answers will be used to calculate your confidence gap.
                The timer auto-submits when it expires.
              </div>
            </div>
          </div>

          <button
            onClick={startEvaluation}
            disabled={!selectedTopic || loading}
            className="w-full py-3 rounded-lg bg-error text-on-error text-headline-md font-semibold hover:bg-error/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Assembling questions...' : 'Start Timed Evaluation'}
          </button>
        </div>
      </div>
    );
  }

  // Active evaluation
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Top bar with timer */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm py-3 mb-4 border-b border-outline-variant/30">
        <div className="flex items-center justify-between">
          <span className="text-label-sm-mono text-on-surface-variant">
            Evaluation · Q{currentIndex + 1}/{questions.length}
          </span>
          <Timer
            durationSeconds={durationMinutes * 60}
            onExpire={handleTimerExpire}
            running={true}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-body-md">{error}</div>
      )}

      <div className="flex gap-5 flex-col lg:flex-row">
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
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => handleNavigateQuestion(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="flex-1 py-2.5 rounded-lg border border-outline-variant text-body-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-30"
            >
              ← Previous
            </button>
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => handleNavigateQuestion(currentIndex + 1)}
                className="flex-1 py-2.5 rounded-lg bg-primary-container text-on-primary text-body-md font-semibold hover:bg-primary transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmSubmit(true)}
                className="flex-1 py-2.5 rounded-lg bg-error text-on-error text-body-md font-semibold hover:bg-error/90 transition-colors"
              >
                Submit Evaluation
              </button>
            )}
          </div>
        </div>

        {/* Question navigator */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-4 lg:sticky lg:top-36">
            <h3 className="text-label-sm-mono text-on-surface-variant mb-3">QUESTIONS</h3>
            <div className="grid grid-cols-5 lg:grid-cols-4 gap-1.5">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isReview = markedForReview.has(q.id);
                const isCurrent = i === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigateQuestion(i)}
                    className={`w-full aspect-square rounded-lg text-label-mono font-bold transition-all duration-150 border-2 ${
                      isCurrent
                        ? 'border-primary bg-primary text-on-primary scale-105 shadow-sm'
                        : isReview
                        ? 'border-status-weak bg-status-weak/10 text-status-weak'
                        : isAnswered
                        ? 'border-tertiary-container bg-tertiary-container/10 text-tertiary-container'
                        : 'border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant hover:border-primary/50'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-1.5 text-label-sm-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-tertiary-container/30 border border-tertiary-container" />
                <span className="text-on-surface-variant">Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-status-weak/20 border border-status-weak" />
                <span className="text-on-surface-variant">Review ({markedForReview.size})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-surface-container-lowest border border-outline-variant" />
                <span className="text-on-surface-variant">Unanswered ({unansweredCount})</span>
              </div>
            </div>

            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="w-full mt-4 py-2.5 rounded-lg bg-error text-on-error text-body-md font-semibold hover:bg-error/90 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* Confirm submit modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant p-6 max-w-sm w-full animate-fade-in">
            <h3 className="text-headline-md text-on-surface mb-3">Submit Evaluation?</h3>
            <div className="space-y-2 mb-5 text-body-md text-on-surface-variant">
              <p>Answered: <span className="font-bold text-on-surface">{answeredCount}/{questions.length}</span></p>
              {unansweredCount > 0 && (
                <p className="text-error">⚠ {unansweredCount} question{unansweredCount > 1 ? 's' : ''} unanswered</p>
              )}
              {markedForReview.size > 0 && (
                <p className="text-status-weak">📌 {markedForReview.size} marked for review</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant text-body-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Continue Test
              </button>
              <button
                onClick={() => { setShowConfirmSubmit(false); handleSubmitEvaluation(); }}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-error text-on-error text-body-md font-semibold hover:bg-error/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
