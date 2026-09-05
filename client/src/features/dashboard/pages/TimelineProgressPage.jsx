import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { AlertTriangle, Clock, ArrowRight, PartyPopper, Zap } from '@/shared/components/Icon';
import { dashboardService } from '../services/dashboardService';
import { profileService } from '@/features/profile/services/profileService';

const STATUS_PRIORITY = {
  OVERCONFIDENT: 0,
  WEAK_ALIGNED: 1,
  PRELIMINARY: 2,
  INSUFFICIENT_DATA: 3,
  UNDERCONFIDENT: 4,
  ALIGNED: 5
};

export default function TimelineProgressPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, dashboardData] = await Promise.all([
        profileService.getProfile(),
        dashboardService.getDashboard()
      ]);
      setProfile(profileData);
      setDashboard(dashboardData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const timeline = useMemo(() => {
    if (!profile?.target_exam_year || dashboard.length === 0) return null;

    const now = new Date();
    const examDate = new Date(profile.target_exam_year, 3, 1); // JEE Main typically in April
    const daysLeft = Math.max(0, Math.ceil((examDate - now) / (1000 * 60 * 60 * 24)));
    const weeksLeft = Math.ceil(daysLeft / 7);

    const byStatus = {};
    dashboard.forEach(topic => {
      if (!byStatus[topic.status]) byStatus[topic.status] = [];
      byStatus[topic.status].push(topic);
    });

    const stats = {
      total: dashboard.length,
      aligned: (byStatus.ALIGNED || []).length,
      overconfident: (byStatus.OVERCONFIDENT || []).length,
      weak: (byStatus.WEAK_ALIGNED || []).length,
      preliminary: (byStatus.PRELIMINARY || []).length,
      insufficient: (byStatus.INSUFFICIENT_DATA || []).length,
      underconfident: (byStatus.UNDERCONFIDENT || []).length
    };

    stats.readiness = Math.round((stats.aligned / stats.total) * 100);
    stats.atRisk = stats.overconfident + stats.weak;
    stats.needWork = stats.preliminary + stats.insufficient;

    // Calculate weekly targets
    const riskTopics = (byStatus.OVERCONFIDENT || []).concat(byStatus.WEAK_ALIGNED || []);
    const untesteds = (byStatus.INSUFFICIENT_DATA || []).concat(byStatus.PRELIMINARY || []);

    let weeklyPlan = [];
    if (weeksLeft > 0) {
      const weeksForRisk = Math.ceil(riskTopics.length / 3); // 3 per week
      const weeksForNew = Math.ceil(untesteds.length / 5); // 5 per week
      const weeksForReview = Math.max(2, weeksLeft - weeksForRisk - weeksForNew); // Final push

      weeklyPlan = [
        {
          week: '1-' + Math.min(weeksForRisk, weeksLeft),
          focus: 'Fix critical gaps',
          target: riskTopics.length,
          icon: 'priority_high',
          color: 'error',
          topics: riskTopics
        },
        weeksLeft > weeksForRisk && {
          week: (weeksForRisk + 1) + '-' + Math.min(weeksForRisk + weeksForNew, weeksLeft),
          focus: 'Test new ground',
          target: untesteds.length,
          icon: 'lightbulb',
          color: 'primary',
          topics: untesteds
        },
        weeksLeft > weeksForRisk + weeksForNew && {
          week: (weeksForRisk + weeksForNew + 1) + '-' + weeksLeft,
          focus: 'Tighten precision',
          target: Math.ceil(stats.aligned * 0.5), // 50% of aligned for review
          icon: 'precision',
          color: 'status-aligned',
          topics: (byStatus.ALIGNED || []).slice(0, Math.ceil(stats.aligned * 0.5))
        }
      ].filter(Boolean);
    }

    return {
      daysLeft,
      weeksLeft,
      examYear: profile.target_exam_year,
      stats,
      byStatus,
      weeklyPlan,
      urgency: daysLeft < 30 ? 'critical' : daysLeft < 60 ? 'high' : 'moderate'
    };
  }, [profile, dashboard]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest">Calculating timeline...</div>
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

  if (!timeline) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center">
        <p className="text-body-lg text-on-surface-variant">Set your exam year in your profile to see the timeline.</p>
        <button onClick={() => navigate('/profile')} className="mt-4 px-6 py-2 bg-primary text-white font-mono uppercase text-xs tracking-wider font-semibold rounded-sm">
          Go to Profile
        </button>
      </div>
    );
  }

  const { daysLeft, weeksLeft, examYear, stats, weeklyPlan, urgency } = timeline;

  return (
    <div className="w-full max-w-5xl min-w-0 mx-auto animate-fade-in space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Exam Readiness &middot; Countdown Timeline
          </div>
          <h1 className="text-3xl sm:text-4xl font-extralight text-white tracking-tight lowercase">
            prep timeline
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Weekly milestones and urgent calibration deadlines targeted for JEE {examYear}.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-white/10 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors shrink-0"
        >
          open knowledge map
        </button>
      </div>

      {/* Exam Countdown Hero Tile */}
      <div className={`rounded-sm p-6 sm:p-8 text-white relative overflow-hidden bg-surface-container border border-white/10 border-l-4 ${
        urgency === 'critical'
          ? 'border-l-error'
          : urgency === 'high'
            ? 'border-l-status-weak'
            : 'border-l-primary'
      }`}>
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none p-4">
          {urgency === 'critical' ? (
            <AlertTriangle size={180} className="text-error" />
          ) : (
            <Clock size={180} className="text-primary" />
          )}
        </div>

        <div className="relative z-10">
          <div className="text-label-sm-mono uppercase tracking-widest text-primary text-xs mb-2">JEE {examYear} &middot; Exam Countdown</div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-5xl sm:text-6xl font-extralight font-mono text-white tracking-tight">{daysLeft}</div>
              <div className="text-sm font-mono text-white/60 uppercase tracking-widest mt-1">days left</div>
              <div className="text-xs text-white/40 font-mono mt-1.5">~{weeksLeft} calendar weeks remaining</div>
            </div>

            {urgency === 'critical' && (
              <div className="p-4 bg-error/10 rounded-sm border border-error/30 max-w-md">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-error flex items-center gap-2">
                  <Zap className="w-4 h-4 text-error fill-current" />
                  <span>Critical Target Horizon</span>
                </div>
                <div className="text-xs font-mono text-white/80 mt-1.5 leading-relaxed">Focus exclusively on high-impact overconfidence gaps to recover wasted marks immediately.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Readiness KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-surface-container border border-white/10 rounded-sm p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1.5">Overall Readiness</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-light font-mono text-primary">{stats.readiness}%</div>
              <div className="text-xs font-mono text-white/50">{stats.aligned}/{stats.total} topics</div>
            </div>
            <div className="mt-3 h-1.5 bg-surface-dim rounded-none overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-700"
                style={{ width: `${stats.readiness}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            {stats.readiness < 50 ? (
              <p className="text-[11px] font-mono text-error font-semibold">Below critical threshold</p>
            ) : stats.readiness < 80 ? (
              <p className="text-[11px] font-mono text-status-weak font-semibold">On track, but needs focus</p>
            ) : (
              <p className="text-[11px] font-mono text-status-aligned font-semibold">Strong foundation</p>
            )}
          </div>
        </div>

        <div className="bg-surface-container border border-white/10 rounded-sm p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1.5">At Risk Gaps</div>
            <div className="text-3xl font-light font-mono text-status-overconfident">{stats.atRisk}</div>
            <div className="text-xs font-mono text-white/50 mt-1">{stats.overconfident} overconfident &middot; {stats.weak} weak</div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-status-overconfident bg-status-overconfident/10 border border-status-overconfident/25 px-2 py-0.5 rounded-xs">
              Priority: Fix First
            </span>
          </div>
        </div>

        <div className="bg-surface-container border border-white/10 rounded-sm p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1.5">Awaiting Test Evidence</div>
            <div className="text-3xl font-light font-mono text-primary">{stats.needWork}</div>
            <div className="text-xs font-mono text-white/50 mt-1">{stats.preliminary} preliminary &middot; {stats.insufficient} unrated</div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-xs">
              Secondary: Take Mocks
            </span>
          </div>
        </div>
      </div>

      {/* Suggested Study Timeline */}
      {weeklyPlan.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest font-bold">
              Suggested Study Timeline
            </h3>
            <p className="text-xs font-mono text-white/50 mt-0.5">Break down your {weeksLeft} weeks into targeted revision blocks</p>
          </div>

          {weeklyPlan.map((phase, idx) => (
            <div key={idx} className="border border-white/10 bg-surface-container rounded-sm p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-sm ${
                    phase.color === 'error' ? 'bg-status-overconfident/15 text-status-overconfident' :
                    phase.color === 'primary' ? 'bg-primary/15 text-primary' :
                    'bg-status-aligned/15 text-status-aligned'
                  }`}>
                    <Icon name={phase.icon} size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                      Week {phase.week}
                    </div>
                    <h4 className="text-lg font-light text-white">{phase.focus}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light font-mono text-white">{phase.target}</div>
                  <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Target Topics</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {phase.topics.slice(0, 8).map(topic => (
                  <button
                    key={topic.topic_id}
                    onClick={() => navigate(`/topics/${topic.topic_id}`)}
                    className="px-2.5 py-1 bg-surface-dim border border-white/10 hover:border-primary text-xs font-mono rounded-xs transition-colors text-white/70 hover:text-white"
                  >
                    {topic.topic_name}
                  </button>
                ))}
                {phase.topics.length > 8 && (
                  <span className="px-2.5 py-1 text-xs font-mono text-white/40">
                    +{phase.topics.length - 8} more
                  </span>
                )}
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-sm text-xs font-mono text-white/70">
                {idx === 0 && `Spend roughly ${Math.ceil(weeksLeft / weeklyPlan.length)} days on ${phase.focus.toLowerCase()}.`}
                {idx === 1 && `Once critical gaps are fixed, expand coverage to untested topics.`}
                {idx === 2 && `Use final weeks to polish what you know and build exam-day speed.`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actionable Next Steps */}
      <div className="bg-surface-container border border-white/10 rounded-sm p-6 space-y-4">
        <h3 className="text-xs font-mono text-primary uppercase tracking-widest font-bold">Recommended Immediate Actions</h3>
        <div className="space-y-2.5">
          {stats.overconfident > 0 && (
            <button
              onClick={() => navigate('/insights')}
              className="w-full p-4 text-left bg-surface-dim border border-white/10 hover:border-status-overconfident transition-colors rounded-sm group flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium text-white group-hover:text-status-overconfident transition-colors">Address {stats.overconfident} overconfident topics</div>
                <p className="text-xs font-mono text-white/50 mt-0.5">Start with quick drills to recalibrate perceived confidence</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-status-overconfident transition-colors flex-shrink-0" />
            </button>
          )}

          {stats.needWork > 0 && (
            <button
              onClick={() => navigate('/plan')}
              className="w-full p-4 text-left bg-surface-dim border border-white/10 hover:border-primary transition-colors rounded-sm group flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium text-white group-hover:text-primary transition-colors">Evaluate {stats.needWork} untested topics</div>
                <p className="text-xs font-mono text-white/50 mt-0.5">Take short evaluations to benchmark true performance</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full p-4 text-left bg-surface-dim border border-white/10 hover:border-white/30 transition-colors rounded-sm group flex items-center justify-between"
          >
            <div>
              <div className="text-sm font-medium text-white group-hover:text-white transition-colors">View full knowledge map spreadsheet</div>
              <p className="text-xs font-mono text-white/50 mt-0.5">Inspect all 30+ topics, confidence levels, and gap metrics</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Progress Insights Alert */}
      {stats.readiness >= 80 && (
        <div className="bg-status-aligned/10 border border-status-aligned/40 border-l-4 border-l-status-aligned rounded-sm p-5 flex items-start gap-3">
          <PartyPopper className="w-5 h-5 text-status-aligned flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-white">Strong Exam Alignment</div>
            <p className="text-xs font-mono text-white/70 mt-1 leading-relaxed">
              With {stats.readiness}% of topics aligned, focus on speed and accuracy in your final weeks. Maintain periodic re-tests to prevent confidence decay.
            </p>
          </div>
        </div>
      )}

      {stats.readiness < 50 && (
        <div className="bg-error/10 border border-error/40 border-l-4 border-l-error rounded-sm p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-white">Intensive Recalibration Needed</div>
            <p className="text-xs font-mono text-white/70 mt-1 leading-relaxed">
              Readiness is below 50% with {daysLeft} days left. Prioritize the {stats.atRisk} at-risk topics immediately to prevent negative marking penalties on exam day.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
