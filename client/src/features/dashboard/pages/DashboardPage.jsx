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
      setData(result || []);
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

  const biggestGapTopic = useMemo(() => {
    const overconfident = data.filter(d => d.status === 'OVERCONFIDENT').sort((a, b) => a.gap - b.gap);
    return overconfident[0] || null;
  }, [data]);

  const groupedByChapter = useMemo(() => {
    const groups = {};
    filtered.forEach(topic => {
      const groupName = `${topic.subject_name} \u203A ${topic.chapter_name}`;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(topic);
    });
    return groups;
  }, [filtered]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const priority = filtered.filter(t => ['OVERCONFIDENT', 'WEAK_ALIGNED', 'UNDERCONFIDENT'].includes(t.status)).length;
    const avgConfidence = filtered.filter(t => t.confidence !== null).reduce((sum, t) => sum + t.confidence, 0) / Math.max(1, filtered.filter(t => t.confidence !== null).length);

    return {
      total,
      priority,
      avgConfidence: Number.isFinite(avgConfidence) ? avgConfidence.toFixed(1) : '0.0'
    };
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
    <div className="animate-fade-in space-y-8 pb-16">
      {/* Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono uppercase tracking-[0.25em] text-primary">study command center</div>
          <h1 className="text-display font-light text-on-surface lowercase tracking-tight mt-1">knowledge map</h1>
        </div>
        <div className="flex items-center gap-6 text-label-sm-mono uppercase tracking-widest text-on-surface-variant">
          <span><strong className="text-on-surface text-body-lg font-mono">{summary.total}</strong> topics</span>
          {summary.priority > 0 && (
            <span className="text-status-overconfident font-semibold">
              <strong className="text-body-lg font-mono">{summary.priority}</strong> priority
            </span>
          )}
          <span><strong className="text-primary text-body-lg font-mono">{summary.avgConfidence}</strong>/10 avg conf</span>
        </div>
      </div>

      {/* Priority Focus Banner */}
      {biggestGapTopic && (
        <div
          onClick={() => navigate(`/topics/${biggestGapTopic.topic_id}`)}
          className="p-4 bg-status-overconfident text-white rounded-md flex items-center justify-between cursor-pointer metro-tile transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px]">warning</span>
            <div>
              <span className="text-body-md font-bold">Priority Focus: {biggestGapTopic.topic_name}</span>
              <span className="text-body-sm opacity-80 hidden md:inline ml-2">
                ({biggestGapTopic.subject_name} &rsaquo; {biggestGapTopic.chapter_name})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-label-sm-mono uppercase tracking-widest font-mono text-xs opacity-90">
              Conf: {biggestGapTopic.confidence}/10 &middot; Eval: {biggestGapTopic.evaluation_accuracy}%
            </span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </div>
        </div>
      )}

      {/* Pivot Headers (Windows Phone Style) */}
      <div className="border-b border-outline-variant overflow-x-auto no-scrollbar">
        <div className="flex gap-8 min-w-max pb-1">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`text-headline-lg lowercase font-light pb-2 transition-all whitespace-nowrap border-b-2 ${
                subjectFilter === s
                  ? 'text-primary font-normal border-primary'
                  : 'text-on-surface-variant hover:text-on-surface border-transparent'
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

      {/* Panorama Grouped Live Tiles */}
      <div className="flex flex-col gap-10">
        {Object.entries(groupedByChapter).map(([groupName, topics]) => (
          <section key={groupName} className="animate-fade-in">
            <h3 className="text-label-sm-mono text-on-surface-variant mb-4 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/60"></span>
              {groupName}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 auto-rows-auto">
              {topics.map(topic => (
                <div
                  key={topic.topic_id}
                  onClick={() => navigate(`/topics/${topic.topic_id}`)}
                  className={`relative cursor-pointer metro-tile p-4 flex flex-col justify-between overflow-hidden group rounded-md ${getTileSize(topic)} ${getTileColor(topic.status)}`}
                >
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
            <div className="text-body-lg font-light">No topics found for this subject filter.</div>
          </div>
        )}
      </div>
    </div>
  );
}
