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
        <button onClick={() => navigate('/profile')} className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-lg">
          Go to Profile
        </button>
      </div>
    );
  }

  const { daysLeft, weeksLeft, examYear, stats, weeklyPlan, urgency } = timeline;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8 pb-12">
      {/* Exam Countdown */}
      <div className={`rounded-xl p-8 text-white relative overflow-hidden ${
        urgency === 'critical'
          ? 'bg-gradient-to-r from-error to-error-container'
          : urgency === 'high'
            ? 'bg-gradient-to-r from-status-overconfident to-error/70'
            : 'bg-gradient-to-r from-primary to-primary-container'
      }`}>
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none p-4">
          {urgency === 'critical' ? (
            <AlertTriangle size={180} />
          ) : (
            <Clock size={180} />
          )}
        </div>

        <div className="relative z-10">
          <div className="text-label-sm-mono uppercase tracking-widest opacity-90 mb-2">JEE {examYear}</div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-display font-light">{daysLeft}</div>
              <div className="text-headline-md font-light opacity-90">days left</div>
              <div className="text-body-md font-light opacity-80 mt-2">~{weeksLeft} weeks</div>
            </div>

            {urgency === 'critical' && (
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                <div className="text-headline-md font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-300 fill-current" />
                  <span>CRITICAL TIMELINE</span>
                </div>
                <div className="text-body-md mt-2">You need to reset your study plan immediately. Focus on the highest-priority gaps first.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Readiness Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Overall Readiness</div>
          <div className="flex items-baseline gap-2">
            <div className="text-display font-light text-primary">{stats.readiness}%</div>
            <div className="text-body-lg text-on-surface-variant">{stats.aligned}/{stats.total} topics</div>
          </div>
          <div className="mt-4 h-2 bg-surface-dim rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-status-overconfident to-primary transition-all duration-1000"
              style={{ width: `${stats.readiness}%` }}
            />
          </div>
          {stats.readiness < 50 ? (
            <p className="mt-3 text-body-sm text-error font-semibold">Below critical threshold for exam prep</p>
          ) : stats.readiness < 80 ? (
            <p className="mt-3 text-body-sm text-status-weak font-semibold">On track, but needs focus</p>
          ) : (
            <p className="mt-3 text-body-sm text-status-aligned font-semibold">Strong foundation</p>
          )}
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">At Risk</div>
          <div className="text-display font-light text-status-overconfident">{stats.atRisk}</div>
          <div className="text-body-md text-on-surface-variant mt-1">{stats.overconfident} overconfident</div>
          <div className="text-body-md text-on-surface-variant">{stats.weak} weak/aligned</div>
          <div className="mt-4 p-3 bg-error/10 border border-error/30 rounded-lg">
            <p className="text-body-sm text-error font-semibold">Urgent: Fix these first</p>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Need Testing</div>
          <div className="text-display font-light text-primary">{stats.needWork}</div>
          <div className="text-body-md text-on-surface-variant mt-1">{stats.preliminary} preliminary</div>
          <div className="text-body-md text-on-surface-variant">{stats.insufficient} untested</div>
          <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-body-sm text-primary font-semibold">Secondary: Test these</p>
          </div>
        </div>
      </div>

      {/* Weekly Study Plan */}
      {weeklyPlan.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">
              Suggested Study Timeline
            </h3>
            <p className="text-body-lg text-on-surface">Break down your {weeksLeft} weeks into focused phases</p>
          </div>

          {weeklyPlan.map((phase, idx) => (
            <div key={idx} className="border border-outline-variant bg-surface-container rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <Icon
                    name={phase.icon}
                    size={36}
                    className={
                      phase.color === 'error' ? 'text-status-overconfident' :
                      phase.color === 'primary' ? 'text-primary' :
                      'text-status-aligned'
                    }
                  />
                  <div>
                    <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">
                      Week {phase.week}
                    </div>
                    <h4 className="text-headline-md text-on-surface font-light">{phase.focus}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-display font-light">{phase.target}</div>
                  <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Topics</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {phase.topics.slice(0, 8).map(topic => (
                  <button
                    key={topic.topic_id}
                    onClick={() => navigate(`/topics/${topic.topic_id}`)}
                    className="px-3 py-1 bg-surface-dim border border-outline-variant hover:border-primary text-body-sm rounded-full transition-colors text-on-surface-variant hover:text-on-surface"
                  >
                    {topic.topic_name}
                  </button>
                ))}
                {phase.topics.length > 8 && (
                  <span className="px-3 py-1 text-body-sm text-on-surface-variant">
                    +{phase.topics.length - 8} more
                  </span>
                )}
              </div>

              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-body-sm text-on-surface">
                {idx === 0 && `Spend roughly ${Math.ceil(weeksLeft / weeklyPlan.length)} days on ${phase.focus.toLowerCase()}.`}
                {idx === 1 && `Once critical gaps are fixed, expand coverage to untested topics.`}
                {idx === 2 && `Use final weeks to polish what you know and build exam-day speed.`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actionable Next Steps */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
        <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-4">Next Steps</h3>
        <div className="space-y-3">
          {stats.overconfident > 0 && (
            <button
              onClick={() => navigate('/insights')}
              className="w-full p-4 text-left bg-error/10 border border-error/30 hover:border-error transition-colors rounded-lg group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-body-lg font-semibold text-on-surface">Address {stats.overconfident} overconfident topics</div>
                  <p className="text-body-sm text-on-surface-variant mt-1">Start with quick drills to recalibrate</p>
                </div>
                <ArrowRight className="w-5 h-5 text-on-surface-variant group-hover:text-error transition-colors flex-shrink-0" />
              </div>
            </button>
          )}

          {stats.needWork > 0 && (
            <button
              onClick={() => navigate('/plan')}
              className="w-full p-4 text-left bg-primary/10 border border-primary/30 hover:border-primary transition-colors rounded-lg group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-body-lg font-semibold text-on-surface">Evaluate {stats.needWork} untested topics</div>
                  <p className="text-body-sm text-on-surface-variant mt-1">Take short evaluations to build baseline confidence</p>
                </div>
                <ArrowRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full p-4 text-left bg-surface-container-high border border-outline-variant hover:border-outline transition-colors rounded-lg group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-body-lg font-semibold text-on-surface">View your knowledge map</div>
                <p className="text-body-sm text-on-surface-variant mt-1">See all topics and their current status</p>
              </div>
              <ArrowRight className="w-5 h-5 text-on-surface-variant group-hover:text-on-surface transition-colors flex-shrink-0" />
            </div>
          </button>
        </div>
      </div>

      {/* Progress Insights */}
      {stats.readiness >= 80 && (
        <div className="bg-status-aligned/10 border border-status-aligned rounded-xl p-6">
          <div className="flex gap-3">
            <PartyPopper className="w-8 h-8 text-status-aligned flex-shrink-0" />
            <div>
              <div className="text-headline-md text-on-surface font-light">You're in strong shape!</div>
              <p className="text-body-md text-on-surface-variant mt-2">
                With {stats.readiness}% of topics aligned, focus on speed and accuracy in your final weeks. Take timed evaluations and drill missed concepts.
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.readiness < 50 && (
        <div className="bg-error/10 border border-error rounded-xl p-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-8 h-8 text-error flex-shrink-0" />
            <div>
              <div className="text-headline-md text-on-surface font-light">Intensive prep required</div>
              <p className="text-body-md text-on-surface-variant mt-2">
                You're below 50% readiness with {daysLeft} days left. Prioritize the {stats.atRisk} at-risk topics immediately. Consider increasing study frequency to 4-5 hours daily.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
