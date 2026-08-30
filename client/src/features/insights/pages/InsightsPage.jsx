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
      <div className="flex items-center justify-center py-20">
        <div className="text-display text-primary font-light animate-pulse-soft lowercase">loading...</div>
      </div>
    );
  }

  if (!insights || data.length === 0) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h2 className="text-display text-on-surface mb-8 font-light lowercase">insights</h2>
        <div className="bg-surface-dim border-2 border-outline-variant p-8 md:p-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[64px] mb-6 block">analytics</span>
          <h3 className="text-headline-lg text-on-surface mb-4 font-light lowercase">no data yet</h3>
          <p className="text-body-lg text-on-surface-variant mb-8 font-light lowercase">start by rating your confidence and taking evaluations to see insights.</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-4 bg-primary text-white text-body-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors"
          >
            go to map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-12">
      <h2 className="text-display text-on-surface mb-8 font-light lowercase">insights</h2>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
        {[
          { label: 'overconfident', count: insights.overconfident.length, color: 'text-white', bg: 'bg-status-overconfident' },
          { label: 'weak', count: insights.weakAligned.length, color: 'text-white', bg: 'bg-status-weak' },
          { label: 'underconfident', count: insights.underconfident.length, color: 'text-white', bg: 'bg-status-underconfident' },
          { label: 'aligned', count: insights.aligned.length, color: 'text-white', bg: 'bg-status-aligned' },
          { label: 'no data', count: insights.noData.length, color: 'text-on-surface-variant', bg: 'bg-surface-container-high' },
        ].map(s => (
          <div key={s.label} className={`p-6 ${s.bg}`}>
            <div className={`text-display font-light mb-2 ${s.color}`}>{s.count}</div>
            <div className={`text-label-sm-mono uppercase tracking-widest ${s.color === 'text-white' ? 'text-white/80' : 'text-on-surface-variant'}`}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Subject Breakdown */}
        <div className="bg-surface-dim border-2 border-outline-variant p-6 md:p-8">
          <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-6">subject breakdown</h3>
          <div className="space-y-4">
            {Object.entries(insights.bySubject).map(([name, s]) => (
              <div key={name} className="p-4 bg-surface-container">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-headline-md font-light text-on-surface lowercase">{name}</h4>
                  <span className="text-label-mono text-on-surface-variant">{s.attempted}/{s.total} topics</span>
                </div>
                <div className="flex flex-col gap-2 text-body-md uppercase tracking-widest text-[11px] font-semibold">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">avg accuracy</span>
                    <strong className={
                      s.avgAccuracyNum !== null
                        ? s.avgAccuracyNum >= 70 ? 'text-status-aligned' :
                          s.avgAccuracyNum >= 40 ? 'text-status-weak' : 'text-error'
                        : 'text-on-surface-variant'
                    }>{s.avgAccuracyNum !== null ? `${s.avgAccuracyNum}%` : 'â€”'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">overconfident</span>
                    <span className="text-error">{s.overconfident}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">aligned</span>
                    <span className="text-status-aligned">{s.aligned}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* Priority Topics */}
          {insights.overconfident.length > 0 && (
            <div className="bg-surface-dim border-2 border-error p-6 md:p-8">
              <h3 className="text-label-sm-mono text-error uppercase tracking-widest mb-6 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                priority review
              </h3>
              <div className="space-y-3">
                {insights.overconfident.slice(0, 5).map(t => (
                  <div
                    key={t.topic_id}
                    onClick={() => navigate(`/topics/${t.topic_id}`)}
                    className="flex flex-col p-4 bg-error/10 hover:bg-error/20 cursor-pointer transition-colors"
                  >
                    <div className="mb-2">
                      <span className="text-body-lg font-light text-on-surface lowercase block">{t.topic_name}</span>
                      <span className="text-label-sm-mono text-on-surface-variant lowercase mt-1 block">{t.subject_name} / {t.chapter_name}</span>
                    </div>
                    <div className="flex items-center gap-6 text-label-mono uppercase tracking-widest text-[11px]">
                      <span className="text-primary font-bold">conf: {t.confidence}</span>
                      <span className="text-on-surface font-bold">eval: {t.evaluation_accuracy}%</span>
                      <span className="text-error font-bold">gap: {t.gap}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Untested topics */}
          {insights.noData.length > 0 && (
            <div className="bg-surface-dim border-2 border-outline-variant p-6 md:p-8">
              <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-6">
                needs evaluation ({insights.noData.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {insights.noData.slice(0, 15).map(t => (
                  <button
                    key={t.topic_id}
                    onClick={() => navigate(`/topics/${t.topic_id}`)}
                    className="px-4 py-2 bg-surface-container hover:bg-primary/20 hover:text-primary transition-colors text-body-md font-light lowercase"
                  >
                    {t.topic_name}
                  </button>
                ))}
                {insights.noData.length > 15 && (
                  <span className="px-4 py-2 text-body-md text-on-surface-variant font-light lowercase">
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

