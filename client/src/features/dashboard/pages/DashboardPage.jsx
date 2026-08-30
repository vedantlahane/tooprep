import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await dashboardService.getDashboard();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subjects = useMemo(() => {
    const set = new Set(data.map(r => r.subject_name).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    if (subjectFilter === 'ALL') return data;
    return data.filter(r => r.subject_name === subjectFilter);
  }, [data, subjectFilter]);

  const groupedByChapter = useMemo(() => {
    const groups = {};
    filtered.forEach(topic => {
      const groupName = `${topic.subject_name} \u203A ${topic.chapter_name}`;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(topic);
    });
    return groups;
  }, [filtered]);

  const getTileSize = (topic) => {
    if (topic.status === 'OVERCONFIDENT') return 'col-span-2 row-span-2 aspect-square';
    if (topic.status === 'UNDERCONFIDENT') return 'col-span-2 row-span-1 aspect-[2/1]';
    return 'col-span-1 row-span-1 aspect-square';
  };

  const getTileColor = (status) => {
    switch (status) {
      case 'OVERCONFIDENT': return 'bg-status-overconfident text-white';
      case 'UNDERCONFIDENT': return 'bg-status-underconfident text-white';
      case 'ALIGNED': return 'bg-status-aligned text-white';
      case 'WEAK_ALIGNED': return 'bg-status-weak text-white';
      case 'INSUFFICIENT_DATA': return 'acrylic hover:bg-surface-bright border border-outline-variant';
      case 'PRELIMINARY': return 'acrylic-primary';
      default: return 'bg-surface-container';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest">Building Knowledge Map...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Pivot Headers (Windows Phone Style) */}
      <div className="mb-10 overflow-x-auto no-scrollbar">
        <div className="flex gap-6 pb-2 border-b border-outline-variant">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`text-headline-lg transition-all whitespace-nowrap pb-2 border-b-4 ${
                subjectFilter === s 
                  ? 'text-primary font-semibold border-primary' 
                  : 'text-on-surface-variant hover:text-on-surface font-light border-transparent'
              }`}
            >
              {s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-body-md rounded-r-md">
          {error}
        </div>
      )}

      {/* Panorama groups */}
      <div className="flex flex-col gap-12">
        {Object.entries(groupedByChapter).map(([groupName, topics]) => (
          <section key={groupName} className="animate-fade-in">
            <h3 className="text-label-sm-mono text-on-surface-variant mb-4 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/50"></span>
              {groupName}
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 auto-rows-auto">
              {topics.map(topic => (
                <div
                  key={topic.topic_id}
                  onClick={() => navigate(`/topics/${topic.topic_id}`)}
                  className={`relative cursor-pointer metro-tile p-4 flex flex-col justify-between overflow-hidden group rounded-md ${getTileSize(topic)} ${getTileColor(topic.status)}`}
                >
                  {/* Status Icon */}
                  <span className="material-symbols-outlined absolute top-3 right-3 opacity-30 text-[24px]">
                    {topic.status === 'OVERCONFIDENT' ? 'warning' :
                     topic.status === 'ALIGNED' ? 'check_circle' :
                     topic.status === 'UNDERCONFIDENT' ? 'trending_up' :
                     topic.status === 'WEAK_ALIGNED' ? 'trending_flat' : 'help_center'}
                  </span>

                  <div>
                    <h4 className={`font-semibold leading-tight line-clamp-3 w-5/6 ${topic.status === 'OVERCONFIDENT' ? 'text-headline-md' : 'text-body-md'}`}>
                      {topic.topic_name}
                    </h4>
                  </div>
                  
                  <div className="mt-4 flex items-end justify-between z-10">
                    <div>
                      {topic.confidence ? (
                        <div className="text-headline-md font-light">
                          {topic.confidence}<span className="text-body-sm opacity-60">/10</span>
                        </div>
                      ) : (
                        <div className="text-label-sm-mono opacity-60">No rating</div>
                      )}
                    </div>
                    {topic.evaluation_accuracy !== null && (
                      <div className="text-body-md font-bold">
                        {topic.evaluation_accuracy}%
                      </div>
                    )}
                  </div>

                  {/* Hover reveal overlay for gap */}
                  {topic.gap !== null && (
                    <div className="absolute inset-0 bg-surface/90 backdrop-blur-md flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1">Gap</div>
                      <div className={`text-display font-light ${topic.gap < 0 ? 'text-error' : 'text-status-aligned'}`}>
                        {topic.gap > 0 ? `+${topic.gap}` : topic.gap}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="acrylic border border-outline-variant rounded-md p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-[48px] opacity-20">grid_off</span>
            <div className="text-body-lg font-light">No topics available for this view.</div>
          </div>
        )}
      </div>
    </div>
  );
}
