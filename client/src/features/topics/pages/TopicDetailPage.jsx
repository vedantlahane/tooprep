import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import ConfidenceSlider from '@/features/confidence/components/ConfidenceSlider';

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
      loadTopic();
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
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OVERCONFIDENT': return 'text-status-overconfident';
      case 'UNDERCONFIDENT': return 'text-status-underconfident';
      case 'WEAK_ALIGNED': return 'text-status-weak';
      case 'ALIGNED': return 'text-status-aligned';
      default: return 'text-on-surface';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-display text-primary font-light animate-pulse-soft">loading...</div>
      </div>
    );
  }

  if (error && !data) {
    return <div className="p-4 bg-error text-on-error text-body-md">{error}</div>;
  }

  const { topic, confidence_history, evaluation_history } = data;
  const confidencePercent = topic.confidence ? (topic.confidence / 10) * 100 : null;

  return (
    <div className="animate-fade-in max-w-4xl">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-body-md text-on-surface-variant hover:text-on-surface mb-6 uppercase tracking-widest"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        back
      </button>

      <div className="mb-10">
        <p className="text-body-lg text-on-surface-variant uppercase tracking-widest mb-1">
          {topic.chapters?.subjects?.name} / {topic.chapters?.name}
        </p>
        <h2 className="text-display text-on-surface font-light">{topic.name}</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-10">
        <div className="p-6 bg-primary text-on-primary">
          <div className="text-display font-light mb-1">
            {topic.confidence ? `${topic.confidence}` : '—'}
          </div>
          <div className="text-label-sm-mono opacity-70">CONFIDENCE</div>
        </div>
        <div className="p-6 bg-surface-container-high text-on-surface">
          <div className="text-display font-light mb-1">
            {topic.evaluation_accuracy !== null ? `${topic.evaluation_accuracy}%` : '—'}
          </div>
          <div className="text-label-sm-mono text-on-surface-variant">EVAL ACCURACY</div>
        </div>
        <div className="p-6 bg-surface-container-high text-on-surface">
          <div className={`text-display font-light ${getStatusColor(topic.status)}`}>
            {topic.gap !== null ? (topic.gap >= 0 ? `+${topic.gap}` : topic.gap) : '—'}
          </div>
          <div className="text-label-sm-mono text-on-surface-variant">PERFORMANCE GAP</div>
        </div>
        <div className="p-6 bg-surface-container-high text-on-surface">
          <div className={`text-headline-md mt-2 font-semibold uppercase tracking-wider ${getStatusColor(topic.status)}`}>
            {topic.status?.replace('_', ' ')}
          </div>
          <div className="text-label-sm-mono text-on-surface-variant mt-2">STATUS</div>
        </div>
      </div>

      {showConfidenceInput && (
        <div className="bg-primary/20 border-l-4 border-primary p-6 mb-10">
          <h3 className="text-headline-md text-on-surface mb-2 font-light">rate your confidence</h3>
          <p className="text-body-md text-on-surface-variant mb-6">
            Set your initial baseline before practicing.
          </p>
          <ConfidenceSlider value={newConfidence} onChange={setNewConfidence} />
          <button
            onClick={handleSetConfidence}
            disabled={confidenceLoading}
            className="mt-6 px-8 py-3 bg-primary text-on-primary text-body-md font-semibold uppercase tracking-wider hover:bg-primary-fixed-dim transition-colors disabled:opacity-50"
          >
            {confidenceLoading ? 'saving...' : 'set confidence'}
          </button>
        </div>
      )}

      <div className="flex gap-4 mb-12">
        <button
          onClick={() => navigate(`/practice?topic=${id}`)}
          className="flex-1 py-4 border-2 border-primary text-primary text-body-md font-semibold uppercase tracking-widest hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">school</span>
          practice
        </button>
        <button
          onClick={() => navigate(`/evaluate?topic=${id}`)}
          className="flex-1 py-4 bg-primary text-on-primary text-body-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">quiz</span>
          evaluate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-headline-md font-light mb-4">history</h3>
          {evaluation_history && evaluation_history.length > 0 ? (
            <div className="space-y-2">
              {evaluation_history.map((ev, i) => (
                <div
                  key={ev.id || i}
                  onClick={() => navigate(`/results/${ev.id}`)}
                  className="flex items-center justify-between p-4 bg-surface-container-high hover:bg-surface-variant cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-headline-md font-light w-16">
                      {ev.accuracy}%
                    </span>
                    <span className="text-label-sm-mono text-on-surface-variant">
                      {ev.correct_count}/{ev.total_questions}
                    </span>
                  </div>
                  <span className="text-label-sm-mono text-on-surface-variant uppercase">{formatDate(ev.started_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-md text-on-surface-variant">no evaluations yet.</p>
          )}
        </div>

        <div>
          <h3 className="text-headline-md font-light mb-4">metrics</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-4 bg-surface-container-high">
              <div className="text-headline-md font-light">{topic.questions_attempted || 0}</div>
              <div className="text-label-sm-mono text-on-surface-variant">ATTEMPTED</div>
            </div>
            <div className="p-4 bg-surface-container-high">
              <div className="text-headline-md font-light">
                {topic.pyq_accuracy !== null ? `${topic.pyq_accuracy}%` : '—'}
              </div>
              <div className="text-label-sm-mono text-on-surface-variant">PYQ ACCURACY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
