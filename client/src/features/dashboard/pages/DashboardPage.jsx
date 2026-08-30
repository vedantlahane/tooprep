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

  // Group by chapter to create horizontal groups like Windows 8/Phone Panoramas
  const groupedByChapter = useMemo(() => {
    const groups = {};
    filtered.forEach(topic => {
      const groupName = `${topic.subject_name} â€” ${topic.chapter_name}`;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(topic);
    });
    return groups;
  }, [filtered]);

  const getTileColor = (status) => {
    switch (status) {
      case 'OVERCONFIDENT': return 'bg-status-overconfident text-white';
      case 'UNDERCONFIDENT': return 'bg-status-underconfident text-white';
      case 'WEAK_ALIGNED': return 'bg-status-weak text-white';
      case 'ALIGNED': return 'bg-status-aligned text-white';
      default: return 'bg-surface-container-high text-on-surface hover:bg-surface-variant';
    }
  };

  const getTileSize = (topic) => {
    // If it's a priority status or has lots of data, make it wide
    if (['OVERCONFIDENT', 'WEAK_ALIGNED'].includes(topic.status) || topic.questions_attempted > 20) {
      return 'col-span-2 md:col-span-2 aspect-[2/1]';
    }
    // Default square
    return 'col-span-1 aspect-square';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-display text-primary font-light animate-pulse-soft">loading...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 pb-2">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`text-headline-md transition-colors whitespace-nowrap ${
                subjectFilter === s ? 'text-primary font-normal' : 'text-on-surface-variant hover:text-on-surface font-light'
              }`}
            >
              {s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error text-on-error text-body-md">
          {error}
        </div>
      )}

      {/* Panorama groups */}
      <div className="flex flex-col gap-10">
        {Object.entries(groupedByChapter).map(([groupName, topics]) => (
          <div key={groupName}>
            <h3 className="text-body-lg text-on-surface-variant mb-4 uppercase tracking-widest">{groupName}</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {topics.map(topic => (
                <div
                  key={topic.topic_id}
                  onClick={() => navigate(`/topics/${topic.topic_id}`)}
                  className={`relative cursor-pointer transition-transform hover:scale-[0.98] active:scale-95 p-3 flex flex-col justify-between overflow-hidden group ${getTileSize(topic)} ${getTileColor(topic.status)}`}
                >
                  {/* Top-right icon based on status */}
                  <span className="material-symbols-outlined absolute top-3 right-3 text-white/50 text-3xl">
                    {topic.status === 'OVERCONFIDENT' ? 'warning' :
                     topic.status === 'ALIGNED' ? 'check_circle' :
                     topic.status === 'WEAK_ALIGNED' ? 'trending_down' :
                     topic.status === 'UNDERCONFIDENT' ? 'trending_up' : 'data_usage'}
                  </span>

                  <div>
                    <h4 className="text-body-md font-semibold leading-tight line-clamp-3 w-5/6">
                      {topic.topic_name}
                    </h4>
                  </div>
                  
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      {topic.confidence ? (
                        <div className="text-headline-md font-light">
                          {topic.confidence}<span className="text-body-md text-white/70">/10</span>
                        </div>
                      ) : (
                        <div className="text-body-md text-white/70">No rating</div>
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
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-label-sm-mono text-white/70 mb-1">GAP</div>
                      <div className={`text-display font-light ${topic.gap < 0 ? 'text-error' : 'text-status-aligned'}`}>
                        {topic.gap > 0 ? `+${topic.gap}` : topic.gap}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-body-lg text-on-surface-variant font-light">
            no topics available.
          </div>
        )}
      </div>
    </div>
  );
}

