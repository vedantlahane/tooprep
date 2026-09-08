import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { TrendingUp, TrendingDown, ArrowRight, Activity, Timer, Play, CheckCircle2, AlertTriangle } from '@/shared/components/Icon';
import { dashboardService } from '../services/dashboardService';
import { evaluationsService } from '@/features/evaluations/services/evaluationsService';
import { topicsService } from '@/features/topics/services/topicsService';
import MapSubNav from '../components/MapSubNav';

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
        <div className="p-4 bg-error/10 border border-error/30 text-error text-xs font-mono">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-6 pb-16 text-left">
      <MapSubNav />

      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Trends &middot; Accuracy &amp; Score Trajectory
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight">
            Performance Trends
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Longitudinal trajectory tracking: Monitor empirical improvement across multiple evaluation attempts.
          </p>
        </div>

        <button
          onClick={() => navigate('/evaluate')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black hover:brightness-110 text-xs font-mono uppercase tracking-wider font-bold rounded-none transition-all shadow-md shadow-primary/20 cursor-pointer"
        >
          <Timer className="w-3.5 h-3.5" />
          new evaluation
        </button>
      </div>

      {topicsWithTrends.length === 0 ? (
        <div className="text-left py-12 border border-white/10 bg-white/[0.01] p-8 space-y-4">
          <TrendingUp className="w-10 h-10 text-primary opacity-60" />
          <h3 className="text-xl font-light text-white">No retest trends yet</h3>
          <p className="text-xs text-white/50 max-w-md font-mono">
            Retake evaluations on the same topic to generate longitudinal accuracy progression charts and trajectory metrics.
          </p>
          <button
            onClick={() => navigate('/evaluate')}
            className="px-6 py-3 bg-primary text-black text-xs font-mono uppercase tracking-widest font-bold rounded-none hover:brightness-110 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            Take an Evaluation
          </button>
        </div>
      ) : (
        <>
          {/* Platform-Wide Retest Summary Live Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 border border-status-aligned/40 bg-status-aligned/5 relative overflow-hidden text-left">
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-status-aligned" />
              <div className="text-[10px] font-mono text-status-aligned uppercase tracking-widest mb-1 font-bold">Topics Improving</div>
              <div className="text-3xl font-light font-mono text-status-aligned">
                {topicsWithTrends.filter(t => t.improvement).length}
              </div>
              <div className="text-[11px] font-mono text-white/40 mt-1">
                {Math.round((topicsWithTrends.filter(t => t.improvement).length / topicsWithTrends.length) * 100)}% of retested topics
              </div>
            </div>

            <div className="p-4 border border-primary/40 bg-primary/10 relative overflow-hidden text-left">
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary" />
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1 font-bold">Avg Trajectory Delta</div>
              <div className="text-3xl font-light font-mono text-primary">
                +{Math.round(topicsWithTrends.reduce((sum, t) => sum + t.trend, 0) / topicsWithTrends.length)}%
              </div>
              <div className="text-[11px] font-mono text-white/40 mt-1">
                across repeated attempts
              </div>
            </div>

            <div className="p-4 border border-white/15 bg-white/[0.02] relative overflow-hidden text-left">
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-white/40" />
              <div className="text-[10px] font-mono text-white/60 uppercase tracking-widest mb-1 font-bold">Evaluations Tracked</div>
              <div className="text-3xl font-light font-mono text-white">
                {evaluations.length}
              </div>
              <div className="text-[11px] font-mono text-white/40 mt-1">
                {topicsWithTrends.reduce((sum, t) => sum + t.count, 0)} comparative attempts
              </div>
            </div>
          </div>

          {/* Responsive Widescreen Continuum Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Topic Selector List */}
            <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-4 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-mono uppercase tracking-widest text-white/60 font-bold">Topics With Trends</span>
                <span className="text-primary font-bold text-xs font-mono">{topicsWithTrends.length} topics</span>
              </div>

              <div className="space-y-1 max-h-[600px] overflow-y-auto no-scrollbar">
                {topicsWithTrends.map((topic) => (
                  <button
                    key={topic.topicId}
                    onClick={() => setSelectedTopic(topic.topicId)}
                    className={`w-full text-left p-3.5 border-b transition-colors text-xs font-mono ${
                      selectedTopic === topic.topicId
                        ? 'border-primary bg-white/[0.03] text-white'
                        : 'border-white/10 hover:border-white/30 text-white/70'
                    }`}
                  >
                    <div className="font-light text-sm text-white truncate">{topic.topicName}</div>
                    <div className="text-[10px] text-white/40 mt-0.5 uppercase">
                      {topic.subject} &rsaquo; {topic.chapter}
                    </div>
                    <div className={`text-xs font-mono font-bold mt-2 flex items-center justify-between ${
                      topic.improvement ? 'text-status-aligned' : 'text-white/50'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {topic.improvement ? (
                          <TrendingUp className="w-3.5 h-3.5 text-status-aligned shrink-0" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        )}
                        <span>{topic.improvement ? `+${topic.trend}%` : `${topic.trend}%`}</span>
                      </div>
                      <span className="text-white/40 font-normal">latest: {topic.lastAccuracy}% ({topic.count} evals)</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Trend Detail & Progression */}
            {selectedTopicData && (
              <div className="lg:col-span-8 xl:col-span-8 space-y-6 text-left">
                {/* Topic Header & Actions */}
                <div className="border-b border-white/10 pb-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-light text-white">{selectedTopicData.topicName}</h3>
                      <p className="text-xs font-mono text-white/50 uppercase mt-1">
                        {selectedTopicData.subject} &rsaquo; {selectedTopicData.chapter}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/practice?topic=${selectedTopicData.topicId}`)}
                        className="px-3.5 py-2 bg-transparent border border-white/15 text-white/80 hover:text-white hover:border-primary text-xs font-mono uppercase tracking-wider rounded-none transition-colors"
                      >
                        drill topic
                      </button>
                      <button
                        onClick={() => navigate(`/evaluate?topic=${selectedTopicData.topicId}`)}
                        className="px-3.5 py-2 bg-primary text-black text-xs font-mono uppercase tracking-wider font-bold rounded-none hover:brightness-110 transition-all shadow-md shadow-primary/20"
                      >
                        re-test
                      </button>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <div className="p-3 border border-white/10 bg-white/[0.01] text-left">
                      <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-0.5">Attempts</div>
                      <div className="text-2xl font-light font-mono text-white">{selectedTopicData.count}</div>
                    </div>

                    <div className="p-3 border border-white/10 bg-white/[0.01] text-left">
                      <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-0.5">Avg Accuracy</div>
                      <div className="text-2xl font-light font-mono text-primary">{selectedTopicData.averageAccuracy}%</div>
                    </div>

                    <div className="p-3 border border-white/10 bg-white/[0.01] text-left">
                      <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-0.5">Baseline (1st)</div>
                      <div className="text-2xl font-light font-mono text-white/70">{selectedTopicData.firstAccuracy}%</div>
                    </div>

                    <div className={`p-3 text-left border ${
                      selectedTopicData.improvement
                        ? 'border-status-aligned/40 bg-status-aligned/5'
                        : 'border-white/10 bg-white/[0.01]'
                    }`}>
                      <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-0.5">Latest</div>
                      <div className={`text-2xl font-light font-mono ${
                        selectedTopicData.improvement ? 'text-status-aligned' : 'text-white'
                      }`}>
                        {selectedTopicData.lastAccuracy}%
                      </div>
                    </div>
                  </div>

                  {/* Trend Banner */}
                  {selectedTopicData.improvement && (
                    <div className="mt-4 p-3.5 border border-status-aligned/40 bg-status-aligned/5 flex items-center gap-3 text-left">
                      <TrendingUp className="w-5 h-5 text-status-aligned shrink-0" />
                      <div>
                        <div className="text-xs font-mono text-status-aligned uppercase tracking-wider font-bold">Positive Longitudinal Trajectory</div>
                        <div className="text-xs text-white/70 font-mono mt-0.5">
                          +{selectedTopicData.trend}% net improvement from baseline attempt to latest evaluation.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Trajectory Visual Progression */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-xs font-mono text-primary uppercase tracking-widest flex items-center gap-2 font-bold">
                      <Activity className="w-4 h-4" />
                      LONGITUDINAL ATTEMPTS TRAJECTORY
                    </h3>
                    <span className="text-[10px] font-mono text-white/40 uppercase">Attempt Chronology</span>
                  </div>

                  {/* Visual Bar Chart */}
                  <div className="flex items-end justify-between h-48 gap-3 px-2 border-b border-white/10 pb-4">
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

                          <div className="w-full max-w-[48px] h-32 bg-white/[0.02] flex items-end justify-center p-0.5">
                            <div
                              className={`w-full transition-all duration-300 group-hover:brightness-125 ${barColor}`}
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
                  <div className="space-y-1 pt-2">
                    {selectedTopicData.evaluations.map((eval_, idx) => (
                      <button
                        key={eval_.id}
                        onClick={() => navigate(`/results/${eval_.id}`)}
                        className="w-full p-3 border-b border-white/10 hover:border-primary/50 transition-colors text-left flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-sm font-light text-white group-hover:text-primary transition-colors">
                            Evaluation Attempt #{idx + 1}
                          </div>
                          <div className="text-[10px] font-mono text-white/40 mt-0.5">
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
                            <div className={`text-base font-light font-mono ${
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

                          <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-primary transition-colors shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
