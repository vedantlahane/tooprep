import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import StatusDot from '../components/StatusDot';
import ConfidenceSlider from '../components/ConfidenceSlider';

export default function TopicDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Confidence rating
  const [showConfidenceInput, setShowConfidenceInput] = useState(false);
  const [newConfidence, setNewConfidence] = useState(5);
  const [confidenceLoading, setConfidenceLoading] = useState(false);

  useEffect(() => {
    loadTopic();
  }, [id]);

  const loadTopic = async () => {
    try {
      const result = await api.getTopicDetail(id);
      setData(result);

      // If no confidence yet, prompt
      if (!result.topic.confidence) {
        setShowConfidenceInput(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetConfidence = async () => {
    setConfidenceLoading(true);
    try {
      await api.setConfidence(id, newConfidence, 'INITIAL');
      setShowConfidenceInput(false);
      loadTopic(); // Reload
    } catch (err) {
      setError(err.message);
    } finally {
      setConfidenceLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getGapColor = (status) => {
    switch (status) {
      case 'ALIGNED': return 'text-status-aligned';
      case 'OVERCONFIDENT': return 'text-status-overconfident';
      case 'UNDERCONFIDENT': return 'text-status-underconfident';
      case 'WEAK_ALIGNED': return 'text-status-weak';
      default: return 'text-on-surface-variant';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse-soft text-primary text-headline-md">Loading topic...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="p-4 rounded-lg bg-error-container/20 border border-error/30 text-error">{error}</div>
      </div>
    );
  }

  const { topic, confidence_history, evaluation_history } = data;
  const confidencePercent = topic.confidence ? (topic.confidence / 10) * 100 : null;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-body-md text-on-surface-variant hover:text-primary transition-colors mb-4"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Knowledge Map
      </button>

      {/* Topic Header */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-label-sm-mono text-on-surface-variant mb-1">
              {topic.chapters?.subjects?.name} › {topic.chapters?.name}
            </p>
            <h2 className="text-display text-on-surface">{topic.name}</h2>
          </div>
          <StatusDot status={topic.status} />
        </div>

        {/* Gap Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-lg bg-surface-container text-center">
            <div className="text-headline-lg text-primary font-bold">
              {topic.confidence ? `${topic.confidence}/10` : '—'}
            </div>
            <div className="text-label-sm-mono text-on-surface-variant mt-1">Confidence</div>
          </div>
          <div className="p-4 rounded-lg bg-surface-container text-center">
            <div className={`text-headline-lg font-bold ${
              topic.evaluation_accuracy !== null
                ? topic.evaluation_accuracy >= 70 ? 'text-tertiary-container' :
                  topic.evaluation_accuracy >= 40 ? 'text-status-weak' : 'text-error'
                : 'text-on-surface-variant'
            }`}>
              {topic.evaluation_accuracy !== null ? `${topic.evaluation_accuracy}%` : '—'}
            </div>
            <div className="text-label-sm-mono text-on-surface-variant mt-1">Eval Accuracy</div>
          </div>
          <div className="p-4 rounded-lg bg-surface-container text-center">
            <div className="text-headline-lg text-on-surface font-bold font-mono">
              {confidencePercent !== null ? `${confidencePercent}%` : '—'}
            </div>
            <div className="text-label-sm-mono text-on-surface-variant mt-1">Confidence %</div>
          </div>
          <div className="p-4 rounded-lg bg-surface-container text-center">
            <div className={`text-headline-lg font-bold ${getGapColor(topic.status)}`}>
              {topic.gap !== null ? (topic.gap >= 0 ? `+${topic.gap}` : topic.gap) : '—'}
            </div>
            <div className="text-label-sm-mono text-on-surface-variant mt-1">Gap</div>
          </div>
        </div>

        {/* Status explanation */}
        {topic.status === 'OVERCONFIDENT' && (
          <div className="mt-4 p-3 rounded-lg bg-error-container/10 border border-error/20 text-body-md text-on-surface flex items-start gap-2">
            <span className="text-error">🔴</span>
            <span>You rate yourself higher than your demonstrated performance. Focus on practice before re-evaluating.</span>
          </div>
        )}
        {topic.status === 'UNDERCONFIDENT' && (
          <div className="mt-4 p-3 rounded-lg bg-status-underconfident/10 border border-status-underconfident/20 text-body-md text-on-surface flex items-start gap-2">
            <span className="text-status-underconfident">🔵</span>
            <span>You're performing better than you think! Your skills are stronger than your confidence suggests.</span>
          </div>
        )}
        {topic.status === 'WEAK_ALIGNED' && (
          <div className="mt-4 p-3 rounded-lg bg-status-weak/10 border border-status-weak/20 text-body-md text-on-surface flex items-start gap-2">
            <span className="text-status-weak">🟡</span>
            <span>Your confidence matches your performance, but both are low. This topic needs focused practice.</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => navigate(`/practice?topic=${id}`)}
            className="flex-1 py-3 rounded-lg border-2 border-primary text-primary text-body-md font-semibold hover:bg-primary-fixed/30 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">school</span>
            Start Practice
          </button>
          <button
            onClick={() => navigate(`/evaluate?topic=${id}`)}
            className="flex-1 py-3 rounded-lg bg-primary-container text-on-primary text-body-md font-semibold hover:bg-primary transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">quiz</span>
            Start Evaluation
          </button>
        </div>
      </div>

      {/* Initial confidence prompt */}
      {showConfidenceInput && (
        <div className="bg-primary-fixed/20 border-2 border-primary-fixed rounded-xl p-6 mb-6 animate-fade-in">
          <h3 className="text-headline-md text-on-surface mb-2">Rate Your Confidence</h3>
          <p className="text-body-md text-on-surface-variant mb-4">
            How confident do you feel about this topic? This is your starting point.
          </p>
          <ConfidenceSlider value={newConfidence} onChange={setNewConfidence} />
          <button
            onClick={handleSetConfidence}
            disabled={confidenceLoading}
            className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-on-primary text-body-md font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {confidenceLoading ? 'Saving...' : 'Set Initial Confidence'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confidence History */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5">
          <h3 className="text-label-sm-mono text-on-surface-variant mb-4">CONFIDENCE HISTORY</h3>
          {confidence_history && confidence_history.length > 0 ? (
            <div className="space-y-2.5">
              {[...confidence_history].reverse().map((c, i) => (
                <div key={c.id || i} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container/50">
                  <div>
                    <span className="text-label-mono text-primary font-bold">{c.confidence}/10</span>
                    <span className={`ml-2 text-label-sm-mono px-1.5 py-0.5 rounded ${
                      c.trigger === 'POST_EVALUATION'
                        ? 'bg-status-weak/10 text-status-weak'
                        : 'bg-primary-fixed/30 text-primary'
                    }`}>
                      {c.trigger === 'POST_EVALUATION' ? 'Post-Eval' : 'Initial'}
                    </span>
                  </div>
                  <span className="text-label-sm-mono text-on-surface-variant">{formatDate(c.recorded_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-md text-on-surface-variant">No confidence ratings yet.</p>
          )}
        </div>

        {/* Evaluation History */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5">
          <h3 className="text-label-sm-mono text-on-surface-variant mb-4">EVALUATION HISTORY</h3>
          {evaluation_history && evaluation_history.length > 0 ? (
            <div className="space-y-2.5">
              {evaluation_history.map((ev, i) => (
                <div
                  key={ev.id || i}
                  onClick={() => navigate(`/results/${ev.id}`)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container/50 cursor-pointer hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-label-mono font-bold ${
                      ev.accuracy >= 70 ? 'text-tertiary-container' :
                      ev.accuracy >= 40 ? 'text-status-weak' : 'text-error'
                    }`}>
                      {ev.accuracy}%
                    </span>
                    <span className="text-label-sm-mono text-on-surface-variant">
                      {ev.correct_count}/{ev.total_questions}
                    </span>
                  </div>
                  <span className="text-label-sm-mono text-on-surface-variant">{formatDate(ev.started_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-md text-on-surface-variant">No evaluations yet. Take your first timed evaluation!</p>
          )}
        </div>
      </div>

      {/* Additional stats */}
      <div className="mt-6 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5">
        <h3 className="text-label-sm-mono text-on-surface-variant mb-4">ADDITIONAL METRICS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-headline-md text-on-surface font-bold">{topic.questions_attempted || 0}</div>
            <div className="text-label-sm-mono text-on-surface-variant">Qs Attempted</div>
          </div>
          <div className="text-center">
            <div className="text-headline-md text-on-surface font-bold font-mono">
              {topic.avg_time_seconds
                ? `${Math.floor(topic.avg_time_seconds / 60)}:${String(topic.avg_time_seconds % 60).padStart(2, '0')}`
                : '—'}
            </div>
            <div className="text-label-sm-mono text-on-surface-variant">Avg Time/Q</div>
          </div>
          <div className="text-center">
            <div className="text-headline-md text-on-surface font-bold">
              {topic.pyq_accuracy !== null ? `${topic.pyq_accuracy}%` : '—'}
            </div>
            <div className="text-label-sm-mono text-on-surface-variant">PYQ Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-headline-md text-on-surface font-bold">
              {topic.last_practiced_at ? formatDate(topic.last_practiced_at).split(',')[0] : '—'}
            </div>
            <div className="text-label-sm-mono text-on-surface-variant">Last Practiced</div>
          </div>
        </div>

        {/* Difficulty breakdown if available */}
        {topic.difficulty_breakdown && (
          <div className="mt-5 pt-4 border-t border-surface-container-high">
            <h4 className="text-label-sm-mono text-on-surface-variant mb-3">DIFFICULTY BREAKDOWN (Latest Eval)</h4>
            <div className="grid grid-cols-3 gap-4">
              {['easy', 'medium', 'hard'].map(diff => {
                const d = topic.difficulty_breakdown[diff];
                if (!d || d.total === 0) return (
                  <div key={diff} className="text-center">
                    <div className="text-headline-md text-on-surface-variant font-bold">—</div>
                    <div className="text-label-sm-mono text-on-surface-variant capitalize">{diff}</div>
                  </div>
                );
                return (
                  <div key={diff} className="text-center">
                    <div className={`text-headline-md font-bold ${
                      diff === 'easy' ? 'text-tertiary-container' :
                      diff === 'medium' ? 'text-status-weak' : 'text-error'
                    }`}>
                      {d.accuracy !== null ? `${d.accuracy}%` : '—'}
                    </div>
                    <div className="text-label-sm-mono text-on-surface-variant capitalize">{diff} ({d.correct}/{d.total})</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
