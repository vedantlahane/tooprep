import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import Icon, {
  Play,
  Timer,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Target,
  Zap,
  Grid,
  Smartphone,
  Apple,
  Monitor,
  Check
} from '@/shared/components/Icon';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState('android'); // 'android', 'ios', 'desktop'

  // Interactive Live Calibration Demo State
  const [demoConfidence, setDemoConfidence] = useState(8);
  const [demoAccuracy, setDemoAccuracy] = useState(38);

  const demoGap = useMemo(() => {
    return demoAccuracy - (demoConfidence * 10);
  }, [demoConfidence, demoAccuracy]);

  const demoStatus = useMemo(() => {
    if (demoGap <= -20) {
      return {
        label: 'Overconfident',
        badgeClass: 'bg-error/20 text-error border-error/40',
        icon: AlertTriangle,
        desc: 'High Risk of -1 Negative Marks! You feel prepared, but exam pressure reveals critical conceptual blind spots.',
        action: 'Immediate Diagnostic Mock Recommended'
      };
    }
    if (demoGap >= 20) {
      return {
        label: 'Underconfident',
        badgeClass: 'bg-primary/20 text-primary border-primary/40',
        icon: TrendingUp,
        desc: 'Unwarranted Hesitation. You solve problems accurately but second-guess yourself, wasting valuable exam minutes.',
        action: 'Build Speed with Timed Practice Drills'
      };
    }
    return {
      label: 'Aligned & Exam Ready',
      badgeClass: 'bg-status-aligned/20 text-status-aligned border-status-aligned/40',
      icon: Target,
      desc: 'Optimal Calibration. Your subjective confidence matches objective performance. Minimal negative mark vulnerability.',
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
    <div className="min-h-screen bg-black text-on-surface flex flex-col selection:bg-primary selection:text-black">
      {/* ─── Top Ambient Telemetry Header ─── */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-primary font-bold tracking-widest text-sm uppercase">TOOPREP</span>
            <span className="text-white/30 font-light">//</span>
            <span className="text-white/70 uppercase text-xs tracking-widest group-hover:text-white transition-colors">
              JEE 2026
            </span>
          </Link>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase tracking-wider">
            PWA Offline
          </span>
        </div>

        <div className="flex items-center gap-3">
          {installPrompt && !installed && (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-primary/20 border border-primary text-primary hover:bg-primary hover:text-black transition-all rounded-xs text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 press-feedback"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {user ? (
            <button
              onClick={() => navigate('/')}
              className="px-4 py-1.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xs hover:brightness-110 transition-all flex items-center gap-1.5 press-feedback"
            >
              <span>Knowledge Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/auth')}
                className="px-3 py-1.5 text-white/70 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-1.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xs hover:brightness-110 transition-all flex items-center gap-1 press-feedback"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── Hero Section with Interactive Telemetry Widget ─── */}
      <section className="relative px-4 md:px-8 pt-10 md:pt-16 pb-12 max-w-6xl mx-auto w-full space-y-10 animate-slide-up">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Core Value Proposition */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-primary uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              SCIENTIFIC JEE TELEMETRY // 130 TOPICS
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extralight text-white tracking-tight leading-[1.15]">
              calibrate your <span className="font-normal text-primary">jee confidence</span> against actual reality.
            </h1>

            <p className="text-sm sm:text-base text-white/60 font-light leading-relaxed">
              Aspirants don’t lose ranks to difficult questions — they lose marks to <strong className="text-white font-medium">overconfidence</strong> in topics they thought they knew. TooPrep computes your subjective-to-objective performance gap to expose blind spots before the exam does.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => navigate(user ? '/' : '/auth')}
                className="px-6 py-3 bg-primary text-black font-mono font-bold text-xs uppercase tracking-widest rounded-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2 press-feedback"
              >
                <span>{user ? 'Open Knowledge Map' : 'Start Calibrating — Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#install"
                className="px-4 py-3 bg-surface-container border border-white/15 hover:border-primary text-white/80 hover:text-white font-mono text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span>Install on Phone</span>
              </a>
            </div>

            <div className="flex items-center gap-6 pt-3 border-t border-white/10 text-xs font-mono">
              <div>
                <div className="text-xl font-bold text-white">130</div>
                <div className="text-white/40 uppercase text-[10px]">Syllabus Topics</div>
              </div>
              <div className="w-px h-7 bg-white/10"></div>
              <div>
                <div className="text-xl font-bold text-primary">110</div>
                <div className="text-white/40 uppercase text-[10px]">Verified PYQs</div>
              </div>
              <div className="w-px h-7 bg-white/10"></div>
              <div>
                <div className="text-xl font-bold text-emerald-400">100%</div>
                <div className="text-white/40 uppercase text-[10px]">Offline PWA</div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Calibration Simulation Card */}
          <div className="lg:col-span-6">
            <div className="acrylic-glass border border-white/15 rounded-md p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-white/80 font-bold uppercase tracking-wider">Live Gap Diagnostic</span>
                </div>
                <span className="text-primary text-[11px]">fx =Acc - (Conf*10)</span>
              </div>

              {/* Slider 1: Self-Rated Confidence */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between items-center text-white/70">
                  <span>1. Your Self-Reported Confidence:</span>
                  <span className="text-primary font-bold text-sm bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
                    {demoConfidence} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={demoConfidence}
                  onChange={e => setDemoConfidence(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>1 (Zero Clue)</span>
                  <span>5 (Average)</span>
                  <span>10 (Mastery)</span>
                </div>
              </div>

              {/* Slider 2: Timed Mock Accuracy */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between items-center text-white/70">
                  <span>2. Timed Mock Test Accuracy:</span>
                  <span className="text-white font-bold text-sm bg-surface-container border border-white/15 px-2 py-0.5 rounded">
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
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>0% (Blanked Out)</span>
                  <span>50% (Cutoff Pace)</span>
                  <span>100% (Flawless)</span>
                </div>
              </div>

              {/* Dynamic Telemetry Calculation Display */}
              <div className="p-3.5 bg-black/60 rounded border border-white/10 space-y-2.5 font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 uppercase">Computed Calibration Gap:</span>
                    <span className={`text-base font-bold ${
                      demoGap < 0 ? 'text-error' : demoGap > 0 ? 'text-primary' : 'text-status-aligned'
                    }`}>
                      {demoGap > 0 ? `+${demoGap}%` : `${demoGap}%`}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${demoStatus.badgeClass}`}>
                    <DemoStatusIcon className="w-3 h-3" />
                    <span>{demoStatus.label}</span>
                  </span>
                </div>

                <p className="text-[11px] text-white/70 leading-relaxed font-sans">
                  {demoStatus.desc}
                </p>

                <div className="text-[10px] text-white/40 flex items-center gap-1.5 pt-1 border-t border-white/5">
                  <span className="text-primary font-bold">→ Recommended Action:</span>
                  <span className="text-white/80">{demoStatus.action}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3 Core Pillars (Compact Grid) ─── */}
      <section className="px-4 md:px-8 py-12 bg-neutral-950 border-y border-white/10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-1 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extralight text-white lowercase">
              how tooprep protects your rank
            </h2>
            <p className="text-xs font-mono text-white/50">
              Three precision tools designed to replace guesswork with empirical data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            {/* Feature 1 */}
            <div className="bg-surface-container/60 border border-white/10 hover:border-primary/50 p-5 rounded-sm space-y-3 transition-colors hover-lift group">
              <div className="w-9 h-9 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Grid className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-white font-sans">Excel Knowledge Map</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                40 chapters and 130 canonical topics in a spreadsheet matrix with in-cell confidence calibration, sortable columns, and instant overconfidence alerts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface-container/60 border border-white/10 hover:border-primary/50 p-5 rounded-sm space-y-3 transition-colors hover-lift group">
              <div className="w-9 h-9 rounded bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Timer className="w-4 h-4 stroke-[2]" />
              </div>
              <h3 className="text-base font-semibold text-white font-sans">Timed Mock Diagnostics</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Exam-grade pressure testing with withheld solutions to eliminate false confidence signals and expose topics susceptible to -1 negative penalties.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface-container/60 border border-white/10 hover:border-primary/50 p-5 rounded-sm space-y-3 transition-colors hover-lift group">
              <div className="w-9 h-9 rounded bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-white font-sans">100% Offline PWA</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Zero app store friction. Add to Android or iOS home screen in seconds. Study on commutes or at coaching without internet connectivity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Compact Phone & Desktop Install Section ─── */}
      <section id="install" className="px-4 md:px-8 py-12 max-w-4xl mx-auto w-full space-y-6">
        <div className="text-center space-y-1 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 border border-primary/30 rounded-full text-[11px] font-mono text-primary uppercase tracking-widest">
            <Zap className="w-3 h-3" />
            10-Second Installation
          </div>
          <h2 className="text-2xl sm:text-3xl font-extralight text-white lowercase">
            install on your device
          </h2>
          <p className="text-xs text-white/50 font-mono">
            No store downloads required. Installs directly via your web browser as a standalone app.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center">
          <div className="bg-neutral-900 p-1 rounded border border-white/15 inline-flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setActiveInstallTab('android')}
              className={`px-3.5 py-1.5 rounded transition-all flex items-center gap-1.5 press-feedback ${
                activeInstallTab === 'android'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>

            <button
              onClick={() => setActiveInstallTab('ios')}
              className={`px-3.5 py-1.5 rounded transition-all flex items-center gap-1.5 press-feedback ${
                activeInstallTab === 'ios'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iPhone (Safari)</span>
            </button>

            <button
              onClick={() => setActiveInstallTab('desktop')}
              className={`px-3.5 py-1.5 rounded transition-all flex items-center gap-1.5 press-feedback ${
                activeInstallTab === 'desktop'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
          </div>
        </div>

        {/* Concise Instructions Card */}
        <div className="acrylic-glass border border-white/15 rounded-md p-5 font-mono text-xs space-y-4">
          {activeInstallTab === 'android' && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-2 text-white font-medium">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Android Chrome / Brave / Edge Setup</span>
              </div>
              <ul className="space-y-1.5 text-white/60 pl-6 list-decimal">
                <li>Open this site in Chrome on your phone.</li>
                <li>Tap the three vertical dots (⋮) in the top-right corner.</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
              </ul>
            </div>
          )}

          {activeInstallTab === 'ios' && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-2 text-white font-medium">
                <Apple className="w-4 h-4 text-cyan-400" />
                <span>iPhone & iPad Safari Setup</span>
              </div>
              <ul className="space-y-1.5 text-white/60 pl-6 list-decimal">
                <li>Open this site in Safari on your iPhone.</li>
                <li>Tap the Share button in the bottom navigation bar.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>, then tap <strong>"Add"</strong>.</li>
              </ul>
            </div>
          )}

          {activeInstallTab === 'desktop' && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-2 text-white font-medium">
                <Monitor className="w-4 h-4 text-violet-400" />
                <span>Desktop Chrome / Edge Setup</span>
              </div>
              <ul className="space-y-1.5 text-white/60 pl-6 list-decimal">
                <li>Look at the right side of the address bar for the install icon (⊕).</li>
                <li>Click <strong>"Install TooPrep"</strong> to pin to your Windows Taskbar or Mac Dock.</li>
                <li>Enjoy distraction-free fullscreen mode with offline data sync.</li>
              </ul>
            </div>
          )}

          {/* 1-Click Install Button if supported by browser */}
          {installPrompt && !installed && (
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <span className="text-[11px] text-white/50">One-click install available:</span>
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-primary text-black font-bold text-[11px] uppercase tracking-wider rounded-xs hover:brightness-110 flex items-center gap-1.5 press-feedback"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Install on this Device</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Minimalist Footer ─── */}
      <footer className="mt-auto px-4 md:px-8 py-6 border-t border-white/10 bg-black text-xs font-mono text-white/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold">TOOPREP</span>
          <span>&middot;</span>
          <span>Scientific JEE Main Telemetry</span>
        </div>
        <div className="flex items-center gap-4 text-white/60">
          <a href="#install" className="hover:text-primary">Install Guide</a>
          <Link to="/auth" className="hover:text-primary">Sign In</Link>
          <button onClick={() => navigate(user ? '/' : '/auth')} className="text-primary hover:underline">
            {user ? 'Open Map →' : 'Get Started →'}
          </button>
        </div>
      </footer>
    </div>
  );
}
