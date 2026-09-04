import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight } from 'lucide-react';
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
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest">Analyzing trends...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <div className="p-4 bg-error/10 border-l-4 border-error text-error rounded-r-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-8 pb-12">
      <div>
        <p className="text-label-sm-mono uppercase tracking-[0.2em] text-primary">performance trends</p>
        <h2 className="text-display text-on-surface mt-2 font-light">track your improvement</h2>
        <p className="text-body-lg text-on-surface-variant font-light mt-2">See how you're improving on topics you've retested.</p>
      </div>

      {topicsWithTrends.length === 0 ? (
        <div className="text-center py-20 border border-outline-variant rounded-lg bg-surface-container">
          <TrendingUp className="w-16 h-16 text-primary block opacity-50 mb-4 mx-auto" />
          <h3 className="text-headline-lg text-on-surface font-light mb-2">No trends yet</h3>
          <p className="text-body-lg text-on-surface-variant mb-6">Retake evaluations on the same topic to see your improvement trend.</p>
          <button
            onClick={() => navigate('/evaluate')}
            className="px-6 py-3 bg-primary text-on-primary text-label-sm-mono uppercase tracking-widest rounded-lg hover:brightness-110"
          >
            Take Evaluation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Topic List */}
          <div className="lg:col-span-1">
            <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-3">Topics with trends</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {topicsWithTrends.map((topic) => (
                <button
                  key={topic.topicId}
                  onClick={() => setSelectedTopic(topic.topicId)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTopic === topic.topicId
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant bg-surface-container hover:border-primary'
                  }`}
                >
                  <div className="text-body-sm font-semibold">{topic.topicName}</div>
                  <div className="text-label-xs text-on-surface-variant mt-1">
                    {topic.count} evaluations
                  </div>
                  <div className={`text-label-xs font-bold mt-2 flex items-center gap-1 ${
                    topic.improvement ? 'text-status-aligned' : 'text-on-surface-variant'
                  }`}>
                    {topic.improvement ? '📈' : '→'} {topic.lastAccuracy}%
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Trend Detail */}
          {selectedTopicData && (
            <div className="lg:col-span-3 space-y-6">
              {/* Topic Header */}
              <div className="border border-outline-variant bg-surface-container rounded-lg p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-headline-lg text-on-surface font-light">{selectedTopicData.topicName}</h3>
                    <p className="text-body-md text-on-surface-variant mt-2">
                      {selectedTopicData.subject} › {selectedTopicData.chapter}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/topics/${selectedTopicData.topicId}`)}
                    className="px-4 py-2 border border-primary text-primary text-label-sm-mono uppercase tracking-widest hover:bg-primary/10 transition-colors rounded-lg"
                  >
                    View Topic
                  </button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-surface-dim rounded-lg text-center">
                    <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1">Evaluations</div>
                    <div className="text-headline-md font-light text-on-surface">{selectedTopicData.count}</div>
                  </div>

                  <div className="p-3 bg-surface-dim rounded-lg text-center">
                    <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1">Avg Accuracy</div>
                    <div className="text-headline-md font-light text-primary">{selectedTopicData.averageAccuracy}%</div>
                  </div>

                  <div className="p-3 bg-surface-dim rounded-lg text-center">
                    <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1">First Attempt</div>
                    <div className="text-headline-md font-light text-on-surface">{selectedTopicData.firstAccuracy}%</div>
                  </div>

                  <div className={`p-3 rounded-lg text-center border ${
                    selectedTopicData.improvement
                      ? 'bg-status-aligned/10 border-status-aligned'
                      : 'bg-surface-dim border-outline-variant'
                  }`}>
                    <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-1">Latest</div>
                    <div className={`text-headline-md font-light ${
                      selectedTopicData.improvement ? 'text-status-aligned' : 'text-on-surface'
                    }`}>
                      {selectedTopicData.lastAccuracy}%
                    </div>
                  </div>
                </div>

                {/* Trend Indicator */}
                {selectedTopicData.improvement && (
                  <div className="mt-4 p-3 bg-status-aligned/10 border border-status-aligned rounded-lg flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-status-aligned flex-shrink-0" />
                    <div>
                      <div className="text-label-sm-mono text-status-aligned uppercase tracking-widest font-bold">Improving!</div>
                      <div className="text-body-sm text-on-surface">
                        +{selectedTopicData.trend.toFixed(0)}% improvement from first to latest
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trend Chart */}
              <div className="border border-outline-variant bg-surface-container rounded-lg p-6">
                <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-4">Accuracy Over Time</h3>

                <div className="space-y-6">
                  {/* Simple line chart visualization */}
                  <div className="flex items-end justify-center h-64 gap-2 px-4">
                    {selectedTopicData.evaluations.map((eval_, idx) => {
                      const maxAccuracy = 100;
                      const heightPercent = (eval_.accuracy / maxAccuracy) * 100;
                      return (
                        <div
                          key={eval_.id}
                          className="flex-1 flex flex-col items-center group"
                        >
                          <div className="relative w-full flex items-end justify-center mb-2">
                            <div
                              className={`w-8 rounded-t transition-all group-hover:opacity-80 ${
                                eval_.accuracy >= 70
                                  ? 'bg-status-aligned'
                                  : eval_.accuracy >= 40
                                    ? 'bg-status-weak'
                                    : 'bg-error'
                              }`}
                              style={{
                                height: `${Math.max(10, heightPercent * 2)}px`
                              }}
                            />
                          </div>

                          {/* Tooltip */}
                          <div className="hidden group-hover:block absolute bottom-0 transform translate-y-12 bg-on-surface text-surface px-2 py-1 rounded text-label-xs whitespace-nowrap z-10">
                            <div>{eval_.accuracy}%</div>
                            <div className="text-[10px] opacity-80">
                              {eval_.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Data table */}
                  <div className="space-y-2">
                    {selectedTopicData.evaluations.map((eval_, idx) => (
                      <button
                        key={eval_.id}
                        onClick={() => navigate(`/results/${eval_.id}`)}
                        className="w-full p-3 bg-surface-dim border border-outline-variant hover:border-primary rounded-lg transition-colors text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-body-md text-on-surface font-semibold">
                              Attempt {idx + 1}
                            </div>
                            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mt-1">
                              {eval_.date.toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-4">
                            <div>
                              <div className={`text-headline-md font-bold ${
                                eval_.accuracy >= 70
                                  ? 'text-status-aligned'
                                  : eval_.accuracy >= 40
                                    ? 'text-status-weak'
                                    : 'text-error'
                              }`}>
                                {eval_.accuracy}%
                              </div>
                              <div className="text-label-sm-mono text-on-surface-variant">
                                {eval_.correct}/{eval_.questionCount}
                              </div>
                            </div>

                            {idx > 0 && (
                              <div className={`text-label-sm-mono font-bold ${
                                eval_.accuracy > selectedTopicData.evaluations[idx - 1].accuracy
                                  ? 'text-status-aligned'
                                  : eval_.accuracy < selectedTopicData.evaluations[idx - 1].accuracy
                                    ? 'text-error'
                                    : 'text-on-surface-variant'
                              }`}>
                                {eval_.accuracy > selectedTopicData.evaluations[idx - 1].accuracy
                                  ? `+${eval_.accuracy - selectedTopicData.evaluations[idx - 1].accuracy}%`
                                  : eval_.accuracy < selectedTopicData.evaluations[idx - 1].accuracy
                                    ? `${eval_.accuracy - selectedTopicData.evaluations[idx - 1].accuracy}%`
                                    : '→'}
                              </div>
                            )}

                            <ArrowRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="border border-outline-variant bg-surface-container rounded-lg p-6">
                <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-4">Insights</h3>
                <div className="space-y-3">
                  {selectedTopicData.improvement ? (
                    <div className="p-3 bg-status-aligned/10 border border-status-aligned rounded-lg text-body-md text-on-surface">
                      ✓ You're improving on this topic. Keep practicing to sustain momentum.
                    </div>
                  ) : (
                    <div className="p-3 bg-error/10 border border-error rounded-lg text-body-md text-on-surface">
                      Consider taking a quick drill to reinforce the weak concepts before re-evaluating.
                    </div>
                  )}

                  {selectedTopicData.averageAccuracy >= 70 && (
                    <div className="p-3 bg-primary/10 border border-primary rounded-lg text-body-md text-on-surface">
                      🎯 Your average accuracy is above 70%. This topic is well-prepared.
                    </div>
                  )}

                  {selectedTopicData.evaluations.length > 2 && (
                    <div className="p-3 bg-primary/10 border border-primary rounded-lg text-body-md text-on-surface">
                      📈 You've evaluated this topic {selectedTopicData.evaluations.length} times. Consistent practice shows commitment.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overall Trends Summary */}
      {topicsWithTrends.length > 0 && (
        <div className="border border-outline-variant bg-surface-container rounded-lg p-6">
          <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-4">All Topics Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-dim rounded-lg text-center border border-outline-variant">
              <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Topics Improving</div>
              <div className="text-headline-md font-light text-status-aligned">
                {topicsWithTrends.filter(t => t.improvement).length}
              </div>
              <div className="text-body-sm text-on-surface-variant mt-1">
                {Math.round((topicsWithTrends.filter(t => t.improvement).length / topicsWithTrends.length) * 100)}% of topics
              </div>
            </div>

            <div className="p-4 bg-surface-dim rounded-lg text-center border border-outline-variant">
              <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Avg Improvement</div>
              <div className="text-headline-md font-light text-primary">
                {Math.round(topicsWithTrends.reduce((sum, t) => sum + t.trend, 0) / topicsWithTrends.length)}%
              </div>
              <div className="text-body-sm text-on-surface-variant mt-1">
                across all retested topics
              </div>
            </div>

            <div className="p-4 bg-surface-dim rounded-lg text-center border border-outline-variant">
              <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Total Evaluations</div>
              <div className="text-headline-md font-light text-on-surface">
                {evaluations.length}
              </div>
              <div className="text-body-sm text-on-surface-variant mt-1">
                {topicsWithTrends.reduce((sum, t) => sum + t.count, 0)} evaluations tracked
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
