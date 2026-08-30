import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'map', icon: 'grid_view' },
  { path: '/insights', label: 'insights', icon: 'analytics' },
  { path: '/practice', label: 'practice', icon: 'school' },
  { path: '/evaluate', label: 'evaluate', icon: 'quiz' },
  { path: '/profile', label: 'profile', icon: 'person' },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0 p-6 md:p-8 z-10 bg-surface-dim md:bg-transparent border-b md:border-b-0 md:border-r border-outline-variant flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="mb-10 flex items-center justify-between gap-3">
            <div>
              <div className="text-label-sm-mono uppercase tracking-[0.25em] text-primary text-xs">study OS</div>
              <h1 className="text-display text-on-surface mb-0 font-light leading-none tracking-tight">tooprep</h1>
            </div>
            <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/30 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">insights</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex flex-col gap-2">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3.5 rounded-sm px-4 py-3 transition-all border ${
                    isActive
                      ? 'bg-primary/15 border-primary/50 text-primary font-semibold'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container hover:border-outline-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  <span className="text-headline-md font-light lowercase tracking-wide">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Metro Footer Tip */}
        <div className="hidden md:block pt-6 border-t border-outline-variant/60">
          <div className="text-label-sm-mono uppercase tracking-widest text-on-surface-variant text-[11px]">Daily Rule</div>
          <div className="text-body-md text-on-surface font-light mt-1">Calibrate confidence. Close the gap.</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 px-6 md:px-10 pt-6 pb-28 md:pb-12 max-w-6xl">
        <div className="animate-fade-in">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant flex justify-around items-center h-20 px-2">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 py-1"
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] mt-1 uppercase tracking-wider font-mono ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
