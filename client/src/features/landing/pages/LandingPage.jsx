import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';
import MathText from '@/features/questions/components/MathText';
import {
  Play,
  Timer,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Target,
  Zap,
  Grid,
  Smartphone,
  Apple,
  Monitor,
  Check,
  User,
  Activity,
  Layers,
  Sparkles,
  BookOpen,
  MoreHorizontal,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const SAMPLE_QUESTION = {
  id: 'landing-sample-1',
  difficulty: 'medium',
  source_type: 'PYQ',
  exam_year: '2024',
  question_text: 'A particle moves along the x-axis with velocity $v(t) = 3t^2 - 12t + 9\\,\\text{m/s}$. At what time $t > 0$ does the acceleration of the particle equal zero?',
  options: [
    { id: 'A', text: '$t = 1\\,\\text{s}$' },
    { id: 'B', text: '$t = 2\\,\\text{s}$' },
    { id: 'C', text: '$t = 3\\,\\text{s}$' },
    { id: 'D', text: '$t = 4\\,\\text{s}$' }
  ],
  correct_answer: 'B',
  solution_text: 'Acceleration is the time derivative of velocity: $a(t) = \\frac{dv}{dt} = \\frac{d}{dt}(3t^2 - 12t + 9) = 6t - 12$. Setting $a(t) = 0 \\implies 6t - 12 = 0 \\implies t = 2\\,\\text{s}$. Hence, Option B is correct.'
};

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [activePivot, setActivePivot] = useState('start'); // 'start', 'telemetry', 'preview', 'install', 'why'
  const [activeInstallTab, setActiveInstallTab] = useState('android'); // 'android', 'ios', 'desktop'
  const [appBarExpanded, setAppBarExpanded] = useState(false);

  // Interactive Live Calibration Demo State (Simulated on Live Tile)
  const [demoConfidence, setDemoConfidence] = useState(8);
  const [demoAccuracy, setDemoAccuracy] = useState(38);
  const [sampleRevealed, setSampleRevealed] = useState(false);

  const demoGap = useMemo(() => {
    return demoAccuracy - (demoConfidence * 10);
  }, [demoConfidence, demoAccuracy]);

  const demoStatus = useMemo(() => {
    if (demoGap <= -20) {
      return {
        label: 'overconfident',
        textColor: 'text-status-overconfident',
        borderColor: 'border-status-overconfident/40',
        bgTint: 'bg-status-overconfident/[0.04]',
        pipBg: 'bg-status-overconfident',
        icon: AlertTriangle,
        desc: 'High risk of -1 negative marks! You feel prepared (80%), but mock tests reveal hidden blind spots (38%).',
        action: 'Immediate Diagnostic Mock Required'
      };
    }
    if (demoGap >= 20) {
      return {
        label: 'underconfident',
        textColor: 'text-status-underconfident',
        borderColor: 'border-status-underconfident/40',
        bgTint: 'bg-status-underconfident/[0.04]',
        pipBg: 'bg-status-underconfident',
        icon: TrendingUp,
        desc: 'Unwarranted hesitation. You solve accurately but second-guess yourself, leaving solvable questions unattempted.',
        action: 'Build Speed with Timed Practice Drills'
      };
    }
    return {
      label: 'aligned',
      textColor: 'text-status-aligned',
      borderColor: 'border-status-aligned/40',
      bgTint: 'bg-status-aligned/[0.04]',
      pipBg: 'bg-status-aligned',
      icon: Target,
      desc: 'Optimal calibration. Your subjective confidence matches objective performance. Minimal negative mark vulnerability.',
      action: 'Maintain Calibration with Periodic Reviews'
    };
  }, [demoGap]);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setInstallPrompt(null);
  };

  const DemoStatusIcon = demoStatus.icon;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black font-sans flex flex-col pb-24 w-full max-w-[100vw] overflow-x-hidden">
      {/* Top Ambient Bar */}
      <div className="w-full bg-black/90 backdrop-blur border-b border-white/10 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs font-mono select-none">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold tracking-wider text-xs uppercase">TOOPREP</span>
          <span className="text-white/30">&middot;</span>
          <span className="text-white/70 uppercase text-[11px] tracking-wider">JEE MAIN 2026</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/" className="text-primary hover:underline uppercase text-xs tracking-wider font-bold">
              Open Dashboard &rarr;
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/auth" className="text-white/70 hover:text-white uppercase text-xs tracking-wider">
                Sign In
              </Link>
              <span className="text-white/20">&middot;</span>
              <Link to="/auth" className="text-primary font-bold hover:underline uppercase text-xs tracking-wider">
                Register Free
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Panoramic Horizon Header with Lumia Pivot Titles */}
      <header className="px-4 sm:px-8 max-w-7xl mx-auto w-full pt-8 sm:pt-12 pb-4 select-none text-left">
        <div className="flex items-baseline gap-6 sm:gap-10 overflow-x-auto no-scrollbar border-b border-white/10 pb-3 max-w-full">
          <button
            type="button"
            onClick={() => setActivePivot('start')}
            className={`text-3xl sm:text-5xl font-extralight tracking-tight lowercase transition-colors cursor-pointer shrink-0 ${
              activePivot === 'start' ? 'text-white font-light' : 'text-white/35 hover:text-white/70'
            }`}
          >
            start
          </button>

          <button
            type="button"
            onClick={() => setActivePivot('telemetry')}
            className={`text-3xl sm:text-5xl font-extralight tracking-tight lowercase transition-colors cursor-pointer shrink-0 ${
              activePivot === 'telemetry' ? 'text-white font-light' : 'text-white/35 hover:text-white/70'
            }`}
          >
            telemetry
          </button>

          <button
            type="button"
            onClick={() => setActivePivot('preview')}
            className={`text-3xl sm:text-5xl font-extralight tracking-tight lowercase transition-colors cursor-pointer shrink-0 ${
              activePivot === 'preview' ? 'text-white font-light' : 'text-white/35 hover:text-white/70'
            }`}
          >
            question preview
          </button>

          <button
            type="button"
            onClick={() => setActivePivot('install')}
            className={`text-3xl sm:text-5xl font-extralight tracking-tight lowercase transition-colors cursor-pointer shrink-0 ${
              activePivot === 'install' ? 'text-white font-light' : 'text-white/35 hover:text-white/70'
            }`}
          >
            install app
          </button>

          <button
            type="button"
            onClick={() => setActivePivot('why')}
            className={`text-3xl sm:text-5xl font-extralight tracking-tight lowercase transition-colors cursor-pointer shrink-0 ${
              activePivot === 'why' ? 'text-white font-light' : 'text-white/35 hover:text-white/70'
            }`}
          >
            why tooprep
          </button>
        </div>
      </header>

      {/* Main Panoramic Content Canvas */}
      <main className="flex-1 px-4 sm:px-8 max-w-7xl mx-auto w-full min-w-0">
        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════════════════
           * PIVOT 1: START (ICONIC NOKIA LUMIA LIVE TILES START SCREEN)
           * ═══════════════════════════════════════════════════════════════════ */}
          {activePivot === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-6 pt-4 text-left"
            >
              {/* Responsive Live Tiles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* ─── Wide Hero Live Tile (Lumia Cyan #00BFFF) ─── */}
                <div
                  onClick={() => navigate(user ? '/' : '/auth')}
                  className="sm:col-span-2 border border-primary/40 bg-primary/10 text-white p-6 sm:p-8 flex flex-col justify-between rounded-none shadow-xl cursor-pointer hover:border-primary transition-all relative overflow-hidden text-left group"
                >
                  <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
                  <div className="space-y-3">
                    <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>METACOGNITIVE KNOWLEDGE ENGINE</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-tight text-white leading-tight">
                      stop losing marks to overconfidence.
                    </h2>
                    <p className="text-xs sm:text-sm font-light text-white/75 leading-relaxed max-w-xl">
                      Aspirants don’t drop ranks to impossible questions. They lose marks to false confidence in topics they assumed they knew. TooPrep calculates your calibration gap empirically.
                    </p>
                  </div>

                  <div className="pt-8 flex items-center justify-between border-t border-white/10">
                    <span className="text-xs font-mono uppercase tracking-wider font-bold text-primary group-hover:underline">
                      {user ? 'Open Knowledge Map' : 'Start Calibrating Free'}
                    </span>
                    <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* ─── Medium Tile 1: 130 Topics (Mango Orange #FF8C00) ─── */}
                <div
                  onClick={() => navigate(user ? '/subjects' : '/auth')}
                  className="border border-[#FF8C00]/40 bg-[#FF8C00]/10 text-white p-5 flex flex-col justify-between rounded-none shadow-xl cursor-pointer hover:border-[#FF8C00] transition-all min-h-[180px] text-left relative"
                >
                  <span className="absolute top-3 right-3 w-2 h-2 bg-[#FF8C00]" />
                  <div className="flex items-center justify-between">
                    <Grid className="w-5 h-5 text-[#FF8C00]" />
                  </div>
                  <div>
                    <div className="text-4xl sm:text-5xl font-extralight font-mono text-[#FF8C00]">130</div>
                    <div className="text-xs uppercase tracking-wider font-bold mt-1 text-white font-mono">
                      Syllabus Topics
                    </div>
                    <div className="text-[11px] text-white/60 font-mono">
                      Physics, Chemistry, Math
                    </div>
                  </div>
                </div>

                {/* ─── Medium Tile 2: 110 Verified PYQs (Xbox Emerald #107C10) ─── */}
                <div
                  onClick={() => navigate(user ? '/questions' : '/auth')}
                  className="border border-[#107C10]/40 bg-[#107C10]/10 text-white p-5 flex flex-col justify-between rounded-none shadow-xl cursor-pointer hover:border-[#107C10] transition-all min-h-[180px] text-left relative"
                >
                  <span className="absolute top-3 right-3 w-2 h-2 bg-[#107C10]" />
                  <div className="flex items-center justify-between">
                    <BookOpen className="w-5 h-5 text-[#107C10]" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 border border-white/10 text-white/80">
                      JEE 2018–24
                    </span>
                  </div>
                  <div>
                    <div className="text-4xl sm:text-5xl font-extralight font-mono text-[#107C10]">110+</div>
                    <div className="text-xs uppercase tracking-wider font-bold mt-1 text-white font-mono">
                      Verified PYQs
                    </div>
                    <div className="text-[11px] text-white/60 font-mono">
                      Exam-grade test bank
                    </div>
                  </div>
                </div>

                {/* ─── Interactive Live Calibration Simulator (2 Cols Wide) ─── */}
                <div className="sm:col-span-2 border border-white/15 bg-white/[0.02] p-6 flex flex-col justify-between rounded-none shadow-xl space-y-4 text-left relative">
                  <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-primary animate-pulse" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        LIVE CALIBRATION SIMULATOR
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-white/40 uppercase">Interactive Preview</span>
                  </div>

                  {/* 1. Self-Rating Strip (1–10 Number Bar) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/70">1. Perceived Confidence (Self-Assessment):</span>
                      <span className="text-primary font-bold text-sm">{demoConfidence}/10 ({(demoConfidence * 10)}%)</span>
                    </div>
                    <div className="grid grid-cols-10 gap-1 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDemoConfidence(val)}
                          className={`h-9 flex items-center justify-center font-mono text-xs transition-all cursor-pointer ${
                            demoConfidence === val
                              ? 'bg-primary text-black font-bold scale-105'
                              : 'border border-white/10 bg-white/[0.02] text-white/70 hover:border-white/30'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Mock Score Slider */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/70">2. Empirical Mock Accuracy:</span>
                      <span className="text-white font-bold text-sm font-mono">{demoAccuracy}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={demoAccuracy}
                      onChange={e => setDemoAccuracy(Number(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-none appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-white/40">
                      <span>0% Flunk</span>
                      <span>50% Baseline</span>
                      <span>75% Top 1% JEE Target</span>
                      <span>100% Perfect</span>
                    </div>
                  </div>

                  {/* 3. Live Gap Output Ribbon */}
                  <div className={`p-4 border ${demoStatus.borderColor} ${demoStatus.bgTint} text-xs font-mono space-y-1 relative`}>
                    <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 ${demoStatus.pipBg}`} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Calculated Gap:</span>
                      <span className={`font-bold text-base ${demoStatus.textColor}`}>
                        {demoGap > 0 ? `+${demoGap}%` : `${demoGap}%`} [{demoStatus.label.toUpperCase()}]
                      </span>
                    </div>
                    <p className="text-xs text-white/80 font-light leading-relaxed pt-1">
                      {demoStatus.desc}
                    </p>
                  </div>
                </div>

                {/* ─── Medium Tile 3: Negative Marks (Crimson #FF2E55) ─── */}
                <div
                  onClick={() => setActivePivot('telemetry')}
                  className="border border-[#FF2E55]/40 bg-[#FF2E55]/10 text-white p-5 flex flex-col justify-between rounded-none shadow-xl cursor-pointer hover:border-[#FF2E55] transition-all min-h-[180px] text-left relative"
                >
                  <span className="absolute top-3 right-3 w-2 h-2 bg-[#FF2E55]" />
                  <div className="flex items-center justify-between">
                    <AlertTriangle className="w-5 h-5 text-[#FF2E55]" />
                  </div>
                  <div>
                    <div className="text-4xl sm:text-5xl font-extralight font-mono text-[#FF2E55]">-1</div>
                    <div className="text-xs uppercase tracking-wider font-bold mt-1 text-white font-mono">
                      Negative Marks
                    </div>
                    <div className="text-[11px] text-white/60 font-mono">
                      Overconfidence penalty
                    </div>
                  </div>
                </div>

                {/* ─── Medium Tile 4: 100% Offline PWA (Deep Slate) ─── */}
                <div
                  onClick={() => setActivePivot('install')}
                  className="border border-white/15 bg-white/[0.02] text-white p-5 flex flex-col justify-between rounded-none shadow-xl cursor-pointer hover:border-primary transition-all min-h-[180px] text-left relative"
                >
                  <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
                  <div className="flex items-center justify-between">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-4xl sm:text-5xl font-extralight font-mono text-primary">100%</div>
                    <div className="text-xs uppercase tracking-wider font-bold mt-1 text-white font-mono">
                      Offline PWA
                    </div>
                    <div className="text-[11px] text-white/60 font-mono">
                      Works without network
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Banner Strip */}
              <div className="border border-white/10 bg-white/[0.01] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
                    GET STARTED IN 30 SECONDS
                  </div>
                  <h3 className="text-lg font-light text-white">
                    Free diagnostic access for all JEE Main &amp; Advanced aspirants.
                  </h3>
                </div>
                <button
                  onClick={() => navigate(user ? '/' : '/auth')}
                  className="px-6 py-3 bg-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:brightness-110 shadow-md shadow-primary/20 transition-all cursor-pointer shrink-0"
                >
                  Create Free Account &rarr;
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
           * PIVOT 2: TELEMETRY (SCIENTIFIC GAP ENGINE)
           * ═══════════════════════════════════════════════════════════════════ */}
          {activePivot === 'telemetry' && (
            <motion.div
              key="telemetry"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-6 pt-4 text-left"
            >
              <div className="space-y-2 border-b border-white/10 pb-4">
                <div className="text-xs font-mono text-primary uppercase tracking-widest font-bold">
                  PRECISION DIAGNOSTIC METHODOLOGY
                </div>
                <h3 className="text-3xl font-extralight lowercase text-white">
                  the mathematics of calibration
                </h3>
                <p className="text-xs font-mono text-white/60 max-w-2xl leading-relaxed">
                  TooPrep replaces subjective guesswork with mathematical gap analysis, comparing your Perceived Self-Rating (1–10) against your Objective Timed Test Score (0–100%).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {/* 1. Overconfident Panel */}
                <div className="border border-status-overconfident/40 bg-status-overconfident/[0.03] p-6 space-y-3 relative text-left">
                  <span className="absolute top-3 right-3 w-2 h-2 bg-status-overconfident" />
                  <div className="flex items-center justify-between pr-4">
                    <span className="text-status-overconfident font-bold text-sm uppercase">1. Overconfident</span>
                    <span className="text-status-overconfident text-[10px] bg-status-overconfident/15 px-2 py-0.5">Gap &le; -20%</span>
                  </div>
                  <p className="text-white/80 font-light leading-relaxed text-xs">
                    You rate yourself 8/10 but score 35%. You enter the exam overestimating your speed, leading to hasty attempts, missed edge cases, and devastating -1 penalties.
                  </p>
                  <div className="pt-2 border-t border-white/10 text-[11px] text-white/50">
                    Remedy: Timed diagnostic mocks with withheld answers.
                  </div>
                </div>

                {/* 2. Aligned Panel */}
                <div className="border border-status-aligned/40 bg-status-aligned/[0.03] p-6 space-y-3 relative text-left">
                  <span className="absolute top-3 right-3 w-2 h-2 bg-status-aligned" />
                  <div className="flex items-center justify-between pr-4">
                    <span className="text-status-aligned font-bold text-sm uppercase">2. Aligned</span>
                    <span className="text-status-aligned text-[10px] bg-status-aligned/15 px-2 py-0.5">|Gap| &lt; 20%</span>
                  </div>
                  <p className="text-white/80 font-light leading-relaxed text-xs">
                    Your subjective confidence matches your objective test score. You know what you know, and you know what to skip. Minimal negative mark vulnerability.
                  </p>
                  <div className="pt-2 border-t border-white/10 text-[11px] text-white/50">
                    Target: 80%+ of your syllabus calibrated in Aligned.
                  </div>
                </div>

                {/* 3. Underconfident Panel */}
                <div className="border border-status-underconfident/40 bg-status-underconfident/[0.03] p-6 space-y-3 relative text-left">
                  <span className="absolute top-3 right-3 w-2 h-2 bg-status-underconfident" />
                  <div className="flex items-center justify-between pr-4">
                    <span className="text-status-underconfident font-bold text-sm uppercase">3. Underconfident</span>
                    <span className="text-status-underconfident text-[10px] bg-status-underconfident/15 px-2 py-0.5">Gap &ge; +20%</span>
                  </div>
                  <p className="text-white/80 font-light leading-relaxed text-xs">
                    You score 80% but rate yourself 4/10. Unwarranted hesitation causes slow pacing, leaving solvable questions unattempted at the end of the exam.
                  </p>
                  <div className="pt-2 border-t border-white/10 text-[11px] text-white/50">
                    Remedy: High-speed practice drills to build conviction.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
           * PIVOT 3: QUESTION PREVIEW (LIVE EXAM QUESTIONS & LATEX DERIVATIONS)
           * ═══════════════════════════════════════════════════════════════════ */}
          {activePivot === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-6 pt-4 text-left"
            >
              <div className="space-y-2 border-b border-white/10 pb-4">
                <div className="text-xs font-mono text-primary uppercase tracking-widest font-bold flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>CURRICULUM QUESTION BANK PREVIEW</span>
                </div>
                <h3 className="text-3xl font-extralight lowercase text-white">
                  high-precision latex question stems
                </h3>
                <p className="text-xs font-mono text-white/60 max-w-2xl leading-relaxed">
                  TooPrep questions are curated directly from JEE Main &amp; Advanced papers with full mathematical fidelity and step-by-step derivations.
                </p>
              </div>

              {/* Sample Question Live Card */}
              <div className="border border-white/10 bg-white/[0.02] p-6 space-y-4 relative text-left">
                <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-primary/20 text-primary font-bold uppercase text-[10px]">
                      JEE PYQ {SAMPLE_QUESTION.exam_year}
                    </span>
                    <span className="px-2 py-0.5 bg-status-weak/20 text-status-weak font-bold uppercase text-[10px]">
                      {SAMPLE_QUESTION.difficulty}
                    </span>
                  </div>
                  <span className="text-white/40">Kinematics &middot; Calculus in Physics</span>
                </div>

                {/* Question Stem with MathText */}
                <div className="text-base sm:text-lg text-white font-light leading-relaxed py-2">
                  <MathText text={SAMPLE_QUESTION.question_text} />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SAMPLE_QUESTION.options.map(opt => {
                    const isCorrect = sampleRevealed && opt.id === SAMPLE_QUESTION.correct_answer;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 border text-xs font-light flex items-start gap-2.5 transition-all ${
                          isCorrect
                            ? 'border-status-aligned/60 bg-status-aligned/10 text-white ring-1 ring-status-aligned/40'
                            : 'border-white/10 bg-white/[0.01] text-white/80'
                        }`}
                      >
                        <span className={`w-5 h-5 flex items-center justify-center font-mono font-bold shrink-0 text-[11px] ${
                          isCorrect ? 'bg-status-aligned text-black' : 'bg-white/10 text-primary'
                        }`}>
                          {opt.id}
                        </span>
                        <div className="flex-1 min-w-0">
                          <MathText text={opt.text} />
                        </div>
                        {isCorrect && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-status-aligned shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Toggle Derivation Button */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => setSampleRevealed(!sampleRevealed)}
                    className="text-xs font-mono uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    {sampleRevealed ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Hide Derivation</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Reveal Step-by-Step Derivation</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => navigate('/auth')}
                    className="text-xs font-mono text-white/60 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <span>Practice full question bank &rarr;</span>
                  </button>
                </div>

                {/* Derivation Body */}
                {sampleRevealed && (
                  <div className="mt-3 p-4 border border-primary/30 bg-primary/[0.03] space-y-2 animate-fade-in text-left">
                    <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                      CORRECT OPTION: B (t = 2 s)
                    </div>
                    <div className="text-sm text-white/90 font-light leading-relaxed border-t border-white/10 pt-2">
                      <MathText text={SAMPLE_QUESTION.solution_text} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
           * PIVOT 4: INSTALL APP (WINDOWS PHONE PWA HUB)
           * ═══════════════════════════════════════════════════════════════════ */}
          {activePivot === 'install' && (
            <motion.div
              key="install"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-6 pt-4 text-left"
            >
              <div className="space-y-2 border-b border-white/10 pb-4">
                <div className="text-xs font-mono text-primary uppercase tracking-widest font-bold">
                  ZERO APP STORE FRICTION
                </div>
                <h3 className="text-3xl font-extralight lowercase text-white">
                  install on your phone or desktop
                </h3>
                <p className="text-xs font-mono text-white/60">
                  Installs directly in 10 seconds via your browser. Full offline test support.
                </p>
              </div>

              {/* Platform Selector Tabs */}
              <div className="flex items-baseline gap-6 border-b border-white/10 pb-3 text-sm font-mono uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setActiveInstallTab('android')}
                  className={`cursor-pointer ${activeInstallTab === 'android' ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-white/40 hover:text-white'}`}
                >
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInstallTab('ios')}
                  className={`cursor-pointer ${activeInstallTab === 'ios' ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-white/40 hover:text-white'}`}
                >
                  iPhone (Safari)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInstallTab('desktop')}
                  className={`cursor-pointer ${activeInstallTab === 'desktop' ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-white/40 hover:text-white'}`}
                >
                  Windows / Mac
                </button>
              </div>

              {/* Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeInstallTab === 'android' && (
                  <>
                    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2">
                      <div className="text-2xl font-light text-primary font-mono">01</div>
                      <h4 className="text-sm font-semibold text-white font-mono">Open in Chrome</h4>
                      <p className="text-xs text-white/60 font-mono leading-relaxed">Open this website in Google Chrome or Brave on your Android device.</p>
                    </div>
                    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2">
                      <div className="text-2xl font-light text-primary font-mono">02</div>
                      <h4 className="text-sm font-semibold text-white font-mono">Tap Menu (&vellip;)</h4>
                      <p className="text-xs text-white/60 font-mono leading-relaxed">Tap the three vertical dots in the top-right corner of Chrome.</p>
                    </div>
                    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2">
                      <div className="text-2xl font-light text-primary font-mono">03</div>
                      <h4 className="text-sm font-semibold text-white font-mono">Install App</h4>
                      <p className="text-xs text-white/60 font-mono leading-relaxed">Select "Install app" or "Add to Home screen" to pin directly to your app launcher.</p>
                    </div>
                  </>
                )}

                {activeInstallTab === 'ios' && (
                  <>
                    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2">
                      <div className="text-2xl font-light text-primary font-mono">01</div>
                      <h4 className="text-sm font-semibold text-white font-mono">Open in Safari</h4>
                      <p className="text-xs text-white/60 font-mono leading-relaxed">Open this site in Apple Safari on your iPhone or iPad.</p>
                    </div>
                    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2">
                      <div className="text-2xl font-light text-primary font-mono">02</div>
                      <h4 className="text-sm font-semibold text-white font-mono">Tap Share</h4>
                      <p className="text-xs text-white/60 font-mono leading-relaxed">Tap the Share icon (square with upward arrow) in Safari's bottom toolbar.</p>
                    </div>
                    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2">
                      <div className="text-2xl font-light text-primary font-mono">03</div>
                      <h4 className="text-sm font-semibold text-white font-mono">Add to Home Screen</h4>
                      <p className="text-xs text-white/60 font-mono leading-relaxed">Scroll down and select "Add to Home Screen", then tap "Add".</p>
                    </div>
                  </>
                )}

                {activeInstallTab === 'desktop' && (
                  <>
                    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2">
                      <div className="text-2xl font-light text-primary font-mono">01</div>
                      <h4 className="text-sm font-semibold text-white font-mono">Address Bar Icon</h4>
                      <p className="text-xs text-white/60 font-mono leading-relaxed">Look for the install icon on the right side of your Chrome/Edge address bar.</p>
                    </div>
                    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2">
                      <div className="text-2xl font-light text-primary font-mono">02</div>
                      <h4 className="text-sm font-semibold text-white font-mono">Click Install</h4>
                      <p className="text-xs text-white/60 font-mono leading-relaxed">Click "Install TooPrep" to launch in a clean, standalone desktop window.</p>
                    </div>
                    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2">
                      <div className="text-2xl font-light text-primary font-mono">03</div>
                      <h4 className="text-sm font-semibold text-white font-mono">Pin to Taskbar</h4>
                      <p className="text-xs text-white/60 font-mono leading-relaxed">Pin TooPrep to your Windows Taskbar or macOS Dock for 1-click access.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Direct Install Prompt if available */}
              {installPrompt && !installed && (
                <div className="p-4 bg-primary/10 border border-primary/40 flex items-center justify-between gap-4">
                  <div className="font-mono text-xs text-white/80">
                    <span className="text-primary font-bold">One-Click Install Ready:</span> Add TooPrep to your device right now.
                  </div>
                  <button
                    onClick={handleInstallClick}
                    className="px-5 py-2.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider cursor-pointer hover:brightness-110"
                  >
                    Install on this Device
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
           * PIVOT 5: WHY TOOPREP
           * ═══════════════════════════════════════════════════════════════════ */}
          {activePivot === 'why' && (
            <motion.div
              key="why"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-6 pt-4 max-w-4xl text-left"
            >
              <div className="space-y-2 border-b border-white/10 pb-4">
                <div className="text-xs font-mono text-primary uppercase tracking-widest font-bold">
                  PHILOSOPHY &amp; PEDAGOGY
                </div>
                <h3 className="text-3xl font-extralight lowercase text-white">
                  built for the realities of jee main
                </h3>
                <p className="text-xs font-mono text-white/60">
                  Why traditional preparation platforms fail to prevent rank drop on exam day.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-5 border border-white/10 bg-white/[0.02] space-y-2">
                  <div className="text-primary font-bold uppercase text-sm">1. Solutions are Withheld during evaluations</div>
                  <p className="text-white/80 font-light leading-relaxed text-xs">
                    Most mock test apps reveal answers immediately. This tricks your brain into thinking "I knew that!", inflating your perceived competence. TooPrep strictly withholds solutions until submission, reproducing the exact pressure of the actual exam hall.
                  </p>
                </div>

                <div className="p-5 border border-white/10 bg-white/[0.02] space-y-2">
                  <div className="text-primary font-bold uppercase text-sm">2. Metacognitive Mistake Categorization</div>
                  <p className="text-white/80 font-light leading-relaxed text-xs">
                    Wrong answers are categorized: Conceptual Lack, Calculation Error, Misread Question, or Time Pressure. You learn whether you need textbook revision or pacing discipline.
                  </p>
                </div>

                <div className="p-5 border border-white/10 bg-white/[0.02] space-y-2">
                  <div className="text-primary font-bold uppercase text-sm">3. Excel-Style Knowledge Map</div>
                  <p className="text-white/80 font-light leading-relaxed text-xs">
                    Track all 130 topics in a high-density matrix with in-cell confidence calibration, sorting, and instant overconfidence alerts.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Iconic Windows Phone Bottom Application Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/10 px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Action 1: Launch Knowledge Map */}
            <button
              onClick={() => navigate(user ? '/' : '/auth')}
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="metro-circle-btn">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              <span className="text-[10px] font-mono text-white/60 group-hover:text-primary transition-colors lowercase">
                {user ? 'map' : 'start'}
              </span>
            </button>

            {/* Action 2: Diagnostic Test */}
            <button
              onClick={() => navigate(user ? '/evaluate' : '/auth')}
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="metro-circle-btn">
                <Timer className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-[10px] font-mono text-white/60 group-hover:text-primary transition-colors lowercase">
                mock
              </span>
            </button>

            {/* Action 3: Questions */}
            <button
              onClick={() => navigate(user ? '/questions' : '/auth')}
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="metro-circle-btn">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-white/60 group-hover:text-primary transition-colors lowercase">
                bank
              </span>
            </button>

            {/* Action 4: Install PWA */}
            <button
              onClick={() => {
                if (installPrompt && !installed) {
                  handleInstallClick();
                } else {
                  setActivePivot('install');
                }
              }}
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="metro-circle-btn">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] font-mono text-white/60 group-hover:text-primary transition-colors lowercase">
                install
              </span>
            </button>
          </div>

          {/* Right Ellipsis Menu Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAppBarExpanded(!appBarExpanded)}
              className="p-2 text-white/50 hover:text-white transition-colors cursor-pointer"
              title="More System Options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Application Bar Menu (Classic Windows Phone App Bar Drawer) */}
        <AnimatePresence>
          {appBarExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="max-w-7xl mx-auto pt-3 border-t border-white/10 mt-2 font-mono text-xs space-y-2 overflow-hidden text-left"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-white/80">
                <button
                  onClick={() => { setActivePivot('start'); setAppBarExpanded(false); }}
                  className="p-2.5 border border-white/10 bg-white/[0.02] hover:bg-white/5 text-left cursor-pointer"
                >
                  Start
                </button>
                <button
                  onClick={() => { setActivePivot('telemetry'); setAppBarExpanded(false); }}
                  className="p-2.5 border border-white/10 bg-white/[0.02] hover:bg-white/5 text-left cursor-pointer"
                >
                  Calibration
                </button>
                <button
                  onClick={() => { setActivePivot('install'); setAppBarExpanded(false); }}
                  className="p-2.5 border border-white/10 bg-white/[0.02] hover:bg-white/5 text-left cursor-pointer"
                >
                  Install App
                </button>
                <button
                  onClick={() => { navigate(user ? '/profile' : '/auth'); setAppBarExpanded(false); }}
                  className="p-2.5 border border-primary/40 bg-primary/20 text-primary text-left cursor-pointer font-bold"
                >
                  {user ? 'Profile & Settings' : 'Student Sign In'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}
