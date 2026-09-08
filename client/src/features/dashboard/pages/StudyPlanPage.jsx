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
    <div className="w-full min-w-0 animate-fade-in space-y-8 pb-16 text-left">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Daily Preparation Roadmap
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight">
            Daily Study Plan
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Adaptive sequence targeted directly at eliminating overconfidence gaps and filling untested syllabus areas.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-white/15 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-none transition-colors"
        >
          open knowledge map
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/30 text-error text-xs font-mono">
          {error}
        </div>
      )}

      {/* KPI Priority Tiles - Flat Lumia Style */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="border border-status-overconfident/40 p-5 bg-status-overconfident/5 relative overflow-hidden text-left">
          <div className="absolute top-0 left-0 right-0 h-1 bg-status-overconfident" />
          <div className="text-[10px] font-mono uppercase tracking-widest text-status-overconfident flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Priority Revision (Gaps)
          </div>
          <div className="mt-2 text-3xl font-light font-mono text-status-overconfident">{topPriority.length}</div>
          <div className="text-xs text-white/40 font-mono mt-1">High negative mark risk in mock exams</div>
        </div>

        <div className="border border-status-underconfident/40 p-5 bg-status-underconfident/5 relative overflow-hidden text-left">
          <div className="absolute top-0 left-0 right-0 h-1 bg-status-underconfident" />
          <div className="text-[10px] font-mono uppercase tracking-widest text-status-underconfident flex items-center gap-1.5 font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            Quick Wins (Underconfident)
          </div>
          <div className="mt-2 text-3xl font-light font-mono text-status-underconfident">{quickWins.length}</div>
          <div className="text-xs text-white/40 font-mono mt-1">High empirical accuracy, ready for mocks</div>
        </div>

        <div className="border border-white/15 p-5 bg-white/[0.02] relative overflow-hidden text-left">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 flex items-center gap-1.5 font-bold">
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            Untested Syllabus Topics
          </div>
          <div className="mt-2 text-3xl font-light font-mono text-primary">{untested.length}</div>
          <div className="text-xs text-white/40 font-mono mt-1">Needs baseline diagnostic evaluation</div>
        </div>
      </div>

      {/* Responsive Widescreen Dual-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Recommended Session Protocol */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest flex items-center gap-2 font-bold">
              <ListTodo className="w-4 h-4" />
              RECOMMENDED SESSION PROTOCOL
            </h3>
            <span className="text-[10px] font-mono text-white/40 uppercase">{plan.length} steps scheduled</span>
          </div>

          <div className="space-y-4">
            {plan.map((task, idx) => {
              const TaskIcon = task.icon || Sparkles;
              return (
                <div
                  key={task.title}
                  className={`p-5 border transition-all text-left relative ${
                    task.tone === 'error' ? 'border-status-overconfident/40 bg-status-overconfident/[0.03]' :
                    task.tone === 'primary' ? 'border-primary/40 bg-primary/[0.03]' :
                    task.tone === 'tertiary' ? 'border-status-aligned/40 bg-status-aligned/[0.03]' :
                    'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <span className={`absolute top-3 right-3 w-2 h-2 ${
                    task.tone === 'error' ? 'bg-status-overconfident' :
                    task.tone === 'primary' ? 'bg-primary' :
                    task.tone === 'tertiary' ? 'bg-status-aligned' :
                    'bg-white/30'
                  }`} />
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2 shrink-0 mt-0.5 ${
                        task.tone === 'error' ? 'bg-status-overconfident/15 text-status-overconfident' :
                        task.tone === 'primary' ? 'bg-primary/15 text-primary' :
                        task.tone === 'tertiary' ? 'bg-status-aligned/15 text-status-aligned' :
                        'bg-white/10 text-white'
                      }`}>
                        <TaskIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                          STEP 0{idx + 1} &middot; {task.subtitle}
                        </div>
                        <div className="text-base md:text-lg font-light text-white mt-0.5">{task.title}</div>
                        <div className="text-xs text-white/70 font-mono mt-1.5 leading-relaxed max-w-xl">{task.reason}</div>
                      </div>
                    </div>

                    <button
                      onClick={task.onClick}
                      className={`px-4 py-2 text-xs font-mono uppercase tracking-widest font-bold rounded-none transition-all flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer ${
                        task.tone === 'error' ? 'bg-status-overconfident text-white hover:brightness-110' :
                        task.tone === 'primary' ? 'bg-primary text-black hover:brightness-110 shadow-md shadow-primary/20' :
                        'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      <span>{task.action}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Priority Queues Detail (Sticky Cockpit on Widescreen) */}
        <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-4 space-y-6">
          {/* Priority Overconfidence Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="text-xs font-mono text-status-overconfident uppercase tracking-widest flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4" />
                OVERCONFIDENCE QUEUE
              </h3>
              <span className="text-[10px] font-mono text-white/40">{topPriority.length} queued</span>
            </div>

            <div className="space-y-2">
              {topPriority.length === 0 ? (
                <p className="text-xs font-mono text-white/40 p-4 border border-white/10 bg-white/[0.01]">
                  No overconfidence gaps detected. Knowledge calibration is healthy.
                </p>
              ) : topPriority.map(topic => (
                <div
                  key={topic.topic_id}
                  className="p-3 border-b border-white/10 hover:border-primary/50 transition-colors flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <div
                      onClick={() => navigate(`/topics/${topic.topic_id}`)}
                      className="text-xs sm:text-sm font-light text-white hover:text-primary cursor-pointer transition-colors"
                    >
                      {topic.topic_name}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 uppercase mt-0.5">
                      {topic.subject_name} &rsaquo; {topic.chapter_name}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-status-overconfident">{topic.confidence ?? '—'}/10</div>
                      <div className="text-[9px] font-mono text-white/40 uppercase">CONF</div>
                    </div>
                    <button
                      onClick={() => navigate(`/practice?topic=${topic.topic_id}`)}
                      className="px-2.5 py-1 bg-status-overconfident/15 border border-status-overconfident/40 text-status-overconfident text-[11px] font-mono uppercase rounded-none hover:bg-status-overconfident hover:text-white transition-colors"
                    >
                      drill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Untested Syllabus Topics */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="text-xs font-mono text-primary uppercase tracking-widest flex items-center gap-2 font-bold">
                <HelpCircle className="w-4 h-4" />
                UNTESTED SYLLABUS TOPICS
              </h3>
              <span className="text-[10px] font-mono text-white/40">{untested.length} topics</span>
            </div>

            <div className="space-y-2">
              {untested.length === 0 ? (
                <p className="text-xs font-mono text-white/40 p-4 border border-white/10 bg-white/[0.01]">
                  All syllabus topics have at least one test attempt recorded.
                </p>
              ) : untested.map(topic => (
                <div
                  key={topic.topic_id}
                  className="p-3 border-b border-white/10 hover:border-primary/50 transition-colors flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <div
                      onClick={() => navigate(`/topics/${topic.topic_id}`)}
                      className="text-xs sm:text-sm font-light text-white hover:text-primary cursor-pointer transition-colors"
                    >
                      {topic.topic_name}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 uppercase mt-0.5">
                      {topic.subject_name} &rsaquo; {topic.chapter_name}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/evaluate?topic=${topic.topic_id}`)}
                    className="px-2.5 py-1 bg-white/5 border border-white/15 text-white/80 hover:text-white hover:border-primary text-[11px] font-mono uppercase rounded-none transition-colors flex items-center gap-1 shrink-0"
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
    </div>
  );
}
