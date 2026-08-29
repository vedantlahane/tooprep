import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

const navItems = [
  { path: '/', label: 'Knowledge Map', icon: 'map' },
  { path: '/insights', label: 'Insights', icon: 'analytics' },
  { path: '/profile', label: 'Profile', icon: 'person' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant shadow-sm w-full">
        <div className="flex items-center justify-between w-full px-4 h-16 max-w-[1280px] mx-auto">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-headline-md font-bold text-primary hover:opacity-80 transition-opacity">
              TooPrep
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-body-lg px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'text-primary font-semibold bg-surface-container-low'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="ml-4 text-body-md text-on-surface-variant hover:text-error transition-colors px-3 py-2 rounded-lg hover:bg-error-container/30"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-28 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-4 bg-surface border-t border-outline-variant shadow-sm">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center px-4 py-1 rounded-2xl transition-all duration-150 ${
                isActive
                  ? 'bg-secondary-container text-on-surface'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="text-label-sm-mono mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
