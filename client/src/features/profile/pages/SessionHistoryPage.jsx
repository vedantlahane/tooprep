import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceService } from '@/features/practice/services/practiceService';
import { evaluationsService } from '@/features/evaluations/services/evaluationsService';

export default function SessionHistoryPage() {
  const navigate = useNavigate();
  const [practiceSessions, setPracticeSessions] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, PRACTICE, EVALUATION
  const [sortBy, setSortBy] = useState('DATE_DESC'); // DATE_DESC, ACCURACY_DESC, DURATION_DESC

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [practice, evals] = await Promise.all([
        practiceService.listPracticeSessions().catch(() => []),
        evaluationsService.listEvaluations().catch(() => [])
      ]);
      setPracticeSessions(practice || []);
      setEvaluations(evals || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const allSessions = useMemo(() => {
    const combined = [
      ...practiceSessions.map(s => ({ ...s, type: 'PRACTICE', sessionId: s.id })),
      ...evaluations.map(e => ({ ...e, type: 'EVALUATION', sessionId: e.id }))
    ];

    // Filter
    let filtered = combined;
    if (typeFilter !== 'ALL') {
      filtered = combined.filter(s => s.type === typeFilter);
    }

    // Sort
    if (sortBy === 'DATE_DESC') {
      filtered.sort((a, b) => new Date(b.started_at || b.created_at) - new Date(a.started_at || a.created_at));
    } else if (sortBy === 'ACCURACY_DESC') {
      filtered.sort((a, b) => (b.summary?.accuracy || 0) - (a.summary?.accuracy || 0));
    } else if (sortBy === 'DURATION_DESC') {
      const getDuration = (s) => {
        if (s.type === 'EVALUATION') return s.summary?.duration_seconds || 0;
        return (s.summary?.total_time_seconds || 0);
      };
      filtered.sort((a, b) => getDuration(b) - getDuration(a));
    }

    return filtered;
  }, [practiceSessions, evaluations, typeFilter, sortBy]);

  const analytics = useMemo(() => {
    if (allSessions.length === 0) return null;

    const totalSessions = allSessions.length;
    const totalTime = allSessions.reduce((sum, s) => {
      const time = s.type === 'EVALUATION'
        ? s.summary?.duration_seconds || 0
        : s.summary?.total_time_seconds || 0;
      return sum + time;
    }, 0);
    const totalHours = (totalTime / 3600).toFixed(1);

    const accuracies = allSessions
      .filter(s => s.summary?.accuracy !== null && s.summary?.accuracy !== undefined)
      .map(s => s.summary.accuracy);
    const avgAccuracy = accuracies.length > 0
      ? Math.round(accuracies.reduce((a, b) => a + b) / accuracies.length)
      : 0;

    const topics = {};
    allSessions.forEach(s => {
      const topicName = s.topic?.name || s.topic_name || 'Unknown';
      if (!topics[topicName]) topics[topicName] = 0;
      topics[topicName]++;
    });
    const topTopics = Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const recent7 = allSessions.slice(0, 7);
    const recentAccuracies = recent7
      .filter(s => s.summary?.accuracy !== null)
      .map(s => s.summary.accuracy);
    const recentAvg = recentAccuracies.length > 0
      ? Math.round(recentAccuracies.reduce((a, b) => a + b) / recentAccuracies.length)
      : null;

    return {
      totalSessions,
      totalHours,
      avgAccuracy,
      topTopics,
      recentAvg,
      trend: recentAvg && recentAvg > avgAccuracy ? 'improving' : 'stable'
    };
  }, [allSessions]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-8 pb-12">
      <div>
        <p className="text-label-sm-mono uppercase tracking-[0.2em] text-primary">study history</p>
        <h2 className="text-display text-on-surface mt-2 font-light">your study activity log</h2>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error rounded-r-md">
          {error}
        </div>
      )}

      {allSessions.length === 0 ? (
        <div className="text-center py-20 border border-outline-variant rounded-lg bg-surface-container">
          <span className="material-symbols-outlined text-primary text-[64px] block opacity-50 mb-4">history</span>
          <h3 className="text-headline-lg text-on-surface font-light mb-2">No sessions yet</h3>
          <p className="text-body-lg text-on-surface-variant mb-6">Start practicing to build your study history.</p>
          <button
            onClick={() => navigate('/practice')}
            className="px-6 py-3 bg-primary text-on-primary text-label-sm-mono uppercase tracking-widest rounded-lg hover:brightness-110"
          >
            Start Practice
          </button>
        </div>
      ) : (
        <>
          {/* Analytics Cards */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border border-outline-variant bg-surface-container rounded-lg p-5">
                <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Sessions</div>
                <div className="text-display font-light text-primary mb-1">{analytics.totalSessions}</div>
                <div className="text-body-sm text-on-surface-variant">total practice & eval</div>
              </div>

              <div className="border border-outline-variant bg-surface-container rounded-lg p-5">
                <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Time Invested</div>
                <div className="text-display font-light text-primary mb-1">{analytics.totalHours}</div>
                <div className="text-body-sm text-on-surface-variant">hours</div>
              </div>

              <div className="border border-outline-variant bg-surface-container rounded-lg p-5">
                <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Avg Accuracy</div>
                <div className={`text-display font-light mb-1 ${
                  analytics.avgAccuracy >= 70 ? 'text-status-aligned' :
                  analytics.avgAccuracy >= 40 ? 'text-status-weak' : 'text-error'
                }`}>
                  {analytics.avgAccuracy}%
                </div>
                <div className="text-body-sm text-on-surface-variant">all sessions</div>
              </div>

              <div className={`border rounded-lg p-5 ${
                analytics.trend === 'improving'
                  ? 'border-status-aligned bg-status-aligned/10'
                  : 'border-outline-variant bg-surface-container'
              }`}>
                <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Recent Trend</div>
                <div className={`text-display font-light mb-1 flex items-center gap-2 ${
                  analytics.trend === 'improving' ? 'text-status-aligned' : 'text-on-surface-variant'
                }`}>
                  {analytics.recentAvg}%
                  {analytics.trend === 'improving' && <span className="material-symbols-outlined text-[20px]">trending_up</span>}
                </div>
                <div className="text-body-sm text-on-surface-variant">last 7 sessions</div>
              </div>
            </div>
          )}

          {/* Top Topics */}
          {analytics?.topTopics.length > 0 && (
            <div className="border border-outline-variant bg-surface-container rounded-lg p-6">
              <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-4">Most Practiced</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {analytics.topTopics.map((topic, i) => (
                  <div key={topic.name} className="p-3 bg-surface-dim rounded-lg text-center border border-outline-variant">
                    <div className="text-headline-md font-light text-primary">{topic.count}</div>
                    <div className="text-body-sm text-on-surface-variant mt-1 line-clamp-2">{topic.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters & Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Type</label>
              <div className="flex gap-2">
                {['ALL', 'PRACTICE', 'EVALUATION'].map(type => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-4 py-2 rounded-lg text-label-sm-mono uppercase tracking-widest transition-colors ${
                      typeFilter === type
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container border border-outline-variant text-on-surface hover:border-primary'
                    }`}
                  >
                    {type === 'ALL' ? 'All Sessions' : type === 'PRACTICE' ? 'Practice Only' : 'Evaluations Only'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-on-surface focus:border-primary outline-none"
              >
                <option value="DATE_DESC">Newest First</option>
                <option value="ACCURACY_DESC">Highest Accuracy</option>
                <option value="DURATION_DESC">Longest Sessions</option>
              </select>
            </div>
          </div>

          {/* Sessions Timeline */}
          <div className="space-y-3">
            {allSessions.map((session, idx) => (
              <div
                key={`${session.type}-${session.sessionId}`}
                className="border border-outline-variant bg-surface-container rounded-lg p-5 hover:border-primary transition-colors cursor-pointer group"
                onClick={() => {
                  if (session.type === 'EVALUATION') {
                    navigate(`/results/${session.sessionId}`);
                  }
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left: Type + Topic + Time */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`px-3 py-2 rounded-lg text-label-sm-mono uppercase tracking-widest font-semibold ${
                      session.type === 'PRACTICE'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-status-overconfident/10 text-status-overconfident'
                    }`}>
                      {session.type === 'PRACTICE' ? '⚡ Practice' : '📝 Eval'}
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/topics/${session.topic_id || session.topic?.id}`);
                        }}
                        className="text-body-lg font-semibold text-on-surface hover:text-primary transition-colors"
                      >
                        {session.topic?.name || session.topic_name || 'Unknown Topic'}
                      </button>
                      <div className="text-body-sm text-on-surface-variant mt-1">
                        {new Date(session.started_at || session.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Stats */}
                  <div className="flex items-center gap-6">
                    {/* Accuracy */}
                    {session.summary?.accuracy !== null && session.summary?.accuracy !== undefined && (
                      <div className="text-center">
                        <div className={`text-headline-md font-bold ${
                          session.summary.accuracy >= 70 ? 'text-status-aligned' :
                          session.summary.accuracy >= 40 ? 'text-status-weak' : 'text-error'
                        }`}>
                          {session.summary.accuracy}%
                        </div>
                        <div className="text-label-sm-mono text-on-surface-variant uppercase">Accuracy</div>
                      </div>
                    )}

                    {/* Questions */}
                    <div className="text-center">
                      <div className="text-headline-md font-light text-on-surface">
                        {session.summary?.total_questions || session.question_count || '—'}
                      </div>
                      <div className="text-label-sm-mono text-on-surface-variant uppercase">Questions</div>
                    </div>

                    {/* Time */}
                    <div className="text-center">
                      <div className="text-headline-md font-light text-on-surface">
                        {session.type === 'EVALUATION'
                          ? `${Math.floor((session.summary?.duration_seconds || 0) / 60)}m`
                          : `${Math.round((session.summary?.total_time_seconds || 0) / 60)}m`
                        }
                      </div>
                      <div className="text-label-sm-mono text-on-surface-variant uppercase">Time</div>
                    </div>

                    {/* Score if evaluation */}
                    {session.type === 'EVALUATION' && session.summary?.correct_count && (
                      <div className="text-center">
                        <div className="text-headline-md font-bold text-primary">
                          {session.summary.correct_count}/{session.summary.total_questions}
                        </div>
                        <div className="text-label-sm-mono text-on-surface-variant uppercase">Score</div>
                      </div>
                    )}

                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
