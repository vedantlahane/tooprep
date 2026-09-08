import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicsService } from '../services/topicsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import { questionsService } from '@/features/questions/services/questionsService';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';
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
  Check
} from 'lucide-react';

export default function TopicDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Lumia Pivot tab: 'overview' | 'trajectory' | 'chapter' | 'bank'
  const [activePivot, setActivePivot] = useState('overview');

  // In-place confidence calibration state
  const [showConfidenceInput, setShowConfidenceInput] = useState(false);
  const [newConfidence, setNewConfidence] = useState(5);
  const [confidenceLoading, setConfidenceLoading] = useState(false);
  const [confidenceSavedNotice, setConfidenceSavedNotice] = useState(false);

  // Modals
  const [showDrill, setShowDrill] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Question bank preview state
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
        setNewConfidence(result.topic.confidence);
      } else {
        setShowConfidenceInput(true);
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

  const handleSetConfidence = async () => {
    setConfidenceLoading(true);
    try {
      await confidenceService.setConfidence(id, newConfidence, 'INITIAL');
      setConfidenceSavedNotice(true);
      setTimeout(() => setConfidenceSavedNotice(false), 3000);
      await loadTopic();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfidenceLoading(false);
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
      default: return 'text-white/60';
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'OVERCONFIDENT': return 'border-status-overconfident/40';
      case 'UNDERCONFIDENT': return 'border-status-underconfident/40';
      case 'WEAK_ALIGNED': return 'border-status-weak/40';
      case 'ALIGNED': return 'border-status-aligned/40';
      default: return 'border-white/15';
    }
  };

  const getStatusPipColor = (status) => {
    switch (status) {
      case 'OVERCONFIDENT': return 'bg-status-overconfident';
      case 'UNDERCONFIDENT': return 'bg-status-underconfident';
      case 'WEAK_ALIGNED': return 'bg-status-weak';
      case 'ALIGNED': return 'bg-status-aligned';
      default: return 'bg-white/40';
    }
  };

  const getRecommendation = (status) => {
    if (status === 'OVERCONFIDENT') {
      return {
        title: 'High Negative-Marking Hazard',
        text: 'Your self-perceived confidence significantly exceeds your empirical accuracy. In JEE Main & Advanced, overconfidence leads to penalty deductions. Run targeted drills on the wrong answers before taking your next timed evaluation.',
        tone: 'error'
      };
    }
    if (status === 'WEAK_ALIGNED') {
      return {
        title: 'Inconsistent Foundation',
        text: 'Your accuracy matches your self-awareness, but overall mastery is below the 50% safety benchmark. Review foundational theory and work through medium-difficulty derivations step by step.',
        tone: 'weak'
      };
    }
    if (status === 'UNDERCONFIDENT') {
      return {
        title: 'Unrecognized Subject Strength',
        text: 'Your empirical evaluation score is substantially higher than your self-rating. You understand this topic well—take one timed exam to confirm your pacing and lock in this score.',
        tone: 'under'
      };
    }
    if (status === 'ALIGNED') {
      return {
        title: 'Well-Calibrated Mastery',
        text: 'Your confidence and empirical test accuracy are in healthy alignment above 50%. Keep this topic in active maintenance mode with an occasional mixed-chapter drill.',
        tone: 'aligned'
      };
    }
    if (status === 'PRELIMINARY') {
      return {
        title: 'Early Calibration Signal',
        text: 'Between 5 and 9 questions attempted. Your preliminary accuracy is being monitored—complete a 15-question evaluation to solidify your diagnostic status.',
        tone: 'primary'
      };
    }
    return {
      title: 'Diagnostic Baseline Required',
      text: 'Insufficient empirical evidence recorded yet. Start with a 5-question Quick Drill, then take a timed Mock Evaluation to compute your metacognitive knowledge gap.',
      tone: 'neutral'
    };
  };

  const filteredQuestions = useMemo(() => {
    if (!topicQuestions) return [];
    if (difficultyFilter === 'ALL') return topicQuestions;
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
      <div className="flex items-center justify-center py-24">
        <div className="text-2xl font-light text-primary font-mono animate-pulse">loading topic diagnostics...</div>
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
  const chronEvals = [...(evaluation_history || [])].reverse();
  const recommendation = getRecommendation(topic.status);
  const diffBreakdown = topic.difficulty_breakdown || {};

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-6 pb-20 text-left">
      {/* Top Breadcrumb Trail & Sibling Steppers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 text-xs font-mono">
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
          <span className="text-primary font-bold uppercase tracking-wider truncate max-w-[240px]">
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

      {/* Staff Admin Controls Bar */}
      {profile?.is_admin && (
        <div className="border border-status-weak/40 bg-status-weak/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono relative">
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-status-weak" />
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

      {/* Topic Title Header */}
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
            Metacognitive calibration, empirical accuracy telemetry, and question bank.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDrill(true)}
            className="px-3.5 py-2 border border-status-aligned/40 bg-status-aligned/10 text-status-aligned text-xs font-mono font-bold uppercase tracking-wider hover:bg-status-aligned hover:text-black transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Quick Drill</span>
          </button>
          <button
            onClick={() => navigate(`/practice?topic=${id}`)}
            className="px-3.5 py-2 border border-primary/40 bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Practice</span>
          </button>
          <button
            onClick={() => navigate(`/evaluate?topic=${id}`)}
            className="px-3.5 py-2 bg-primary text-black text-xs font-mono font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Mock Eval</span>
          </button>
        </div>
      </div>

      {/* Lumia Pivot Navigation Bar */}
      <nav aria-label="Topic Views" className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-white/10 pb-0.5 text-xs font-mono select-none">
        <button
          type="button"
          onClick={() => setActivePivot('overview')}
          className={`px-4 py-2.5 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activePivot === 'overview'
              ? 'text-primary font-bold border-b-2 border-primary -mb-[1px] bg-primary/10'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>OVERVIEW</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePivot('trajectory')}
          className={`px-4 py-2.5 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activePivot === 'trajectory'
              ? 'text-primary font-bold border-b-2 border-primary -mb-[1px] bg-primary/10'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>ACCURACY &amp; HISTORY</span>
          {evaluation_history?.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-white/70">
              {evaluation_history.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActivePivot('chapter')}
          className={`px-4 py-2.5 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activePivot === 'chapter'
              ? 'text-primary font-bold border-b-2 border-primary -mb-[1px] bg-primary/10'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>CHAPTER TOPICS</span>
          {chapter_topics?.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-white/70">
              {chapter_topics.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActivePivot('bank')}
          className={`px-4 py-2.5 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activePivot === 'bank'
              ? 'text-primary font-bold border-b-2 border-primary -mb-[1px] bg-primary/10'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>QUESTION BANK</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-white/70">
            {topicQuestions?.length || topic.question_count || 0}
          </span>
        </button>
      </nav>

      {/* Main Dual-Pane Responsive Continuum Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Pane: Active Pivot Content (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6 text-left">
          {/* ══════════ PIVOT 1: OVERVIEW ══════════ */}
          {activePivot === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Metacognitive Recommendation Card */}
              <div className={`p-5 border ${getStatusBorderColor(topic.status)} bg-white/[0.02] relative text-left`}>
                <span className={`absolute top-3 right-3 w-2 h-2 ${getStatusPipColor(topic.status)}`} />
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                      RECOMMENDATION PROTOCOL:
                    </span>
                    <span className="text-xs font-mono text-white/80 font-bold">
                      {recommendation.title}
                    </span>
                  </div>
                  <span className={`text-xs font-mono uppercase tracking-widest font-bold ${getStatusColor(topic.status)}`}>
                    {topic.status?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-white/90 font-light leading-relaxed max-w-3xl">
                  {recommendation.text}
                </p>
              </div>

              {/* 3-Point Calibration Matrix */}
              <div className="border border-white/10 bg-white/[0.01] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-primary flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    3-POINT CALIBRATION ALIGNMENT MATRIX
                  </h3>
                  <span className="text-[10px] font-mono text-white/40 uppercase">
                    Perceived vs Empirical vs Target
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Point 1: Perceived Confidence */}
                  <div className="p-4 border border-white/10 bg-white/[0.02] relative">
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary" />
                    <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest font-semibold">
                      PERCEIVED CONFIDENCE
                    </div>
                    <div className="text-3xl font-light text-primary font-mono mt-1">
                      {topic.confidence ? `${(topic.confidence * 10)}%` : '—'}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">
                      Rating: {topic.confidence ? `${topic.confidence}/10` : 'Unrated'}
                    </div>
                  </div>

                  {/* Point 2: Empirical Accuracy */}
                  <div className="p-4 border border-white/10 bg-white/[0.02] relative">
                    <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 ${getStatusPipColor(topic.status)}`} />
                    <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest font-semibold">
                      EMPIRICAL ACCURACY
                    </div>
                    <div className={`text-3xl font-light font-mono mt-1 ${getStatusColor(topic.status)}`}>
                      {topic.evaluation_accuracy !== null ? `${topic.evaluation_accuracy}%` : '—'}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">
                      {topic.evaluation_accuracy !== null ? 'From timed evaluations' : 'No eval recorded'}
                    </div>
                  </div>

                  {/* Point 3: JEE Benchmark Target */}
                  <div className="p-4 border border-white/10 bg-white/[0.02] relative">
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-status-aligned" />
                    <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest font-semibold">
                      JEE TARGET BENCHMARK
                    </div>
                    <div className="text-3xl font-light text-status-aligned font-mono mt-1">
                      75%
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">
                      Top 1% qualification goal
                    </div>
                  </div>
                </div>

                {/* Metacognitive Gap Analysis Bar */}
                {topic.gap !== null && (
                  <div className="p-4 border border-white/10 bg-white/[0.02] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/60 uppercase">Metacognitive Divergence:</span>
                      <span className={`font-bold ${getStatusColor(topic.status)}`}>
                        {topic.gap >= 0 ? `+${topic.gap}% Underconfident` : `${topic.gap}% Overconfident`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 relative overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          topic.gap < -20 ? 'bg-status-overconfident' :
                          topic.gap > 20 ? 'bg-status-underconfident' :
                          'bg-status-aligned'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.abs(topic.gap) * 2)}%`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-white/40 pt-1">
                      <span>0% Balanced Alignment</span>
                      <span>&plusmn;20% Hazard Boundary</span>
                    </div>
                  </div>
                )}
              </div>

              {/* In-situ Confidence Recalibration Slider */}
              <div className="border border-white/10 bg-white/[0.02] p-5 space-y-4 relative">
                <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-mono uppercase tracking-widest text-white font-bold flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-primary" />
                      RECALIBRATE CONFIDENCE RATING
                    </h3>
                    <p className="text-xs text-white/60 font-mono mt-0.5">
                      Update your subjective calibration after study or revision.
                    </p>
                  </div>
                  {confidenceSavedNotice && (
                    <span className="text-xs font-mono text-status-aligned flex items-center gap-1 font-bold animate-fade-in">
                      <Check className="w-3.5 h-3.5" />
                      Saved
                    </span>
                  )}
                </div>

                <ConfidenceSlider value={newConfidence} onChange={setNewConfidence} />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleSetConfidence}
                    disabled={confidenceLoading}
                    className="px-6 py-2.5 bg-primary text-black text-xs font-mono font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-primary/20"
                  >
                    {confidenceLoading ? 'Saving...' : 'Save New Rating'}
                  </button>
                </div>
              </div>

              {/* Quick Launchpad Strip */}
              <div className="border border-white/10 bg-white/[0.01] p-5 space-y-3">
                <div className="text-xs font-mono text-white/50 uppercase tracking-widest font-bold">
                  RECOMMENDED NEXT ACTIONS
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setShowDrill(true)}
                    className="p-4 border border-status-aligned/40 bg-status-aligned/5 hover:bg-status-aligned/15 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <Zap className="w-4 h-4 text-status-aligned" />
                      <ArrowRight className="w-3.5 h-3.5 text-status-aligned opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-sm font-light text-white mt-2">Quick Drill</div>
                    <div className="text-[11px] font-mono text-white/50 mt-0.5">5 rapid-fire questions</div>
                  </button>

                  <button
                    onClick={() => navigate(`/practice?topic=${id}`)}
                    className="p-4 border border-primary/40 bg-primary/5 hover:bg-primary/15 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <Play className="w-4 h-4 text-primary fill-current" />
                      <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-sm font-light text-white mt-2">Deep Practice</div>
                    <div className="text-[11px] font-mono text-white/50 mt-0.5">Untimed with live solutions</div>
                  </button>

                  <button
                    onClick={() => navigate(`/evaluate?topic=${id}`)}
                    className="p-4 border border-white/15 bg-white/[0.02] hover:border-primary/50 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <Timer className="w-4 h-4 text-white" />
                      <ArrowRight className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-sm font-light text-white mt-2">Mock Evaluation</div>
                    <div className="text-[11px] font-mono text-white/50 mt-0.5">Timed 15Q diagnostic</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ PIVOT 2: ACCURACY & HISTORY ══════════ */}
          {activePivot === 'trajectory' && (
            <div className="space-y-6 animate-fade-in">
              {/* Longitudinal Accuracy Progression Sparkline */}
              <div className="border border-white/10 bg-white/[0.01] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    EVALUATION ACCURACY PROGRESSION
                  </h3>
                  <span className="text-[10px] font-mono text-white/40 uppercase">
                    {evaluation_history?.length || 0} completed evaluations
                  </span>
                </div>

                {chronEvals.length >= 2 ? (
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
                        <linearGradient id="evalChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#00D2FF" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {(() => {
                        const pts = chronEvals.map((ev, i) => ({
                          x: (i / (chronEvals.length - 1)) * 390 + 20,
                          y: 95 - ((ev.accuracy || 0) * 0.85),
                          accuracy: ev.accuracy || 0,
                          id: ev.id
                        }));
                        const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                        const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},95 L${pts[0].x.toFixed(1)},95 Z`;

                        return (
                          <>
                            <path d={areaPath} fill="url(#evalChartGrad)" />
                            <path d={linePath} stroke="#00D2FF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            {pts.map((p, i) => (
                              <g key={i} className="cursor-pointer" onClick={() => navigate(`/results/${p.id}`)}>
                                <circle cx={p.x} cy={p.y} r="4" fill="#00D2FF" stroke="#000000" strokeWidth="1.5" />
                                <text x={p.x} y={Math.max(12, p.y - 8)} textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="'Segoe UI', monospace">
                                  {p.accuracy}%
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                    <div className="flex justify-between text-[10px] font-mono text-white/40 mt-2 px-1">
                      <span>Baseline: {chronEvals[0]?.accuracy}%</span>
                      <span className="text-primary">Latest: {chronEvals[chronEvals.length - 1]?.accuracy}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-white/40 py-6 border border-white/10 bg-white/[0.01] text-center">
                    Complete at least 2 timed evaluations on this topic to generate an empirical trajectory chart.
                  </p>
                )}
              </div>

              {/* Difficulty Breakdown & Pacing Telemetry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Difficulty Tier Stats */}
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
                    PACING &amp; TIME MANAGEMENT
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/60">Avg Time / Question:</span>
                      <span className="text-white font-bold text-base">
                        {topic.avg_time_seconds !== null ? `${topic.avg_time_seconds}s` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/60">JEE Target Pacing:</span>
                      <span className="text-primary font-bold text-base">120s</span>
                    </div>
                    <div className="p-3 border border-white/10 bg-white/[0.02] text-[11px] font-mono text-white/70 leading-relaxed">
                      {topic.avg_time_seconds !== null ? (
                        topic.avg_time_seconds <= 120 ? (
                          <span className="text-status-aligned font-bold">Pacing is within ideal JEE parameters (&le; 120s).</span>
                        ) : (
                          <span className="text-status-weak font-bold">Pacing is slower than ideal JEE rate (&gt; 120s). Work on speed drills.</span>
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
                  <span className="text-[10px] font-mono text-white/40 uppercase">Review Sessions</span>
                </div>

                {evaluation_history && evaluation_history.length > 0 ? (
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
                ) : (
                  <p className="text-xs font-mono text-white/40 py-6 border border-white/10 bg-white/[0.01] text-center">
                    No evaluations recorded yet. Complete a timed evaluation to track longitudinal results here.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ══════════ PIVOT 3: CHAPTER SIBLINGS ══════════ */}
          {activePivot === 'chapter' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border border-white/10 bg-white/[0.01] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="text-[10px] font-mono text-primary uppercase tracking-widest font-bold">
                      CURRICULUM CHAPTER EXPLORER
                    </div>
                    <h3 className="text-lg font-light text-white mt-0.5">
                      {topic.chapters?.name} ({chapter_topics?.length || 0} topics)
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate(`/practice?chapter=${topic.chapter_id}`)}
                    className="px-3 py-1.5 border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-black text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Practice Entire Chapter</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {chapter_topics && chapter_topics.length > 0 ? (
                    chapter_topics.map((sib, idx) => {
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
                                {isCurrent ? '● Active viewing topic' : 'Click to inspect diagnostic status'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isCurrent ? (
                              <span className="px-2.5 py-1 bg-primary text-black text-[10px] font-mono uppercase font-bold tracking-wider">
                                Current
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 border border-white/15 text-white/70 hover:text-white text-[10px] font-mono uppercase tracking-wider flex items-center gap-1">
                                <span>Inspect</span>
                                <ArrowRight className="w-3 h-3 text-primary" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs font-mono text-white/40 p-4">No sibling topics discovered in this chapter.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ PIVOT 4: QUESTION BANK ══════════ */}
          {activePivot === 'bank' && (
            <div className="space-y-6 animate-fade-in">
              {/* Question Filter Header */}
              <div className="border border-white/10 bg-white/[0.01] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-primary flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      TOPIC QUESTION REPOSITORY
                    </h3>
                    <p className="text-xs text-white/50 font-mono mt-0.5">
                      Preview question stems, test options, and step-by-step mathematical derivations.
                    </p>
                  </div>

                  {/* Difficulty Filters */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['ALL', 'easy', 'medium', 'hard'].map(diff => (
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
                    Loading question bank...
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="py-10 text-center space-y-2 border border-white/10 bg-white/[0.01]">
                    <p className="text-sm text-white/60 font-light">No questions found matching this filter.</p>
                    <p className="text-xs font-mono text-white/40">Try selecting 'ALL' or import questions in Admin.</p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
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

                          {/* Question Badges Bar */}
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
                                <span>Edit Question</span>
                              </button>
                            )}
                          </div>

                          {/* Question Stem with MathText */}
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

                          {/* Reveal Solution Accordion */}
                          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <button
                              onClick={() => toggleSolution(q.id)}
                              className="text-xs font-mono uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5 cursor-pointer self-start"
                            >
                              {isRevealed ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  <span>Hide Answer &amp; Solution</span>
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
                              className="text-[11px] font-mono text-white/50 hover:text-white uppercase tracking-wider flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                            >
                              <span>Practice In Live Set</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Solution Drawer */}
                          {isRevealed && (
                            <div className="mt-3 p-4 border border-primary/30 bg-primary/[0.03] space-y-3 animate-fade-in text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                                  CORRECT ANSWER: OPTION {q.correct_answer || 'Withheld until practice'}
                                </span>
                              </div>

                              {hasSolution ? (
                                <div className="text-xs sm:text-sm text-white/90 font-light leading-relaxed border-t border-white/10 pt-2">
                                  <MathText text={q.solution_text || q.solution || ''} />
                                </div>
                              ) : (
                                <p className="text-xs font-mono text-white/50 border-t border-white/10 pt-2">
                                  Detailed mathematical derivation is available upon completing a practice session.
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
            </div>
          )}
        </div>

        {/* Right Pane: Persistent Responsive Widescreen Sticky Cockpit (lg:col-span-4) */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-6 text-left">
          {/* KPI Live Tiles (Windows 10 Mobile / Nokia Lumia Flat Live Tiles) */}
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

          {/* Action Launch Buttons */}
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
                  {topicQuestions?.length || topic.question_count || topic.questions_available || 0}
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
