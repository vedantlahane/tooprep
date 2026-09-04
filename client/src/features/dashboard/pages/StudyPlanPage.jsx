import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { ArrowRight, ListTodo, AlertTriangle, TrendingUp, HelpCircle, Play, Timer, Sparkles } from '@/shared/components/Icon';
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
        if (mounted) setData(result || []);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load study plan');
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
  const untested = rankedTopics.filter(t => t.status === 'INSUFFICIENT_DATA').slice(0, 4);

  const plan = useMemo(() => {
    const tasks = [];

    if (topPriority.length > 0) {
      const first = topPriority[0];
      tasks.push({
        title: `Overconfidence Reset: ${first.topic_name}`,
        subtitle: `${first.subject_name} › ${first.chapter_name}`,
        reason: `You rated confidence ${first.confidence || '?'}/10, but evaluation accuracy is only ${first.evaluation_accuracy !== null ? first.evaluation_accuracy + '%' : 'untested'}. Recalibrate with targeted drill before taking timed mocks.`,
        action: 'Drill Topic',
        onClick: () => navigate(`/practice?topic=${first.topic_id}`),
        tone: 'error',
        icon: AlertTriangle,
      });
    }

    if (quickWins.length > 0) {
      const topic = quickWins[0];
      tasks.push({
        title: `Confidence Confirmation: ${topic.topic_name}`,
        subtitle: `${topic.subject_name} › ${topic.chapter_name}`,
        reason: `Your test accuracy is high (${topic.evaluation_accuracy}%), but you under-rated your confidence (${topic.confidence}/10). Take a short mock to confirm mastery.`,
        action: 'Take Mock',
        onClick: () => navigate(`/evaluate?topic=${topic.topic_id}`),
        tone: 'primary',
        icon: TrendingUp,
      });
    }

    if (untested.length > 0) {
      const topic = untested[0];
      tasks.push({
        title: `Syllabus Exploration: ${topic.topic_name}`,
        subtitle: `${topic.subject_name} › ${topic.chapter_name}`,
        reason: `You have 0 verified attempts for this topic. Start with a low-pressure practice set to establish baseline competency.`,
        action: 'Warm Up',
        onClick: () => navigate(`/practice?topic=${topic.topic_id}`),
        tone: 'tertiary',
        icon: HelpCircle,
      });
    }

    if (tasks.length === 0) {
      tasks.push({
        title: 'Mastery Maintenance',
        subtitle: 'All topics currently aligned',
        reason: 'Your knowledge map is balanced. Maintain your edge with a mixed question set from the verified PYQ question bank.',
        action: 'Question Bank',
        onClick: () => navigate('/questions'),
        tone: 'neutral',
        icon: Sparkles,
      });
    }

    return tasks;
  }, [topPriority, quickWins, untested, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest text-xs font-mono">Synthesizing Prioritized Roadmap...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-8 pb-16">
      {/* Telemetry Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            STUDY PLAN // AI-PRIORITIZED DAILY ROADMAP
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight lowercase">
            daily study plan
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Adaptive sequence targeted directly at eliminating overconfidence gaps and filling untested syllabus areas.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-white/10 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors"
        >
          open knowledge map
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-l-4 border-error text-error text-xs font-mono rounded-r-md">
          {error}
        </div>
      )}

      {/* KPI Priority Tiles */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="acrylic-glass border border-status-overconfident/30 p-5 rounded-sm bg-status-overconfident/5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-status-overconfident flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Priority Revision (Gaps)
          </div>
          <div className="mt-2 text-3xl font-light font-mono text-status-overconfident">{topPriority.length}</div>
          <div className="text-xs text-white/40 font-mono mt-1">High negative mark risk</div>
        </div>

        <div className="acrylic-glass border border-status-underconfident/30 p-5 rounded-sm bg-status-underconfident/5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-status-underconfident flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Quick Wins (Underconfident)
          </div>
          <div className="mt-2 text-3xl font-light font-mono text-status-underconfident">{quickWins.length}</div>
          <div className="text-xs text-white/40 font-mono mt-1">Ready for timed mocks</div>
        </div>

        <div className="acrylic-glass border border-white/10 p-5 rounded-sm bg-surface-container/40">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            Untested Syllabus Topics
          </div>
          <div className="mt-2 text-3xl font-light font-mono text-primary">{untested.length}</div>
          <div className="text-xs text-white/40 font-mono mt-1">Needs baseline evaluation</div>
        </div>
      </div>

      {/* Today's Action Steps */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono text-white/60 uppercase tracking-widest flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-primary" />
          RECOMMENDED SESSION PROTOCOL
        </h3>

        {plan.map((task, idx) => {
          const TaskIcon = task.icon || Sparkles;
          return (
            <div
              key={task.title}
              className={`p-6 rounded-md border transition-all ${
                task.tone === 'error' ? 'border-status-overconfident/40 bg-status-overconfident/5' :
                task.tone === 'primary' ? 'border-primary/40 bg-primary/5' :
                task.tone === 'tertiary' ? 'border-status-aligned/40 bg-status-aligned/5' :
                'border-white/10 bg-surface-container/60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-sm mt-0.5 ${
                    task.tone === 'error' ? 'bg-status-overconfident/15 text-status-overconfident' :
                    task.tone === 'primary' ? 'bg-primary/15 text-primary' :
                    task.tone === 'tertiary' ? 'bg-status-aligned/15 text-status-aligned' :
                    'bg-white/10 text-white'
                  }`}>
                    <TaskIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                      STEP 0{idx + 1} // {task.subtitle}
                    </div>
                    <div className="text-lg font-light text-white mt-0.5">{task.title}</div>
                    <div className="text-xs text-white/70 font-mono mt-2 leading-relaxed max-w-2xl">{task.reason}</div>
                  </div>
                </div>

                <button
                  onClick={task.onClick}
                  className={`px-5 py-2.5 text-xs font-mono uppercase tracking-widest font-semibold rounded-sm transition-all flex items-center justify-center gap-2 flex-shrink-0 ${
                    task.tone === 'error' ? 'bg-status-overconfident text-white hover:brightness-110' :
                    task.tone === 'primary' ? 'bg-primary text-white hover:brightness-110' :
                    'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  {task.action}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Queues Detail */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="acrylic-glass border border-white/10 rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono text-white/60 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-overconfident" />
              PRIORITY OVERCONFIDENCE QUEUE
            </h3>
            <span className="text-[10px] font-mono text-white/40">{topPriority.length} queued</span>
          </div>

          <div className="space-y-3">
            {topPriority.length === 0 ? (
              <p className="text-xs font-mono text-white/40 p-4 bg-surface-container/40 rounded-sm">No overconfidence gaps detected. Keep current drill steady.</p>
            ) : topPriority.map(topic => (
              <div
                key={topic.topic_id}
                className="p-3.5 rounded-sm border border-white/10 bg-surface-container/40 hover:border-white/20 transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <div
                    onClick={() => navigate(`/topics/${topic.topic_id}`)}
                    className="text-sm font-medium text-white hover:text-primary cursor-pointer transition-colors"
                  >
                    {topic.topic_name}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 uppercase mt-0.5">
                    {topic.subject_name} › {topic.chapter_name}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-primary">{topic.confidence ?? '—'}/10</div>
                    <div className="text-[9px] font-mono text-white/40 uppercase">CONF</div>
                  </div>
                  <button
                    onClick={() => navigate(`/practice?topic=${topic.topic_id}`)}
                    className="px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase rounded-sm hover:bg-primary hover:text-white transition-colors"
                  >
                    drill
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="acrylic-glass border border-white/10 rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono text-white/60 uppercase tracking-widest flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              UNTESTED SYLLABUS TOPICS
            </h3>
            <span className="text-[10px] font-mono text-white/40">{untested.length} topics</span>
          </div>

          <div className="space-y-3">
            {untested.length === 0 ? (
              <p className="text-xs font-mono text-white/40 p-4 bg-surface-container/40 rounded-sm">All topics in the syllabus have at least one test recorded.</p>
            ) : untested.map(topic => (
              <div
                key={topic.topic_id}
                className="p-3.5 rounded-sm border border-white/10 bg-surface-container/40 hover:border-white/20 transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <div
                    onClick={() => navigate(`/topics/${topic.topic_id}`)}
                    className="text-sm font-medium text-white hover:text-primary cursor-pointer transition-colors"
                  >
                    {topic.topic_name}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 uppercase mt-0.5">
                    {topic.subject_name} › {topic.chapter_name}
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/evaluate?topic=${topic.topic_id}`)}
                  className="px-3 py-1.5 bg-white/5 border border-white/15 text-white/80 hover:text-white hover:bg-white/10 text-xs font-mono uppercase rounded-sm transition-colors flex items-center gap-1.5"
                >
                  mock test
                  <ArrowRight className="w-3 h-3 text-primary" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
