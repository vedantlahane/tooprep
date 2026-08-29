import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'map', icon: 'map' },
  { path: '/insights', label: 'insights', icon: 'analytics' },
  { path: '/profile', label: 'profile', icon: 'person' },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden flex flex-col md:flex-row">
      {/* Metro Panorama Header / Left Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0 p-6 md:p-12 z-10 bg-surface-dim md:bg-transparent">
        <h1 className="text-display text-on-surface mb-2 font-light">tooprep</h1>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex flex-col gap-6 mt-16">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`text-headline-md transition-all ${
                  isActive ? 'text-primary translate-x-2' : 'text-on-surface-variant hover:text-on-surface hover:translate-x-1'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 px-6 md:px-12 pt-4 pb-32 md:pb-12 max-w-5xl">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Windows Phone Style Application Bar (Bottom) for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface-dim/95 backdrop-blur-sm border-t border-outline-variant flex justify-center items-center h-24 gap-8">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
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
