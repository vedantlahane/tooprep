import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '@/features/dashboard/services/dashboardService';

export default function InsightsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await dashboardService.getDashboard();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Computed insights
  const insights = useMemo(() => {
    if (data.length === 0) return null;

    const withData = data.filter(d => d.status !== 'INSUFFICIENT_DATA');
    const overconfident = data.filter(d => d.status === 'OVERCONFIDENT').sort((a, b) => a.gap - b.gap);
    const underconfident = data.filter(d => d.status === 'UNDERCONFIDENT').sort((a, b) => b.gap - a.gap);
    const weakAligned = data.filter(d => d.status === 'WEAK_ALIGNED');
    const aligned = data.filter(d => d.status === 'ALIGNED');
    const noData = data.filter(d => d.status === 'INSUFFICIENT_DATA');

    // Subject-level summaries
    const bySubject = {};
    for (const topic of data) {
      if (!bySubject[topic.subject_name]) {
        bySubject[topic.subject_name] = { total: 0, attempted: 0, avgAccuracy: [], overconfident: 0, aligned: 0 };
      }
      const s = bySubject[topic.subject_name];
      s.total++;
      if (topic.questions_attempted > 0) s.attempted++;
      if (topic.evaluation_accuracy !== null) s.avgAccuracy.push(topic.evaluation_accuracy);
      if (topic.status === 'OVERCONFIDENT') s.overconfident++;
      if (topic.status === 'ALIGNED') s.aligned++;
    }

    for (const [name, s] of Object.entries(bySubject)) {
      s.avgAccuracyNum = s.avgAccuracy.length > 0
        ? Math.round(s.avgAccuracy.reduce((a, b) => a + b, 0) / s.avgAccuracy.length)
        : null;
    }

    return { withData, overconfident, underconfident, weakAligned, aligned, noData, bySubject };
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest">Crunching Data...</div>
      </div>
    );
  }

  if (!insights || data.length === 0) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h2 className="text-display text-on-surface mb-8 font-light lowercase">Insights</h2>
        <div className="acrylic border border-outline-variant p-12 text-center rounded-md">
          <span className="material-symbols-outlined text-primary text-[80px] mb-6 block opacity-80">analytics</span>
          <h3 className="text-headline-lg text-on-surface mb-4 font-light lowercase">No Data Yet</h3>
          <p className="text-body-lg text-on-surface-variant mb-8 font-light lowercase">Start by rating your confidence and taking evaluations to generate insights.</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-4 bg-primary text-white text-label-sm-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all rounded-sm"
          >
            Go to Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20 space-y-10">
      <div>
        <h2 className="text-display text-on-surface font-light lowercase">Insights</h2>
        <p className="text-body-lg text-on-surface-variant font-light mt-2">Aggregated performance and confidence analysis.</p>
      </div>

      {/* Status Summary Live Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'overconfident', count: insights.overconfident.length, bg: 'bg-status-overconfident', icon: 'warning' },
          { label: 'weak', count: insights.weakAligned.length, bg: 'bg-status-weak', icon: 'trending_flat' },
          { label: 'underconfident', count: insights.underconfident.length, bg: 'bg-status-underconfident', icon: 'trending_up' },
          { label: 'aligned', count: insights.aligned.length, bg: 'bg-status-aligned', icon: 'check_circle' },
          { label: 'untested', count: insights.noData.length, bg: 'bg-surface-container-high', icon: 'help_center' },
        ].map(s => (
          <div key={s.label} className={`metro-tile p-5 rounded-md flex flex-col justify-between relative overflow-hidden group ${s.bg}`}>
            <span className="material-symbols-outlined absolute top-3 right-3 opacity-20 text-[32px] group-hover:scale-125 transition-transform">{s.icon}</span>
            <div className={`text-display font-light mb-4 ${s.bg === 'bg-surface-container-high' ? 'text-on-surface' : 'text-white'}`}>{s.count}</div>
            <div className={`text-label-sm-mono uppercase tracking-widest ${s.bg === 'bg-surface-container-high' ? 'text-on-surface-variant' : 'text-white/80'}`}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Subject Breakdown */}
        <div className="acrylic border border-outline-variant p-6 md:p-8 rounded-md">
          <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">donut_large</span>
            Subject Mastery
          </h3>
          <div className="space-y-6">
            {Object.entries(insights.bySubject).map(([name, s]) => {
              const acc = s.avgAccuracyNum || 0;
              const barColor = acc >= 70 ? 'bg-status-aligned' : acc >= 40 ? 'bg-status-weak' : 'bg-status-overconfident';
              return (
                <div key={name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <h4 className="text-headline-md font-light text-on-surface lowercase">{name}</h4>
                    <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">{s.attempted}/{s.total} tested</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${acc}%` }}></div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-label-sm-mono uppercase tracking-widest text-center">
                    <div className="bg-surface-container p-2 rounded-sm">
                      <div className="text-on-surface-variant mb-1">Accuracy</div>
                      <div className={`text-body-md font-bold ${acc >= 70 ? 'text-status-aligned' : acc >= 40 ? 'text-status-weak' : 'text-status-overconfident'}`}>{s.avgAccuracyNum !== null ? `${acc}%` : '--'}</div>
                    </div>
                    <div className="bg-surface-container p-2 rounded-sm">
                      <div className="text-on-surface-variant mb-1">Overconf</div>
                      <div className="text-body-md font-bold text-status-overconfident">{s.overconfident}</div>
                    </div>
                    <div className="bg-surface-container p-2 rounded-sm">
                      <div className="text-on-surface-variant mb-1">Aligned</div>
                      <div className="text-body-md font-bold text-status-aligned">{s.aligned}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-8">
          {/* Priority Topics */}
          {insights.overconfident.length > 0 && (
            <div className="border border-error bg-error/5 p-6 md:p-8 rounded-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-[150px] text-error">warning</span>
              </div>
              
              <h3 className="text-label-sm-mono text-error uppercase tracking-widest mb-6 font-bold flex items-center gap-2 relative z-10">
                <span className="material-symbols-outlined text-[18px]">priority_high</span>
                Critical Priority Review
              </h3>
              
              <div className="space-y-3 relative z-10">
                {insights.overconfident.slice(0, 5).map(t => (
                  <div
                    key={t.topic_id}
                    onClick={() => navigate(`/topics/${t.topic_id}`)}
                    className="flex flex-col p-4 bg-surface-container hover:bg-error/20 border-l-4 border-error cursor-pointer transition-colors rounded-r-sm"
                  >
                    <div className="mb-2">
                      <span className="text-body-lg font-semibold text-on-surface">{t.topic_name}</span>
                      <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mt-1 block">{t.subject_name} &rsaquo; {t.chapter_name}</span>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <div className="bg-surface-dim px-3 py-1 rounded-sm text-label-sm-mono uppercase">
                        <span className="text-on-surface-variant mr-2">Conf:</span><span className="text-primary font-bold">{t.confidence}/10</span>
                      </div>
                      <div className="bg-surface-dim px-3 py-1 rounded-sm text-label-sm-mono uppercase">
                        <span className="text-on-surface-variant mr-2">Eval:</span><span className="text-on-surface font-bold">{t.evaluation_accuracy}%</span>
                      </div>
                      <div className="bg-error/20 px-3 py-1 rounded-sm text-label-sm-mono uppercase">
                        <span className="text-error font-bold">Gap: {t.gap}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Untested topics */}
          {insights.noData.length > 0 && (
            <div className="acrylic border border-outline-variant p-6 md:p-8 rounded-md">
              <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">rule</span>
                Needs Evaluation ({insights.noData.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {insights.noData.slice(0, 15).map(t => (
                  <button
                    key={t.topic_id}
                    onClick={() => navigate(`/topics/${t.topic_id}`)}
                    className="px-4 py-2 bg-surface-container border border-outline-variant hover:border-primary hover:text-primary transition-colors text-label-sm-mono rounded-full"
                  >
                    {t.topic_name}
                  </button>
                ))}
                {insights.noData.length > 15 && (
                  <span className="px-4 py-2 text-label-sm-mono text-on-surface-variant bg-surface-dim rounded-full border border-dashed border-outline-variant">
                    +{insights.noData.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
