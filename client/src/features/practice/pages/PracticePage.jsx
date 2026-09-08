import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { practiceService } from '../services/practiceService';
import { topicsService } from '@/features/topics/services/topicsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import QuestionCard from '@/features/questions/components/QuestionCard';
import MistakeTypeSelector from '@/features/questions/components/MistakeTypeSelector';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';
import CurriculumMultiPicker from '@/shared/components/CurriculumMultiPicker';
import Icon, {
  Play,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Timer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Grid,
  Check,
  X
} from '@/shared/components/Icon';

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Multi-Curriculum Setup state
  const [hierarchy, setHierarchy] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState(
    searchParams.get('topic') ? [searchParams.get('topic')] : []
  );

  // Session state (supports direct pre-loading from re-drill)
  const [session, setSession] = useState(location.state?.session || null);
  const [questions, setQuestions] = useState(location.state?.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mercer Mettl / NTA style per-question state map:
  // { [index]: { selectedAnswer, submitted, correct, correct_answer, result, mistakeType, isFlagged, timeSpent } }
  const [questionStates, setQuestionStates] = useState({});
  const [paletteOpen, setPaletteOpen] = useState(true);

  const [attempts, setAttempts] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const startTimeRef = useRef(null);

  // Post-session confidence update
  const [postSessionConfidence, setPostSessionConfidence] = useState(5);
  const [confidenceUpdated, setConfidenceUpdated] = useState(false);
  const [confidenceUpdating, setConfidenceUpdating] = useState(false);

  useEffect(() => {
    loadHierarchy();
    if (location.state?.session && location.state?.questions) {
      startTimeRef.current = Date.now();
    }
  }, []);

  const loadHierarchy = async () => {
    try {
      const tree = await topicsService.getTopics();
      setHierarchy(tree || []);

      const urlTopic = searchParams.get('topic');
      if (urlTopic && tree) {
        setSelectedTopics([urlTopic]);
        for (const s of tree) {
          for (const c of s.chapters || []) {
            if ((c.topics || []).some(t => t.id === urlTopic)) {
              setSelectedSubject(s.id || s.name);
              setSelectedChapters([c.id || c.name]);
              break;
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load curriculum hierarchy');
    }
  };

  const startPractice = async () => {
    setLoading(true);
    setError('');
    try {
      let targetTopicIds = [...selectedTopics];

      if (targetTopicIds.length === 0) {
        if (selectedChapters.length > 0) {
          for (const s of hierarchy) {
            for (const c of s.chapters || []) {
              if (selectedChapters.includes(c.id || c.name)) {
                (c.topics || []).forEach(t => {
                  if (!targetTopicIds.includes(t.id)) targetTopicIds.push(t.id);
                });
              }
            }
          }
        } else if (selectedSubject) {
          const s = hierarchy.find(subj => subj.id === selectedSubject || subj.name === selectedSubject);
          if (s) {
            for (const c of s.chapters || []) {
              (c.topics || []).forEach(t => {
                if (!targetTopicIds.includes(t.id)) targetTopicIds.push(t.id);
              });
            }
          }
        }
      }

      if (targetTopicIds.length === 0) {
        setError('Please select at least one topic or chapter to practice.');
        setLoading(false);
        return;
      }

      const result = await practiceService.startPractice(targetTopicIds, null);
      setSession(result.session);
      setQuestions(result.questions || []);
      setCurrentIndex(0);
      setQuestionStates({});
      setAttempts([]);
      startTimeRef.current = Date.now();
    } catch (err) {
      setError(err.message || 'Failed to start practice drill');
    } finally {
      setLoading(false);
    }
  };

  // Current Question accessor & per-question state helpers
  const currentQuestion = questions[currentIndex];
  const currentState = questionStates[currentIndex] || {};
  const isCurrentSubmitted = Boolean(currentState.submitted);
  const currentSelectedAnswer = currentState.selectedAnswer ?? null;
  const isCurrentFlagged = Boolean(currentState.isFlagged);
  const currentMistakeType = currentState.mistakeType ?? null;

  const handleSelectAnswer = (ans) => {
    if (isCurrentSubmitted) return;
    setQuestionStates(prev => ({
      ...prev,
      [currentIndex]: {
        ...prev[currentIndex],
        selectedAnswer: ans
      }
    }));
  };

  const handleToggleFlag = () => {
    setQuestionStates(prev => ({
      ...prev,
      [currentIndex]: {
        ...prev[currentIndex],
        isFlagged: !prev[currentIndex]?.isFlagged
      }
    }));
  };

  const handleMistakeTypeChange = (type) => {
    setQuestionStates(prev => ({
      ...prev,
      [currentIndex]: {
        ...prev[currentIndex],
        mistakeType: type
      }
    }));
  };

  const handleGoToQuestion = (targetIndex) => {
    if (targetIndex >= 0 && targetIndex < questions.length) {
      setCurrentIndex(targetIndex);
      startTimeRef.current = Date.now();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      handleGoToQuestion(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      handleGoToQuestion(currentIndex + 1);
    } else {
      completePractice();
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentSelectedAnswer || isCurrentSubmitted) return;
    setLoading(true);

    const timeSpent = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000);

    try {
      const result = await practiceService.submitPracticeAttempt(session.id, {
        question_id: currentQuestion.id,
        selected_answer: currentSelectedAnswer,
        time_spent_seconds: timeSpent,
        mistake_type: null
      });

      // Update question's correct answer for solution reveal
      currentQuestion.correct_answer = result.correct_answer;

      setQuestionStates(prev => ({
        ...prev,
        [currentIndex]: {
          ...prev[currentIndex],
          submitted: true,
          correct: result.correct,
          correct_answer: result.correct_answer,
          result,
          timeSpent
        }
      }));

      setAttempts(prev => {
        const filtered = prev.filter(a => a.question_id !== currentQuestion.id);
        return [...filtered, { ...result, question: currentQuestion }];
      });
    } catch (err) {
      setError(err.message || 'Failed to record answer');
    } finally {
      setLoading(false);
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

  // Computed question palette stats
  const paletteStats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    let incorrect = 0;
    let flagged = 0;

    questions.forEach((_, idx) => {
      const st = questionStates[idx];
      if (st?.isFlagged) flagged++;
      if (st?.submitted) {
        answered++;
        if (st.correct) correct++;
        else incorrect++;
      }
    });

    return {
      answered,
      unanswered: questions.length - answered,
      correct,
      incorrect,
      flagged
    };
  }, [questions, questionStates]);

  // ─── Screen 1: Setup & Multi-Curriculum Configuration Screen ───
  if (!session) {
    const hasSelection = selectedChapters.length > 0 || selectedTopics.length > 0 || Boolean(selectedSubject);

    return (
      <div className="w-full min-w-0 animate-fade-in space-y-6 text-left">
        <div className="border-b border-white/10 pb-5">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary font-bold">
            Training Facility &middot; Problem Drill
          </div>
          <h1 className="text-3xl md:text-5xl font-light text-white tracking-tight mt-1">
            Practice Mode
          </h1>
          <p className="text-sm md:text-base text-white/60 font-light mt-2 max-w-2xl leading-relaxed">
            Continuous self-paced drill. Select multiple chapters and topics to customize your problem set.
            Answers and full step-by-step LaTeX derivations are revealed immediately after every submission.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-error/10 border-l-4 border-error text-error text-xs font-mono rounded-r-sm">
            {error}
          </div>
        )}

        <div className="acrylic-glass p-6 md:p-8 rounded-sm border border-white/10 space-y-6 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-white/90">
              1. Choose Curriculum Scope (Multi-Select)
            </h2>
            <p className="text-xs font-light text-white/50">
              Select one or multiple chapters and specific topics. The drill pool automatically adapts to your selection.
            </p>
          </div>

          <CurriculumMultiPicker
            hierarchy={hierarchy}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
            selectedChapters={selectedChapters}
            onChaptersChange={setSelectedChapters}
            selectedTopics={selectedTopics}
            onTopicsChange={setSelectedTopics}
          />

          {/* Start Drill Action */}
          <div className="pt-2">
            <button
              onClick={startPractice}
              disabled={loading || !hasSelection}
              className="w-full py-3.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{loading ? 'Preparing Drill Pool...' : 'Start Practice Drill'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Screen 2: Session Completed Summary ───
  if (completed && summary) {
    return (
      <div className="w-full max-w-4xl mx-auto animate-fade-in space-y-6 text-left">
        <div>
          <div className="text-label-sm-mono uppercase tracking-[0.25em] text-primary text-xs">
            Drill Complete &middot; Performance Debrief
          </div>
          <h1 className="text-4xl font-extralight text-white tracking-tight mt-1">
            Practice Results
          </h1>
        </div>

        {/* Scorecard Tiles - Windows 10 Mobile Live Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="acrylic-glass p-5 rounded-sm border border-primary/40 bg-primary/10 relative overflow-hidden shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
            <div className="text-3xl sm:text-4xl font-light text-primary tracking-tight font-sans mt-1">{summary.correct}/{summary.total_questions}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-2 font-semibold">Total Score</div>
          </div>
          <div className="acrylic-glass p-5 rounded-sm border border-white/10 relative overflow-hidden shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight font-sans mt-1">{summary.accuracy}%</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-2 font-semibold">Accuracy</div>
          </div>
          <div className="acrylic-glass p-5 rounded-sm border border-white/10 relative overflow-hidden shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight font-sans mt-1">
              {Math.floor(summary.avg_time_seconds / 60)}:{String(summary.avg_time_seconds % 60).padStart(2, '0')}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-2 font-semibold">Avg Time / Q</div>
          </div>
          <div className="acrylic-glass p-5 rounded-sm border border-white/10 relative overflow-hidden shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight font-sans mt-1">{summary.total_questions}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-2 font-semibold">Total Solved</div>
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
            onClick={() => {
              setSession(null);
              setCompleted(false);
              setSummary(null);
            }}
            className="flex-1 py-3 border border-outline-variant text-xs font-mono uppercase tracking-widest text-white/80 hover:text-white hover:border-primary transition-colors rounded-sm"
          >
            New Practice Drill
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 bg-primary text-black text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 transition-colors rounded-sm flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 stroke-[2]" />
            <span>Knowledge Map</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Screen 3: Active Practice Drill (Mercer Mettl / NTA JEE Style Navigation) ───
  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in space-y-5 text-left">
      {/* ─── Top Telemetry & Controls Bar ─── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-white/60">
            Question <span className="text-primary font-bold text-sm">{currentIndex + 1}</span> of {questions.length}
          </span>
          <button
            type="button"
            onClick={() => setPaletteOpen(!paletteOpen)}
            className="px-3 py-1.5 bg-surface-container border border-white/15 hover:border-primary/50 text-white text-xs font-mono rounded-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Toggle Question Palette"
          >
            <Grid className="w-3.5 h-3.5 text-primary" />
            <span>Palette ({paletteStats.answered}/{questions.length})</span>
            {paletteOpen ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-primary/10 border border-primary/30 rounded-sm text-primary font-mono text-xs font-bold">
            Score: <span>{paletteStats.correct}</span>/{paletteStats.answered}
          </div>
          <button
            type="button"
            onClick={completePractice}
            className="px-3 py-1.5 border border-status-weak/40 text-status-weak hover:bg-status-weak hover:text-black rounded-sm text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
            title="Finish session early with current score"
          >
            Finish Drill
          </button>
        </div>
      </div>

      {/* ─── Mercer Mettl / NTA Style Question Palette Drawer ─── */}
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border border-white/10 acrylic-glass rounded-sm p-4 space-y-3.5 shadow-xl"
          >
            <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider">
              <span className="text-white/60 font-bold">Question Palette (Click to jump):</span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="w-2.5 h-2.5 rounded-xs bg-primary inline-block" />
                  <span>Current</span>
                </span>
                <span className="flex items-center gap-1.5 text-status-aligned">
                  <span className="w-2.5 h-2.5 rounded-xs bg-status-aligned/30 border border-status-aligned inline-block" />
                  <span>Correct ({paletteStats.correct})</span>
                </span>
                <span className="flex items-center gap-1.5 text-error">
                  <span className="w-2.5 h-2.5 rounded-xs bg-error/30 border border-error inline-block" />
                  <span>Incorrect ({paletteStats.incorrect})</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#FF9500]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#FF9500]/30 border border-[#FF9500] inline-block" />
                  <span>Flagged ({paletteStats.flagged})</span>
                </span>
                <span className="flex items-center gap-1.5 text-white/40">
                  <span className="w-2.5 h-2.5 rounded-xs bg-black/50 border border-white/15 inline-block" />
                  <span>Unanswered ({paletteStats.unanswered})</span>
                </span>
              </div>
            </div>

            {/* Questions Number Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 gap-1.5 pt-1">
              {questions.map((_, idx) => {
                const qNum = idx + 1;
                const st = questionStates[idx];
                const isCurrent = idx === currentIndex;
                const isSubmitted = Boolean(st?.submitted);
                const isCorrect = Boolean(st?.correct);
                const isFlagged = Boolean(st?.isFlagged);

                let cellClass = 'bg-black/40 border-white/10 text-white/50 hover:border-white/40 hover:text-white';
                if (isCurrent) {
                  cellClass = 'bg-primary text-black font-bold ring-2 ring-primary ring-offset-2 ring-offset-black shadow-md shadow-primary/30';
                } else if (isSubmitted) {
                  if (isCorrect) {
                    cellClass = 'bg-status-aligned/20 border-status-aligned text-status-aligned font-bold hover:bg-status-aligned/30';
                  } else {
                    cellClass = 'bg-error/20 border-error text-error font-bold hover:bg-error/30';
                  }
                } else if (isFlagged) {
                  cellClass = 'bg-[#FF9500]/20 border-[#FF9500] text-[#FF9500] font-bold';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleGoToQuestion(idx)}
                    className={`relative py-2 px-1 text-center font-mono text-xs rounded-sm border transition-all cursor-pointer ${cellClass}`}
                    title={`Question ${qNum}${isSubmitted ? (isCorrect ? ' (Correct)' : ' (Incorrect)') : ''}${isFlagged ? ' (Flagged for Review)' : ''}`}
                  >
                    <span>{qNum}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF9500]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((paletteStats.answered) / (questions.length || 1)) * 100}%` }}
        />
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-xs font-mono rounded-r-sm">
          {error}
        </div>
      )}

      {/* ─── Question Card with Directional Animation ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion?.id || currentIndex}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <QuestionCard
            question={currentQuestion}
            selectedAnswer={currentSelectedAnswer}
            onSelectAnswer={!isCurrentSubmitted ? handleSelectAnswer : undefined}
            showResult={isCurrentSubmitted}
            showSolution={isCurrentSubmitted}
            disabled={isCurrentSubmitted}
            questionNumber={currentIndex + 1}
            markedForReview={isCurrentFlagged}
            onMarkForReview={handleToggleFlag}
          />
        </motion.div>
      </AnimatePresence>

      {/* ─── Post-submission Mistake Reflection Selector ─── */}
      <AnimatePresence>
        {isCurrentSubmitted && !currentState.correct && (
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
            <MistakeTypeSelector value={currentMistakeType} onChange={handleMistakeTypeChange} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Mercer Mettl Navigation Controls ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
        {/* Left: Previous & Mark for Review */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2.5 bg-surface-container border border-white/15 hover:border-white/40 text-white text-xs font-mono uppercase tracking-wider rounded-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={handleToggleFlag}
            className={`px-3.5 py-2.5 border text-xs font-mono uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
              isCurrentFlagged
                ? 'bg-[#FF9500]/20 border-[#FF9500] text-[#FF9500] font-bold'
                : 'bg-surface-container border-white/15 text-white/60 hover:text-white hover:border-white/30'
            }`}
            title="Mark this question to review later"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{isCurrentFlagged ? 'Flagged' : 'Mark for Review'}</span>
          </button>
        </div>

        {/* Right: Submit Answer & Next */}
        <div className="flex items-center gap-2">
          {!isCurrentSubmitted ? (
            <motion.button
              whileHover={!currentSelectedAnswer || loading ? {} : { scale: 1.01 }}
              whileTap={!currentSelectedAnswer || loading ? {} : { scale: 0.98 }}
              onClick={handleSubmitAnswer}
              disabled={!currentSelectedAnswer || loading}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20 cursor-pointer"
            >
              {loading ? 'Submitting...' : 'Submit & Reveal'}
            </motion.button>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-surface-container border border-white/10 rounded-xs text-[11px] font-mono">
              {currentState.correct ? (
                <span className="text-status-aligned flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Correct</span>
                </span>
              ) : (
                <span className="text-error flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Solution Revealed</span>
                </span>
              )}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-surface-bright border border-white/20 hover:border-primary text-white hover:text-primary text-xs font-mono uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'Complete Drill'}</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
