import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';
import Icon, {
  Activity,
  BookOpen,
  LayoutGrid,
  UploadCloud,
  RefreshCw,
  ArrowLeft,
  Shield,
  LogOut,
  Sliders,
  Sparkles
} from './Icon';

const ADMIN_PIVOT_ITEMS = [
  { path: '/admin', label: 'overview', icon: Activity },
  { path: '/admin/questions', label: 'question bank', icon: BookOpen },
  { path: '/admin/curriculum', label: 'curriculum matrix', icon: LayoutGrid },
  { path: '/admin/content', label: 'content ops', icon: UploadCloud },
  { path: '/admin/syncs', label: 'projection sync', icon: RefreshCw },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (e) {
      console.error(e);
    }
  };

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin' || location.pathname === '/admin/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-black text-on-surface flex flex-col selection:bg-primary selection:text-black">
      {/* ─── Top Ambient Admin Telemetry Rail ─── */}
      <header className="sticky top-0 w-full bg-black/95 backdrop-blur-md border-b border-primary/30 px-4 md:px-8 py-2.5 flex items-center justify-between text-label-sm-mono text-xs tracking-wider z-50">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="flex items-center gap-2 group">
            <span className="text-primary font-bold tracking-widest text-[11px] uppercase">TOOPREP</span>
            <span className="text-white/30 font-light">//</span>
            <span className="text-status-weak font-bold uppercase text-[11px] tracking-widest flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-status-weak" />
              <span>ADMIN CONSOLE</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-white/15 text-[10px] font-mono text-white/50">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-aligned animate-pulse"></span>
              <span>SUPABASE: LIVE</span>
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              <span>PIPELINE: ACTIVE</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-white/50 hidden sm:inline">{timeStr}</span>

          {/* Return to Student Portal button */}
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1 bg-surface-container border border-white/15 hover:border-primary text-white/80 hover:text-white transition-colors text-[11px] font-mono uppercase tracking-wider rounded-none"
            title="Switch back to student preparation portal"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-primary" />
            <span>Student App</span>
          </Link>

          {/* Admin profile pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/15">
            <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-[10px] font-bold">
              {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'A')}
            </div>
            <span className="text-[11px] font-mono text-white/80 hidden md:inline truncate max-w-[100px]">
              {profile?.display_name || user?.email?.split('@')[0] || 'admin'}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="p-1 text-white/40 hover:text-error transition-colors"
            title="Sign out of admin session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── Windows Phone Panoramic Pivot Bar for Admin ─── */}
      <nav className="sticky top-[45px] w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-40 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center gap-6 sm:gap-8 h-12">
          {ADMIN_PIVOT_ITEMS.map((item) => {
            const active = isActive(item.path);
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative h-full flex items-center gap-2 text-xs font-mono uppercase tracking-widest transition-colors shrink-0 ${
                  active ? 'text-primary font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-white/50'}`} />
                <span>{item.label}</span>

                {active && (
                  <motion.span
                    layoutId="adminPivotIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ─── Main Content Canvas ─── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-20">
        {children}
      </main>
    </div>
  );
}
