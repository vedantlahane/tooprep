import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';
import Icon, {
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
  RotateCcw
} from '@/shared/components/Icon';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [activePivot, setActivePivot] = useState('start'); // 'start', 'telemetry', 'install', 'why'
  const [activeInstallTab, setActiveInstallTab] = useState('android'); // 'android', 'ios', 'desktop'
  const [appBarExpanded, setAppBarExpanded] = useState(false);

  // Interactive Live Calibration Demo State (Simulated on Live Tile)
  const [demoConfidence, setDemoConfidence] = useState(8);
  const [demoAccuracy, setDemoAccuracy] = useState(38);

  const demoGap = useMemo(() => {
    return demoAccuracy - (demoConfidence * 10);
  }, [demoConfidence, demoAccuracy]);

  const demoStatus = useMemo(() => {
    if (demoGap <= -20) {
      return {
        label: 'overconfident',
        badgeBg: 'bg-[#FF2E55]',
        textColor: 'text-[#FF2E55]',
        tileBg: 'bg-[#FF2E55] text-white',
        icon: AlertTriangle,
        desc: 'High risk of -1 negative marks! You feel prepared, but exam pressure reveals conceptual blind spots.',
        action: 'Immediate Diagnostic Mock Required'
      };
    }
    if (demoGap >= 20) {
      return {
        label: 'underconfident',
        badgeBg: 'bg-[#00BFFF]',
        textColor: 'text-[#00BFFF]',
        tileBg: 'bg-[#00BFFF] text-black',
        icon: TrendingUp,
        desc: 'Unwarranted hesitation. You solve accurately but second-guess yourself, wasting valuable exam minutes.',
        action: 'Build Speed with Timed Practice Drills'
      };
    }
    return {
      label: 'aligned',
      badgeBg: 'bg-[#107C10]',
      textColor: 'text-[#107C10]',
      tileBg: 'bg-[#107C10] text-white',
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
      {/* ─── Top Bar ─── */}
      <div className="w-full bg-black/90 backdrop-blur border-b border-neutral-900 px-3 sm:px-4 md:px-8 py-2 flex items-center justify-between text-xs text-white/60 select-none">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold tracking-wider text-xs uppercase">TOOPREP</span>
          <span className="text-white/30">&middot;</span>
          <span className="text-white/80 uppercase text-xs tracking-wider">JEE MAIN 2026</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <span className="text-white/70 truncate max-w-[120px] text-xs">{user.email?.split('@')[0]}</span>
          ) : (
            <Link to="/auth" className="text-primary hover:underline uppercase text-xs tracking-wider">Sign In</Link>
          )}
        </div>
      </div>

      {/* ─── Panoramic Horizon Header ─── */}
      <header className="px-3 sm:px-4 md:px-8 pt-6 sm:pt-10 pb-4 max-w-7xl mr-auto w-full select-none">
        {/* Panoramic Horizontal Pivot Titles */}
        <div className="flex items-baseline gap-5 sm:gap-6 md:gap-10 overflow-x-auto no-scrollbar pt-2 border-b border-neutral-900 pb-3 max-w-full">
          <button
            onClick={() => setActivePivot('start')}
            className={`text-4xl sm:text-5xl md:text-6xl font-extralight tracking-tight lowercase transition-colors cursor-pointer shrink-0 ${
              activePivot === 'start' ? 'text-white' : 'text-white/35 hover:text-white/70'
            }`}
          >
            start
          </button>

          <button
            onClick={() => setActivePivot('telemetry')}
            className={`text-4xl sm:text-5xl md:text-6xl font-extralight tracking-tight lowercase transition-colors cursor-pointer shrink-0 ${
              activePivot === 'telemetry' ? 'text-white' : 'text-white/35 hover:text-white/70'
            }`}
          >
            telemetry
          </button>

          <button
            onClick={() => setActivePivot('install')}
            className={`text-4xl sm:text-5xl md:text-6xl font-extralight tracking-tight lowercase transition-colors cursor-pointer shrink-0 ${
              activePivot === 'install' ? 'text-white' : 'text-white/35 hover:text-white/70'
            }`}
          >
            install app
          </button>

          <button
            onClick={() => setActivePivot('why')}
            className={`text-4xl sm:text-5xl md:text-6xl font-extralight tracking-tight lowercase transition-colors cursor-pointer shrink-0 ${
              activePivot === 'why' ? 'text-white' : 'text-white/35 hover:text-white/70'
            }`}
          >
            why tooprep
          </button>
        </div>
      </header>

      {/* ─── Main Panoramic Content ─── */}
      <main className="flex-1 px-3 sm:px-4 md:px-8 max-w-7xl mr-auto w-full min-w-0 overflow-x-hidden sm:overflow-x-visible">
        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════════════════
           * PIVOT 1: START (ICONIC WINDOWS PHONE LIVE TILES START SCREEN)
           * ═══════════════════════════════════════════════════════════════════ */}
          {activePivot === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6 pt-2"
            >
              {/* Live Tiles Grid: Flat, Sharp Corners, Pure Metro Aesthetic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">

                {/* ─── Wide Hero Live Tile (Lumia Cyan #00BFFF) ─── */}
                <motion.div
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => navigate(user ? '/' : '/auth')}
                  className="sm:col-span-2 bg-[#00BFFF] text-black p-5 sm:p-7 flex flex-col justify-between rounded-none shadow-xl cursor-pointer metro-tile"
                >
                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-4xl font-light tracking-tight leading-tight lowercase">
                      stop losing marks to overconfidence.
                    </h2>
                    <p className="text-xs sm:text-sm font-normal text-black/80 leading-relaxed max-w-md pt-1">
                      Aspirants don’t lose ranks to difficult questions. They lose marks to false confidence in topics they thought they mastered. TooPrep calculates your calibration gap empirically.
                    </p>
                  </div>

                  <div className="pt-6 flex items-center justify-between border-t border-black/15">
                    <span className="text-xs uppercase tracking-wider font-bold">
                      {user ? 'Open Knowledge Map' : 'Start Calibrating Free'}
                    </span>
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </div>
                </motion.div>

                {/* ─── Medium Tile 1: 130 Topics (Mango Orange #FF8C00) ─── */}
                <motion.div
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => navigate(user ? '/' : '/auth')}
                  className="bg-[#FF8C00] text-black p-5 flex flex-col justify-between rounded-none shadow-xl cursor-pointer aspect-square sm:aspect-auto sm:h-auto min-h-[170px] metro-tile"
                >
                  <div className="flex items-center justify-between">
                    <Grid className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-5xl font-extralight tracking-tighter">130</div>
                    <div className="text-xs uppercase tracking-wider font-bold mt-1">
                      Syllabus Topics
                    </div>
                    <div className="text-[11px] text-black/70 font-sans">
                      Physics, Chemistry, Math
                    </div>
                  </div>
                </motion.div>

                {/* ─── Medium Tile 2: 110 Verified PYQs (Xbox Emerald #107C10) ─── */}
                <motion.div
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => navigate(user ? '/questions' : '/auth')}
                  className="bg-[#107C10] text-white p-5 flex flex-col justify-between rounded-none shadow-xl cursor-pointer aspect-square sm:aspect-auto sm:h-auto min-h-[170px] metro-tile"
                >
                  <div className="flex items-center justify-between">
                    <BookOpen className="w-5 h-5" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-black/30 px-1.5 py-0.5">
                      JEE 2018–24
                    </span>
                  </div>
                  <div>
                    <div className="text-5xl font-extralight tracking-tighter">110</div>
                    <div className="text-xs uppercase tracking-wider font-bold mt-1">
                      Verified PYQs
                    </div>
                    <div className="text-[11px] text-white/70 font-sans">
                      Exam-grade test bank
                    </div>
                  </div>
                </motion.div>

                {/* ─── Large Interactive Diagnostic Live Tile (2 Cols Wide) ─── */}
                <div className="sm:col-span-2 bg-[#161616] border border-neutral-800 p-5 sm:p-6 flex flex-col justify-between rounded-none shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-primary animate-pulse"></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        Live Calibration Simulator
                      </span>
                    </div>
                  </div>

                  {/* Interactive Sliders */}
                  <div className="space-y-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-white/80">
                        <span>1. Your Self-Rating (Confidence):</span>
                        <span className="text-primary font-bold text-sm bg-primary/15 px-2 py-0.5 border border-primary/40">
                          {demoConfidence}/10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={demoConfidence}
                        onChange={e => setDemoConfidence(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-800 rounded-none appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-white/40">
                        <span>1 (Low)</span>
                        <span>5 (Moderate)</span>
                        <span>10 (Mastery)</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-white/80">
                        <span>2. Actual Mock Score:</span>
                        <span className="text-white font-bold text-sm bg-neutral-800 px-2 py-0.5 border border-white/20">
                          {demoAccuracy}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={demoAccuracy}
                        onChange={e => setDemoAccuracy(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-800 rounded-none appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-white/40">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Gap Output Box */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={demoStatus.label}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16 }}
                      className={`p-3.5 rounded-none text-xs ${
                        demoGap <= -20 ? 'bg-[#FF2E55]/15 border border-[#FF2E55]/40 text-white' :
                        demoGap >= 20 ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/40 text-white' :
                        'bg-[#107C10]/15 border border-[#107C10]/40 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] uppercase tracking-wider text-white/60">Calculated Gap:</span>
                        <span className="font-bold text-base">
                          {demoGap > 0 ? `+${demoGap}%` : `${demoGap}%`} [{demoStatus.label.toUpperCase()}]
                        </span>
                      </div>
                      <p className="text-[11px] text-white/80 font-sans leading-relaxed">
                        {demoStatus.desc}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* ─── Medium Tile 3: Negative Marks (Crimson #FF2E55) ─── */}
                <motion.div
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => setActivePivot('telemetry')}
                  className="bg-[#FF2E55] text-white p-5 flex flex-col justify-between rounded-none shadow-xl cursor-pointer aspect-square sm:aspect-auto sm:h-auto min-h-[170px] metro-tile"
                >
                  <div className="flex items-center justify-between">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-5xl font-extralight tracking-tighter">-1</div>
                    <div className="text-xs uppercase tracking-wider font-bold mt-1">
                      Negative Marks
                    </div>
                    <div className="text-[11px] text-white/70 font-sans">
                      Overconfidence penalty
                    </div>
                  </div>
                </motion.div>

                {/* ─── Medium Tile 4: 100% Offline PWA (Deep Cobalt #1F1F1F) ─── */}
                <motion.div
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => setActivePivot('install')}
                  className="bg-[#1C1C1C] border border-neutral-800 hover:border-primary text-white p-5 flex flex-col justify-between rounded-none shadow-xl cursor-pointer aspect-square sm:aspect-auto sm:h-auto min-h-[170px] metro-tile"
                >
                  <div className="flex items-center justify-between">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-5xl font-extralight tracking-tighter text-primary">100%</div>
                    <div className="text-xs uppercase tracking-wider font-bold mt-1">
                      Offline PWA
                    </div>
                    <div className="text-[11px] text-white/50 font-sans">
                      Works without network
                    </div>
                  </div>
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
           * PIVOT 2: TELEMETRY (SCIENTIFIC GAP ENGINE)
           * ═══════════════════════════════════════════════════════════════════ */}
          {activePivot === 'telemetry' && (
            <motion.div
              key="telemetry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6 pt-2"
            >
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-light lowercase text-white">
                  the mathematics of calibration
                </h3>
                <p className="text-xs font-mono text-white/50 max-w-2xl leading-relaxed">
                  TooPrep eliminates guesswork by tracking your Subjective Rating (1-10) against your Objective Timed Test Score (0-100%).
                </p>
              </div>

              {/* 3 Metro Panels for the 3 States */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {/* Overconfident Panel */}
                <div className="bg-neutral-950 border-l-4 border-[#FF2E55] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#FF2E55] font-bold text-sm uppercase">1. Overconfident</span>
                    <span className="text-[#FF2E55] text-[10px] bg-[#FF2E55]/15 px-2 py-0.5">Gap ≤ -20%</span>
                  </div>
                  <p className="text-white/70 font-sans leading-relaxed text-xs">
                    You rate yourself 8/10 but score 35%. You enter the exam over-estimating your speed and knowledge, leading to hasty attempts, missed edge cases, and devastating -1 penalties.
                  </p>
                  <div className="pt-2 border-t border-neutral-900 text-[11px] text-white/40">
                    Fix: Timed diagnostic mocks with withheld answers.
                  </div>
                </div>

                {/* Aligned Panel */}
                <div className="bg-neutral-950 border-l-4 border-[#107C10] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#107C10] font-bold text-sm uppercase">2. Aligned</span>
                    <span className="text-[#107C10] text-[10px] bg-[#107C10]/15 px-2 py-0.5">|Gap| &lt; 20%</span>
                  </div>
                  <p className="text-white/70 font-sans leading-relaxed text-xs">
                    Your subjective confidence matches your objective test score. You know what you know, and you know what to skip. Minimal negative mark vulnerability.
                  </p>
                  <div className="pt-2 border-t border-neutral-900 text-[11px] text-white/40">
                    Target: 80%+ of your syllabus calibrated in Aligned.
                  </div>
                </div>

                {/* Underconfident Panel */}
                <div className="bg-neutral-950 border-l-4 border-[#00BFFF] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#00BFFF] font-bold text-sm uppercase">3. Underconfident</span>
                    <span className="text-[#00BFFF] text-[10px] bg-[#00BFFF]/15 px-2 py-0.5">Gap ≥ +20%</span>
                  </div>
                  <p className="text-white/70 font-sans leading-relaxed text-xs">
                    You score 80% but rate yourself 4/10. Unwarranted hesitation causes slow pacing, leaving solvable questions unattempted at the end of the exam.
                  </p>
                  <div className="pt-2 border-t border-neutral-900 text-[11px] text-white/40">
                    Fix: High-speed practice drills to build conviction.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
           * PIVOT 3: INSTALL APP (WINDOWS PHONE PWA HUB)
           * ═══════════════════════════════════════════════════════════════════ */}
          {activePivot === 'install' && (
            <motion.div
              key="install"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6 pt-2"
            >
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-light lowercase text-white">
                  install on your phone or desktop
                </h3>
                <p className="text-xs font-mono text-white/50">
                  Zero app store friction. Installs directly in 10 seconds via your browser.
                </p>
              </div>

              {/* Platform Selector */}
              <div className="flex items-baseline gap-6 border-b border-neutral-900 pb-3 text-sm font-mono uppercase tracking-wider">
                <button
                  onClick={() => setActiveInstallTab('android')}
                  className={`cursor-pointer ${activeInstallTab === 'android' ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-white/40 hover:text-white'}`}
                >
                  Android
                </button>
                <button
                  onClick={() => setActiveInstallTab('ios')}
                  className={`cursor-pointer ${activeInstallTab === 'ios' ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-white/40 hover:text-white'}`}
                >
                  iPhone (Safari)
                </button>
                <button
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
                    <div className="bg-neutral-900 p-5 space-y-2 border border-neutral-800">
                      <div className="text-2xl font-light text-primary font-mono">01</div>
                      <h4 className="text-sm font-semibold text-white">Open in Chrome</h4>
                      <p className="text-xs text-white/60 font-sans">Open this website in Google Chrome or Brave on your Android device.</p>
                    </div>
                    <div className="bg-neutral-900 p-5 space-y-2 border border-neutral-800">
                      <div className="text-2xl font-light text-primary font-mono">02</div>
                      <h4 className="text-sm font-semibold text-white">Tap Menu (⋮)</h4>
                      <p className="text-xs text-white/60 font-sans">Tap the three vertical dots in the top-right corner of Chrome.</p>
                    </div>
                    <div className="bg-neutral-900 p-5 space-y-2 border border-neutral-800">
                      <div className="text-2xl font-light text-primary font-mono">03</div>
                      <h4 className="text-sm font-semibold text-white">Install App</h4>
                      <p className="text-xs text-white/60 font-sans">Select "Install app" or "Add to Home screen" to pin to your app drawer.</p>
                    </div>
                  </>
                )}

                {activeInstallTab === 'ios' && (
                  <>
                    <div className="bg-neutral-900 p-5 space-y-2 border border-neutral-800">
                      <div className="text-2xl font-light text-primary font-mono">01</div>
                      <h4 className="text-sm font-semibold text-white">Open in Safari</h4>
                      <p className="text-xs text-white/60 font-sans">Open this site in Apple Safari on your iPhone or iPad.</p>
                    </div>
                    <div className="bg-neutral-900 p-5 space-y-2 border border-neutral-800">
                      <div className="text-2xl font-light text-primary font-mono">02</div>
                      <h4 className="text-sm font-semibold text-white">Tap Share</h4>
                      <p className="text-xs text-white/60 font-sans">Tap the Share icon (square with arrow) in Safari's bottom toolbar.</p>
                    </div>
                    <div className="bg-neutral-900 p-5 space-y-2 border border-neutral-800">
                      <div className="text-2xl font-light text-primary font-mono">03</div>
                      <h4 className="text-sm font-semibold text-white">Add to Home Screen</h4>
                      <p className="text-xs text-white/60 font-sans">Scroll down and select "Add to Home Screen", then tap "Add".</p>
                    </div>
                  </>
                )}

                {activeInstallTab === 'desktop' && (
                  <>
                    <div className="bg-neutral-900 p-5 space-y-2 border border-neutral-800">
                      <div className="text-2xl font-light text-primary font-mono">01</div>
                      <h4 className="text-sm font-semibold text-white">Look at Address Bar</h4>
                      <p className="text-xs text-white/60 font-sans">Look for the install icon (⊕ or computer) on the right side of Chrome/Edge address bar.</p>
                    </div>
                    <div className="bg-neutral-900 p-5 space-y-2 border border-neutral-800">
                      <div className="text-2xl font-light text-primary font-mono">02</div>
                      <h4 className="text-sm font-semibold text-white">Click Install</h4>
                      <p className="text-xs text-white/60 font-sans">Click "Install TooPrep" to launch in a clean standalone desktop window.</p>
                    </div>
                    <div className="bg-neutral-900 p-5 space-y-2 border border-neutral-800">
                      <div className="text-2xl font-light text-primary font-mono">03</div>
                      <h4 className="text-sm font-semibold text-white">Pin to Taskbar</h4>
                      <p className="text-xs text-white/60 font-sans">Pin TooPrep to your Windows Taskbar or macOS Dock for 1-click access.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Direct Install Button if supported by browser */}
              {installPrompt && !installed && (
                <div className="p-4 bg-primary/10 border border-primary/40 flex items-center justify-between gap-4">
                  <div className="font-mono text-xs text-white/80">
                    <span className="text-primary font-bold">One-Click Install Ready:</span> Add TooPrep to your home screen now.
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
           * PIVOT 4: WHY TOOPREP
           * ═══════════════════════════════════════════════════════════════════ */}
          {activePivot === 'why' && (
            <motion.div
              key="why"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6 pt-2 max-w-4xl"
            >
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-light lowercase text-white">
                  built for the realities of jee main
                </h3>
                <p className="text-xs font-mono text-white/50">
                  Why traditional preparation platforms fail to prevent rank drop on exam day.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-5 bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="text-primary font-bold uppercase text-sm">1. Solutions are Withheld during evaluations</div>
                  <p className="text-white/70 font-sans leading-relaxed text-xs">
                    Most mock test apps reveal answers immediately. This tricks your brain into thinking "I knew that!", inflating your perceived competence. TooPrep strictly withholds solutions until submission, reproducing the exact pressure of the actual exam hall.
                  </p>
                </div>

                <div className="p-5 bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="text-primary font-bold uppercase text-sm">2. Metacognitive Mistake Categorization</div>
                  <p className="text-white/70 font-sans leading-relaxed text-xs">
                    Wrong answers are categorized: Conceptual Lack, Calculation Error, Misread Question, or Time Pressure. You learn whether you need textbook revision or pacing discipline.
                  </p>
                </div>

                <div className="p-5 bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="text-primary font-bold uppercase text-sm">3. Excel-Style Knowledge Map</div>
                  <p className="text-white/70 font-sans leading-relaxed text-xs">
                    Track all 130 topics in a high-density matrix with in-cell confidence calibration, sorting, and instant overconfidence alerts.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Iconic Windows Phone Bottom Application Bar ─── */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-neutral-800 px-4 md:px-8 py-2.5">
        <div className="max-w-7xl mr-auto flex items-center justify-between">
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
              className="max-w-7xl mr-auto pt-3 border-t border-neutral-900 mt-2 font-mono text-xs space-y-2 overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-white/80">
                <button
                  onClick={() => { setActivePivot('start'); setAppBarExpanded(false); }}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 text-left cursor-pointer"
                >
                  Start
                </button>
                <button
                  onClick={() => { setActivePivot('telemetry'); setAppBarExpanded(false); }}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 text-left cursor-pointer"
                >
                  Calibration
                </button>
                <button
                  onClick={() => { setActivePivot('install'); setAppBarExpanded(false); }}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 text-left cursor-pointer"
                >
                  Install App
                </button>
                <button
                  onClick={() => { navigate(user ? '/profile' : '/auth'); setAppBarExpanded(false); }}
                  className="p-2 bg-primary/20 text-primary text-left cursor-pointer"
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
