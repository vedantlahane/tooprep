import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import QuestionCard from '../components/QuestionCard';
import MistakeTypeSelector from '../components/MistakeTypeSelector';
import ConfidenceSlider from '../components/ConfidenceSlider';

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Setup state
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(searchParams.get('topic') || '');
  const [questionCount, setQuestionCount] = useState(15);

  // Session state
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [mistakeType, setMistakeType] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [showSolution, setShowSolution] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const startTimeRef = useRef(null);

  // Need initial confidence?
  const [needsConfidence, setNeedsConfidence] = useState(false);
  const [confidence, setConfidence] = useState(5);

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
              confidence: topic.confidence
            });
          }
        }
      }
      setTopics(allTopics);

      // Auto-select if from URL
      if (searchParams.get('topic')) {
        const t = allTopics.find(t => t.id === searchParams.get('topic'));
        if (t && t.confidence === null) setNeedsConfidence(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTopicSelect = (topicId) => {
    setSelectedTopic(topicId);
    const topic = topics.find(t => t.id === topicId);
    if (topic && topic.confidence === null) {
      setNeedsConfidence(true);
    } else {
      setNeedsConfidence(false);
    }
  };

  const handleSetConfidence = async () => {
    try {
      await api.setConfidence(selectedTopic, confidence, 'INITIAL');
      setNeedsConfidence(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const startPractice = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.startPractice(selectedTopic, questionCount);
      setSession(result.session);
      setQuestions(result.questions);
      setCurrentIndex(0);
      setAttempts([]);
      startTimeRef.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) return;
    setLoading(true);

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const result = await api.submitPracticeAttempt(session.id, {
        question_id: questions[currentIndex].id,
        selected_answer: selectedAnswer,
        time_spent_seconds: timeSpent,
        mistake_type: null
      });

      setAttempts(prev => [...prev, { ...result, question: questions[currentIndex] }]);
      setSubmitted(true);

      // Auto-show solution in practice mode
      questions[currentIndex].correct_answer = result.correct_answer;
      setShowSolution(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMistakeSubmit = async () => {
    // Update the last attempt with mistake type if needed
    if (mistakeType && attempts.length > 0) {
      // For simplicity, we record it client-side; it was already submitted without type
      // In a real scenario, you'd PATCH the attempt
    }
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
      setShowSolution(false);
      setMistakeType(null);
      startTimeRef.current = Date.now();
    } else {
      completePractice();
    }
  };

  const completePractice = async () => {
    try {
      const result = await api.completePractice(session.id);
      setSummary(result.summary);
      setCompleted(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Setup screen
  if (!session) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h2 className="text-display text-on-surface mb-2">Practice Mode</h2>
        <p className="text-body-lg text-on-surface-variant mb-6">
          Untimed practice with solutions revealed after each question.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-body-md">{error}</div>
        )}

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 space-y-5">
          {/* Topic selector */}
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant mb-2">Select Topic</label>
            <select
              value={selectedTopic}
              onChange={e => handleTopicSelect(e.target.value)}
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

          {/* Initial confidence prompt */}
          {needsConfidence && selectedTopic && (
            <div className="p-4 rounded-lg bg-primary-fixed/20 border border-primary-fixed">
              <p className="text-body-md text-on-surface mb-3">
                How confident do you feel about this topic? (First-time rating)
              </p>
              <ConfidenceSlider value={confidence} onChange={setConfidence} />
              <button
                onClick={handleSetConfidence}
                className="mt-3 px-4 py-2 rounded-lg bg-primary text-on-primary text-body-md font-semibold hover:bg-primary-container transition-colors"
              >
                Set Confidence & Continue
              </button>
            </div>
          )}

          {/* Question count */}
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

          <button
            onClick={startPractice}
            disabled={!selectedTopic || loading || needsConfidence}
            className="w-full py-3 rounded-lg bg-primary-container text-on-primary text-headline-md font-semibold hover:bg-primary transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading questions...' : 'Start Practice'}
          </button>
        </div>
      </div>
    );
  }

  // Completed screen
  if (completed && summary) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h2 className="text-display text-on-surface mb-6">Practice Complete</h2>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-surface-container">
              <div className="text-headline-lg text-primary font-bold">{summary.correct}/{summary.total_questions}</div>
              <div className="text-label-sm-mono text-on-surface-variant mt-1">Correct</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-surface-container">
              <div className="text-headline-lg text-on-surface font-bold">{summary.accuracy}%</div>
              <div className="text-label-sm-mono text-on-surface-variant mt-1">Accuracy</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-surface-container">
              <div className="text-headline-lg text-on-surface font-bold">
                {Math.floor(summary.avg_time_seconds / 60)}:{String(summary.avg_time_seconds % 60).padStart(2, '0')}
              </div>
              <div className="text-label-sm-mono text-on-surface-variant mt-1">Avg Time/Q</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-surface-container">
              <div className="text-headline-lg text-on-surface font-bold">{summary.total_questions}</div>
              <div className="text-label-sm-mono text-on-surface-variant mt-1">Total Qs</div>
            </div>
          </div>

          <p className="text-body-md text-on-surface-variant mb-4 text-center">
            Practice accuracy is separate from your evaluation performance. Take a timed evaluation to update your confidence gap.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-2.5 rounded-lg border border-outline-variant text-body-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate(`/evaluate?topic=${session.topic_id}`)}
              className="flex-1 py-2.5 rounded-lg bg-primary-container text-on-primary text-body-md font-semibold hover:bg-primary transition-colors"
            >
              Start Evaluation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active practice
  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Progress bar */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-label-sm-mono text-on-surface-variant">
          Practice · Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-label-mono text-primary font-bold">
          {attempts.filter(a => a.correct).length}/{attempts.length} correct
        </span>
      </div>
      <div className="w-full h-1.5 bg-surface-container rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-body-md">{error}</div>
      )}

      <QuestionCard
        question={currentQuestion}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={!submitted ? setSelectedAnswer : undefined}
        showResult={submitted}
        showSolution={showSolution}
        disabled={submitted}
        questionNumber={currentIndex + 1}
      />

      <div className="mt-4 space-y-3">
        {/* Mistake type for wrong answers */}
        {submitted && !attempts[attempts.length - 1]?.correct && (
          <MistakeTypeSelector value={mistakeType} onChange={setMistakeType} />
        )}

        {/* Action buttons */}
        {!submitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || loading}
            className="w-full py-3 rounded-lg bg-primary-container text-on-primary text-headline-md font-semibold hover:bg-primary transition-colors disabled:opacity-50"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-lg bg-primary-container text-on-primary text-headline-md font-semibold hover:bg-primary transition-colors"
          >
            {currentIndex < questions.length - 1 ? 'Next Question →' : 'Complete Practice'}
          </button>
        )}
      </div>
    </div>
  );
}
