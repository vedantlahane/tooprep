import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicsService } from '../services/topicsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import { questionsService } from '@/features/questions/services/questionsService';
import QuickDrillModal from '@/features/practice/components/QuickDrillModal';
import QuestionEditModal from '@/features/questions/components/QuestionEditModal';
import MathText from '@/features/questions/components/MathText';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Zap,
  Play,
  Timer,
  Shield,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  Layers,
  Grid,
  Edit3,
  Sliders,
  Check,
  Sparkles,
  HelpCircle,
  Activity
} from 'lucide-react';

const CONFIDENCE_LEVELS = [
  { val: 1, label: 'Novice', desc: 'Never studied / Need complete theory' },
  { val: 2, label: 'Introductory', desc: 'Read once, unfamiliar with formulas' },
  { val: 3, label: 'Rudimentary', desc: 'Know basic definitions only' },
  { val: 4, label: 'Developing', desc: 'Can apply standard textbook formulas' },
  { val: 5, label: 'Moderate', desc: 'Comfortable with basics, struggle on speed' },
  { val: 6, label: 'Competent', desc: 'Solve JEE Main level standard questions' },
  { val: 7, label: 'Proficient', desc: 'Good accuracy and consistent speed' },
  { val: 8, label: 'Advanced', desc: 'Confident on multi-concept mixed questions' },
  { val: 9, label: 'Mastered', desc: 'High accuracy on JEE Advanced level sets' },
  { val: 10, label: 'Expert', desc: 'Top tier mastery under strict exam timing' },
];

