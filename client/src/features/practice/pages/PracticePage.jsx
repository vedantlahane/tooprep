import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { practiceService } from '../services/practiceService';
import { topicsService } from '@/features/topics/services/topicsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import QuestionCard from '@/features/questions/components/QuestionCard';
import MistakeTypeSelector from '@/features/questions/components/MistakeTypeSelector';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';
import TopicPicker from '@/shared/components/TopicPicker';
import Icon, {
  Play,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Timer
} from '@/shared/components/Icon';

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Setup state
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(searchParams.get('topic') || '');
  const [questionCount, setQuestionCount] = useState(10);

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

  // ─── Screen 1: Setup & Configuration Screen ───
  if (!session) {
    return (
      <div className="w-full max-w-3xl mr-auto animate-fade-in space-y-8 text-left">
        <div>
          <div className="text-label-sm-mono uppercase tracking-[0.25em] text-primary text-xs">
            Training Facility &middot; Problem Drill
          </div>
          <h1 className="text-4xl md:text-5xl font-extralight text-white tracking-tight lowercase mt-1">
            practice mode
          </h1>
          <p className="text-body-md text-white/60 font-light mt-2">
            Untimed drill mode. Answers and step-by-step LaTeX solutions are revealed immediately after every submission.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-error/10 border-l-4 border-error text-error text-xs font-mono rounded-r-sm">
            {error}
          </div>
        )}

        <div className="acrylic-glass p-6 md:p-8 rounded-sm border border-outline-variant space-y-6">
          {/* Topic Selector */}
          <div className="space-y-2">
            <label className="block text-label-sm-mono text-white/80 uppercase tracking-widest text-xs font-bold">
              1. Select Curriculum Topic
            </label>
            <TopicPicker
              topics={topics}
              selectedTopicId={selectedTopic}
              onSelect={handleTopicSelect}
              placeholder="Search or pick a topic to practice..."
            />
          </div>

          {/* Initial confidence prompt */}
          {needsConfidence && selectedTopic && (
            <div className="p-5 bg-primary/10 border-l-4 border-primary rounded-r-sm space-y-3 animate-fade-in">
              <div className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
                Rate Initial Confidence (1–10)
              </div>
              <p className="text-xs text-white/70 font-light">
                You haven't calibrated this topic yet. How confident do you feel before practicing?
              </p>
              <ConfidenceSlider value={confidence} onChange={setConfidence} />
              <button
                onClick={handleSetConfidence}
                className="w-full py-2.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110"
              >
                Set Confidence &amp; Continue
              </button>
            </div>
          )}

          {/* Question count selector */}
          <div className="space-y-2">
            <label className="block text-label-sm-mono text-white/80 uppercase tracking-widest text-xs font-bold">
              2. Number of Questions
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`py-3 rounded-sm border text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                    questionCount === n
                      ? 'bg-primary text-black border-primary shadow'
                      : 'bg-surface-dim border-outline-variant text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {n} Qs
                </button>
              ))}
            </div>
          </div>

          {/* Start Drill Button */}
          <div className="pt-2">
            <button
              onClick={startPractice}
              disabled={!selectedTopic || loading || needsConfidence}
              className="w-full py-3.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{loading ? 'Preparing Questions...' : 'Start Practice Drill'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Screen 2: Session Completed Summary ───
  if (completed && summary) {
    return (
      <div className="w-full max-w-3xl mr-auto animate-fade-in space-y-6 text-left">
        <div>
          <div className="text-label-sm-mono uppercase tracking-[0.25em] text-primary text-xs">
            Drill Complete &middot; Performance Debrief
          </div>
          <h1 className="text-4xl font-extralight text-white tracking-tight lowercase mt-1">
            practice results
          </h1>
        </div>

        {/* Scorecard Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="acrylic-glass p-5 rounded-sm border border-primary/40 bg-primary/10">
            <div className="text-3xl font-mono font-light text-primary">{summary.correct}/{summary.total_questions}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1">Score</div>
          </div>
          <div className="acrylic-glass p-5 rounded-sm border border-outline-variant">
            <div className="text-3xl font-mono font-light text-white">{summary.accuracy}%</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1">Accuracy</div>
          </div>
          <div className="acrylic-glass p-5 rounded-sm border border-outline-variant">
            <div className="text-3xl font-mono font-light text-white">
              {Math.floor(summary.avg_time_seconds / 60)}:{String(summary.avg_time_seconds % 60).padStart(2, '0')}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1">Avg Time / Q</div>
          </div>
          <div className="acrylic-glass p-5 rounded-sm border border-outline-variant">
            <div className="text-3xl font-mono font-light text-white">{summary.total_questions}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1">Total Solved</div>
          </div>
        </div>

        {/* Post-Session Confidence Rating Prompt */}
        {!confidenceUpdated ? (
          <div className="acrylic-glass p-6 border border-primary/40 bg-primary/5 rounded-sm space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-widest font-bold">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Update Confidence Rating?</span>
            </div>
            <p className="text-xs text-white/70 font-light">
              You achieved <strong>{summary.accuracy}% accuracy</strong> on this set. Based on this session, how confident do you feel about this topic now?
            </p>
            <ConfidenceSlider value={postSessionConfidence} onChange={setPostSessionConfidence} />
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePostSessionConfidenceUpdate}
                disabled={confidenceUpdating}
                className="flex-1 py-2.5 bg-primary text-black text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 transition-colors rounded-sm"
              >
                {confidenceUpdating ? 'Updating...' : 'Update Topic Confidence'}
              </button>
              <button
                onClick={() => setConfidenceUpdated(true)}
                className="px-5 py-2.5 border border-outline-variant text-white/60 text-xs font-mono uppercase tracking-widest hover:text-white rounded-sm"
              >
                Skip
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-status-aligned/10 border border-status-aligned/40 text-status-aligned text-xs font-mono rounded-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-status-aligned" />
            <span>Confidence rating calibrated successfully!</span>
          </div>
        )}

        <div className="p-4 acrylic-glass border border-white/10 rounded-sm text-xs text-white/60 font-light leading-relaxed">
          <strong>Next step:</strong> Practice accuracy trains your instincts. To officially benchmark and update your Knowledge Map confidence gap, take a timed evaluation.
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 border border-outline-variant text-xs font-mono uppercase tracking-widest text-white/80 hover:text-white hover:border-primary transition-colors rounded-sm"
          >
            Knowledge Map
          </button>
          <button
            onClick={() => navigate(`/evaluate?topic=${session.topic_id}`)}
            className="flex-1 py-3 bg-primary text-black text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 transition-colors rounded-sm flex items-center justify-center gap-1.5"
          >
            <Timer className="w-4 h-4 stroke-[2]" />
            <span>Take Timed Mock Test</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Screen 3: Active Practice Drill ───
  const currentQuestion = questions[currentIndex];

  return (
    <div className="w-full max-w-4xl mr-auto animate-fade-in space-y-6 text-left">
      {/* Telemetry status bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="text-xs font-mono uppercase tracking-widest text-white/60">
          Question <span className="text-primary font-bold">{currentIndex + 1}</span> of {questions.length}
        </div>
        <div className="text-xs font-mono uppercase tracking-widest text-white/60">
          Score: <span className="text-primary font-bold">{attempts.filter(a => a.correct).length}</span>/{attempts.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-xs font-mono rounded-r-sm">
          {error}
        </div>
      )}

      {/* Question Card with Directional Physics */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion?.id || currentIndex}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <QuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={!submitted ? setSelectedAnswer : undefined}
            showResult={submitted}
            showSolution={showSolution}
            disabled={submitted}
            questionNumber={currentIndex + 1}
          />
        </motion.div>
      </AnimatePresence>

      {/* Post-submission Mistake Selector */}
      <AnimatePresence>
        {submitted && !attempts[attempts.length - 1]?.correct && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <div className="text-xs font-mono uppercase tracking-wider text-error font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Categorize This Mistake (Metacognitive Reflection)</span>
            </div>
            <MistakeTypeSelector value={mistakeType} onChange={setMistakeType} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Controls */}
      <div className="pt-2">
        {!submitted ? (
          <motion.button
            whileHover={!selectedAnswer || loading ? {} : { scale: 1.01 }}
            whileTap={!selectedAnswer || loading ? {} : { scale: 0.98 }}
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || loading}
            className="w-full py-3.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20 cursor-pointer"
          >
            {loading ? 'Submitting...' : 'Submit & Reveal Solution'}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="w-full py-3.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 cursor-pointer"
          >
            <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'Complete Practice Session'}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
