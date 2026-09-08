import { useLocation, useNavigate } from 'react-router-dom';
import { Grid, Layers, Clock, ListTodo, TrendingUp } from 'lucide-react';

const MAP_PIVOTS = [
  { path: '/', label: 'Matrix & Map', icon: Grid },
  { path: '/subjects', label: 'Subject Hierarchy', icon: Layers },
  { path: '/timeline', label: 'Revision Milestones', icon: Clock },
  { path: '/plan', label: 'Study Plan', icon: ListTodo },
  { path: '/trends', label: 'Performance Trends', icon: TrendingUp },
];

export default function MapSubNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav aria-label="Map Sections" className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-white/10 pb-0.5 mb-6 text-xs font-mono select-none">
      {MAP_PIVOTS.map(pivot => {
        const isActive = location.pathname === pivot.path;
        const PivotIcon = pivot.icon;
        return (
          <button
            key={pivot.path}
            type="button"
            onClick={() => navigate(pivot.path)}
            className={`px-3.5 py-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              isActive
                ? 'text-primary font-bold border-b-2 border-primary -mb-[1px] bg-primary/10'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <PivotIcon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-white/40'}`} />
            <span>{pivot.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
