import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'map', icon: 'map' },
  { path: '/timeline', label: 'timeline', icon: 'schedule' },
  { path: '/subjects', label: 'subjects', icon: 'category' },
  { path: '/trends', label: 'trends', icon: 'trending_up' },
  { path: '/plan', label: 'plan', icon: 'task_alt' },
  { path: '/practice', label: 'practice', icon: 'school' },
  { path: '/evaluate', label: 'evaluate', icon: 'quiz' },
  { path: '/insights', label: 'insights', icon: 'analytics' },
  { path: '/history', label: 'history', icon: 'history' },
  { path: '/profile', label: 'profile', icon: 'person' },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden flex flex-col md:flex-row">
      <aside className="w-full md:w-72 flex-shrink-0 p-6 md:p-8 z-10 bg-surface-dim md:bg-transparent border-b md:border-b-0 md:border-r border-outline-variant">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <div className="text-label-sm-mono uppercase tracking-[0.2em] text-on-surface-variant">study OS</div>
            <h1 className="text-display text-on-surface mb-0 font-light leading-none">tooprep</h1>
          </div>
          <div className="w-12 h-12 rounded-md bg-primary/10 border border-primary/30 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">insights</span>
          </div>
        </div>

        <nav className="hidden md:flex flex-col gap-3 mt-10">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 rounded-md px-4 py-3 transition-all border ${
                  isActive
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container hover:border-outline-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-headline-md font-light lowercase">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block mt-10 rounded-md border border-outline-variant bg-surface-container p-4">
          <div className="text-label-sm-mono uppercase tracking-[0.18em] text-on-surface-variant mb-2">focus window</div>
          <div className="text-body-lg text-on-surface">Target the biggest confidence gap first.</div>
          <div className="mt-4 flex items-center gap-2 text-label-sm-mono uppercase tracking-[0.16em] text-primary">
            <span className="material-symbols-outlined text-[18px]">playlist_add_check</span>
            2 short sessions today
          </div>
        </div>
      </aside>

      <main className="flex-1 px-6 md:px-10 pt-4 pb-32 md:pb-12 max-w-6xl">
        <div className="animate-fade-in">{children}</div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface-dim/95 backdrop-blur-sm border-t border-outline-variant flex justify-center items-center h-24 gap-4">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center group"
            >
              <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${
                isActive
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-on-surface text-on-surface group-hover:border-primary group-hover:text-primary'
              }`}>
                <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
              </div>
              <span className={`text-[11px] mt-1.5 font-semibold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
