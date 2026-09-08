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
      <div className="w-full max-w-4xl mr-auto py-10 text-left">
        <div className="p-4 bg-error/10 border-l-4 border-error text-error rounded-r-md">
          {error}
        </div>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="w-full max-w-4xl mr-auto py-10 text-left">
        <p className="text-body-lg text-on-surface-variant">Set your exam year in your profile to see the timeline.</p>
        <button onClick={() => navigate('/profile')} className="mt-4 px-6 py-2 bg-primary text-white font-mono uppercase text-xs tracking-wider font-semibold rounded-sm">
          Go to Profile
        </button>
      </div>
    );
  }

  const { daysLeft, weeksLeft, examYear, stats, weeklyPlan, urgency } = timeline;

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-8 pb-16 text-left">
      {/* ─── Header ─── */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Exam Readiness &middot; Countdown Timeline
          </div>
          <h1 className="text-3xl sm:text-4xl font-extralight text-white tracking-tight">
            Prep Timeline
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Weekly revision milestones and calibration targets for JEE {examYear}.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 border border-white/20 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
          >
            Knowledge Map
          </button>
          <button
            onClick={() => navigate('/plan')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Study Plan
          </button>
        </div>
      </div>

      {/* ─── Top Telemetry Live Tiles (4-Column Continuum Strip) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Countdown Tile */}
        <div className={`p-5 border-l-4 ${
          urgency === 'critical' ? 'border-l-error' : urgency === 'high' ? 'border-l-status-weak' : 'border-l-primary'
        } border-t border-r border-b border-white/10 bg-black flex flex-col justify-between`}>
          <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1">JEE {examYear} Countdown</div>
          <div>
            <div className="text-4xl sm:text-5xl font-extralight font-mono text-white tracking-tight">{daysLeft}</div>
            <div className="text-xs font-mono text-white/50 uppercase tracking-widest mt-1">days left &middot; ~{weeksLeft} wks</div>
          </div>
        </div>

        {/* Overall Readiness Tile */}
        <div className="p-5 border-l-4 border-l-primary border-t border-r border-b border-white/10 bg-black flex flex-col justify-between">
          <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1">Syllabus Readiness</div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light font-mono text-primary">{stats.readiness}%</span>
              <span className="text-xs font-mono text-white/40">{stats.aligned}/{stats.total}</span>
            </div>
            <div className="w-full h-1 bg-white/10 mt-2.5 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${stats.readiness}%` }}
              />
            </div>
          </div>
        </div>

        {/* At-Risk Gaps Tile */}
        <div className="p-5 border-l-4 border-l-status-overconfident border-t border-r border-b border-white/10 bg-black flex flex-col justify-between">
          <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1">At-Risk Topics</div>
          <div>
            <div className="text-4xl font-light font-mono text-status-overconfident">{stats.atRisk}</div>
            <div className="text-xs font-mono text-white/50 mt-1">
              {stats.overconfident} overconfident &middot; {stats.weak} weak
            </div>
          </div>
        </div>

        {/* Untested Ground Tile */}
        <div className="p-5 border-l-4 border-l-white/40 border-t border-r border-b border-white/10 bg-black flex flex-col justify-between">
          <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1">Awaiting Evidence</div>
          <div>
            <div className="text-4xl font-light font-mono text-white">{stats.needWork}</div>
            <div className="text-xs font-mono text-white/50 mt-1">
              {stats.preliminary} preliminary &middot; {stats.insufficient} unrated
            </div>
          </div>
        </div>
      </div>

      {/* ─── Continuum Dual-Pane Widescreen Cockpit ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ─── Left Pane: Suggested Study Timeline (col-span-8) ─── */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-xs font-mono text-primary uppercase tracking-widest font-bold flex items-center gap-2">
              <Clock size={16} />
              <span>Targeted Revision Sequence &middot; {weeksLeft} Weeks Horizon</span>
            </h2>
            <span className="text-[11px] font-mono text-white/40">
              {weeklyPlan.length} Phases Planned
            </span>
          </div>

          {weeklyPlan.length > 0 ? (
            <div className="space-y-4">
              {weeklyPlan.map((phase, idx) => {
                const phaseBorder = phase.color === 'error' ? 'border-l-error' :
                  phase.color === 'primary' ? 'border-l-primary' :
                  'border-l-status-aligned';

                return (
                  <div
                    key={idx}
                    className={`border-l-4 ${phaseBorder} border-t border-r border-b border-white/10 p-5 bg-black space-y-3.5`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${
                          phase.color === 'error' ? 'bg-status-overconfident/15 text-status-overconfident' :
                          phase.color === 'primary' ? 'bg-primary/15 text-primary' :
                          'bg-status-aligned/15 text-status-aligned'
                        }`}>
                          <Icon name={phase.icon} size={20} />
                        </div>
                        <div>
                          <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                            Milestone &middot; Week {phase.week}
                          </div>
                          <h4 className="text-xl font-light text-white tracking-tight">{phase.focus}</h4>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-2xl font-light font-mono text-white">{phase.target}</div>
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Target Topics</div>
                      </div>
                    </div>

                    {/* Topic Chips */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Target Curriculum:</div>
                      <div className="flex flex-wrap gap-2">
                        {phase.topics.slice(0, 10).map(topic => (
                          <button
                            key={topic.topic_id}
                            onClick={() => navigate(`/topics/${topic.topic_id}`)}
                            className="px-2.5 py-1 bg-black border border-white/15 hover:border-primary text-xs font-mono text-white/70 hover:text-white transition-colors cursor-pointer"
                          >
                            {topic.topic_name}
                          </button>
                        ))}
                        {phase.topics.length > 10 && (
                          <span className="px-2.5 py-1 text-xs font-mono text-white/40 border border-transparent">
                            +{phase.topics.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Phase Directive Note */}
                    <div className="pt-2 text-xs font-mono text-white/60 border-t border-white/5 leading-relaxed">
                      {idx === 0 && `Spend roughly ${Math.ceil(weeksLeft / weeklyPlan.length)} days remediating ${phase.focus.toLowerCase()} through targeted mock evaluations.`}
                      {idx === 1 && `Expand syllabus perimeter into untested topics with diagnostic test benchmarks.`}
                      {idx === 2 && `Final sprint: polish verified topics, eliminate speed drag, and simulate full exam sets.`}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 border border-white/10 bg-black text-center space-y-3">
              <Clock size={40} className="text-primary block mx-auto opacity-60" />
              <h3 className="text-lg font-light text-white">Timeline Completed</h3>
              <p className="text-xs font-mono text-white/50 max-w-sm mx-auto">
                Exam horizon date has arrived or all curriculum topics are fully aligned.
              </p>
            </div>
          )}
        </div>

        {/* ─── Right Pane: Telemetry & Strategic Directives (col-span-4) ─── */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          {/* Readiness Milestone Alert */}
          {stats.readiness >= 80 && (
            <div className="border-l-4 border-l-status-aligned border-t border-r border-b border-white/10 p-5 bg-black space-y-2">
              <div className="flex items-center gap-2 text-status-aligned font-mono text-xs uppercase tracking-widest font-bold">
                <PartyPopper className="w-4 h-4" />
                <span>Elite Alignment Milestone</span>
              </div>
              <p className="text-xs font-mono text-white/70 leading-relaxed">
                With {stats.readiness}% of syllabus topics empirically aligned, focus on timed precision drills and question speed maintenance.
              </p>
            </div>
          )}

          {stats.readiness < 50 && (
            <div className="border-l-4 border-l-error border-t border-r border-b border-white/10 p-5 bg-black space-y-2">
              <div className="flex items-center gap-2 text-error font-mono text-xs uppercase tracking-widest font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Intensive Calibration Required</span>
              </div>
              <p className="text-xs font-mono text-white/70 leading-relaxed">
                Readiness is at {stats.readiness}% with {daysLeft} days left. Prioritize your {stats.atRisk} at-risk topics immediately to prevent negative marking penalties on exam day.
              </p>
            </div>
          )}

          {/* Recommended Immediate Actions */}
          <div className="border border-white/10 p-5 bg-black space-y-3">
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest font-bold">
              Immediate Action Directives
            </h3>
            <div className="space-y-2">
              {stats.overconfident > 0 && (
                <button
                  onClick={() => navigate('/insights')}
                  className="w-full p-3 text-left border border-white/10 hover:border-status-overconfident transition-colors group flex items-center justify-between cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-mono font-medium text-white group-hover:text-status-overconfident transition-colors">
                      Remediate {stats.overconfident} Overconfident
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-0.5">
                      Recalibrate inflated confidence gaps
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-status-overconfident transition-colors shrink-0" />
                </button>
              )}

              {stats.needWork > 0 && (
                <button
                  onClick={() => navigate('/plan')}
                  className="w-full p-3 text-left border border-white/10 hover:border-primary transition-colors group flex items-center justify-between cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-mono font-medium text-white group-hover:text-primary transition-colors">
                      Benchmark {stats.needWork} Untested Topics
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-0.5">
                      Execute standardized diagnostic evaluations
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors shrink-0" />
                </button>
              )}

              <button
                onClick={() => navigate('/')}
                className="w-full p-3 text-left border border-white/10 hover:border-white/40 transition-colors group flex items-center justify-between cursor-pointer"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-mono font-medium text-white group-hover:text-white transition-colors">
                    Interactive Knowledge Map
                  </div>
                  <div className="text-[10px] font-mono text-white/40 mt-0.5">
                    Inspect all 30+ topics & calibration formulas
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>
          </div>

          {/* Exam Target Horizon Card */}
          <div className="border border-white/10 p-5 bg-black space-y-2">
            <div className="text-xs font-mono text-primary uppercase tracking-widest font-bold">
              Exam Configuration
            </div>
            <p className="text-xs font-mono text-white/60">
              Configured Target: <span className="text-white font-bold">JEE Main {examYear}</span>
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="text-primary hover:underline text-xs font-mono uppercase tracking-wider block pt-1 cursor-pointer"
            >
              Modify exam year in Profile &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
