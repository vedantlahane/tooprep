import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';

const PRIORITY_STATUS = {
  OVERCONFIDENT: 0,
  WEAK_ALIGNED: 1,
  PRELIMINARY: 2,
  INSUFFICIENT_DATA: 3,
  UNDERCONFIDENT: 4,
  ALIGNED: 5,
};

export default function StudyPlanPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const result = await dashboardService.getDashboard();
        if (mounted) setData(result);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load plan');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const rankedTopics = useMemo(() => {
    return [...data].sort((a, b) => (PRIORITY_STATUS[a.status] ?? 99) - (PRIORITY_STATUS[b.status] ?? 99));
  }, [data]);

  const topPriority = rankedTopics.filter(t => ['OVERCONFIDENT', 'WEAK_ALIGNED', 'PRELIMINARY'].includes(t.status)).slice(0, 3);
  const quickWins = rankedTopics.filter(t => t.status === 'UNDERCONFIDENT').slice(0, 2);
  const untested = rankedTopics.filter(t => t.status === 'INSUFFICIENT_DATA').slice(0, 3);

  const plan = useMemo(() => {
    const tasks = [];

    if (topPriority.length > 0) {
      const first = topPriority[0];
      tasks.push({
        title: 'Priority reset',
        description: `Recalibrate confidence on ${first.topic_name} before your next timed session.`,
        action: 'Practice',
        onClick: () => navigate(`/practice?topic=${first.topic_id}`),
        tone: 'error',
      });
    }

    if (quickWins.length > 0) {
      const topic = quickWins[0];
      tasks.push({
        title: 'Confidence check',
        description: `${topic.topic_name} is under-rated. Take a short evaluation to confirm the signal.`,
        action: 'Evaluate',
        onClick: () => navigate(`/evaluate?topic=${topic.topic_id}`),
        tone: 'primary',
      });
    }

    if (untested.length > 0) {
      const topic = untested[0];
      tasks.push({
        title: 'New topic warmup',
        description: `You have no recent evidence for ${topic.topic_name}. Start with a low-pressure practice set.`,
        action: 'Warm up',
        onClick: () => navigate(`/practice?topic=${topic.topic_id}`),
        tone: 'tertiary',
      });
    }

    if (tasks.length === 0) {
      tasks.push({
        title: 'Maintain momentum',
        description: 'Your knowledge map is stable. Keep your routine light and revisit a low-risk topic for retention.',
        action: 'Review map',
        onClick: () => navigate('/'),
        tone: 'neutral',
      });
    }

    return tasks;
  }, [topPriority, quickWins, untested, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest">Building today’s plan...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label-sm-mono uppercase tracking-[0.2em] text-primary">study plan</p>
          <h2 className="text-display text-on-surface mt-2 font-light">what to do today</h2>
        </div>
        <button onClick={() => navigate('/')} className="px-5 py-3 border border-outline-variant text-on-surface text-label-sm-mono uppercase tracking-widest hover:border-primary transition-colors rounded-sm">
          back to map
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-body-md rounded-r-md">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-outline-variant bg-surface-container p-5 rounded-md">
          <div className="text-label-sm-mono uppercase tracking-widest text-on-surface-variant">Priority topics</div>
          <div className="mt-3 text-headline-lg text-status-overconfident">{topPriority.length}</div>
        </div>
        <div className="border border-outline-variant bg-surface-container p-5 rounded-md">
          <div className="text-label-sm-mono uppercase tracking-widest text-on-surface-variant">Quick wins</div>
          <div className="mt-3 text-headline-lg text-status-underconfident">{quickWins.length}</div>
        </div>
        <div className="border border-outline-variant bg-surface-container p-5 rounded-md">
          <div className="text-label-sm-mono uppercase tracking-widest text-on-surface-variant">Untested</div>
          <div className="mt-3 text-headline-lg text-primary">{untested.length}</div>
        </div>
      </div>

      <div className="space-y-4">
        {plan.map(task => (
          <button
            key={task.title}
            onClick={task.onClick}
            className={`w-full text-left rounded-md border p-5 transition-colors ${
              task.tone === 'error' ? 'border-status-overconfident bg-status-overconfident/8' :
              task.tone === 'primary' ? 'border-primary bg-primary/5' :
              task.tone === 'tertiary' ? 'border-status-aligned bg-status-aligned/8' :
              'border-outline-variant bg-surface-container'
            }`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-label-sm-mono uppercase tracking-[0.18em] text-on-surface-variant">session step</div>
                <div className="mt-2 text-headline-md text-on-surface">{task.title}</div>
                <div className="mt-2 text-body-lg text-on-surface-variant">{task.description}</div>
              </div>
              <div className="px-4 py-2 border border-current rounded-sm text-label-sm-mono uppercase tracking-widest text-primary">
                {task.action}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-outline-variant bg-surface-container rounded-md p-5">
          <h3 className="text-label-sm-mono uppercase tracking-[0.18em] text-on-surface-variant mb-4">priority queue</h3>
          <div className="space-y-3">
            {topPriority.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">No urgent topics right now. Keep your routine steady.</p>
            ) : topPriority.map(topic => (
              <button
                key={topic.topic_id}
                onClick={() => navigate(`/topics/${topic.topic_id}`)}
                className="w-full flex items-center justify-between rounded-sm border border-outline-variant p-3 text-left hover:border-primary transition-colors"
              >
                <div>
                  <div className="text-body-lg text-on-surface">{topic.topic_name}</div>
                  <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">{topic.subject_name} / {topic.chapter_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-headline-md text-primary">{topic.confidence ?? '—'}</div>
                  <div className="text-label-sm-mono uppercase tracking-widest text-on-surface-variant">confidence</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-outline-variant bg-surface-container rounded-md p-5">
          <h3 className="text-label-sm-mono uppercase tracking-[0.18em] text-on-surface-variant mb-4">untested topics</h3>
          <div className="space-y-3">
            {untested.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Everything has at least some recent evidence.</p>
            ) : untested.map(topic => (
              <button
                key={topic.topic_id}
                onClick={() => navigate(`/practice?topic=${topic.topic_id}`)}
                className="w-full flex items-center justify-between rounded-sm border border-outline-variant p-3 text-left hover:border-primary transition-colors"
              >
                <div>
                  <div className="text-body-lg text-on-surface">{topic.topic_name}</div>
                  <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">{topic.subject_name} / {topic.chapter_name}</div>
                </div>
                <span className="material-symbols-outlined text-primary">arrow_forward</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
