import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import Icon, {
  Play,
  Timer,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Layers,
  BookOpen,
  Sparkles,
  ArrowRight,
  ChevronRight,
  User,
  Check,
  Target,
  GraduationCap,
  History,
  ListTodo,
  Activity,
  Zap,
  Grid,
  Smartphone,
  Apple,
  Monitor
} from '@/shared/components/Icon';

export default function LandingPage({ defaultTab = 'overview' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState('android'); // 'android', 'ios', 'desktop'

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

  return (
    <div className="min-h-screen bg-black text-on-surface flex flex-col selection:bg-primary selection:text-black">
      {/* ─── Top Telemetry Navbar ─── */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-primary font-bold tracking-widest text-sm uppercase">TOOPREP</span>
            <span className="text-white/30 font-light">//</span>
            <span className="text-white/70 uppercase text-xs tracking-widest group-hover:text-white transition-colors">
              JEE 2026
            </span>
          </Link>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase tracking-wider">
            PWA Enabled
          </span>
        </div>

        <div className="flex items-center gap-3">
          {installPrompt && !installed && (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-primary/20 border border-primary text-primary hover:bg-primary hover:text-black transition-all rounded-xs text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {user ? (
            <button
              onClick={() => navigate('/')}
              className="px-4 py-1.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xs hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <span>Open Map</span>
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
                className="px-4 py-1.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xs hover:brightness-110 transition-all flex items-center gap-1"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative px-4 md:px-8 pt-16 md:pt-24 pb-16 max-w-6xl mx-auto w-full">
        <div className="space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-primary uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            SCIENTIFIC CALIBRATION // 130 SYLLABUS TOPICS
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extralight text-white tracking-tight leading-[1.1]">
            calibrate your <span className="font-normal text-primary">jee confidence</span> against actual reality.
          </h1>

          <p className="text-base sm:text-lg text-white/60 font-light leading-relaxed max-w-2xl">
            Aspirants don’t fail because of what they don’t know — they fail because of what they <strong className="text-white font-medium">think</strong> they know. TooPrep cross-references your self-reported confidence against timed mock accuracy to expose dangerous overconfidence gaps before the exam does.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => navigate(user ? '/' : '/auth')}
              className="px-6 py-3.5 bg-primary text-black font-mono font-bold text-sm uppercase tracking-widest rounded-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
            >
              <span>{user ? 'Launch Knowledge Map' : 'Start Calibrating — Free'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#install-guide"
              className="px-5 py-3.5 bg-surface-container border border-white/15 hover:border-primary text-white/90 hover:text-white font-mono text-sm uppercase tracking-wider rounded-xs transition-colors flex items-center gap-2"
            >
              <span>How to Install on Phone</span>
              <span className="text-primary font-bold">↓</span>
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs font-mono">
            <div>
              <div className="text-2xl font-bold text-white">130</div>
              <div className="text-white/40 uppercase mt-0.5">Syllabus Topics</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">110</div>
              <div className="text-white/40 uppercase mt-0.5">Verified PYQs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">0 KB</div>
              <div className="text-white/40 uppercase mt-0.5">App Store Friction</div>
            </div>
          </div>
        </div>

        {/* ─── Hero Spreadsheet Simulation Card ─── */}
        <div className="mt-12 acrylic-glass border border-neutral-800 rounded-sm overflow-hidden shadow-2xl">
          <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs font-mono text-white/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
              <span className="ml-2 text-white/70">JEE_Main_Knowledge_Map.xlsx</span>
            </div>
            <span className="text-primary font-bold">fx =CALIBRATE(accuracy, confidence)</span>
          </div>

          <div className="overflow-x-auto text-xs font-mono">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-950 text-white/40 border-b border-neutral-800">
                <tr>
                  <th className="p-2.5 border-r border-neutral-800 text-center w-10">#</th>
                  <th className="p-2.5 border-r border-neutral-800 w-24">Subject</th>
                  <th className="p-2.5 border-r border-neutral-800">Chapter & Topic</th>
                  <th className="p-2.5 border-r border-neutral-800 text-center w-24">Confidence</th>
                  <th className="p-2.5 border-r border-neutral-800 text-center w-24">Mock Acc</th>
                  <th className="p-2.5 border-r border-neutral-800 text-center w-20">Gap</th>
                  <th className="p-2.5 text-center w-36">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 bg-black">
                <tr className="hover:bg-neutral-900/40">
                  <td className="p-2.5 text-center text-white/30 border-r border-neutral-800">14</td>
                  <td className="p-2.5 border-r border-neutral-800"><span className="text-primary font-bold">Physics</span></td>
                  <td className="p-2.5 border-r border-neutral-800 text-white">Laws of Motion › Friction</td>
                  <td className="p-2.5 text-center border-r border-neutral-800 text-primary font-bold">9 / 10</td>
                  <td className="p-2.5 text-center border-r border-neutral-800 text-error font-bold">33%</td>
                  <td className="p-2.5 text-center border-r border-neutral-800 text-error font-bold">-57%</td>
                  <td className="p-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-error/20 text-error border border-error/40">
                      Overconfident ⚠️
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-neutral-900/40">
                  <td className="p-2.5 text-center text-white/30 border-r border-neutral-800">42</td>
                  <td className="p-2.5 border-r border-neutral-800"><span className="text-amber-400 font-bold">Chemistry</span></td>
                  <td className="p-2.5 border-r border-neutral-800 text-white">Chemical Kinetics › Rate Laws</td>
                  <td className="p-2.5 text-center border-r border-neutral-800 text-primary font-bold">7 / 10</td>
                  <td className="p-2.5 text-center border-r border-neutral-800 text-status-aligned font-bold">75%</td>
                  <td className="p-2.5 text-center border-r border-neutral-800 text-status-aligned font-bold">+5%</td>
                  <td className="p-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-status-aligned/20 text-status-aligned border border-status-aligned/40 inline-flex items-center gap-1">
                      <span>Aligned</span>
                      <Target className="w-3 h-3 text-status-aligned" />
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-neutral-900/40">
                  <td className="p-2.5 text-center text-white/30 border-r border-neutral-800">88</td>
                  <td className="p-2.5 border-r border-neutral-800"><span className="text-emerald-400 font-bold">Maths</span></td>
                  <td className="p-2.5 border-r border-neutral-800 text-white">Integral Calculus › Definite Integrals</td>
                  <td className="p-2.5 text-center border-r border-neutral-800 text-primary font-bold">4 / 10</td>
                  <td className="p-2.5 text-center border-r border-neutral-800 text-primary font-bold">80%</td>
                  <td className="p-2.5 text-center border-r border-neutral-800 text-primary font-bold">+40%</td>
                  <td className="p-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-primary/20 text-primary border border-primary/40 inline-flex items-center gap-1">
                      <span>Underconfident</span>
                      <TrendingUp className="w-3 h-3 text-primary" />
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Core Pillars (Metro Tiles Grid) ─── */}
      <section className="px-4 md:px-8 py-16 bg-neutral-950 border-y border-white/10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-xs font-mono text-primary uppercase tracking-[0.25em]">
              The Diagnostic Methodology
            </div>
            <h2 className="text-3xl sm:text-4xl font-extralight text-white lowercase">
              engineered for severe exam precision
            </h2>
            <p className="text-sm text-white/60 font-light">
              Built on mathematical telemetry rather than gut feeling. Here is how TooPrep protects your JEE rank.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tile 1 */}
            <div className="bg-surface-container/60 border border-white/10 hover:border-primary p-6 rounded-sm space-y-4 transition-colors group">
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Grid className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-light text-white lowercase">Excel-Style Knowledge Map</h3>
              <p className="text-xs font-mono text-white/50 leading-relaxed">
                40 chapters and 130 topics organized in an authentic spreadsheet matrix with sticky headers, in-cell confidence calibration, and instant column sorting.
              </p>
            </div>

            {/* Tile 2 */}
            <div className="bg-surface-container/60 border border-white/10 hover:border-primary p-6 rounded-sm space-y-4 transition-colors group">
              <div className="w-10 h-10 rounded bg-error/10 border border-error/30 flex items-center justify-center text-error group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-light text-white lowercase">Overconfidence Detection</h3>
              <p className="text-xs font-mono text-white/50 leading-relaxed">
                Our algorithm triggers an alert whenever your rating exceeds performance by ≥20% with statistical validation (≥10 attempts), saving you from -1 negative marks.
              </p>
            </div>

            {/* Tile 3 */}
            <div className="bg-surface-container/60 border border-white/10 hover:border-primary p-6 rounded-sm space-y-4 transition-colors group">
              <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-light text-white lowercase">Verified PYQ Question Bank</h3>
              <p className="text-xs font-mono text-white/50 leading-relaxed">
                Authentic JEE Main online exam questions curated across Physics, Chemistry, and Mathematics with KaTeX rendered math and step-by-step derivations.
              </p>
            </div>

            {/* Tile 4 */}
            <div className="bg-surface-container/60 border border-white/10 hover:border-primary p-6 rounded-sm space-y-4 transition-colors group">
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <h3 className="text-xl font-light text-white lowercase">Rapid Foundation Drills</h3>
              <p className="text-xs font-mono text-white/50 leading-relaxed">
                Untimed practice mode with immediate answer verification. Test formulas, review complete solutions, and build muscle memory.
              </p>
            </div>

            {/* Tile 5 */}
            <div className="bg-surface-container/60 border border-white/10 hover:border-primary p-6 rounded-sm space-y-4 transition-colors group">
              <div className="w-10 h-10 rounded bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Timer className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-xl font-light text-white lowercase">Timed Mock Diagnostics</h3>
              <p className="text-xs font-mono text-white/50 leading-relaxed">
                Real test pressure with answer withholding. Solutions are kept secure until submission to prevent false confidence signals.
              </p>
            </div>

            {/* Tile 6 */}
            <div className="bg-surface-container/60 border border-white/10 hover:border-primary p-6 rounded-sm space-y-4 transition-colors group">
              <div className="w-10 h-10 rounded bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-light text-white lowercase">100% Offline PWA</h3>
              <p className="text-xs font-mono text-white/50 leading-relaxed">
                Zero app store friction. Add directly to your Android or iOS home screen. Practice on trains, planes, or coaching centers without internet connection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PWA Mobile Installation Guide Section ─── */}
      <section id="install-guide" className="px-4 md:px-8 py-20 max-w-5xl mx-auto w-full space-y-10">
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-mono text-primary uppercase tracking-widest">
            <Zap className="w-3 h-3" />
            PROGRESSIVE WEB APP INSTALL GUIDE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extralight text-white lowercase">
            install on your phone in 10 seconds
          </h2>
          <p className="text-sm text-white/60 font-mono">
            No Play Store or App Store required. Installs as a lightweight, fullscreen native app directly from your browser.
          </p>
        </div>

        {/* Platform Switcher Tabs */}
        <div className="flex justify-center">
          <div className="bg-neutral-900 p-1.5 rounded border border-white/15 inline-flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setActiveInstallTab('android')}
              className={`px-4 py-2 rounded transition-all flex items-center gap-2 ${
                activeInstallTab === 'android'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Android (Chrome)</span>
            </button>

            <button
              onClick={() => setActiveInstallTab('ios')}
              className={`px-4 py-2 rounded transition-all flex items-center gap-2 ${
                activeInstallTab === 'ios'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>iPhone (Safari)</span>
            </button>

            <button
              onClick={() => setActiveInstallTab('desktop')}
              className={`px-4 py-2 rounded transition-all flex items-center gap-2 ${
                activeInstallTab === 'desktop'
                  ? 'bg-primary text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Desktop (Chrome/Edge)</span>
            </button>
          </div>
        </div>

        {/* ─── Platform Instructions Box ─── */}
        <div className="acrylic-glass border border-white/15 rounded-md p-6 sm:p-8 space-y-8 max-w-3xl mx-auto">
          {/* 1. Android Guide */}
          {activeInstallTab === 'android' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl shrink-0">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white font-sans">Android Installation (Chrome / Brave / Edge)</h3>
                  <p className="text-xs text-white/50 font-mono">Runs fullscreen with offline caching & system theme matching.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">1</span>
                  <div className="space-y-1">
                    <strong className="text-white">Open in Chrome or your preferred browser</strong>
                    <p className="text-white/60">Navigate to this website on your Android phone.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">2</span>
                  <div className="space-y-1">
                    <strong className="text-white">Tap the three vertical dots (⋮)</strong>
                    <p className="text-white/60">Located at the top right of your Chrome screen.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">3</span>
                  <div className="space-y-1">
                    <strong className="text-white">Select "Install app" or "Add to Home screen"</strong>
                    <p className="text-white/60">Chrome will prompt you with the TooPrep neon lightning insignia.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">4</span>
                  <div className="space-y-1">
                    <strong className="text-white">Tap "Install"</strong>
                    <p className="text-white/60">TooPrep is placed on your home screen and launches without browser address bars!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. iOS Guide */}
          {activeInstallTab === 'ios' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl shrink-0">
                  <Apple className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white font-sans">iPhone & iPad Installation (Apple Safari)</h3>
                  <p className="text-xs text-white/50 font-mono">Apple requires using Safari for progressive web app installation.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">1</span>
                  <div className="space-y-1">
                    <strong className="text-white">Open in Safari</strong>
                    <p className="text-white/60">Open TooPrep using Safari on your iPhone.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">2</span>
                  <div className="space-y-1">
                    <strong className="text-white">Tap the Share button</strong>
                    <p className="text-white/60">The square icon with an upward arrow in the bottom toolbar.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">3</span>
                  <div className="space-y-1">
                    <strong className="text-white">Scroll down and tap "Add to Home Screen"</strong>
                    <p className="text-white/60">Look for "Add to Home Screen" in the share actions list.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">4</span>
                  <div className="space-y-1">
                    <strong className="text-white">Tap "Add" in the top-right corner</strong>
                    <p className="text-white/60">TooPrep appears on your iOS home screen as a standalone dark-mode app!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Desktop Guide */}
          {activeInstallTab === 'desktop' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xl shrink-0">
                  <Monitor className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white font-sans">Desktop Installation (Chrome / Edge)</h3>
                  <p className="text-xs text-white/50 font-mono">Pin TooPrep directly to your Windows Taskbar or Mac Dock.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">1</span>
                  <div className="space-y-1">
                    <strong className="text-white">Look at your address bar</strong>
                    <p className="text-white/60">On the right side of the URL address bar in Chrome/Edge, you will see an install icon (⊕ or computer icon).</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">2</span>
                  <div className="space-y-1">
                    <strong className="text-white">Click "Install TooPrep"</strong>
                    <p className="text-white/60">A dialog will confirm installation.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-900/60 rounded border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">3</span>
                  <div className="space-y-1">
                    <strong className="text-white">Enjoy standalone desktop window</strong>
                    <p className="text-white/60">Opens as a separate, distraction-free app window with keyboard shortcuts and offline persistence.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive 1-Click Install Button (if browser supports it) */}
          {installPrompt && !installed && (
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-white/70">
                Your browser supports one-click instant installation!
              </div>
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-6 py-3 bg-primary text-black font-mono font-bold text-xs uppercase tracking-widest rounded-xs hover:brightness-110 flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20"
              >
                <Zap className="w-4 h-4" />
                <span>Install TooPrep on this Device</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Frequently Asked Questions (FAQ) ─── */}
      <section className="px-4 md:px-8 py-16 bg-neutral-950 border-t border-white/10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extralight text-white lowercase">
              frequently asked questions
            </h2>
            <p className="text-xs font-mono text-white/50">
              Clear answers regarding TooPrep technology and curriculum.
            </p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="p-5 bg-black rounded border border-white/10 space-y-2">
              <h4 className="text-sm font-semibold text-white">Why does TooPrep focus on "Confidence vs Accuracy"?</h4>
              <p className="text-white/60 leading-relaxed">
                In competitive exams like JEE Main and Advanced, overconfidence is the #1 cause of negative marks. When a student rates a topic 9/10 but scores 30%, they attempt questions blindly in the actual exam and lose points. By calculating your calibration gap, TooPrep shows you exactly where to study next.
              </p>
            </div>

            <div className="p-5 bg-black rounded border border-white/10 space-y-2">
              <h4 className="text-sm font-semibold text-white">Does TooPrep work without an active internet connection?</h4>
              <p className="text-white/60 leading-relaxed">
                Yes! TooPrep is an offline-first Progressive Web App (PWA). The core app shell, syllabus matrix, and cached question telemetry are stored locally in your browser's persistent storage via Service Workers.
              </p>
            </div>

            <div className="p-5 bg-black rounded border border-white/10 space-y-2">
              <h4 className="text-sm font-semibold text-white">Is TooPrep free for students?</h4>
              <p className="text-white/60 leading-relaxed">
                Yes. TooPrep is built to empower JEE 2026 & 2027 aspirants with professional telemetry and zero paywalls or intrusive ads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bottom Call to Action ─── */}
      <section className="px-4 md:px-8 py-20 text-center border-t border-white/10 max-w-4xl mx-auto w-full space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extralight text-white lowercase tracking-tight">
          ready to eliminate your blind spots?
        </h2>
        <p className="text-sm text-white/60 font-mono max-w-xl mx-auto">
          Start diagnosing your syllabus today. In 15 minutes, you will discover exactly which topics are putting your rank at risk.
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate(user ? '/' : '/auth')}
            className="px-8 py-4 bg-primary text-black font-mono font-bold text-sm uppercase tracking-widest rounded-xs hover:brightness-110 shadow-xl shadow-primary/20 transition-all"
          >
            {user ? 'Open Your Knowledge Map' : 'Launch Free Account'}
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-4 md:px-8 py-8 border-t border-white/10 bg-black text-xs font-mono text-white/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold">TOOPREP</span>
          <span>&middot;</span>
          <span>Scientific JEE Main Telemetry Platform</span>
        </div>
        <div className="flex items-center gap-4 text-white/60">
          <Link to="/about" className="hover:text-primary">About</Link>
          <a href="#install-guide" className="hover:text-primary">Install PWA</a>
          <Link to="/auth" className="hover:text-primary">Sign In</Link>
        </div>
      </footer>
    </div>
  );
}
