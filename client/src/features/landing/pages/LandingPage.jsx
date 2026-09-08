import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import MathText from '@/features/questions/components/MathText';
import {
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Download,
  Smartphone,
  Check
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

  // Interactive Live Calibration Demo State
  const [demoConfidence, setDemoConfidence] = useState(8);
  const [demoAccuracy, setDemoAccuracy] = useState(40);
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
        desc: 'High risk of -1 negative marks. You estimated 80% mastery, but the timed evaluation revealed uncalibrated blind spots (40%).',
        action: 'Take a diagnostic evaluation to locate weak concepts'
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
        desc: 'Unwarranted hesitation. You solve accurately (80%+) but self-rate low, causing slow pacing and unattempted questions.',
        action: 'Run high-speed practice drills to build conviction'
      };
    }
    return {
      label: 'aligned',
      textColor: 'text-status-aligned',
      borderColor: 'border-status-aligned/40',
      bgTint: 'bg-status-aligned/[0.04]',
      pipBg: 'bg-status-aligned',
      icon: Target,
      desc: 'Optimal calibration. Your subjective confidence matches objective performance. Minimal vulnerability to negative marks.',
      action: 'Maintain calibration with periodic milestone reviews'
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

  const StatusIcon = demoStatus.icon;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black font-sans flex flex-col w-full max-w-[100vw] overflow-x-hidden">
      {/* Top Ambient Bar */}
      <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold tracking-wider uppercase text-sm">TOOPREP</span>
          <span className="text-white/30">&middot;</span>
          <span className="text-white/70 uppercase text-[11px] tracking-wider font-mono">JEE PREP</span>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <Link
              to="/"
              className="px-4 py-1.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/auth"
                className="text-white/70 hover:text-white uppercase text-xs font-mono tracking-wider transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="px-3.5 py-1.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-16 space-y-16 sm:space-y-20 text-left">
        {/* ─── Hero Section ─── */}
        <section className="space-y-6 pt-2">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-primary" />
            <span>METACOGNITIVE KNOWLEDGE MAPPING</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-white leading-[1.1]">
            stop losing marks to overconfidence.
          </h1>

          <p className="text-base sm:text-lg font-light text-white/70 max-w-2xl leading-relaxed">
            Aspirants don’t drop ranks to impossible questions. They lose marks to false confidence in topics they assumed they knew. TooPrep calculates your knowledge gap empirically before exam day.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => navigate(user ? '/' : '/auth')}
              className="px-6 py-3.5 bg-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:brightness-110 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>{user ? 'Open Knowledge Map' : 'Start Free Calibration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#demo"
              className="px-6 py-3.5 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:border-white/50 transition-colors"
            >
              See How It Works &darr;
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-white/40 block text-[10px] uppercase">Curriculum</span>
              <span className="text-white font-bold">130 Topics</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px] uppercase">Coverage</span>
              <span className="text-white font-bold">Phy, Chem, Math</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px] uppercase">Question Bank</span>
              <span className="text-white font-bold">110+ Verified PYQs</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px] uppercase">Architecture</span>
              <span className="text-white font-bold">100% Free &amp; Offline PWA</span>
            </div>
          </div>
        </section>

        {/* ─── Interactive Knowledge Map & Calibration Showcase (The Actual App UI!) ─── */}
        <section id="demo" className="space-y-6 pt-4">
          <div className="space-y-2 border-b border-white/10 pb-4">
            <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LIVE PRODUCT PREVIEW</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-white">
              how calibration works in tooprep
            </h2>
            <p className="text-xs sm:text-sm font-mono text-white/60 max-w-xl">
              TooPrep computes the mathematical gap between what you think you know and your actual test performance: <span className="text-white">Gap = Accuracy &minus; (Confidence &times; 10)</span>.
            </p>
          </div>

          {/* Interactive Topic Calibration Card (Styled identically to TopicDetailPage) */}
          <div className="border border-white/15 bg-white/[0.02] p-6 sm:p-8 space-y-6 relative text-left">
            <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary" />

            {/* Breadcrumb & Sibling Meta */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-white/50 border-b border-white/10 pb-3">
              <div>
                <span className="text-primary font-semibold">PHYSICS</span> &rsaquo; <span>Mechanics</span> &rsaquo; <span className="text-white font-semibold">Rotational Dynamics</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                Topic 14 of 130
              </div>
            </div>

            {/* Status Ribbon */}
            <div className={`p-4 border ${demoStatus.borderColor} ${demoStatus.bgTint} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono relative`}>
              <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 ${demoStatus.pipBg}`} />
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-5 h-5 ${demoStatus.textColor} shrink-0`} />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">CALIBRATION STATUS</div>
                  <div className={`font-bold text-sm sm:text-base ${demoStatus.textColor} uppercase`}>
                    {demoStatus.label} [{demoGap > 0 ? `+${demoGap}%` : `${demoGap}%`}]
                  </div>
                </div>
              </div>
              <div className="text-xs text-white/80 font-light max-w-md">
                {demoStatus.desc}
              </div>
            </div>

            {/* Step 1: Self-Rating Strip (1–10 Number Bar) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/70">1. Rate your perceived confidence:</span>
                <span className="text-primary font-bold text-sm">{demoConfidence} / 10 ({demoConfidence * 10}%)</span>
              </div>
              <div className="grid grid-cols-10 gap-1 sm:gap-2 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDemoConfidence(val)}
                    className={`h-9 flex items-center justify-center font-mono text-xs transition-all cursor-pointer ${
                      demoConfidence === val
                        ? 'bg-primary text-black font-bold'
                        : 'border border-white/10 bg-white/[0.02] text-white/70 hover:border-white/30'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Timed Mock Accuracy */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/70">2. Simulate timed mock test accuracy:</span>
                <span className="text-white font-bold text-sm font-mono">{demoAccuracy}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={demoAccuracy}
                onChange={e => setDemoAccuracy(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>0% Blind Guessing</span>
                <span>50% Baseline</span>
                <span>75% Top 1% JEE Target</span>
                <span>100% Perfect</span>
              </div>
            </div>

            {/* Recommended Action */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="text-white/60">
                <span className="text-primary font-semibold">Action:</span> {demoStatus.action}
              </div>
              <button
                onClick={() => navigate(user ? '/' : '/auth')}
                className="text-primary hover:underline font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <span>Calibrate Your Full Syllabus</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ─── The 3-Step Preparation Loop (Concise, no repeat) ─── */}
        <section className="space-y-6 pt-4">
          <div className="space-y-1 border-b border-white/10 pb-4">
            <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
              THE WORKFLOW
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-white">
              three steps to zero negative marks
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Step 1 */}
            <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2 relative text-left">
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary" />
              <div className="text-primary font-bold text-sm">01 / MAP</div>
              <h3 className="text-white font-semibold text-sm">Rate Baseline Confidence</h3>
              <p className="text-white/60 font-light leading-relaxed">
                Review all 130 JEE topics across Physics, Chemistry, and Math in a single spreadsheet-density matrix. Set your self-assessment before taking any test.
              </p>
            </div>

            {/* Step 2 */}
            <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2 relative text-left">
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary" />
              <div className="text-primary font-bold text-sm">02 / EVALUATE</div>
              <h3 className="text-white font-semibold text-sm">Take Timed Evaluations</h3>
              <p className="text-white/60 font-light leading-relaxed">
                Take timed 15-question tests where solutions are strictly withheld until submission. Experience real exam pressure without inflated competence.
              </p>
            </div>

            {/* Step 3 */}
            <div className="border border-white/10 bg-white/[0.02] p-5 space-y-2 relative text-left">
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary" />
              <div className="text-primary font-bold text-sm">03 / CALIBRATE</div>
              <h3 className="text-white font-semibold text-sm">Eliminate Overconfidence</h3>
              <p className="text-white/60 font-light leading-relaxed">
                TooPrep highlights topics where your confidence outpaced your accuracy. Re-drill only the questions you missed with step-by-step derivations.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Question Bank Preview ─── */}
        <section className="space-y-6 pt-4">
          <div className="space-y-1 border-b border-white/10 pb-4">
            <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
              QUESTION REPOSITORY
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-white">
              high-fidelity latex question bank
            </h2>
            <p className="text-xs sm:text-sm font-mono text-white/60">
              Exam-grade questions with complete mathematical formulas and step-by-step solutions.
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.02] p-6 space-y-4 relative text-left">
            <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary" />

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

            {/* Question Stem */}
            <div className="text-base text-white font-light leading-relaxed py-1">
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
                        ? 'border-status-aligned/60 bg-status-aligned/10 text-white'
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
                type="button"
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
                type="button"
                onClick={() => navigate('/auth')}
                className="text-xs font-mono text-white/50 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <span>Full Question Bank &rarr;</span>
              </button>
            </div>

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
        </section>

        {/* ─── PWA Install Section (Clean, unobtrusive) ─── */}
        <section className="border border-white/10 bg-white/[0.01] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-left">
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-primary font-bold flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span>OFFLINE PROGRESSIVE WEB APP</span>
            </div>
            <h3 className="text-xl font-light text-white">
              Install TooPrep on Android, iOS, or Desktop
            </h3>
            <p className="text-xs font-mono text-white/60 max-w-md">
              Runs 100% in your browser or installs to your home screen with zero app-store bloat. Cache questions locally for offline study.
            </p>
          </div>

          {installPrompt && !installed ? (
            <button
              onClick={handleInstallClick}
              className="px-5 py-3 bg-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:brightness-110 cursor-pointer shrink-0 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Install to Device</span>
            </button>
          ) : (
            <div className="text-xs font-mono text-white/50 flex flex-col gap-1 shrink-0">
              <span>Android: Chrome &rsaquo; Install App</span>
              <span>iOS: Safari &rsaquo; Share &rsaquo; Add to Home Screen</span>
              <span>PC: Chrome/Edge address bar install icon</span>
            </div>
          )}
        </section>

        {/* ─── Final Call to Action ─── */}
        <section className="border border-primary/40 bg-primary/[0.04] p-8 sm:p-10 text-center space-y-4 relative">
          <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
          <h2 className="text-3xl sm:text-4xl font-light text-white">
            Ready to calibrate your preparation?
          </h2>
          <p className="text-xs sm:text-sm font-mono text-white/70 max-w-md mx-auto">
            130 syllabus topics mapped. 100% free with no ads. Start your first evaluation in 30 seconds.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate(user ? '/' : '/auth')}
              className="px-8 py-3.5 bg-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 cursor-pointer"
            >
              {user ? 'Open Your Dashboard' : 'Create Free Account &rarr;'}
            </button>
          </div>
        </section>
      </main>

      {/* Clean Ambient Footer */}
      <footer className="w-full border-t border-white/10 px-4 sm:px-8 py-6 text-xs font-mono text-white/40 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto select-none">
        <div>&copy; 2026 TooPrep &middot; Metacognitive Knowledge Mapping for JEE</div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="hover:text-white transition-colors">Sign In</Link>
          <span className="text-white/20">&middot;</span>
          <Link to="/auth" className="hover:text-white transition-colors">Register</Link>
          <span className="text-white/20">&middot;</span>
          <Link to="/" className="hover:text-white transition-colors">Knowledge Map</Link>
        </div>
      </footer>
    </div>
  );
}
