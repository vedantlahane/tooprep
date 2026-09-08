import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronDown, ArrowRight, BookOpen, AlertTriangle, CheckCircle2, Zap, Play, Layers } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';

const STATUS_COLORS = {
  OVERCONFIDENT: 'status-overconfident',
  WEAK_ALIGNED: 'status-weak',
  PRELIMINARY: 'primary',
  INSUFFICIENT_DATA: 'on-surface-variant',
  UNDERCONFIDENT: 'status-underconfident',
  ALIGNED: 'status-aligned'
};

export default function SubjectMasteryPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await dashboardService.getDashboard();
      setData(result);
      // Automatically expand first subject if available
      if (result && result.length > 0) {
        const firstSub = result[0]?.subject_name;
        if (firstSub) setExpandedSubject(firstSub);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subjectMastery = useMemo(() => {
    if (data.length === 0) return [];

    const bySubject = {};
    data.forEach(topic => {
      const subject = topic.subject_name || 'Unknown';
      if (!bySubject[subject]) {
        bySubject[subject] = [];
      }
      bySubject[subject].push(topic);
    });

    return Object.entries(bySubject).map(([subjectName, topics]) => {
      const byChapter = {};
      topics.forEach(topic => {
        const chapter = topic.chapter_name || 'Unknown';
        if (!byChapter[chapter]) {
          byChapter[chapter] = [];
        }
        byChapter[chapter].push(topic);
      });

      const chapterStats = Object.entries(byChapter).map(([chapterName, chTopics]) => {
        const total = chTopics.length;
        const aligned = chTopics.filter(t => t.status === 'ALIGNED').length;
        const weak = chTopics.filter(t => ['WEAK_ALIGNED', 'PRELIMINARY'].includes(t.status)).length;
        const overconfident = chTopics.filter(t => t.status === 'OVERCONFIDENT').length;
        const untested = chTopics.filter(t => t.status === 'INSUFFICIENT_DATA').length;

        const avgAccuracy = chTopics.filter(t => t.evaluation_accuracy !== null).length > 0
          ? Math.round(chTopics.filter(t => t.evaluation_accuracy !== null).reduce((sum, t) => sum + t.evaluation_accuracy, 0) / chTopics.filter(t => t.evaluation_accuracy !== null).length)
          : null;

        const avgConfidence = chTopics.filter(t => t.confidence !== null).length > 0
          ? (chTopics.filter(t => t.confidence !== null).reduce((sum, t) => sum + t.confidence, 0) / chTopics.filter(t => t.confidence !== null).length).toFixed(1)
          : null;

        const mastery = Math.round((aligned / total) * 100);

        const priority = overconfident > 0 ? 'critical' : weak > 0 ? 'high' : untested > 0 ? 'medium' : 'low';
        const weakestTopics = chTopics
          .filter(t => ['OVERCONFIDENT', 'WEAK_ALIGNED', 'PRELIMINARY'].includes(t.status))
          .sort((a, b) => {
            const priorityMap = { OVERCONFIDENT: 0, WEAK_ALIGNED: 1, PRELIMINARY: 2 };
            return priorityMap[a.status] - priorityMap[b.status];
          })
          .slice(0, 4);

        return {
          chapterName,
          total,
          aligned,
          weak,
          overconfident,
          untested,
          avgAccuracy,
          avgConfidence,
          mastery,
          priority,
          weakestTopics,
          topics: chTopics
        };
      });

      const subjectTotal = topics.length;
      const subjectAligned = topics.filter(t => t.status === 'ALIGNED').length;
      const subjectMastery = Math.round((subjectAligned / subjectTotal) * 100);

      return {
        subjectName,
        mastery: subjectMastery,
        topics: topics.length,
        chapters: chapterStats.length,
        chapterStats: chapterStats.sort((a, b) => a.mastery - b.mastery)
      };
    }).sort((a, b) => a.mastery - b.mastery);
  }, [data]);

  const platformSummary = useMemo(() => {
    if (subjectMastery.length === 0) return null;
    const totalTopics = subjectMastery.reduce((sum, s) => sum + s.topics, 0);
    const totalChapters = subjectMastery.reduce((sum, s) => sum + s.chapters, 0);
    const avgMastery = Math.round(subjectMastery.reduce((sum, s) => sum + s.mastery, 0) / subjectMastery.length);
    const strongest = subjectMastery[subjectMastery.length - 1];
    const weakest = subjectMastery[0];
    return { totalTopics, totalChapters, avgMastery, strongest, weakest };
  }, [subjectMastery]);

  const priorityChapters = useMemo(() => {
    const list = [];
    subjectMastery.forEach(sub => {
      sub.chapterStats.forEach(ch => {
        if (ch.overconfident > 0 || ch.weak > 0) {
          list.push({ ...ch, subjectName: sub.subjectName });
        }
      });
    });
    return list.sort((a, b) => {
      if (b.overconfident !== a.overconfident) return b.overconfident - a.overconfident;
      return a.mastery - b.mastery;
    }).slice(0, 5);
  }, [subjectMastery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest text-xs font-mono">Aggregating Subject Hierarchy...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mr-auto py-10 text-left">
        <div className="p-4 bg-error/10 border border-error/30 text-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-8 pb-16 text-left">
      {/* ─── Header ─── */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Curriculum Depth &middot; Diagnostic Hierarchy
          </div>
          <h1 className="text-3xl sm:text-4xl font-extralight text-white tracking-tight">
            Subject Mastery
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Chapter-level syllabus progression and metacognitive alignment across subjects.
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
            onClick={() => navigate('/evaluate')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Diagnostic Exam
          </button>
        </div>
      </div>

      {/* ─── Platform-Wide KPI Live Tiles (Uniform 1px Borders with Accent Pips) ─── */}
      {platformSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 border border-white/10 hover:border-white/20 bg-black flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">Overall Mastery</span>
              <span className="w-2 h-2 bg-primary"></span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className={`text-4xl font-light font-mono ${
                platformSummary.avgMastery >= 70 ? 'text-status-aligned' : platformSummary.avgMastery >= 40 ? 'text-status-weak' : 'text-error'
              }`}>
                {platformSummary.avgMastery}%
              </div>
              <span className="text-xs font-mono text-white/40">mean</span>
            </div>
            <div className="w-full h-1 bg-white/10 mt-3 overflow-hidden">
              <div
                className={`h-full ${
                  platformSummary.avgMastery >= 70 ? 'bg-status-aligned' : platformSummary.avgMastery >= 40 ? 'bg-status-weak' : 'bg-error'
                }`}
                style={{ width: `${platformSummary.avgMastery}%` }}
              />
            </div>
          </div>

          <div className="p-5 border border-white/10 hover:border-white/20 bg-black flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">Strongest Subject</span>
              <span className="w-2 h-2 bg-status-aligned"></span>
            </div>
            <div>
              <div className="text-2xl font-light text-status-aligned truncate">
                {platformSummary.strongest.subjectName}
              </div>
              <div className="text-xs font-mono text-white/40 mt-1">
                {platformSummary.strongest.mastery}% syllabus aligned
              </div>
            </div>
          </div>

          <div className="p-5 border border-white/10 hover:border-white/20 bg-black flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">Needs Priority Focus</span>
              <span className="w-2 h-2 bg-error"></span>
            </div>
            <div>
              <div className="text-2xl font-light text-error truncate">
                {platformSummary.weakest.subjectName}
              </div>
              <div className="text-xs font-mono text-white/40 mt-1">
                {platformSummary.weakest.mastery}% syllabus aligned
              </div>
            </div>
          </div>

          <div className="p-5 border border-white/10 hover:border-white/20 bg-black flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">Syllabus Scope</span>
              <span className="w-2 h-2 bg-white/40"></span>
            </div>
            <div>
              <div className="text-3xl font-light font-mono text-white">
                {platformSummary.totalTopics}
              </div>
              <div className="text-xs font-mono text-white/40 mt-1">
                topics across {platformSummary.totalChapters} chapters
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Continuum Dual-Pane Widescreen Cockpit ─── */}
      {subjectMastery.length === 0 ? (
        <div className="text-center py-20 border border-white/10 bg-black">
          <GraduationCap className="w-16 h-16 text-primary block opacity-50 mb-4 mx-auto" />
          <h3 className="text-xl font-light text-white mb-2">No diagnostic data yet</h3>
          <p className="text-sm font-mono text-white/50 max-w-md mx-auto">
            Complete diagnostic evaluations or practice drills to populate your subject-by-subject curriculum hierarchy.
          </p>
          <button
            onClick={() => navigate('/evaluate')}
            className="mt-6 px-6 py-2.5 bg-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:brightness-110"
          >
            Take First Diagnostic
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ─── Left Pane: Subject & Chapter Hierarchy (col-span-8) ─── */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h2 className="text-xs font-mono text-primary uppercase tracking-widest font-bold flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Subject Hierarchy &middot; Click to Expand</span>
              </h2>
              <span className="text-[11px] font-mono text-white/40">
                {subjectMastery.length} subjects active
              </span>
            </div>

            <div className="space-y-4">
              {subjectMastery.map((subject) => {
                const isExpanded = expandedSubject === subject.subjectName;
                const statusText = subject.mastery >= 70 ? 'text-status-aligned' : subject.mastery >= 40 ? 'text-status-weak' : 'text-error';

                return (
                  <div key={subject.subjectName} className="border border-white/10 hover:border-white/20 bg-black transition-colors">
                    {/* Flat Subject Row Button */}
                    <button
                      onClick={() => setExpandedSubject(isExpanded ? null : subject.subjectName)}
                      className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-2xl font-light text-white tracking-tight">{subject.subjectName}</h3>
                          <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border font-bold ${
                            subject.mastery >= 70 ? 'bg-status-aligned/10 text-status-aligned border-status-aligned/40' :
                            subject.mastery >= 40 ? 'bg-status-weak/10 text-status-weak border-status-weak/40' :
                            'bg-error/10 text-error border-error/40'
                          }`}>
                            {subject.mastery}% mastery
                          </span>
                        </div>

                        {/* Thin 2px Sharp Progress Bar */}
                        <div className="w-full h-1 bg-white/10 mb-2.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              subject.mastery >= 70 ? 'bg-status-aligned' :
                              subject.mastery >= 40 ? 'bg-status-weak' :
                              'bg-error'
                            }`}
                            style={{ width: `${subject.mastery}%` }}
                          />
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono text-white/50">
                          <span>{subject.chapters} chapters</span>
                          <span>&middot;</span>
                          <span>{subject.topics} topics in scope</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className={`text-2xl font-light font-mono ${statusText}`}>
                          {subject.mastery}%
                        </span>
                        <ChevronDown className={`w-5 h-5 text-white/50 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                      </div>
                    </button>

                    {/* Flat Chapter Breakdown (No Nested Cards) */}
                    {isExpanded && (
                      <div className="border-t border-white/10 divide-y divide-white/10 bg-black">
                        {subject.chapterStats.map((chapter) => {
                          const pipColor = chapter.priority === 'critical' ? 'bg-error' :
                            chapter.priority === 'high' ? 'bg-status-overconfident' :
                            chapter.priority === 'medium' ? 'bg-status-weak' : 'bg-status-aligned';

                          return (
                            <div key={chapter.chapterName} className="p-4 sm:p-5 hover:bg-white/[0.01] transition-colors space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5">
                                  <span className={`w-1.5 h-1.5 ${pipColor} mt-2 shrink-0`}></span>
                                  <div>
                                    <h4 className="text-base font-normal text-white">{chapter.chapterName}</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-white/50 uppercase tracking-wider">
                                      <span>{chapter.aligned}/{chapter.total} topics aligned</span>
                                      {chapter.avgAccuracy !== null && <span>&middot; Acc: {chapter.avgAccuracy}%</span>}
                                      {chapter.avgConfidence && <span>&middot; Conf: {chapter.avgConfidence}/10</span>}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border font-bold ${
                                    chapter.priority === 'critical' ? 'bg-error/15 text-error border-error/40' :
                                    chapter.priority === 'high' ? 'bg-status-overconfident/15 text-status-overconfident border-status-overconfident/40' :
                                    chapter.priority === 'medium' ? 'bg-status-weak/15 text-status-weak border-status-weak/40' :
                                    'bg-status-aligned/15 text-status-aligned border-status-aligned/40'
                                  }`}>
                                    {chapter.priority}
                                  </span>
                                  <span className="text-lg font-light font-mono text-white">
                                    {chapter.mastery}%
                                  </span>
                                </div>
                              </div>

                              {/* 1.5px Hairline Mastery Bar */}
                              <div className="w-full h-1 bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    chapter.mastery >= 70 ? 'bg-status-aligned' :
                                    chapter.mastery >= 40 ? 'bg-status-weak' :
                                    'bg-error'
                                  }`}
                                  style={{ width: `${chapter.mastery}%` }}
                                />
                              </div>

                              {/* High-density status counters */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                                <div className="p-2 border border-white/5 bg-white/[0.02]">
                                  <div className="text-status-aligned font-light text-lg">{chapter.aligned}</div>
                                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Aligned</div>
                                </div>
                                <div className="p-2 border border-white/5 bg-white/[0.02]">
                                  <div className="text-status-weak font-light text-lg">{chapter.weak}</div>
                                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Weak</div>
                                </div>
                                <div className="p-2 border border-white/5 bg-white/[0.02]">
                                  <div className="text-status-overconfident font-light text-lg">{chapter.overconfident}</div>
                                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Over-conf</div>
                                </div>
                                <div className="p-2 border border-white/5 bg-white/[0.02]">
                                  <div className="text-primary font-light text-lg">{chapter.untested}</div>
                                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Untested</div>
                                </div>
                              </div>

                              {/* Target Topics Quick Access */}
                              {chapter.weakestTopics.length > 0 && (
                                <div className="pt-2 border-t border-white/10 space-y-1.5">
                                  <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                                    Priority Calibration Targets:
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {chapter.weakestTopics.map((topic) => (
                                      <button
                                        key={topic.topic_id}
                                        onClick={() => navigate(`/topics/${topic.topic_id}`)}
                                        className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                                          topic.status === 'OVERCONFIDENT'
                                            ? 'border-status-overconfident/40 bg-status-overconfident/10 text-status-overconfident hover:bg-status-overconfident/20'
                                            : topic.status === 'WEAK_ALIGNED'
                                              ? 'border-status-weak/40 bg-status-weak/10 text-status-weak hover:bg-status-weak/20'
                                              : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                                        }`}
                                      >
                                        {topic.topic_name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Chapter Drill CTA */}
                              {chapter.priority !== 'low' && (
                                <div className="pt-1 flex items-center justify-end">
                                  <button
                                    onClick={() => navigate(`/plan?chapter=${encodeURIComponent(chapter.chapterName)}`)}
                                    className="px-4 py-1.5 border border-white/20 hover:border-primary text-primary hover:text-white text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>Plan Revision for {chapter.chapterName}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Right Pane: Strategic Telemetry & Quick Action Cockpit (col-span-4) ─── */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Priority Chapter Queue */}
            <div className="border border-white/10 p-5 bg-black space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xs font-mono text-primary uppercase tracking-widest font-bold flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-status-overconfident" />
                  <span>Strategic Chapter Queue</span>
                </h3>
                <span className="text-[10px] font-mono text-white/40">Critical Gaps</span>
              </div>

              <p className="text-xs text-white/50 font-mono leading-relaxed">
                Chapters with active overconfidence or low accuracy requiring immediate remedial drills:
              </p>

              {priorityChapters.length > 0 ? (
                <div className="space-y-2">
                  {priorityChapters.map((ch) => (
                    <div
                      key={ch.chapterName}
                      className="p-3 border border-white/10 hover:border-white/20 bg-black transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-1.5 h-1.5 bg-status-overconfident shrink-0"></span>
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{ch.subjectName}</span>
                          </div>
                          <div className="text-sm font-medium text-white truncate">{ch.chapterName}</div>
                        </div>
                        <span className="text-xs font-mono font-bold text-status-overconfident shrink-0">
                          {ch.overconfident} gap{ch.overconfident !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-white/50 pt-2 border-t border-white/5">
                        <span>Mastery: {ch.mastery}%</span>
                        <button
                          onClick={() => navigate(`/plan?chapter=${encodeURIComponent(ch.chapterName)}`)}
                          className="text-primary hover:underline uppercase text-[10px] tracking-wider"
                        >
                          Add to Plan &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-status-aligned/30 bg-status-aligned/5 text-status-aligned text-xs font-mono">
                  No high-risk chapters detected. All evaluated chapters maintain aligned accuracy.
                </div>
              )}
            </div>

            {/* Metacognitive Mastery Doctrine */}
            <div className="border border-white/10 p-5 bg-black space-y-3">
              <h3 className="text-xs font-mono text-primary uppercase tracking-widest font-bold flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Diagnostic Doctrine</span>
              </h3>
              <p className="text-xs font-mono text-white/60 leading-relaxed">
                In TooPrep, <strong className="text-white">Mastery %</strong> is determined exclusively by empirical test verification (<span className="text-status-aligned font-bold">ALIGNED</span> topics), not subjective self-confidence.
              </p>
              <div className="space-y-1 text-[11px] font-mono text-white/50 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-status-aligned"></span>
                  <span>ALIGNED: High confidence verified by &ge;70% test score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-status-overconfident"></span>
                  <span>OVERCONFIDENT: High confidence contradicted by test mistakes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary"></span>
                  <span>UNTESTED: Stored without standardized diagnostic evidence</span>
                </div>
              </div>
            </div>

            {/* Quick Action Launchers */}
            <div className="border border-white/10 p-5 bg-black space-y-2.5">
              <div className="text-xs font-mono text-primary uppercase tracking-widest font-bold mb-1">
                Curriculum Workflows
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full py-2.5 px-3 border border-white/10 hover:border-primary text-white text-xs font-mono uppercase tracking-widest transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Spreadsheet Knowledge Map</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/40" />
              </button>
              <button
                onClick={() => navigate('/plan')}
                className="w-full py-2.5 px-3 border border-white/10 hover:border-primary text-white text-xs font-mono uppercase tracking-widest transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Custom Study Plan</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/40" />
              </button>
              <button
                onClick={() => navigate('/practice')}
                className="w-full py-2.5 px-3 border border-white/10 hover:border-primary text-white text-xs font-mono uppercase tracking-widest transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Untimed Practice Session</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

