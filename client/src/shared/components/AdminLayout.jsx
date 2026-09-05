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
    <div className="min-h-screen bg-black text-on-surface flex flex-col selection:bg-primary selection:text-black w-full max-w-[100vw] overflow-x-hidden">
      {/* ─── Top Ambient Admin Bar ─── */}
      <header className="sticky top-0 w-full bg-black/95 backdrop-blur-md border-b border-primary/30 px-3 sm:px-4 md:px-8 py-2.5 flex items-center justify-between text-xs tracking-wider z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/admin" className="flex items-center gap-1.5 sm:gap-2 group">
            <span className="text-primary font-bold tracking-widest text-[11px] uppercase">TOOPREP</span>
            <span className="text-white/30 font-light">&middot;</span>
            <span className="text-status-weak font-bold uppercase text-[11px] tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-status-weak shrink-0" />
              <span>ADMIN CONSOLE</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] text-white/50 hidden sm:inline">{timeStr}</span>

          {/* Return to Student Portal button */}
          <Link
            to="/"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-surface-container border border-white/15 hover:border-primary text-white/80 hover:text-white transition-colors text-[11px] uppercase tracking-wider"
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
            <span className="text-[11px] text-white/80 hidden md:inline truncate max-w-[100px]">
              {profile?.display_name || user?.email?.split('@')[0] || 'admin'}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="p-1 text-white/40 hover:text-error transition-colors cursor-pointer"
            title="Sign out of admin session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── Panoramic Pivot Bar for Admin ─── */}
      <nav className="sticky top-[45px] w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-40 overflow-x-auto no-scrollbar max-w-full">
        <div className="w-full max-w-7xl mr-auto px-3 sm:px-4 md:px-8 flex items-center gap-5 sm:gap-8 h-12 min-w-max">
          {ADMIN_PIVOT_ITEMS.map((item) => {
            const active = isActive(item.path);
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative h-full flex items-center gap-2 text-xs uppercase tracking-wider transition-colors shrink-0 ${
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
      <main className="flex-1 w-full max-w-7xl mr-auto px-3 sm:px-4 md:px-8 pt-4 sm:pt-6 pb-20 min-w-0 overflow-x-hidden sm:overflow-x-visible">
        {children}
      </main>
    </div>
  );
}