export default function TopicDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active view tab for calibrated state: 'trajectory' | 'bank' | 'chapter'
  const [calibratedTab, setCalibratedTab] = useState('trajectory');

  // Interactive confidence state
  const [selectedConfidence, setSelectedConfidence] = useState(5);
  const [confidenceSaving, setConfidenceSaving] = useState(false);
  const [confidenceSavedNotice, setConfidenceSavedNotice] = useState(false);

  // Modals
  const [showDrill, setShowDrill] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Question bank state
  const [topicQuestions, setTopicQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [revealedSolutions, setRevealedSolutions] = useState({});

  useEffect(() => {
    loadTopic();
    loadTopicQuestions();
  }, [id]);

  const loadTopic = async () => {
    try {
      const result = await topicsService.getTopicDetail(id);
      setData(result);
      if (result.topic?.confidence) {
        setSelectedConfidence(result.topic.confidence);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTopicQuestions = async () => {
    setQuestionsLoading(true);
    try {
      let qs;
      if (profile?.is_admin) {
        qs = await questionsService.adminListQuestions({ topic_id: id });
      } else {
        qs = await questionsService.browseQuestions({ topic_id: id });
      }
      setTopicQuestions(qs || []);
    } catch (err) {
      console.warn('Could not load topic questions:', err.message);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSelectConfidence = async (ratingVal) => {
    setSelectedConfidence(ratingVal);
    setConfidenceSaving(true);
    try {
      await confidenceService.setConfidence(id, ratingVal, 'INITIAL');
      setConfidenceSavedNotice(true);
      setTimeout(() => setConfidenceSavedNotice(false), 3000);
      await loadTopic();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfidenceSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OVERCONFIDENT': return 'text-status-overconfident';
      case 'UNDERCONFIDENT': return 'text-status-underconfident';
      case 'WEAK_ALIGNED': return 'text-status-weak';
      case 'ALIGNED': return 'text-status-aligned';
      case 'PRELIMINARY': return 'text-primary';
      default: return 'text-white/60';
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'OVERCONFIDENT': return 'border-status-overconfident/40';
      case 'UNDERCONFIDENT': return 'border-status-underconfident/40';
      case 'WEAK_ALIGNED': return 'border-status-weak/40';
      case 'ALIGNED': return 'border-status-aligned/40';
      case 'PRELIMINARY': return 'border-primary/40';
      default: return 'border-white/15';
    }
  };

  const getStatusPipColor = (status) => {
    switch (status) {
      case 'OVERCONFIDENT': return 'bg-status-overconfident';
      case 'UNDERCONFIDENT': return 'bg-status-underconfident';
      case 'WEAK_ALIGNED': return 'bg-status-weak';
      case 'ALIGNED': return 'bg-status-aligned';
      case 'PRELIMINARY': return 'bg-primary';
      default: return 'bg-white/40';
    }
  };

  const getRecommendation = (status, accuracy, gap) => {
    if (status === 'OVERCONFIDENT') {
      return {
        title: 'High Negative Marking Hazard',
        text: `Your self-perceived confidence (${(data?.topic?.confidence || 0) * 10}%) exceeds your actual test accuracy (${accuracy}%). In JEE Main & Advanced, overconfidence results in costly penalty deductions on questions you assumed were safe. Do a targeted wrong-answer drill before attempting another mock test.`,
        tone: 'error'
      };
    }
    if (status === 'WEAK_ALIGNED') {
      return {
        title: 'Inconsistent Foundation',
        text: `You have realistic self-awareness (${accuracy}% accuracy), but your overall score is below the 50% safety benchmark. Focus on fundamental definitions and step-by-step formula derivations before timing yourself.`,
        tone: 'weak'
      };
    }
    if (status === 'UNDERCONFIDENT') {
      return {
        title: 'Unrecognized Subject Strength',
        text: `You scored ${accuracy}% on this topic—substantially higher than your self-rating! You have strong intuitive grasp of these concepts. Lock in your momentum with a timed evaluation under test conditions.`,
        tone: 'under'
      };
    }
    if (status === 'ALIGNED') {
      return {
        title: 'Well-Calibrated Mastery',
        text: `Excellent alignment. Your confidence and empirical test accuracy (${accuracy}%) are balanced above the 50% benchmark. Maintain this topic with an occasional mixed chapter set every few days.`,
        tone: 'aligned'
      };
    }
    if (status === 'PRELIMINARY') {
      return {
        title: 'Early Calibration Signal',
        text: `You have completed initial attempts with ${accuracy}% accuracy. Complete one full 15-question evaluation to establish your permanent diagnostic baseline.`,
        tone: 'primary'
      };
    }
    return {
      title: 'Diagnostic Baseline Required',
      text: 'No evaluation attempts recorded yet. Rate your confidence below and take a 5-minute diagnostic to establish your baseline.',
      tone: 'neutral'
    };
  };

  const filteredQuestions = useMemo(() => {
    if (!topicQuestions) return [];
    if (difficultyFilter === 'ALL') return topicQuestions;
    if (difficultyFilter === 'PYQ') return topicQuestions.filter(q => q.source_type === 'PYQ');
    return topicQuestions.filter(q => (q.difficulty || '').toLowerCase() === difficultyFilter.toLowerCase());
  }, [topicQuestions, difficultyFilter]);

  const toggleSolution = (qId) => {
    setRevealedSolutions(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3 text-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent animate-spin rounded-full" />
        <div className="text-sm font-mono text-white/60 uppercase tracking-widest">
          Loading topic calibration...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 border border-error/40 bg-error/10 text-error font-mono text-sm text-left">
        {error}
      </div>
    );
  }

  const { topic, evaluation_history, chapter_topics, prev_topic, next_topic } = data;
  const hasEvaluations = evaluation_history && evaluation_history.length > 0;
  const chronEvals = [...(evaluation_history || [])].reverse();
  const recommendation = getRecommendation(topic.status, topic.evaluation_accuracy, topic.gap);
  const diffBreakdown = topic.difficulty_breakdown || {};
  const currentConfidenceLevel = CONFIDENCE_LEVELS.find(l => l.val === selectedConfidence) || CONFIDENCE_LEVELS[4];

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-6 pb-20 text-left">
      {/* ─── Breadcrumb Navigation & Sibling Hoppers ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5 text-xs font-mono">
        <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 flex-wrap text-white/50">
          <button
            onClick={() => navigate('/')}
            className="hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          <span>&rsaquo;</span>
          <button
            onClick={() => navigate('/subjects')}
            className="hover:text-primary transition-colors uppercase tracking-wider cursor-pointer"
          >
            {topic.chapters?.subjects?.name || 'Subject'}
          </button>
          <span>&rsaquo;</span>
          <span className="text-white/70 uppercase tracking-wider">
            {topic.chapters?.name || 'Chapter'}
          </span>
          <span>&rsaquo;</span>
          <span className="text-primary font-bold uppercase tracking-wider truncate max-w-[260px]">
            {topic.name}
          </span>
        </nav>

        {/* Sequential Sibling Hop Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {prev_topic && (
            <button
              onClick={() => navigate(`/topics/${prev_topic.id}`)}
              className="px-2.5 py-1 border border-white/10 hover:border-primary text-white/70 hover:text-white text-[11px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              title={`Previous Topic: ${prev_topic.name}`}
            >
              <ArrowLeft className="w-3 h-3 text-primary" />
              <span className="hidden md:inline">Prev: {prev_topic.name}</span>
              <span className="md:hidden">Prev</span>
            </button>
          )}
          {next_topic && (
            <button
              onClick={() => navigate(`/topics/${next_topic.id}`)}
              className="px-2.5 py-1 border border-white/10 hover:border-primary text-white/70 hover:text-white text-[11px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              title={`Next Topic: ${next_topic.name}`}
            >
              <span className="hidden md:inline">Next: {next_topic.name}</span>
              <span className="md:hidden">Next</span>
              <ArrowRight className="w-3 h-3 text-primary" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Staff Admin Controls Bar ─── */}
      {profile?.is_admin && (
        <div className="border border-status-weak/40 bg-status-weak/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono relative">
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-status-weak" />
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-status-weak shrink-0" />
            <span className="text-white font-bold uppercase tracking-wider">Staff Controls:</span>
            <span className="text-white/60">Topic ID: {id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/admin/questions?topic_id=${id}`)}
              className="px-3 py-1.5 bg-status-weak text-black font-bold uppercase tracking-wider hover:brightness-110 transition-all text-[11px] cursor-pointer"
            >
              Manage in Admin Bank &rarr;
            </button>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setAdminModalOpen(true);
              }}
              className="px-3 py-1.5 bg-primary text-black font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Add Question</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Main Topic Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="text-xs font-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            {topic.chapters?.subjects?.name} &middot; {topic.chapters?.name}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extralight text-white tracking-tight">
            {topic.name}
          </h1>
          <p className="text-xs sm:text-sm text-white/50 font-mono mt-2">
            {hasEvaluations
              ? 'Longitudinal diagnostic tracking, accuracy breakdown, and question repository.'
              : 'Uncalibrated syllabus topic. Set your self-assessment and launch a diagnostic to map your knowledge baseline.'}
          </p>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDrill(true)}
            className="px-4 py-2.5 border border-status-aligned/40 bg-status-aligned/10 text-status-aligned text-xs font-mono font-bold uppercase tracking-wider hover:bg-status-aligned hover:text-black transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Quick Drill</span>
          </button>
          <button
            onClick={() => navigate(`/practice?topic=${id}`)}
            className="px-4 py-2.5 border border-primary/40 bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Practice</span>
          </button>
          <button
            onClick={() => navigate(`/evaluate?topic=${id}`)}
            className="px-4 py-2.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Mock Eval</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          STATE A: UNCALIBRATED TOPIC KICKOFF STUDIO (0 Evaluations)
          No empty boxes or "No data" placeholders! A vibrant launchpad.
         ═════════════════════════════════════════════════════════════════ */}
      {!hasEvaluations && (
        <div className="space-y-8 animate-fade-in">
          {/* STEP 1: Interactive Confidence Rating Bar */}
          <div className="border border-white/10 bg-white/[0.02] p-6 space-y-4 text-left relative">
            <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
                  STEP 01 OF 02 &middot; SELF-AWARENESS BASELINE
                </div>
                <h3 className="text-lg sm:text-xl font-light text-white mt-0.5">
                  How confident do you feel in {topic.name}?
                </h3>
              </div>
              {confidenceSavedNotice && (
                <span className="text-xs font-mono text-status-aligned flex items-center gap-1 font-bold animate-fade-in">
                  <Check className="w-3.5 h-3.5" />
                  Baseline Saved
                </span>
              )}
            </div>

            <p className="text-xs text-white/60 font-mono leading-relaxed max-w-3xl">
              TooPrep uses your self-reported rating to compute your metacognitive knowledge gap once you take a test.
              Select your current confidence on the 1–10 scale:
            </p>

            {/* 10-Level Touch Friendly Number Selector */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2">
              {CONFIDENCE_LEVELS.map(level => {
                const isSelected = selectedConfidence === level.val;
                return (
                  <button
                    key={level.val}
                    type="button"
                    onClick={() => handleSelectConfidence(level.val)}
                    disabled={confidenceSaving}
                    className={`h-14 sm:h-16 flex flex-col items-center justify-center border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-primary text-black border-primary font-bold shadow-lg shadow-primary/20 scale-[1.03]'
                        : 'border-white/10 bg-white/[0.02] text-white/80 hover:border-white/30 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl font-light font-sans">{level.val}</span>
                    <span className={`text-[8px] sm:text-[9px] font-mono uppercase tracking-tighter truncate max-w-[90%] ${
                      isSelected ? 'text-black font-semibold' : 'text-white/40'
                    }`}>
                      {level.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live Descriptor Feedback */}
            <div className="p-3.5 border border-white/10 bg-white/[0.01] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">Selected: {selectedConfidence}/10</span>
                <span className="text-white/40">&middot;</span>
                <span className="text-white/80 font-light">{currentConfidenceLevel.desc}</span>
              </div>
              <span className="text-[10px] text-white/40 hidden sm:inline">
                Click any tile above to update
              </span>
            </div>
          </div>

          {/* STEP 2: Diagnostic Launchpad (3 High-Impact Action Tiles) */}
          <div className="space-y-4">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
                  STEP 02 OF 02 &middot; EMPIRICAL ACCURACY TESTING
                </div>
                <h3 className="text-lg sm:text-xl font-light text-white mt-0.5">
                  Establish Your Performance Baseline
                </h3>
              </div>
              <span className="text-xs font-mono text-white/40 uppercase">
                {topicQuestions.length} Questions Available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option A: Quick Drill */}
              <div
                onClick={() => setShowDrill(true)}
                className="p-5 border border-status-aligned/40 bg-status-aligned/[0.03] hover:bg-status-aligned/10 transition-all cursor-pointer group text-left relative"
              >
                <span className="absolute top-3 right-3 w-2 h-2 bg-status-aligned" />
                <div className="flex items-center gap-2 text-status-aligned">
                  <Zap className="w-5 h-5" />
                  <span className="text-xs font-mono uppercase tracking-widest font-bold">FAST DIAGNOSTIC</span>
                </div>
                <h4 className="text-xl font-light text-white mt-3 group-hover:text-status-aligned transition-colors">
                  5-Question Quick Drill
                </h4>
                <p className="text-xs text-white/60 font-mono mt-2 leading-relaxed">
                  3-minute targeted calibration. 5 randomized questions to establish your baseline without exam pressure.
                </p>
                <div className="mt-6 flex items-center gap-1 text-xs font-mono text-status-aligned font-bold uppercase tracking-wider">
                  <span>Launch Quick Drill</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Option B: Timed Mock Evaluation */}
              <div
                onClick={() => navigate(`/evaluate?topic=${id}`)}
                className="p-5 border border-primary/40 bg-primary/[0.03] hover:bg-primary/10 transition-all cursor-pointer group text-left relative"
              >
                <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
                <div className="flex items-center gap-2 text-primary">
                  <Timer className="w-5 h-5" />
                  <span className="text-xs font-mono uppercase tracking-widest font-bold">OFFICIAL SIMULATION</span>
                </div>
                <h4 className="text-xl font-light text-white mt-3 group-hover:text-primary transition-colors">
                  15-Question Mock Eval
                </h4>
                <p className="text-xs text-white/60 font-mono mt-2 leading-relaxed">
                  30-minute timed exam with official JEE (+4 / -1) marking. Computes your exact Metacognitive Gap.
                </p>
                <div className="mt-6 flex items-center gap-1 text-xs font-mono text-primary font-bold uppercase tracking-wider">
                  <span>Start Mock Evaluation</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Option C: Deep Practice Set */}
              <div
                onClick={() => navigate(`/practice?topic=${id}`)}
                className="p-5 border border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer group text-left relative"
              >
                <span className="absolute top-3 right-3 w-2 h-2 bg-white/40" />
                <div className="flex items-center gap-2 text-white/70">
                  <Play className="w-5 h-5 fill-current" />
                  <span className="text-xs font-mono uppercase tracking-widest font-bold">UNTIMED SANDBOX</span>
                </div>
                <h4 className="text-xl font-light text-white mt-3 group-hover:text-primary transition-colors">
                  Guided Practice
                </h4>
                <p className="text-xs text-white/60 font-mono mt-2 leading-relaxed">
                  Untimed problem solving. Work through questions one by one with immediate step-by-step solutions.
                </p>
                <div className="mt-6 flex items-center gap-1 text-xs font-mono text-white/70 group-hover:text-white font-bold uppercase tracking-wider">
                  <span>Open Practice Set</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: In-Place Question Bank Preview (Real Content!) */}
          <div className="space-y-4 pt-4">
            <div className="border-b border-white/10 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>PREVIEW QUESTION BANK ({topicQuestions.length} QUESTIONS)</span>
                </div>
                <h3 className="text-lg sm:text-xl font-light text-white mt-0.5">
                  Explore Questions In This Topic
                </h3>
              </div>

              {/* Difficulty & PYQ Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['ALL', 'easy', 'medium', 'hard', 'PYQ'].map(diff => (
                  <button
                    key={diff}
                    onClick={() => setDifficultyFilter(diff)}
                    className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                      difficultyFilter === diff
                        ? 'bg-primary text-black font-bold'
                        : 'border border-white/15 text-white/70 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {questionsLoading ? (
              <div className="py-12 text-center text-xs font-mono text-white/50 animate-pulse">
                Loading questions from question repository...
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="py-8 text-center space-y-1 border border-white/10 bg-white/[0.01]">
                <p className="text-sm text-white/60 font-light">No questions found matching this filter.</p>
                <p className="text-xs font-mono text-white/40">Try selecting 'ALL' to view all questions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.slice(0, 6).map((q, idx) => {
                  const isRevealed = !!revealedSolutions[q.id];
                  const options = ['A', 'B', 'C', 'D'];
                  const hasSolution = !!q.solution_text || !!q.solution;

                  return (
                    <div
                      key={q.id || idx}
                      className="border border-white/10 bg-white/[0.02] p-5 space-y-4 text-left relative group hover:border-white/20 transition-colors"
                    >
                      <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary/40" />

                      {/* Question Header Badges */}
                      <div className="flex items-center justify-between gap-3 text-xs font-mono flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-bold">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] uppercase font-bold ${
                            q.difficulty === 'easy' ? 'bg-status-aligned/20 text-status-aligned' :
                            q.difficulty === 'hard' ? 'bg-status-overconfident/20 text-status-overconfident' :
                            'bg-status-weak/20 text-status-weak'
                          }`}>
                            {q.difficulty || 'medium'}
                          </span>
                          {q.source_type === 'PYQ' && (
                            <span className="px-2 py-0.5 text-[10px] bg-primary/20 text-primary font-bold uppercase">
                              JEE PYQ {q.exam_year || ''}
                            </span>
                          )}
                        </div>

                        {profile?.is_admin && (
                          <button
                            onClick={() => {
                              setEditingQuestion(q);
                              setAdminModalOpen(true);
                            }}
                            className="px-2 py-1 bg-white/5 border border-white/15 text-white/80 hover:text-primary hover:border-primary text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>

                      {/* Question Stem with LaTeX MathText */}
                      <div className="text-base text-white/95 font-light leading-relaxed">
                        <MathText text={q.question_text || q.text || ''} />
                      </div>

                      {/* Options Grid */}
                      {q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {options.map(letter => {
                            const optionText = Array.isArray(q.options)
                              ? q.options.find(o => o.id === letter)?.text
                              : (q.options?.[letter] ?? q.options?.[letter.toLowerCase()]);

                            if (!optionText) return null;
                            const isCorrect = isRevealed && q.correct_answer === letter;

                            return (
                              <div
                                key={letter}
                                className={`p-3 border text-xs font-light flex items-start gap-2.5 transition-all ${
                                  isCorrect
                                    ? 'border-status-aligned/60 bg-status-aligned/10 text-white ring-1 ring-status-aligned/40'
                                    : 'border-white/10 bg-white/[0.01] text-white/85'
                                }`}
                              >
                                <span className={`w-5 h-5 flex items-center justify-center font-mono font-bold shrink-0 text-[11px] ${
                                  isCorrect ? 'bg-status-aligned text-black' : 'bg-white/10 text-primary'
                                }`}>
                                  {letter}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <MathText text={String(optionText)} />
                                </div>
                                {isCorrect && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-status-aligned shrink-0 mt-0.5" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Solution Toggle Drawer */}
                      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button
                          onClick={() => toggleSolution(q.id)}
                          className="text-xs font-mono uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                        >
                          {isRevealed ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Hide Derivation</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Reveal Solution Derivation</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => navigate(`/practice?topic=${id}`)}
                          className="text-[11px] font-mono text-white/50 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <span>Practice in live set &rarr;</span>
                        </button>
                      </div>

                      {/* Solution Body */}
                      {isRevealed && (
                        <div className="mt-3 p-4 border border-primary/30 bg-primary/[0.03] space-y-3 animate-fade-in text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                              CORRECT OPTION: {q.correct_answer || 'Withheld until practice'}
                            </span>
                          </div>

                          {hasSolution ? (
                            <div className="text-xs sm:text-sm text-white/90 font-light leading-relaxed border-t border-white/10 pt-2">
                              <MathText text={q.solution_text || q.solution || ''} />
                            </div>
                          ) : (
                            <p className="text-xs font-mono text-white/50 border-t border-white/10 pt-2">
                              Step-by-step mathematical derivation is available after attempting this question in Practice mode.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 4: Sibling Topics in Chapter Continuum */}
          {chapter_topics && chapter_topics.length > 1 && (
            <div className="border-t border-white/10 pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/50 uppercase tracking-widest font-bold">
                  SIBLING TOPICS IN {topic.chapters?.name} ({chapter_topics.length})
                </span>
                <button
                  onClick={() => navigate(`/practice?chapter=${topic.chapter_id}`)}
                  className="text-xs font-mono text-primary hover:underline uppercase"
                >
                  Practice Entire Chapter &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {chapter_topics.map(sib => {
                  const isCurrent = sib.id === id;
                  return (
                    <div
                      key={sib.id}
                      onClick={() => {
                        if (!isCurrent) navigate(`/topics/${sib.id}`);
                      }}
                      className={`p-3 border text-left transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/[0.06] cursor-default'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/30 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-light truncate ${isCurrent ? 'text-primary font-medium' : 'text-white'}`}>
                          {sib.name}
                        </span>
                        {isCurrent ? (
                          <span className="text-[9px] font-mono text-primary uppercase font-bold">CURRENT</span>
                        ) : (
                          <ArrowRight className="w-3 h-3 text-white/40" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          STATE B: CALIBRATED TOPIC WITH EMPIRICAL DATA
          Rich, executive, widescreen-responsive telemetry hub!
         ═════════════════════════════════════════════════════════════════ */}
      {hasEvaluations && (
        <div className="space-y-6 animate-fade-in">
          {/* Executive Performance Statement Ribbon */}
          <div className={`p-6 border ${getStatusBorderColor(topic.status)} bg-white/[0.02] relative text-left`}>
            <span className={`absolute top-3 right-3 w-2 h-2 ${getStatusPipColor(topic.status)}`} />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                    CALIBRATION STATUS:
                  </span>
                  <span className={`text-xs font-mono uppercase font-bold ${getStatusColor(topic.status)}`}>
                    {topic.status?.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-light text-white mt-1">
                  {recommendation.title}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 font-mono mt-2 leading-relaxed max-w-4xl">
                  {recommendation.text}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-6">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  LATEST EVAL ACCURACY
                </div>
                <div className={`text-4xl sm:text-5xl font-extralight font-mono ${getStatusColor(topic.status)}`}>
                  {topic.evaluation_accuracy}%
                </div>
                <div className="text-[10px] font-mono text-white/50 mt-1">
                  {topic.gap !== null ? (topic.gap >= 0 ? `+${topic.gap}% Underconfident` : `${topic.gap}% Overconfident`) : 'Aligned'}
                </div>
              </div>
            </div>
          </div>

          {/* Pivot Tabs Navigation */}
          <nav aria-label="Topic Tabs" className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-white/10 pb-0.5 text-xs font-mono select-none">
            <button
              type="button"
              onClick={() => setCalibratedTab('trajectory')}
              className={`px-4 py-2.5 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                calibratedTab === 'trajectory'
                  ? 'text-primary font-bold border-b-2 border-primary -mb-[1px] bg-primary/10'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>DIAGNOSTIC TRAJECTORY</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-white/70">
                {evaluation_history.length} evals
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCalibratedTab('bank')}
              className={`px-4 py-2.5 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                calibratedTab === 'bank'
                  ? 'text-primary font-bold border-b-2 border-primary -mb-[1px] bg-primary/10'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>QUESTION BANK</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-white/70">
                {topicQuestions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCalibratedTab('chapter')}
              className={`px-4 py-2.5 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                calibratedTab === 'chapter'
                  ? 'text-primary font-bold border-b-2 border-primary -mb-[1px] bg-primary/10'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>CHAPTER SIBLINGS</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-white/70">
                {chapter_topics?.length || 0}
              </span>
            </button>
          </nav>

          {/* Dual-Pane Responsive Continuum Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Pane (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-6 text-left">
              {/* TAB 1: TRAJECTORY & HISTORY */}
              {calibratedTab === 'trajectory' && (
                <div className="space-y-6 animate-fade-in">
                  {/* SVG Accuracy Progression Sparkline */}
                  <div className="border border-white/10 bg-white/[0.01] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-primary flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        LONGITUDINAL ACCURACY PROGRESSION
                      </h3>
                      <span className="text-[10px] font-mono text-white/40 uppercase">
                        {chronEvals.length} EVALUATIONS RECORDED
                      </span>
                    </div>

                    <div className="py-2">
                      <svg viewBox="0 0 420 100" className="w-full h-32 overflow-visible">
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map(y => (
                          <g key={y}>
                            <line
                              x1="0"
                              y1={95 - y * 0.85}
                              x2="420"
                              y2={95 - y * 0.85}
                              stroke={y === 75 ? 'rgba(0, 210, 255, 0.25)' : 'rgba(255,255,255,0.06)'}
                              strokeWidth={y === 75 ? '1' : '1'}
                              strokeDasharray={y === 75 ? '4,4' : undefined}
                            />
                            <text x="5" y={92 - y * 0.85} fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="'Segoe UI', monospace">
                              {y}%
                            </text>
                          </g>
                        ))}

                        <defs>
                          <linearGradient id="evalGradProg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#00D2FF" stopOpacity="0" />
                          </linearGradient>
                        </defs>

                        {(() => {
                          const pts = chronEvals.map((ev, i) => ({
                            x: chronEvals.length === 1 ? 210 : (i / (chronEvals.length - 1)) * 390 + 20,
                            y: 95 - ((ev.accuracy || 0) * 0.85),
                            accuracy: ev.accuracy || 0,
                            id: ev.id
                          }));
                          const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                          const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},95 L${pts[0].x.toFixed(1)},95 Z`;

                          return (
                            <>
                              {chronEvals.length > 1 && <path d={areaPath} fill="url(#evalGradProg)" />}
                              {chronEvals.length > 1 && (
                                <path d={linePath} stroke="#00D2FF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              )}
                              {pts.map((p, i) => (
                                <g key={i} className="cursor-pointer" onClick={() => navigate(`/results/${p.id}`)}>
                                  <circle cx={p.x} cy={p.y} r="4.5" fill="#00D2FF" stroke="#000000" strokeWidth="2" />
                                  <text x={p.x} y={Math.max(12, p.y - 8)} textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" fontFamily="'Segoe UI', monospace">
                                    {p.accuracy}%
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                      <div className="flex justify-between text-[10px] font-mono text-white/40 mt-2 px-1">
                        <span>First: {chronEvals[0]?.accuracy}%</span>
                        <span className="text-primary font-bold">Latest: {chronEvals[chronEvals.length - 1]?.accuracy}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 3-Point Calibration Matrix & Difficulty Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Accuracy by Difficulty Tier */}
                    <div className="border border-white/10 bg-white/[0.01] p-5 space-y-3">
                      <div className="text-xs font-mono text-white/50 uppercase tracking-widest font-bold">
                        ACCURACY BY DIFFICULTY TIER
                      </div>
                      {['easy', 'medium', 'hard'].map(diff => {
                        const stats = diffBreakdown[diff] || { total: 0, correct: 0, accuracy: null };
                        const barColor = diff === 'easy' ? 'bg-status-aligned' : diff === 'medium' ? 'bg-status-weak' : 'bg-status-overconfident';
                        return (
                          <div key={diff} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="uppercase text-white/70">{diff}</span>
                              <span className="text-white font-bold">
                                {stats.accuracy !== null ? `${stats.accuracy}%` : '—'}
                                <span className="text-white/40 font-normal ml-1">({stats.correct}/{stats.total})</span>
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${barColor}`}
                                style={{ width: `${stats.accuracy || 0}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pacing Telemetry */}
                    <div className="border border-white/10 bg-white/[0.01] p-5 space-y-3">
                      <div className="text-xs font-mono text-white/50 uppercase tracking-widest font-bold">
                        SPEED &amp; TIME MANAGEMENT
                      </div>
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-white/60">Avg Time / Question:</span>
                          <span className="text-white font-bold text-base">
                            {topic.avg_time_seconds !== null ? `${topic.avg_time_seconds}s` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-white/60">JEE Benchmark Rate:</span>
                          <span className="text-primary font-bold text-base">120s</span>
                        </div>
                        <div className="p-3 border border-white/10 bg-white/[0.02] text-[11px] font-mono text-white/70 leading-relaxed">
                          {topic.avg_time_seconds !== null ? (
                            topic.avg_time_seconds <= 120 ? (
                              <span className="text-status-aligned font-bold">Pacing is within optimal JEE parameters (&le; 120s/Q).</span>
                            ) : (
                              <span className="text-status-weak font-bold">Pacing is slower than ideal JEE rate (&gt; 120s/Q). Use speed drills.</span>
                            )
                          ) : (
                            <span>Take a timed evaluation to capture pacing benchmarks.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Attempts Archive Table */}
                  <div className="border border-white/10 bg-white/[0.01] p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-white/70">
                        EVALUATION ATTEMPTS ARCHIVE
                      </h3>
                      <span className="text-[10px] font-mono text-white/40 uppercase">Click row to review errors</span>
                    </div>

                    <div className="space-y-1">
                      {evaluation_history.map((ev, i) => (
                        <div
                          key={ev.id || i}
                          onClick={() => navigate(`/results/${ev.id}`)}
                          className="flex items-center justify-between p-3.5 border-b border-white/10 hover:border-primary/50 cursor-pointer transition-colors group text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`text-2xl font-light font-mono w-16 ${
                              ev.accuracy >= 70 ? 'text-status-aligned' : ev.accuracy >= 40 ? 'text-status-weak' : 'text-error'
                            }`}>
                              {ev.accuracy}%
                            </div>
                            <div>
                              <div className="text-sm font-light text-white group-hover:text-primary transition-colors">
                                {ev.correct_count}/{ev.total_questions} Solved Correctly
                              </div>
                              {ev.pyq_accuracy !== null && (
                                <div className="text-[10px] font-mono text-white/50">
                                  PYQ Accuracy: {ev.pyq_accuracy}%
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-white/40 uppercase">{formatDate(ev.started_at)}</span>
                            <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* In-Place Recalibration Slider */}
                  <div className="border border-white/10 bg-white/[0.02] p-5 space-y-4 relative">
                    <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-mono uppercase tracking-widest text-white font-bold flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-primary" />
                          UPDATE CONFIDENCE RATING
                        </h3>
                        <p className="text-xs text-white/60 font-mono mt-0.5">
                          Adjust your self-perceived ability as you revise.
                        </p>
                      </div>
                      {confidenceSavedNotice && (
                        <span className="text-xs font-mono text-status-aligned flex items-center gap-1 font-bold animate-fade-in">
                          <Check className="w-3.5 h-3.5" />
                          Updated
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                      {CONFIDENCE_LEVELS.map(level => {
                        const isSelected = selectedConfidence === level.val;
                        return (
                          <button
                            key={level.val}
                            type="button"
                            onClick={() => handleSelectConfidence(level.val)}
                            className={`h-12 flex flex-col items-center justify-center border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary text-black border-primary font-bold shadow-md shadow-primary/20'
                                : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/30'
                            }`}
                          >
                            <span className="text-lg font-light">{level.val}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: QUESTION BANK */}
              {calibratedTab === 'bank' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border border-white/10 bg-white/[0.01] p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div>
                        <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-primary flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          TOPIC QUESTION REPOSITORY
                        </h3>
                        <p className="text-xs text-white/50 font-mono mt-0.5">
                          Preview question stems, test options, and step-by-step mathematical derivations.
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['ALL', 'easy', 'medium', 'hard', 'PYQ'].map(diff => (
                          <button
                            key={diff}
                            onClick={() => setDifficultyFilter(diff)}
                            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                              difficultyFilter === diff
                                ? 'bg-primary text-black font-bold'
                                : 'border border-white/15 text-white/70 hover:text-white hover:border-white/30'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {filteredQuestions.map((q, idx) => {
                        const isRevealed = !!revealedSolutions[q.id];
                        const options = ['A', 'B', 'C', 'D'];
                        const hasSolution = !!q.solution_text || !!q.solution;

                        return (
                          <div
                            key={q.id || idx}
                            className="border border-white/10 bg-white/[0.02] p-5 space-y-4 text-left relative group hover:border-white/20 transition-colors"
                          >
                            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary/40" />

                            <div className="flex items-center justify-between gap-3 text-xs font-mono flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-primary font-bold">
                                  #{String(idx + 1).padStart(2, '0')}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold ${
                                  q.difficulty === 'easy' ? 'bg-status-aligned/20 text-status-aligned' :
                                  q.difficulty === 'hard' ? 'bg-status-overconfident/20 text-status-overconfident' :
                                  'bg-status-weak/20 text-status-weak'
                                }`}>
                                  {q.difficulty || 'medium'}
                                </span>
                                {q.source_type === 'PYQ' && (
                                  <span className="px-2 py-0.5 text-[10px] bg-primary/20 text-primary font-bold uppercase">
                                    JEE PYQ {q.exam_year || ''}
                                  </span>
                                )}
                              </div>

                              {profile?.is_admin && (
                                <button
                                  onClick={() => {
                                    setEditingQuestion(q);
                                    setAdminModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-white/5 border border-white/15 text-white/80 hover:text-primary hover:border-primary text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>

                            <div className="text-base text-white/95 font-light leading-relaxed">
                              <MathText text={q.question_text || q.text || ''} />
                            </div>

                            {q.options && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {options.map(letter => {
                                  const optionText = Array.isArray(q.options)
                                    ? q.options.find(o => o.id === letter)?.text
                                    : (q.options?.[letter] ?? q.options?.[letter.toLowerCase()]);

                                  if (!optionText) return null;
                                  const isCorrect = isRevealed && q.correct_answer === letter;

                                  return (
                                    <div
                                      key={letter}
                                      className={`p-3 border text-xs font-light flex items-start gap-2.5 transition-all ${
                                        isCorrect
                                          ? 'border-status-aligned/60 bg-status-aligned/10 text-white ring-1 ring-status-aligned/40'
                                          : 'border-white/10 bg-white/[0.01] text-white/85'
                                      }`}
                                    >
                                      <span className={`w-5 h-5 flex items-center justify-center font-mono font-bold shrink-0 text-[11px] ${
                                        isCorrect ? 'bg-status-aligned text-black' : 'bg-white/10 text-primary'
                                      }`}>
                                        {letter}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <MathText text={String(optionText)} />
                                      </div>
                                      {isCorrect && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-status-aligned shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <button
                                onClick={() => toggleSolution(q.id)}
                                className="text-xs font-mono uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                              >
                                {isRevealed ? (
                                  <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    <span>Hide Derivation</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    <span>Reveal Solution Derivation</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => navigate(`/practice?topic=${id}`)}
                                className="text-[11px] font-mono text-white/50 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                              >
                                <span>Practice in live set &rarr;</span>
                              </button>
                            </div>

                            {isRevealed && (
                              <div className="mt-3 p-4 border border-primary/30 bg-primary/[0.03] space-y-3 animate-fade-in text-left">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                                    CORRECT OPTION: {q.correct_answer || 'Withheld until practice'}
                                  </span>
                                </div>

                                {hasSolution ? (
                                  <div className="text-xs sm:text-sm text-white/90 font-light leading-relaxed border-t border-white/10 pt-2">
                                    <MathText text={q.solution_text || q.solution || ''} />
                                  </div>
                                ) : (
                                  <p className="text-xs font-mono text-white/50 border-t border-white/10 pt-2">
                                    Step-by-step mathematical derivation is available after attempting this question in Practice mode.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CHAPTER SIBLINGS */}
              {calibratedTab === 'chapter' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border border-white/10 bg-white/[0.01] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <div className="text-[10px] font-mono text-primary uppercase tracking-widest font-bold">
                          CHAPTER TOPICS IN {topic.chapters?.name}
                        </div>
                        <h3 className="text-lg font-light text-white mt-0.5">
                          {chapter_topics?.length || 0} Syllabus Topics
                        </h3>
                      </div>
                      <button
                        onClick={() => navigate(`/practice?chapter=${topic.chapter_id}`)}
                        className="px-3 py-1.5 border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-black text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Practice Chapter</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {chapter_topics && chapter_topics.map((sib, idx) => {
                        const isCurrent = sib.id === id;
                        return (
                          <div
                            key={sib.id}
                            onClick={() => {
                              if (!isCurrent) navigate(`/topics/${sib.id}`);
                            }}
                            className={`p-4 border transition-all flex items-center justify-between gap-4 text-left ${
                              isCurrent
                                ? 'border-primary bg-primary/[0.06] cursor-default'
                                : 'border-white/10 bg-white/[0.02] hover:border-white/30 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-mono text-white/40 w-6 shrink-0">
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <div className="min-w-0">
                                <div className={`text-sm font-light truncate ${isCurrent ? 'text-primary font-medium' : 'text-white'}`}>
                                  {sib.name}
                                </div>
                                <div className="text-[10px] font-mono text-white/40 mt-0.5">
                                  {isCurrent ? '● Active viewing topic' : 'Click to inspect diagnostic metrics'}
                                </div>
                              </div>
                            </div>

                            <div>
                              {isCurrent ? (
                                <span className="px-2.5 py-1 bg-primary text-black text-[10px] font-mono uppercase font-bold tracking-wider">
                                  Current
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 border border-white/15 text-white/70 hover:text-white text-[10px] font-mono uppercase tracking-wider flex items-center gap-1">
                                  <span>View</span>
                                  <ArrowRight className="w-3 h-3 text-primary" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Pane: Persistent Responsive Widescreen Sticky Cockpit (lg:col-span-4) */}
            <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-6 text-left">
              {/* 4 Live KPI Tiles without Thick Borders */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-white/50 uppercase tracking-widest font-bold">
                  DIAGNOSTIC TELEMETRY COCKPIT
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Tile 1: Confidence */}
                  <div className="p-4 border border-primary/40 bg-primary/10 relative overflow-hidden text-left">
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary" />
                    <div className="text-3xl font-light text-primary font-mono mt-0.5">
                      {topic.confidence ? `${topic.confidence}/10` : '—'}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">
                      CONFIDENCE
                    </div>
                  </div>

                  {/* Tile 2: Eval Accuracy */}
                  <div className="p-4 border border-white/15 bg-white/[0.02] relative overflow-hidden text-left">
                    <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 ${getStatusPipColor(topic.status)}`} />
                    <div className="text-3xl font-light text-white font-mono mt-0.5">
                      {topic.evaluation_accuracy !== null ? `${topic.evaluation_accuracy}%` : '—'}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">
                      EVAL ACCURACY
                    </div>
                  </div>

                  {/* Tile 3: Performance Gap */}
                  <div className="p-4 border border-white/15 bg-white/[0.02] relative overflow-hidden text-left">
                    <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 ${getStatusPipColor(topic.status)}`} />
                    <div className={`text-3xl font-light font-mono mt-0.5 ${getStatusColor(topic.status)}`}>
                      {topic.gap !== null ? (topic.gap >= 0 ? `+${topic.gap}%` : `${topic.gap}%`) : '—'}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">
                      PERFORMANCE GAP
                    </div>
                  </div>

                  {/* Tile 4: Calibration Status */}
                  <div className="p-4 border border-white/15 bg-white/[0.02] relative overflow-hidden text-left">
                    <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 ${getStatusPipColor(topic.status)}`} />
                    <div className={`text-sm font-light uppercase tracking-wider mt-1.5 ${getStatusColor(topic.status)} font-mono font-bold truncate`}>
                      {topic.status?.replace('_', ' ')}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-1 font-semibold">
                      CALIBRATION
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-white/50 uppercase tracking-widest font-bold">
                  LAUNCH WORKFLOW
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDrill(true)}
                    className="flex-1 py-3 border border-status-aligned/40 bg-status-aligned/10 text-status-aligned text-xs font-mono font-bold uppercase tracking-wider hover:bg-status-aligned hover:text-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Quick Drill</span>
                  </button>
                  <button
                    onClick={() => navigate(`/practice?topic=${id}`)}
                    className="flex-1 py-3 border border-primary/40 bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Practice</span>
                  </button>
                  <button
                    onClick={() => navigate(`/evaluate?topic=${id}`)}
                    className="flex-1 py-3 bg-primary text-black text-xs font-mono font-bold uppercase tracking-wider hover:brightness-110 shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>Mock Eval</span>
                  </button>
                </div>
              </div>

              {/* Engagement Telemetry */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-mono text-white/50 uppercase tracking-widest font-bold">
                  ENGAGEMENT TELEMETRY
                </div>
                <div className="space-y-2 border border-white/10 bg-white/[0.01] p-3">
                  <div className="p-2.5 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-white/60 uppercase">Questions Attempted</span>
                    <span className="text-white font-bold text-base font-sans">{topic.questions_attempted || 0}</span>
                  </div>
                  <div className="p-2.5 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-white/60 uppercase">JEE PYQ Accuracy</span>
                    <span className={`text-base font-sans font-bold ${
                      topic.pyq_accuracy !== null && topic.pyq_accuracy >= 70 ? 'text-status-aligned' :
                      topic.pyq_accuracy !== null && topic.pyq_accuracy >= 40 ? 'text-status-weak' : 'text-white/50'
                    }`}>
                      {topic.pyq_accuracy !== null ? `${topic.pyq_accuracy}%` : '—'}
                    </span>
                  </div>
                  <div className="p-2.5 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-white/60 uppercase">Available Questions</span>
                    <span className="text-primary font-bold text-base font-sans">
                      {topicQuestions?.length || topic.question_count || 0}
                    </span>
                  </div>
                  <div className="p-2.5 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-white/60 uppercase">Chapter Siblings</span>
                    <span className="text-white font-bold text-base font-sans">{chapter_topics?.length || 0}</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs font-mono">
                    <span className="text-white/60 uppercase">Last Activity</span>
                    <span className="text-white/80">{formatDate(topic.last_practiced_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Drill Modal */}
      <QuickDrillModal
        topicId={id}
        topicName={topic.name}
        isOpen={showDrill}
        onClose={() => setShowDrill(false)}
        onComplete={() => {
          loadTopic();
          loadTopicQuestions();
        }}
      />

      {/* Admin Question Composer Modal */}
      {profile?.is_admin && (
        <QuestionEditModal
          isOpen={adminModalOpen}
          question={editingQuestion}
          initialTopicId={id}
          onClose={() => {
            setAdminModalOpen(false);
            setEditingQuestion(null);
          }}
          onSaved={() => {
            loadTopic();
            loadTopicQuestions();
          }}
        />
      )}
    </div>
  );
}
