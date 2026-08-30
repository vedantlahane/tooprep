import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { practiceService } from '../services/practiceService';
import { topicsService } from '@/features/topics/services/topicsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import QuestionCard from '@/features/questions/components/QuestionCard';
import MistakeTypeSelector from '@/features/questions/components/MistakeTypeSelector';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Setup state
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(searchParams.get('topic') || '');
  const [questionCount, setQuestionCount] = useState(15);

  // Session state (supports direct pre-loading from re-drill)
  const [session, setSession] = useState(location.state?.session || null);
  const [questions, setQuestions] = useState(location.state?.questions || []);
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

  // Initial confidence prompt state
  const [needsConfidence, setNeedsConfidence] = useState(false);
  const [confidence, setConfidence] = useState(5);

  // Post-session confidence update
  const [postSessionConfidence, setPostSessionConfidence] = useState(5);
  const [confidenceUpdated, setConfidenceUpdated] = useState(false);
  const [confidenceUpdating, setConfidenceUpdating] = useState(false);

  useEffect(() => {
    loadTopics();
    if (location.state?.session && location.state?.questions) {
      startTimeRef.current = Date.now();
    }
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
      await confidenceService.setConfidence(selectedTopic, confidence, 'INITIAL');
      setNeedsConfidence(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const startPractice = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await practiceService.startPractice(selectedTopic, questionCount);
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
      const result = await practiceService.submitPracticeAttempt(session.id, {
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
      const result = await practiceService.completePractice(session.id);
      setSummary(result.summary);
      setCompleted(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePostSessionConfidenceUpdate = async () => {
    if (!session?.topic_id) return;
    setConfidenceUpdating(true);
    try {
      await confidenceService.setConfidence(session.topic_id, postSessionConfidence, 'POST_EVALUATION');
      setConfidenceUpdated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfidenceUpdating(false);
    }
  };

  // Setup screen
  if (!session) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h2 className="text-display text-on-surface mb-2 font-light">practice mode</h2>
        <p className="text-body-lg text-on-surface-variant mb-10 font-light">
          untimed practice with solutions revealed after each question.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-error text-white text-body-md">{error}</div>
        )}

        <div className="space-y-8">
          {/* Topic selector */}
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-3">select topic</label>
            <select
              value={selectedTopic}
              onChange={e => handleTopicSelect(e.target.value)}
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

          {/* Initial confidence prompt */}
          {needsConfidence && selectedTopic && (
            <div className="p-6 bg-primary/20 border-l-4 border-primary">
              <p className="text-body-lg text-on-surface mb-4 font-light">
                how confident do you feel about this topic?
              </p>
              <ConfidenceSlider value={confidence} onChange={setConfidence} />
              <button
                onClick={handleSetConfidence}
                className="mt-6 w-full py-4 bg-primary text-white text-body-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors"
              >
                set confidence & continue
              </button>
            </div>
          )}

          {/* Question count */}
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

          <div className="pt-6">
            <button
              onClick={startPractice}
              disabled={!selectedTopic || loading || needsConfidence}
              className="w-full py-4 bg-primary text-white text-headline-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors disabled:opacity-50"
            >
              {loading ? 'loading...' : 'start practice'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Completed screen
  if (completed && summary) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h2 className="text-display text-on-surface mb-8 font-light">practice complete</h2>
        
        <div className="grid grid-cols-2 gap-2 mb-8">
          <div className="p-6 bg-primary text-white">
            <div className="text-display font-light mb-1">{summary.correct}/{summary.total_questions}</div>
            <div className="text-label-sm-mono uppercase tracking-widest opacity-80">correct</div>
          </div>
          <div className="p-6 bg-surface-container-high">
            <div className="text-display font-light mb-1">{summary.accuracy}%</div>
            <div className="text-label-sm-mono uppercase tracking-widest text-on-surface-variant">accuracy</div>
          </div>
          <div className="p-6 bg-surface-container-high">
            <div className="text-display font-light mb-1">
              {Math.floor(summary.avg_time_seconds / 60)}:{String(summary.avg_time_seconds % 60).padStart(2, '0')}
            </div>
            <div className="text-label-sm-mono uppercase tracking-widest text-on-surface-variant">avg time / q</div>
          </div>
          <div className="p-6 bg-surface-container-high">
            <div className="text-display font-light mb-1">{summary.total_questions}</div>
            <div className="text-label-sm-mono uppercase tracking-widest text-on-surface-variant">total qs</div>
          </div>
        </div>

        {/* Post-Session Confidence Rating Prompt */}
        {!confidenceUpdated ? (
          <div className="mb-8 p-6 bg-primary/10 border border-primary/30 rounded-md space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-label-sm-mono text-primary uppercase tracking-widest font-semibold">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
              Update Confidence?
            </div>
            <p className="text-body-md text-on-surface-variant">
              You scored <strong>{summary.accuracy}%</strong>. Based on this session, how confident do you feel about this topic now?
            </p>
            <ConfidenceSlider value={postSessionConfidence} onChange={setPostSessionConfidence} />
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePostSessionConfidenceUpdate}
                disabled={confidenceUpdating}
                className="flex-1 py-3 bg-primary text-white text-label-sm-mono uppercase tracking-widest font-semibold hover:bg-primary-fixed-dim transition-colors rounded-sm"
              >
                {confidenceUpdating ? 'Updating...' : 'Update Confidence'}
              </button>
              <button
                onClick={() => setConfidenceUpdated(true)}
                className="px-6 py-3 border border-outline-variant text-on-surface-variant text-label-sm-mono uppercase tracking-widest hover:border-on-surface transition-colors rounded-sm"
              >
                Skip
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-status-aligned/10 border border-status-aligned text-status-aligned text-body-md rounded-md flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            Confidence rating updated successfully!
          </div>
        )}

        <p className="text-body-lg text-on-surface-variant font-light mb-8">
          Practice accuracy is separate from your evaluation performance. Take a timed evaluation to officially update your confidence gap.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-4 border-2 border-outline-variant text-body-md font-semibold text-on-surface uppercase tracking-widest hover:border-on-surface transition-colors"
          >
            dashboard
          </button>
          <button
            onClick={() => navigate(`/evaluate?topic=${session.topic_id}`)}
            className="flex-1 py-4 bg-primary text-white text-body-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors"
          >
            start evaluation
          </button>
        </div>
      </div>
    );
  }

  // Active practice
  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Progress bar (Metro flat style) */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">
          practice / question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-label-sm-mono text-primary font-bold tracking-widest uppercase">
          {attempts.filter(a => a.correct).length}/{attempts.length} correct
        </span>
      </div>
      
      <div className="w-full h-1 bg-surface-container-high mb-8 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error text-white text-body-md">{error}</div>
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

      <div className="mt-6 space-y-6">
        {/* Mistake type for wrong answers */}
        {submitted && !attempts[attempts.length - 1]?.correct && (
          <MistakeTypeSelector value={mistakeType} onChange={setMistakeType} />
        )}

        {/* Action buttons */}
        {!submitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || loading}
            className="w-full py-4 bg-primary text-white text-body-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors disabled:opacity-50"
          >
            submit answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-4 bg-primary text-white text-body-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors"
          >
            {currentIndex < questions.length - 1 ? 'next question' : 'complete practice'}
          </button>
        )}
      </div>
    </div>
  );
}
