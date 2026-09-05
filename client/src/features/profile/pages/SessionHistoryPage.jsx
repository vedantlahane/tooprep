import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { History, TrendingUp, ArrowRight, Timer, Play, Calendar } from '@/shared/components/Icon';
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
      setPracticeSessions(Array.isArray(practice) ? practice : []);
      setEvaluations(Array.isArray(evals) ? evals : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const allSessions = useMemo(() => {
    const combined = [
      ...practiceSessions.map(s => ({
        ...s,
        type: 'PRACTICE',
        sessionId: s.id,
        topicName: s.topics?.name || s.topic?.name || s.topic_name || 'Practice Session'
      })),
      ...evaluations.map(e => ({
        ...e,
        type: 'EVALUATION',
        sessionId: e.id,
        topicName: e.topics?.name || e.topic?.name || e.topic_name || 'Timed Evaluation'
      }))
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
      filtered.sort((a, b) => (b.accuracy || b.summary?.accuracy || 0) - (a.accuracy || a.summary?.accuracy || 0));
    } else if (sortBy === 'DURATION_DESC') {
      const getDuration = (s) => (s.duration_seconds || s.summary?.duration_seconds || s.summary?.total_time_seconds || 0);
      filtered.sort((a, b) => getDuration(b) - getDuration(a));
    }

    return filtered;
  }, [practiceSessions, evaluations, typeFilter, sortBy]);

  const analytics = useMemo(() => {
    if (allSessions.length === 0) return null;

    const totalSessions = allSessions.length;
    const totalTime = allSessions.reduce((sum, s) => {
      const time = s.type === 'EVALUATION'
        ? (s.duration_seconds || s.summary?.duration_seconds || 0)
        : (s.summary?.total_time_seconds || 0);
      return sum + time;
    }, 0);
    const totalHours = (totalTime / 3600).toFixed(1);

    const accuracies = allSessions
      .map(s => s.accuracy ?? s.summary?.accuracy)
      .filter(a => a !== null && a !== undefined);
    const avgAccuracy = accuracies.length > 0
      ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
      : 0;

    const topics = {};
    allSessions.forEach(s => {
      const name = s.topicName || 'Unknown';
      if (!topics[name]) topics[name] = 0;
      topics[name]++;
    });
    const topTopics = Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const recent7 = allSessions.slice(0, 7);
    const recentAccuracies = recent7
      .map(s => s.accuracy ?? s.summary?.accuracy)
      .filter(a => a !== null && a !== undefined);
    const recentAvg = recentAccuracies.length > 0
      ? Math.round(recentAccuracies.reduce((a, b) => a + b, 0) / recentAccuracies.length)
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
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest text-xs font-mono">Loading Session History...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl min-w-0 mr-auto animate-fade-in space-y-8 pb-16 text-left">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            History &middot; Evaluation &amp; Practice Log
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight lowercase">
            session history
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Chronological record of all timed evaluations and untimed drill sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/practice')}
            className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors"
          >
            drill practice
          </button>
          <button
            onClick={() => navigate('/evaluate')}
            className="px-4 py-2 bg-primary text-white hover:brightness-110 text-xs font-mono uppercase tracking-wider font-semibold rounded-sm transition-all"
          >
            take mock
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-xs font-mono rounded-r-sm">
          {error}
        </div>
      )}

      {allSessions.length === 0 ? (
        <div className="text-center py-16 acrylic-glass border border-white/10 rounded-sm">
          <History className="w-14 h-14 text-primary block opacity-60 mb-4 mx-auto" />
          <h3 className="text-xl font-light text-white mb-2 lowercase">no sessions recorded yet</h3>
          <p className="text-sm text-white/50 max-w-md mx-auto mb-6 font-mono">
            Start a practice drill or take a timed evaluation to track your historical attempts here.
          </p>
          <button
            onClick={() => navigate('/practice')}
            className="px-6 py-3 bg-primary text-white text-xs font-mono uppercase tracking-widest font-bold rounded-sm hover:brightness-110 transition-all"
          >
            Start Practice
          </button>
        </div>
      ) : (
        <>
          {/* Analytics KPI Cards */}
          {analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="acrylic-glass border border-white/10 rounded-sm p-4 text-center">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Total Sessions</div>
                <div className="text-2xl md:text-3xl font-light font-mono text-primary">{analytics.totalSessions}</div>
                <div className="text-[10px] font-mono text-white/40 mt-1">evals & drills</div>
              </div>

              <div className="acrylic-glass border border-white/10 rounded-sm p-4 text-center">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Time Invested</div>
                <div className="text-2xl md:text-3xl font-light font-mono text-white">{analytics.totalHours}h</div>
                <div className="text-[10px] font-mono text-white/40 mt-1">active testing</div>
              </div>

              <div className="acrylic-glass border border-white/10 rounded-sm p-4 text-center">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Avg Accuracy</div>
                <div className={`text-2xl md:text-3xl font-light font-mono ${
                  analytics.avgAccuracy >= 70 ? 'text-status-aligned' :
                  analytics.avgAccuracy >= 40 ? 'text-status-weak' : 'text-error'
                }`}>
                  {analytics.avgAccuracy}%
                </div>
                <div className="text-[10px] font-mono text-white/40 mt-1">overall average</div>
              </div>

              <div className={`rounded-sm p-4 text-center border ${
                analytics.trend === 'improving'
                  ? 'bg-status-aligned/10 border-status-aligned/30'
                  : 'acrylic-glass border-white/10'
              }`}>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Recent Trend</div>
                <div className={`text-2xl md:text-3xl font-light font-mono flex items-center justify-center gap-1.5 ${
                  analytics.trend === 'improving' ? 'text-status-aligned' : 'text-white'
                }`}>
                  {analytics.recentAvg !== null ? `${analytics.recentAvg}%` : '—'}
                  {analytics.trend === 'improving' && <TrendingUp className="w-4 h-4 text-status-aligned flex-shrink-0" />}
                </div>
                <div className="text-[10px] font-mono text-white/40 mt-1">last 7 sessions</div>
              </div>
            </div>
          )}

          {/* Filters & Sort Controls */}
          <div className="acrylic-glass border border-white/10 p-4 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mr-1">Filter:</span>
              {['ALL', 'PRACTICE', 'EVALUATION'].map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-xs text-xs font-mono uppercase tracking-wider transition-colors ${
                    typeFilter === type
                      ? 'bg-primary text-white font-bold'
                      : 'bg-surface-container border border-white/10 text-white/60 hover:text-white hover:border-white/20'
                  }`}
                >
                  {type === 'ALL' ? 'All' : type === 'PRACTICE' ? 'Practice' : 'Mocks'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest whitespace-nowrap">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-black border border-white/15 rounded-xs text-xs font-mono text-white outline-none focus:border-primary"
              >
                <option value="DATE_DESC">Newest First</option>
                <option value="ACCURACY_DESC">Highest Accuracy</option>
                <option value="DURATION_DESC">Longest Duration</option>
              </select>
            </div>
          </div>

          {/* Sessions Timeline */}
          <div className="space-y-3">
            {allSessions.map((session) => {
              const accuracy = session.accuracy ?? session.summary?.accuracy;
              const isEval = session.type === 'EVALUATION';

              return (
                <div
                  key={`${session.type}-${session.sessionId}`}
                  className="p-4 bg-surface-container/40 border border-white/10 hover:border-white/25 rounded-sm transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  onClick={() => {
                    if (isEval) {
                      navigate(`/results/${session.sessionId}`);
                    } else if (session.topic_id) {
                      navigate(`/topics/${session.topic_id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-xs font-semibold ${
                      isEval ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-white/10 text-white/80 border border-white/15'
                    }`}>
                      {isEval ? 'Mock' : 'Drill'}
                    </span>

                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                        {session.topicName}
                      </div>
                      <div className="text-[11px] font-mono text-white/40 mt-0.5">
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

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t border-white/5 sm:border-0">
                    {accuracy !== null && accuracy !== undefined && (
                      <div className="text-center sm:text-right">
                        <div className={`text-lg font-light font-mono ${
                          accuracy >= 70 ? 'text-status-aligned' :
                          accuracy >= 40 ? 'text-status-weak' : 'text-error'
                        }`}>
                          {accuracy}%
                        </div>
                        <div className="text-[9px] font-mono text-white/40 uppercase">Accuracy</div>
                      </div>
                    )}

                    <div className="text-center sm:text-right">
                      <div className="text-lg font-light font-mono text-white">
                        {session.correct_count !== undefined && session.total_questions !== undefined
                          ? `${session.correct_count}/${session.total_questions}`
                          : session.summary?.total_questions || session.question_count || '—'}
                      </div>
                      <div className="text-[9px] font-mono text-white/40 uppercase">
                        {session.correct_count !== undefined ? 'Score' : 'Questions'}
                      </div>
                    </div>

                    <div className="text-center sm:text-right">
                      <div className="text-lg font-light font-mono text-white/70">
                        {isEval
                          ? `${Math.floor((session.duration_seconds || session.summary?.duration_seconds || 0) / 60)}m`
                          : `${Math.round((session.summary?.total_time_seconds || 0) / 60)}m`
                        }
                      </div>
                      <div className="text-[9px] font-mono text-white/40 uppercase">Time</div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
