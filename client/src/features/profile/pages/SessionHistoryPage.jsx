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
    <div className="w-full min-w-0 animate-fade-in space-y-8 pb-16 text-left">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            History &middot; Evaluation &amp; Practice Log
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight">
            Session History
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Chronological record of all timed evaluations and untimed drill sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/practice')}
            className="px-4 py-2 bg-transparent border border-white/15 text-white/80 hover:text-white hover:border-primary text-xs font-mono uppercase tracking-wider rounded-none transition-colors"
          >
            drill practice
          </button>
          <button
            onClick={() => navigate('/evaluate')}
            className="px-4 py-2 bg-primary text-black hover:brightness-110 text-xs font-mono uppercase tracking-wider font-bold rounded-none transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            take mock
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/30 text-error text-xs font-mono">
          {error}
        </div>
      )}

      {allSessions.length === 0 ? (
        <div className="text-left py-12 border border-white/10 bg-white/[0.01] p-8 space-y-4">
          <History className="w-10 h-10 text-primary opacity-60" />
          <h3 className="text-xl font-light text-white">No sessions recorded yet</h3>
          <p className="text-xs text-white/50 max-w-md font-mono">
            Start a practice drill or take a timed evaluation to track your historical attempts here.
          </p>
          <button
            onClick={() => navigate('/practice')}
            className="px-6 py-3 bg-primary text-black text-xs font-mono uppercase tracking-widest font-bold rounded-none hover:brightness-110 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            Start Practice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Sticky Telemetry Rail on Widescreen) */}
          <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-6 text-left">
            {/* Analytics KPI Tiles */}
            {analytics && (
              <div className="space-y-3">
                <div className="text-xs font-mono text-white/50 uppercase tracking-widest">
                  PORTFOLIO TELEMETRY
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-primary/40 bg-primary/10 p-4 relative overflow-hidden text-left">
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary" />
                    <div className="text-[10px] font-mono text-white/60 uppercase tracking-widest mb-0.5 font-semibold">Total Sessions</div>
                    <div className="text-2xl md:text-3xl font-light font-sans text-primary">{analytics.totalSessions}</div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">evals &amp; drills</div>
                  </div>

                  <div className="border border-white/15 bg-white/[0.02] p-4 relative overflow-hidden text-left">
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-white/40" />
                    <div className="text-[10px] font-mono text-white/60 uppercase tracking-widest mb-0.5 font-semibold">Time Invested</div>
                    <div className="text-2xl md:text-3xl font-light font-sans text-white">{analytics.totalHours}h</div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">active testing</div>
                  </div>

                  <div className="border border-white/15 bg-white/[0.02] p-4 text-left">
                    <div className="text-[10px] font-mono text-white/60 uppercase tracking-widest mb-0.5">Avg Accuracy</div>
                    <div className={`text-2xl md:text-3xl font-light font-mono ${
                      analytics.avgAccuracy >= 70 ? 'text-status-aligned' :
                      analytics.avgAccuracy >= 40 ? 'text-status-weak' : 'text-error'
                    }`}>
                      {analytics.avgAccuracy}%
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">overall average</div>
                  </div>

                  <div className={`p-4 text-left border ${
                    analytics.trend === 'improving'
                      ? 'bg-status-aligned/10 border-status-aligned/40'
                      : 'border-white/15 bg-white/[0.02]'
                  }`}>
                    <div className="text-[10px] font-mono text-white/60 uppercase tracking-widest mb-0.5">Recent Trend</div>
                    <div className={`text-2xl md:text-3xl font-light font-mono flex items-center gap-1.5 ${
                      analytics.trend === 'improving' ? 'text-status-aligned' : 'text-white'
                    }`}>
                      {analytics.recentAvg !== null ? `${analytics.recentAvg}%` : '—'}
                      {analytics.trend === 'improving' && <TrendingUp className="w-4 h-4 text-status-aligned shrink-0" />}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">last 7 sessions</div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Practiced Topics */}
            {analytics?.topTopics?.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-mono text-white/50 uppercase tracking-widest">
                  MOST ACTIVE TOPICS
                </div>
                <div className="space-y-1">
                  {analytics.topTopics.map((item) => (
                    <div
                      key={item.name}
                      className="p-2.5 border-b border-white/10 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-white/80 truncate mr-2">{item.name}</span>
                      <span className="text-primary font-bold">{item.count} sets</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Session Stream) */}
          <div className="lg:col-span-8 space-y-4 text-left">
            {/* Filters & Sort Controls */}
            <div className="border-b border-white/10 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mr-1">Filter:</span>
                {['ALL', 'PRACTICE', 'EVALUATION'].map(type => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded-none transition-colors ${
                      typeFilter === type
                        ? 'bg-primary text-black font-bold'
                        : 'bg-transparent border border-white/15 text-white/60 hover:text-white hover:border-primary'
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
                  className="w-full sm:w-auto px-3 py-1 bg-black border border-white/20 rounded-none text-xs font-mono text-white outline-none focus:border-primary"
                >
                  <option value="DATE_DESC">Newest First</option>
                  <option value="ACCURACY_DESC">Highest Accuracy</option>
                  <option value="DURATION_DESC">Longest Duration</option>
                </select>
              </div>
            </div>

            {/* Sessions Timeline Stream */}
            <div className="space-y-1">
              {allSessions.map((session) => {
                const accuracy = session.accuracy ?? session.summary?.accuracy;
                const isEval = session.type === 'EVALUATION';

                return (
                  <div
                    key={`${session.type}-${session.sessionId}`}
                    className="p-3.5 border-b border-white/10 hover:border-primary/50 transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    onClick={() => {
                      if (isEval) {
                        navigate(`/results/${session.sessionId}`);
                      } else if (session.topic_id) {
                        navigate(`/topics/${session.topic_id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold rounded-none shrink-0 ${
                        isEval ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-white/10 text-white/80 border border-white/20'
                      }`}>
                        {isEval ? 'Mock' : 'Drill'}
                      </span>

                      <div className="min-w-0">
                        <div className="text-sm font-light text-white group-hover:text-primary transition-colors truncate">
                          {session.topicName}
                        </div>
                        <div className="text-[10px] font-mono text-white/40 mt-0.5">
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

                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                      {accuracy !== null && accuracy !== undefined && (
                        <div className="text-center sm:text-right">
                          <div className={`text-base font-light font-mono ${
                            accuracy >= 70 ? 'text-status-aligned' :
                            accuracy >= 40 ? 'text-status-weak' : 'text-error'
                          }`}>
                            {accuracy}%
                          </div>
                          <div className="text-[9px] font-mono text-white/40 uppercase">Accuracy</div>
                        </div>
                      )}

                      <div className="text-center sm:text-right">
                        <div className="text-base font-light font-mono text-white">
                          {session.correct_count !== undefined && session.total_questions !== undefined
                            ? `${session.correct_count}/${session.total_questions}`
                            : session.summary?.total_questions || session.question_count || '—'}
                        </div>
                        <div className="text-[9px] font-mono text-white/40 uppercase">
                          {session.correct_count !== undefined ? 'Score' : 'Questions'}
                        </div>
                      </div>

                      <div className="text-center sm:text-right">
                        <div className="text-base font-light font-mono text-white/70">
                          {isEval
                            ? `${Math.floor((session.duration_seconds || session.summary?.duration_seconds || 0) / 60)}m`
                            : `${Math.round((session.summary?.total_time_seconds || 0) / 60)}m`
                          }
                        </div>
                        <div className="text-[9px] font-mono text-white/40 uppercase">Time</div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
