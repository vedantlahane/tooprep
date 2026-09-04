import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  History
} from './Icon';

const PIVOT_ITEMS = [
  { path: '/', label: 'map', icon: 'map' },
  { path: '/practice', label: 'practice', icon: 'practice' },
  { path: '/evaluate', label: 'evaluate', icon: 'evaluate' },
  { path: '/questions', label: 'questions', icon: 'questions' },
  { path: '/insights', label: 'insights', icon: 'insights' },
  { path: '/trends', label: 'trends', icon: 'trends' },
  { path: '/plan', label: 'study plan', icon: 'checklist' },
  { path: '/profile', label: 'profile', icon: 'profile' },
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
  const [appBarOpen, setAppBarOpen] = useState(false);
  const [accentColor, setAccentColor] = useState('cyan');
  const [timeStr, setTimeStr] = useState('');

  // Live system clock for Windows Phone status rail
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
      {/* ─── Top Ambient OS Telemetry Rail (Windows Phone Status Bar) ─── */}
      <header className="w-full bg-black/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-2.5 flex items-center justify-between text-label-sm-mono text-xs tracking-wider z-40">
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

        <div className="flex items-center gap-4 text-white/60">
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
            className="flex items-center gap-2 pl-2 text-white/80 hover:text-primary transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-[10px] font-bold">
              {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')}
            </div>
            <span className="text-[11px] font-sans lowercase hidden md:inline">
              {profile?.display_name || user?.email?.split('@')[0] || 'student'}
            </span>
          </Link>
        </div>
      </header>

      {/* ─── Iconic Panoramic Pivot Header (Windows Phone Panorama Horizon) ─── */}
      <nav className="w-full bg-black/60 backdrop-blur-sm border-b border-white/5 px-4 md:px-8 pt-4 pb-1 overflow-x-auto no-scrollbar z-30">
        <div className="flex items-baseline gap-6 md:gap-10 min-w-max">
          {PIVOT_ITEMS.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group relative pb-2 transition-all duration-200 flex items-baseline gap-2 ${
                  isActive
                    ? 'text-white'
                    : 'text-white/35 hover:text-white/70'
                }`}
              >
                <span
                  className={`text-2xl md:text-3xl lowercase font-extralight tracking-tight transition-all ${
                    isActive ? 'font-light scale-100 text-white' : 'opacity-60 group-hover:opacity-100'
                  }`}
                >
                  {item.label}
                </span>

                {/* Active Indicator Bar */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ─── Main Panoramic Content Canvas ─── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-36 md:pb-28">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* ─── Signature Windows Phone Metro Bottom Application Bar (App Bar) ─── */}
      <footer className="fixed bottom-0 left-0 w-full z-50 acrylic-glass-strong border-t border-white/10 px-4 py-2 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Quick Action Circle Buttons */}
          <div className="flex items-center gap-5 sm:gap-8">
            <button
              onClick={() => navigate('/practice')}
              className="flex flex-col items-center group"
              title="Rapid Practice Drill"
            >
              <div className={`metro-circle-btn ${location.pathname === '/practice' ? 'border-primary text-primary bg-primary/10' : ''}`}>
                <Play className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase mt-1 text-white/60 group-hover:text-white">
                drill
              </span>
            </button>

            <button
              onClick={() => navigate('/evaluate')}
              className="flex flex-col items-center group"
              title="Timed Mock Evaluation"
            >
              <div className={`metro-circle-btn ${location.pathname === '/evaluate' ? 'border-primary text-primary bg-primary/10' : ''}`}>
                <Timer className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase mt-1 text-white/60 group-hover:text-white">
                mock
              </span>
            </button>

            <button
              onClick={() => navigate('/questions')}
              className="flex flex-col items-center group"
              title="Browse 110 Verified Questions"
            >
              <div className={`metro-circle-btn ${location.pathname === '/questions' ? 'border-primary text-primary bg-primary/10' : ''}`}>
                <BookOpen className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase mt-1 text-white/60 group-hover:text-white">
                bank
              </span>
            </button>

            <button
              onClick={() => navigate('/insights')}
              className="flex flex-col items-center group"
              title="Confidence Gap Insights"
            >
              <div className={`metro-circle-btn ${location.pathname === '/insights' ? 'border-primary text-primary bg-primary/10' : ''}`}>
                <Activity className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase mt-1 text-white/60 group-hover:text-white">
                insights
              </span>
            </button>
          </div>

          {/* The Iconic Metro ••• Expander Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAppBarOpen(!appBarOpen)}
              className="metro-circle-btn hover:border-primary text-white"
              title="More Options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Expandable Windows Phone Flyout Drawer ─── */}
        {appBarOpen && (
          <div className="mt-3 pt-3 border-t border-white/10 max-w-7xl mx-auto animate-fade-in">
            {profile?.is_admin ? (
              /* Admin Operations Drawer */
              <div>
                <div className="text-[10px] font-mono text-primary uppercase tracking-widest mb-2 px-1">
                  Administrative Tools // Staff Only
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <button
                    onClick={() => { navigate('/admin/content'); setAppBarOpen(false); }}
                    className="flex items-center gap-3 p-3 bg-surface-container hover:bg-surface-bright rounded-sm border border-white/5 transition-colors text-left"
                  >
                    <UploadCloud className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold text-xs uppercase tracking-wider text-white">Content Ops</div>
                      <div className="text-[11px] text-white/50">PDF Ingestion & Review</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { navigate('/admin/questions'); setAppBarOpen(false); }}
                    className="flex items-center gap-3 p-3 bg-surface-container hover:bg-surface-bright rounded-sm border border-white/5 transition-colors text-left"
                  >
                    <BookOpen className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold text-xs uppercase tracking-wider text-white">Admin Bank</div>
                      <div className="text-[11px] text-white/50">Full Database Browser</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { navigate('/admin/syncs'); setAppBarOpen(false); }}
                    className="flex items-center gap-3 p-3 bg-surface-container hover:bg-surface-bright rounded-sm border border-white/5 transition-colors text-left"
                  >
                    <RefreshCw className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold text-xs uppercase tracking-wider text-white">Sync Monitor</div>
                      <div className="text-[11px] text-white/50">Storage Telemetry</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { handleSignOut(); setAppBarOpen(false); }}
                    className="flex items-center gap-3 p-3 bg-error/10 hover:bg-error/20 rounded-sm border border-error/20 transition-colors text-left text-error"
                  >
                    <LogOut className="w-5 h-5 text-error shrink-0" />
                    <div>
                      <div className="font-semibold text-xs uppercase tracking-wider">Sign Out</div>
                      <div className="text-[11px] opacity-70">End current session</div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Student Tools Drawer */
              <div>
                <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-2 px-1">
                  Student Navigation & Tools
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  <button
                    onClick={() => { navigate('/plan'); setAppBarOpen(false); }}
                    className="flex items-center gap-3 p-3 bg-surface-container hover:bg-surface-bright rounded-sm border border-white/5 transition-colors text-left"
                  >
                    <ListTodo className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold text-xs uppercase tracking-wider text-white">Study Plan</div>
                      <div className="text-[11px] text-white/50">Topics & Checklist</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { navigate('/trends'); setAppBarOpen(false); }}
                    className="flex items-center gap-3 p-3 bg-surface-container hover:bg-surface-bright rounded-sm border border-white/5 transition-colors text-left"
                  >
                    <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold text-xs uppercase tracking-wider text-white">Trends</div>
                      <div className="text-[11px] text-white/50">Accuracy Trajectory</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { navigate('/history'); setAppBarOpen(false); }}
                    className="flex items-center gap-3 p-3 bg-surface-container hover:bg-surface-bright rounded-sm border border-white/5 transition-colors text-left"
                  >
                    <History className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold text-xs uppercase tracking-wider text-white">History</div>
                      <div className="text-[11px] text-white/50">Past Sessions & Evals</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { navigate('/profile'); setAppBarOpen(false); }}
                    className="flex items-center gap-3 p-3 bg-surface-container hover:bg-surface-bright rounded-sm border border-white/5 transition-colors text-left"
                  >
                    <User className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold text-xs uppercase tracking-wider text-white">Profile</div>
                      <div className="text-[11px] text-white/50">Exam Year & Stats</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { handleSignOut(); setAppBarOpen(false); }}
                    className="flex items-center gap-3 p-3 bg-error/10 hover:bg-error/20 rounded-sm border border-error/20 transition-colors text-left text-error col-span-2 sm:col-span-1"
                  >
                    <LogOut className="w-5 h-5 text-error shrink-0" />
                    <div>
                      <div className="font-semibold text-xs uppercase tracking-wider">Sign Out</div>
                      <div className="text-[11px] opacity-70">End session</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
