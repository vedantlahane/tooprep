import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { TrendingUp, TrendingDown, ArrowRight, Activity, Timer, Play, CheckCircle2, AlertTriangle } from '@/shared/components/Icon';
import { dashboardService } from '../services/dashboardService';
import { evaluationsService } from '@/features/evaluations/services/evaluationsService';
import { topicsService } from '@/features/topics/services/topicsService';

export default function PerformanceTrendPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashData, evals] = await Promise.all([
        dashboardService.getDashboard(),
        evaluationsService.listEvaluations().catch(() => [])
      ]);
      setData(dashData || []);
      setEvaluations(evals || []);
      
      // Auto-select first topic with multiple evaluations
      const topicsWithMultipleEvals = {};
      (evals || []).forEach(e => {
        const topicId = e.topic_id || e.topic?.id;
        if (!topicsWithMultipleEvals[topicId]) topicsWithMultipleEvals[topicId] = [];
        topicsWithMultipleEvals[topicId].push(e);
      });
      const firstTopicWithTrend = Object.entries(topicsWithMultipleEvals)
        .find(([_, evals]) => evals.length > 1)?.[0];
      if (firstTopicWithTrend) {
        setSelectedTopic(firstTopicWithTrend);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group evaluations by topic
  const evaluationsByTopic = useMemo(() => {
    const grouped = {};
    evaluations.forEach(eval_ => {
      const topicId = eval_.topic_id || eval_.topic?.id;
      if (!grouped[topicId]) {
        grouped[topicId] = [];
      }
      grouped[topicId].push({
        ...eval_,
        date: new Date(eval_.started_at || eval_.created_at),
        accuracy: eval_.summary?.accuracy || 0,
        questionCount: eval_.summary?.total_questions || 0,
        correct: eval_.summary?.correct_count || 0
      });
    });

    // Sort each topic's evaluations by date
    Object.keys(grouped).forEach(topicId => {
      grouped[topicId].sort((a, b) => a.date - b.date);
    });

    return grouped;
  }, [evaluations]);

  // Get topic info
  const topicsWithTrends = useMemo(() => {
    return Object.entries(evaluationsByTopic)
      .filter(([_, evals]) => evals.length > 1)
      .map(([topicId, evals]) => {
        const topic = data.find(t => t.topic_id === topicId);
        const accuracies = evals.map(e => e.accuracy);
        const avgAccuracy = Math.round(accuracies.reduce((a, b) => a + b) / accuracies.length);
        const trend = accuracies[accuracies.length - 1] - accuracies[0]; // Latest vs first
        const improvement = trend > 0;

        return {
          topicId,
          topicName: topic?.topic_name || 'Unknown Topic',
          subject: topic?.subject_name,
          chapter: topic?.chapter_name,
          evaluations: evals,
          averageAccuracy: avgAccuracy,
          trend,
          improvement,
          firstAccuracy: accuracies[0],
          lastAccuracy: accuracies[accuracies.length - 1],
          count: evals.length
        };
      })
      .sort((a, b) => b.lastAccuracy - a.lastAccuracy);
  }, [evaluationsByTopic, data]);

  const selectedTopicData = useMemo(() => {
    if (!selectedTopic || !topicsWithTrends) return null;
    return topicsWithTrends.find(t => t.topicId === selectedTopic);
  }, [selectedTopic, topicsWithTrends]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest text-xs font-mono">Analyzing Longitudinal Trends...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mr-auto py-10 text-left">
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-xs font-mono rounded-r-sm">
          {error}
        </div>
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
            Trends &middot; Accuracy &amp; Score Trajectory
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight lowercase">
            performance trends
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Longitudinal trajectory tracking: Monitor empirical improvement across multiple evaluation attempts.
          </p>
        </div>

        <button
          onClick={() => navigate('/evaluate')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:brightness-110 text-xs font-mono uppercase tracking-wider font-semibold rounded-sm transition-all"
        >
          <Timer className="w-3.5 h-3.5" />
          new evaluation
        </button>
      </div>

      {topicsWithTrends.length === 0 ? (
        <div className="text-center py-16 acrylic-glass border border-white/10 rounded-sm">
          <TrendingUp className="w-14 h-14 text-primary block opacity-60 mb-4 mx-auto" />
          <h3 className="text-xl font-light text-white mb-2 lowercase">no retest trends yet</h3>
          <p className="text-sm text-white/50 max-w-md mx-auto mb-6 font-mono">
            Retake evaluations on the same topic to generate accuracy progression charts and trajectory metrics.
          </p>
          <button
            onClick={() => navigate('/evaluate')}
            className="px-6 py-3 bg-primary text-white text-xs font-mono uppercase tracking-widest font-bold rounded-sm hover:brightness-110 transition-all"
          >
            Take an Evaluation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Topic List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center justify-between">
              <span>Topics with trends</span>
              <span className="text-primary font-bold">{topicsWithTrends.length}</span>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar">
              {topicsWithTrends.map((topic) => (
                <button
                  key={topic.topicId}
                  onClick={() => setSelectedTopic(topic.topicId)}
                  className={`w-full text-left p-3.5 rounded-sm border transition-all text-xs font-mono ${
                    selectedTopic === topic.topicId
                      ? 'border-primary bg-primary/10 text-white'
                      : 'border-white/10 bg-surface-container/60 hover:border-white/20 text-white/80'
                  }`}
                >
                  <div className="font-semibold text-sm line-clamp-1">{topic.topicName}</div>
                  <div className="text-[10px] text-white/40 mt-1 uppercase">
                    {topic.count} evaluations
                  </div>
                  <div className={`text-xs font-bold mt-2 flex items-center gap-1.5 ${
                    topic.improvement ? 'text-status-aligned' : 'text-white/50'
                  }`}>
                    {topic.improvement ? (
                      <TrendingUp className="w-3.5 h-3.5 text-status-aligned shrink-0" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    )}
                    <span>{topic.improvement ? `+${topic.trend}%` : `${topic.trend}%`}</span>
                    <span className="text-white/40 font-normal">latest: {topic.lastAccuracy}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Trend Detail */}
          {selectedTopicData && (
            <div className="lg:col-span-3 space-y-6">
              {/* Topic Header */}
              <div className="acrylic-glass border border-white/10 rounded-sm p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-2xl font-light text-white">{selectedTopicData.topicName}</h3>
                    <p className="text-xs font-mono text-white/50 uppercase mt-1">
                      {selectedTopicData.subject} › {selectedTopicData.chapter}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/practice?topic=${selectedTopicData.topicId}`)}
                      className="px-3.5 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-primary hover:text-white transition-colors"
                    >
                      drill topic
                    </button>
                    <button
                      onClick={() => navigate(`/evaluate?topic=${selectedTopicData.topicId}`)}
                      className="px-3.5 py-2 bg-primary text-white text-xs font-mono uppercase tracking-wider font-semibold rounded-sm hover:brightness-110 transition-all"
                    >
                      re-test
                    </button>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-surface-container/60 border border-white/5 rounded-sm text-center">
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Attempts</div>
                    <div className="text-2xl font-light font-mono text-white">{selectedTopicData.count}</div>
                  </div>

                  <div className="p-3 bg-surface-container/60 border border-white/5 rounded-sm text-center">
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Avg Accuracy</div>
                    <div className="text-2xl font-light font-mono text-primary">{selectedTopicData.averageAccuracy}%</div>
                  </div>

                  <div className="p-3 bg-surface-container/60 border border-white/5 rounded-sm text-center">
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Baseline (1st)</div>
                    <div className="text-2xl font-light font-mono text-white/70">{selectedTopicData.firstAccuracy}%</div>
                  </div>

                  <div className={`p-3 rounded-sm text-center border ${
                    selectedTopicData.improvement
                      ? 'bg-status-aligned/10 border-status-aligned/30'
                      : 'bg-surface-container/60 border-white/5'
                  }`}>
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Latest</div>
                    <div className={`text-2xl font-light font-mono ${
                      selectedTopicData.improvement ? 'text-status-aligned' : 'text-white'
                    }`}>
                      {selectedTopicData.lastAccuracy}%
                    </div>
                  </div>
                </div>

                {/* Trend Banner */}
                {selectedTopicData.improvement && (
                  <div className="mt-4 p-3.5 bg-status-aligned/10 border border-status-aligned/30 rounded-sm flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-status-aligned flex-shrink-0" />
                    <div>
                      <div className="text-xs font-mono text-status-aligned uppercase tracking-wider font-bold">Positive Trajectory</div>
                      <div className="text-xs text-white/80 font-mono mt-0.5">
                        +{selectedTopicData.trend}% overall improvement from first evaluation to latest attempt.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trajectory Bar Chart */}
              <div className="acrylic-glass border border-white/10 rounded-sm p-6">
                <h3 className="text-xs font-mono text-white/60 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  ACCURACY PROGRESSION ACROSS ATTEMPTS
                </h3>

                <div className="space-y-6">
                  {/* Visual Bar Chart */}
                  <div className="flex items-end justify-between h-52 gap-3 px-2 border-b border-white/10 pb-4">
                    {selectedTopicData.evaluations.map((eval_, idx) => {
                      const heightPercent = Math.max(12, eval_.accuracy);
                      const barColor = eval_.accuracy >= 70 ? 'bg-status-aligned' : eval_.accuracy >= 40 ? 'bg-status-weak' : 'bg-error';

                      return (
                        <div
                          key={eval_.id}
                          className="flex-1 flex flex-col items-center group cursor-pointer"
                          onClick={() => navigate(`/results/${eval_.id}`)}
                        >
                          <div className="text-[11px] font-mono font-bold text-white/80 group-hover:text-primary mb-1">
                            {eval_.accuracy}%
                          </div>

                          <div className="w-full max-w-[48px] h-36 bg-black/40 rounded-t-xs flex items-end justify-center p-1">
                            <div
                              className={`w-full rounded-t-xs transition-all duration-300 group-hover:brightness-125 ${barColor}`}
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>

                          <div className="text-[10px] font-mono text-white/40 mt-2 uppercase tracking-wider text-center">
                            #{idx + 1}
                          </div>
                          <div className="text-[9px] font-mono text-white/30 text-center">
                            {eval_.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Evaluation Attempts Log */}
                  <div className="space-y-2">
                    {selectedTopicData.evaluations.map((eval_, idx) => (
                      <button
                        key={eval_.id}
                        onClick={() => navigate(`/results/${eval_.id}`)}
                        className="w-full p-3.5 bg-surface-container/40 border border-white/5 hover:border-white/20 rounded-sm transition-colors text-left flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                            Attempt #{idx + 1}
                          </div>
                          <div className="text-[11px] font-mono text-white/40 mt-0.5">
                            {eval_.date.toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <div className={`text-lg font-light font-mono ${
                              eval_.accuracy >= 70 ? 'text-status-aligned' :
                              eval_.accuracy >= 40 ? 'text-status-weak' : 'text-error'
                            }`}>
                              {eval_.accuracy}%
                            </div>
                            <div className="text-[10px] font-mono text-white/40">
                              {eval_.correct}/{eval_.questionCount} correct
                            </div>
                          </div>

                          {idx > 0 && (
                            <div className={`text-xs font-mono font-bold w-12 ${
                              eval_.accuracy > selectedTopicData.evaluations[idx - 1].accuracy
                                ? 'text-status-aligned'
                                : eval_.accuracy < selectedTopicData.evaluations[idx - 1].accuracy
                                  ? 'text-error'
                                  : 'text-white/40'
                            }`}>
                              {eval_.accuracy > selectedTopicData.evaluations[idx - 1].accuracy
                                ? `+${eval_.accuracy - selectedTopicData.evaluations[idx - 1].accuracy}%`
                                : eval_.accuracy < selectedTopicData.evaluations[idx - 1].accuracy
                                  ? `${eval_.accuracy - selectedTopicData.evaluations[idx - 1].accuracy}%`
                                  : '0%'}
                            </div>
                          )}

                          <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overall Trends Summary */}
      {topicsWithTrends.length > 0 && (
        <div className="acrylic-glass border border-white/10 rounded-sm p-6">
          <h3 className="text-xs font-mono text-white/60 uppercase tracking-widest mb-4">PLATFORM-WIDE RETEST SUMMARY</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-container/60 rounded-sm text-center border border-white/5">
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Topics Improving</div>
              <div className="text-3xl font-light font-mono text-status-aligned">
                {topicsWithTrends.filter(t => t.improvement).length}
              </div>
              <div className="text-[11px] font-mono text-white/50 mt-1">
                {Math.round((topicsWithTrends.filter(t => t.improvement).length / topicsWithTrends.length) * 100)}% of retested topics
              </div>
            </div>

            <div className="p-4 bg-surface-container/60 rounded-sm text-center border border-white/5">
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Avg Delta</div>
              <div className="text-3xl font-light font-mono text-primary">
                {Math.round(topicsWithTrends.reduce((sum, t) => sum + t.trend, 0) / topicsWithTrends.length)}%
              </div>
              <div className="text-[11px] font-mono text-white/50 mt-1">
                across all repeated sessions
              </div>
            </div>

            <div className="p-4 bg-surface-container/60 rounded-sm text-center border border-white/5">
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Evaluations Logged</div>
              <div className="text-3xl font-light font-mono text-white">
                {evaluations.length}
              </div>
              <div className="text-[11px] font-mono text-white/50 mt-1">
                {topicsWithTrends.reduce((sum, t) => sum + t.count, 0)} evaluations tracked
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
