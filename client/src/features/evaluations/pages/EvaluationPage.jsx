import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { evaluationsService } from '../services/evaluationsService';
import { topicsService } from '@/features/topics/services/topicsService';
import QuestionCard from '@/features/questions/components/QuestionCard';
import TopicPicker from '@/shared/components/TopicPicker';
import Timer from '@/shared/components/Timer';
import Icon, {
  Timer as TimerIcon,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Layers
} from '@/shared/components/Icon';

export default function EvaluationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Setup state
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(searchParams.get('topic') || '');
  const [questionCount, setQuestionCount] = useState(15);
  const [durationSeconds, setDurationSeconds] = useState(1800);

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
              confidence: topic.confidence
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
        durationSeconds
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
            time_spent_seconds: Math.min(timeSpent, durationSeconds)
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
  }, [answers, evaluation, questions, navigate, submitting, durationSeconds]);

  const handleTimerExpire = useCallback(() => {
    handleSubmitEvaluation();
  }, [handleSubmitEvaluation]);

  // ─── Screen 1: Evaluation Setup Screen ───
  if (!evaluation) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
        <div>
          <div className="text-label-sm-mono uppercase tracking-[0.25em] text-primary text-xs">
            Exam Simulation &middot; Timed Calibration
          </div>
          <h1 className="text-4xl md:text-5xl font-extralight text-white tracking-tight lowercase mt-1">
            mock evaluation
          </h1>
          <p className="text-body-md text-white/60 font-light mt-2">
            Simulate real exam conditions. Solutions and correct answers are withheld until submission to accurately benchmark your calibration gap.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-error/10 border-l-4 border-error text-error text-xs font-mono rounded-r-sm">
            {error}
          </div>
        )}

        <div className="acrylic-glass p-6 md:p-8 rounded-sm border border-outline-variant space-y-6">
          {/* Topic Selector with Hierarchical TopicPicker */}
          <div className="space-y-2">
            <label className="block text-label-sm-mono text-white/80 uppercase tracking-widest text-xs font-bold">
              1. Select Curriculum Topic
            </label>
            <TopicPicker
              topics={topics}
              selectedTopicId={selectedTopic}
              onSelect={setSelectedTopic}
              placeholder="Search or pick a topic for mock evaluation..."
            />
          </div>

          {/* Question count selector */}
          <div className="space-y-2">
            <label className="block text-label-sm-mono text-white/80 uppercase tracking-widest text-xs font-bold">
              2. Number of Questions
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[5, 10, 15, 20, 25, 30].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`py-2.5 rounded-sm border text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                    questionCount === n
                      ? 'bg-error text-white border-error shadow-lg shadow-error/20'
                      : 'bg-surface-dim border-outline-variant text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-2">
            <label className="block text-label-sm-mono text-white/80 uppercase tracking-widest text-xs font-bold">
              3. Time Limit
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: '15 min', val: 900 },
                { label: '30 min', val: 1800 },
                { label: '45 min', val: 2700 },
                { label: '60 min', val: 3600 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setDurationSeconds(val)}
                  className={`py-3 rounded-sm border text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                    durationSeconds === val
                      ? 'bg-error text-white border-error shadow-lg shadow-error/20'
                      : 'bg-surface-dim border-outline-variant text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Examination Protocol Notice */}
          <div className="p-4 bg-error/10 border-l-4 border-error rounded-r-sm space-y-1.5">
            <div className="text-xs font-mono uppercase tracking-wider text-error font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Examination Protocol</span>
            </div>
            <p className="text-xs text-white/70 font-light leading-relaxed">
              No solutions or hints will be displayed during the test. Your final score will benchmark your confidence-performance gap on the Knowledge Map. When time expires, your test auto-submits.
            </p>
          </div>

          {/* Start Test Button */}
          <div className="pt-2">
            <button
              onClick={startEvaluation}
              disabled={!selectedTopic || loading}
              className="w-full py-3.5 bg-error text-white text-xs font-mono font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-error/20"
            >
              <TimerIcon className="w-4 h-4 stroke-[2]" />
              <span>{loading ? 'Assembling Question Set...' : 'Begin Timed Evaluation'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Screen 2: Active Timed Examination ───
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20 space-y-6">
      {/* Sticky Exam Telemetry Bar */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-white/30 hidden sm:inline">&middot;</span>
          <span className="text-xs font-mono text-white/50 hidden sm:inline">
            {answeredCount} Answered, {unansweredCount} Left
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Timer
            durationSeconds={durationSeconds}
            onExpire={handleTimerExpire}
            onWarning={() => {}}
          />

          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="px-4 py-1.5 bg-error text-white text-xs font-mono font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-colors shadow"
          >
            Submit Test
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* Main Question Display with Directional Slide */}
        <div className="space-y-6 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion?.id || currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <QuestionCard
                question={currentQuestion}
                selectedAnswer={answers[currentQuestion?.id] || null}
                onSelectAnswer={handleSelectAnswer}
                questionNumber={currentIndex + 1}
                isMarked={markedForReview.has(currentQuestion?.id)}
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => handleNavigateQuestion(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 bg-surface-container border border-outline-variant text-white/80 hover:text-white rounded-sm text-xs font-mono uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={toggleMarkForReview}
              className={`px-4 py-2.5 border rounded-sm text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                markedForReview.has(currentQuestion?.id)
                  ? 'bg-status-weak/20 text-status-weak border-status-weak/40'
                  : 'bg-surface-dim border-outline-variant text-white/60 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{markedForReview.has(currentQuestion?.id) ? 'Marked for Review' : 'Mark for Review'}</span>
            </button>

            <button
              onClick={() => handleNavigateQuestion(Math.min(questions.length - 1, currentIndex + 1))}
              disabled={currentIndex === questions.length - 1}
              className="px-4 py-2.5 bg-primary text-black font-bold rounded-sm text-xs font-mono uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question Palette Drawer (Desktop) */}
        <div className="acrylic-glass p-5 rounded-sm border border-outline-variant space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-white/80 font-bold border-b border-white/10 pb-2">
            Question Palette
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isMarked = markedForReview.has(q.id);
              const isCurrent = idx === currentIndex;

              let btnStyle = 'bg-surface-dim border-outline-variant text-white/50 hover:text-white';
              if (isCurrent) {
                btnStyle = 'ring-2 ring-primary text-white font-bold bg-primary/20 border-primary';
              } else if (isMarked) {
                btnStyle = 'bg-status-weak/20 border-status-weak/50 text-status-weak font-bold';
              } else if (isAnswered) {
                btnStyle = 'bg-status-aligned/20 border-status-aligned/50 text-status-aligned font-bold';
              }

              return (
                <motion.button
                  key={q.id}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  onClick={() => handleNavigateQuestion(idx)}
                  className={`aspect-square rounded-sm border text-xs font-mono transition-colors flex items-center justify-center cursor-pointer ${btnStyle}`}
                >
                  {idx + 1}
                </motion.button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div className="pt-2 border-t border-white/10 space-y-1.5 text-[10px] font-mono text-white/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-status-aligned/40 border border-status-aligned"></span>
              <span>Attempted ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-status-weak/40 border border-status-weak"></span>
              <span>Marked for Review ({markedForReview.size})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-surface-dim border border-outline-variant"></span>
              <span>Unattempted ({unansweredCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Submit Dialog with Spring Pop */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowConfirmSubmit(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="bg-surface-dim border border-outline-variant p-6 rounded-sm max-w-md w-full shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-label-sm-mono text-error uppercase tracking-widest text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Submit Examination?</span>
              </div>

              <p className="text-sm text-white/80 font-light">
                Are you sure you want to finish the test? Once submitted, your score will be computed and solutions will be revealed.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 bg-surface-container rounded-sm">
                <div>
                  <span className="text-white/40">ATTEMPTED:</span>{' '}
                  <strong className="text-status-aligned">{answeredCount}</strong>
                </div>
                <div>
                  <span className="text-white/40">UNATTEMPTED:</span>{' '}
                  <strong className={unansweredCount > 0 ? 'text-error' : 'text-white'}>{unansweredCount}</strong>
                </div>
              </div>

              {unansweredCount > 0 && (
                <p className="text-[11px] text-status-weak font-mono">
                  ⚠️ In JEE, unanswered questions award zero marks.
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSubmitEvaluation}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-error text-white text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit Test'}
                </button>
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="px-5 py-2.5 border border-outline-variant text-white/70 text-xs font-mono uppercase tracking-wider rounded-sm hover:text-white cursor-pointer"
                >
                  Continue Test
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
