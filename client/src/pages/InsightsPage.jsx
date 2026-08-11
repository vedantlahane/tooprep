import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import StatusDot from '../components/StatusDot';

export default function InsightsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await api.getDashboard();
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
        <div className="animate-pulse-soft text-primary text-headline-md">Loading insights...</div>
      </div>
    );
  }

  if (!insights || data.length === 0) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h2 className="text-display text-on-surface mb-4">Insights</h2>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-8 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4 block">analytics</span>
          <h3 className="text-headline-md text-on-surface mb-2">No Data Yet</h3>
          <p className="text-body-md text-on-surface-variant mb-4">Start by rating your confidence and taking evaluations to see insights.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-lg bg-primary text-on-primary text-body-md font-semibold hover:bg-primary-container transition-colors"
          >
            Go to Knowledge Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h2 className="text-display text-on-surface mb-6">Insights</h2>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Overconfident', count: insights.overconfident.length, color: 'text-status-overconfident', bg: 'bg-status-overconfident/10' },
          { label: 'Weak', count: insights.weakAligned.length, color: 'text-status-weak', bg: 'bg-status-weak/10' },
          { label: 'Underconfident', count: insights.underconfident.length, color: 'text-status-underconfident', bg: 'bg-status-underconfident/10' },
          { label: 'Aligned', count: insights.aligned.length, color: 'text-status-aligned', bg: 'bg-status-aligned/10' },
          { label: 'No Data', count: insights.noData.length, color: 'text-on-surface-variant', bg: 'bg-surface-container' },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-xl border border-outline-variant/50 ${s.bg} text-center`}>
            <div className={`text-headline-lg font-bold ${s.color}`}>{s.count}</div>
            <div className="text-label-sm-mono text-on-surface-variant mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Subject Breakdown */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5 mb-6">
        <h3 className="text-label-sm-mono text-on-surface-variant mb-4">SUBJECT BREAKDOWN</h3>
        <div className="space-y-4">
          {Object.entries(insights.bySubject).map(([name, s]) => (
            <div key={name} className="p-4 rounded-lg bg-surface-container/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-headline-md text-on-surface">{name}</h4>
                <span className="text-label-mono text-on-surface-variant">{s.attempted}/{s.total} topics practiced</span>
              </div>
              <div className="flex items-center gap-6 text-body-md">
                <span>Avg Accuracy: <strong className={
                  s.avgAccuracyNum !== null
                    ? s.avgAccuracyNum >= 70 ? 'text-tertiary-container' :
                      s.avgAccuracyNum >= 40 ? 'text-status-weak' : 'text-error'
                    : 'text-on-surface-variant'
                }>{s.avgAccuracyNum !== null ? `${s.avgAccuracyNum}%` : '—'}</strong></span>
                <span className="text-status-overconfident">⚠ {s.overconfident} overconfident</span>
                <span className="text-status-aligned">✓ {s.aligned} aligned</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Topics */}
      {insights.overconfident.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5 mb-6">
          <h3 className="text-label-sm-mono text-error mb-4">
            ⚠ OVERCONFIDENT TOPICS — Priority Review
          </h3>
          <div className="space-y-2">
            {insights.overconfident.slice(0, 5).map(t => (
              <div
                key={t.topic_id}
                onClick={() => navigate(`/topics/${t.topic_id}`)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-body-md font-semibold text-on-surface">{t.topic_name}</span>
                  <span className="ml-2 text-label-sm-mono text-on-surface-variant">{t.subject_name} › {t.chapter_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-label-mono text-primary">Conf: {t.confidence}/10</span>
                  <span className="text-label-mono text-on-surface">Eval: {t.evaluation_accuracy}%</span>
                  <span className="text-label-mono text-error font-bold">Gap: {t.gap}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Untested topics */}
      {insights.noData.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5">
          <h3 className="text-label-sm-mono text-on-surface-variant mb-4">
            📋 TOPICS NEEDING EVALUATION ({insights.noData.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {insights.noData.slice(0, 15).map(t => (
              <button
                key={t.topic_id}
                onClick={() => navigate(`/topics/${t.topic_id}`)}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/50 text-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
              >
                {t.topic_name}
              </button>
            ))}
            {insights.noData.length > 15 && (
              <span className="px-3 py-1.5 text-body-md text-on-surface-variant">
                +{insights.noData.length - 15} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
