import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';
import Icon, {
  LayoutGrid,
  Play,
  Timer,
  BookOpen,
  Activity,
  TrendingUp,
  User,
  ListTodo,
  MoreHorizontal,
  UploadCloud,
  RefreshCw,
  Sliders,
  LogOut,
  Palette,
  Sparkles,
  History,
  Zap,
  Grid,
  ChevronDown,
  X
} from './Icon';
import PWAInstallBanner from './PWAInstallBanner';

const PIVOT_ITEMS = [
  { path: '/', label: 'map', icon: LayoutGrid },
  { path: '/practice', label: 'practice', icon: Play },
  { path: '/evaluate', label: 'evaluate', icon: Timer },
  { path: '/questions', label: 'questions', icon: BookOpen },
  { path: '/insights', label: 'insights', icon: Activity },
  { path: '/trends', label: 'trends', icon: TrendingUp },
  { path: '/plan', label: 'study plan', icon: ListTodo },
  { path: '/profile', label: 'profile', icon: User },
];

const ACCENT_COLORS = [
  { id: 'cyan', name: 'Lumia Cyan', hex: '#00BFFF', container: '#0078D7' },
  { id: 'mango', name: 'Mango Orange', hex: '#FF8C00', container: '#D97706' },
  { id: 'crimson', name: 'Crimson Red', hex: '#FF2E55', container: '#DC2626' },
  { id: 'emerald', name: 'Xbox Emerald', hex: '#107C10', container: '#059669' },
  { id: 'violet', name: 'Neon Violet', hex: '#A855F7', container: '#7C3AED' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accentColor, setAccentColor] = useState('cyan');
  const [timeStr, setTimeStr] = useState('');

  // Live system clock for status rail
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initialize and apply accent theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tooprep_accent') || 'cyan';
    applyAccent(saved);
  }, []);

  const applyAccent = (accentId) => {
    const found = ACCENT_COLORS.find(c => c.id === accentId) || ACCENT_COLORS[0];
    setAccentColor(found.id);
    document.documentElement.style.setProperty('--color-primary', found.hex);
    document.documentElement.style.setProperty('--color-primary-container', found.container);
    localStorage.setItem('tooprep_accent', found.id);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-black text-on-surface flex flex-col selection:bg-primary selection:text-black">
      {/* ─── PWA Offline Telemetry & Install Banner ─── */}
      <PWAInstallBanner />

      {/* ─── Top Ambient OS Telemetry Rail (Windows Phone Status Bar) ─── */}
      <header className="sticky top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-2.5 flex items-center justify-between text-label-sm-mono text-xs tracking-wider z-50">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-primary font-bold tracking-widest text-[11px] uppercase">TOOPREP</span>
            <span className="text-white/30 font-light">//</span>
            <span className="text-white/70 uppercase text-[11px] tracking-widest group-hover:text-white transition-colors">
              JEE 2026
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-status-aligned animate-pulse"></span>
            <span className="text-white/50 text-[10px]">110 VERIFIED PYQS</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-white/60">
          <span className="font-mono text-[11px] hidden sm:inline">{timeStr}</span>

          {/* Accent Color Palette Quick Switcher */}
          <div className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-full border border-white/10">
            {ACCENT_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => applyAccent(c.id)}
                title={c.name}
                className={`w-3.5 h-3.5 rounded-full transition-transform ${accentColor === c.id ? 'scale-125 ring-2 ring-white' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          {/* User Profile Pill */}
          <Link
            to="/profile"
            className="flex items-center gap-2 pl-1 text-white/80 hover:text-primary transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-[10px] font-bold">
              {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')}
            </div>
            <span className="text-[11px] font-sans lowercase hidden md:inline truncate max-w-[90px]">
              {profile?.display_name || user?.email?.split('@')[0] || 'student'}
            </span>
          </Link>

          {/* System Options Menu Toggle (•••) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-1.5 rounded border transition-colors ${
              menuOpen
                ? 'bg-primary/20 border-primary text-primary'
                : 'border-white/15 hover:border-primary text-white/70 hover:text-white bg-surface-container/60'
            }`}
            title="System Navigation & Tools"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── Expandable Header Slide-Down Menu ─── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="sticky top-[45px] z-40 bg-neutral-950/95 backdrop-blur-xl border-b border-white/15 px-4 md:px-8 py-4 shadow-2xl overflow-hidden"
          >
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
                  {profile?.is_admin ? 'Administrative & Student Systems' : 'Student Navigation & System Tools'}
                </span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-white/40 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* If Admin: Staff Operations */}
              {profile?.is_admin && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                    Administrative Access // Staff Only
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                    <button
                      onClick={() => { navigate('/admin/content'); setMenuOpen(false); }}
                      className="p-3 bg-surface-container hover:bg-surface-bright rounded-xs border border-white/10 hover:border-primary transition-colors text-left flex items-center gap-2.5 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Content Ops</div>
                        <div className="text-[10px] text-white/40">PDF Question Review</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { navigate('/admin/questions'); setMenuOpen(false); }}
                      className="p-3 bg-surface-container hover:bg-surface-bright rounded-xs border border-white/10 hover:border-primary transition-colors text-left flex items-center gap-2.5 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Admin Bank</div>
                        <div className="text-[10px] text-white/40">Full Database Browser</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { navigate('/admin/syncs'); setMenuOpen(false); }}
                      className="p-3 bg-surface-container hover:bg-surface-bright rounded-xs border border-white/10 hover:border-primary transition-colors text-left flex items-center gap-2.5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Sync Monitor</div>
                        <div className="text-[10px] text-white/40">Storage Telemetry</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Student Navigation Tools */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs font-mono">
                <button
                  onClick={() => { navigate('/plan'); setMenuOpen(false); }}
                  className="p-3 bg-surface-container/60 hover:bg-surface-bright rounded-xs border border-white/10 hover:border-primary transition-colors text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <ListTodo className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Study Plan</div>
                    <div className="text-[10px] text-white/40">Topic Checklist</div>
                  </div>
                </button>

                <button
                  onClick={() => { navigate('/trends'); setMenuOpen(false); }}
                  className="p-3 bg-surface-container/60 hover:bg-surface-bright rounded-xs border border-white/10 hover:border-primary transition-colors text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Trends</div>
                    <div className="text-[10px] text-white/40">Calibration Curve</div>
                  </div>
                </button>

                <button
                  onClick={() => { navigate('/history'); setMenuOpen(false); }}
                  className="p-3 bg-surface-container/60 hover:bg-surface-bright rounded-xs border border-white/10 hover:border-primary transition-colors text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <History className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="font-semibold text-white">History</div>
                    <div className="text-[10px] text-white/40">Past Evaluations</div>
                  </div>
                </button>

                <button
                  onClick={() => { navigate('/install'); setMenuOpen(false); }}
                  className="p-3 bg-primary/10 hover:bg-primary/20 rounded-xs border border-primary/30 transition-colors text-left flex items-center gap-2.5 text-primary cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Install App</div>
                    <div className="text-[10px] text-primary/70">Phone & PWA Guide</div>
                  </div>
                </button>

                <button
                  onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                  className="p-3 bg-surface-container/60 hover:bg-surface-bright rounded-xs border border-white/10 hover:border-primary transition-colors text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Profile</div>
                    <div className="text-[10px] text-white/40">Preferences</div>
                  </div>
                </button>

                <button
                  onClick={() => { handleSignOut(); setMenuOpen(false); }}
                  className="p-3 bg-error/10 hover:bg-error/20 rounded-xs border border-error/20 transition-colors text-left flex items-center gap-2.5 text-error cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-error shrink-0" />
                  <div>
                    <div className="font-semibold">Sign Out</div>
                    <div className="text-[10px] opacity-70">End Session</div>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Iconic Panoramic Pivot Header (Windows Phone Panorama Horizon) ─── */}
      <nav className="w-full bg-black/60 backdrop-blur-sm border-b border-white/5 px-4 md:px-8 pt-4 pb-1 overflow-x-auto no-scrollbar z-30">
        <div className="flex items-center gap-6 md:gap-9 min-w-max">
          {PIVOT_ITEMS.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const ItemIcon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group relative pb-2.5 transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                <ItemIcon
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-all ${
                    isActive ? 'text-primary scale-110' : 'opacity-40 group-hover:opacity-100'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.75}
                />

                <span
                  className={`text-xl md:text-2xl lowercase font-extralight tracking-tight transition-all ${
                    isActive ? 'font-light scale-100 text-white' : 'opacity-70 group-hover:opacity-100'
                  }`}
                >
                  {item.label}
                </span>

                {/* Active Indicator Bar with Smooth Gliding Physics */}
                {isActive && (
                  <motion.span
                    layoutId="pivotIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ─── Main Panoramic Content Canvas ─── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
