import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronDown } from 'lucide-react';
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
          .slice(0, 3);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest">Analyzing subjects...</div>
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
    <div className="w-full max-w-5xl min-w-0 mx-auto animate-fade-in space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Subject Mastery &middot; Diagnostic Hierarchy
          </div>
          <h1 className="text-3xl sm:text-4xl font-extralight text-white tracking-tight lowercase">
            subject mastery
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Chapter-level curriculum depth and metacognitive alignment across subjects.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-white/10 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors shrink-0"
        >
          open knowledge map
        </button>
      </div>

      {subjectMastery.length === 0 ? (
        <div className="text-center py-20 border border-white/10 rounded-sm bg-surface-container">
          <GraduationCap className="w-16 h-16 text-primary block opacity-50 mb-4 mx-auto" />
          <h3 className="text-xl font-light text-white mb-2 lowercase">no diagnostic data yet</h3>
          <p className="text-sm font-mono text-white/50">Start practicing or evaluate topics to see your subject mastery breakdown.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subjectMastery.map((subject) => (
            <div key={subject.subjectName} className="border border-white/10 bg-surface-container rounded-sm overflow-hidden">
              {/* Subject Header */}
              <button
                onClick={() => setExpandedSubject(expandedSubject === subject.subjectName ? null : subject.subjectName)}
                className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-xl font-light text-white">{subject.subjectName}</h3>
                    <span className={`px-2.5 py-0.5 rounded-xs text-[10px] font-mono uppercase tracking-wider border font-bold ${
                      subject.mastery >= 80 ? 'bg-status-aligned/15 text-status-aligned border-status-aligned/40' :
                      subject.mastery >= 60 ? 'bg-status-weak/15 text-status-weak border-status-weak/40' :
                      'bg-error/15 text-error border-error/40'
                    }`}>
                      {subject.mastery}% mastery
                    </span>
                  </div>

                  {/* Mastery bar */}
                  <div className="w-full h-1.5 bg-surface-dim rounded-none overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all duration-500 ${
                        subject.mastery >= 80 ? 'bg-status-aligned' :
                        subject.mastery >= 60 ? 'bg-status-weak' :
                        'bg-error'
                      }`}
                      style={{ width: `${subject.mastery}%` }}
                    />
                  </div>

                  <div className="flex gap-4 text-xs font-mono text-white/50">
                    <span>{subject.chapters} chapters</span>
                    <span>&middot;</span>
                    <span>{subject.topics} topics in scope</span>
                  </div>
                </div>

                <ChevronDown className={`w-5 h-5 text-white/50 transition-transform duration-200 ml-4 shrink-0 ${expandedSubject === subject.subjectName ? 'rotate-180' : ''}`} />
              </button>

              {/* Expanded: Chapter List */}
              {expandedSubject === subject.subjectName && (
                <div className="border-t border-white/10 bg-surface-dim p-4 sm:p-6 space-y-3">
                  {subject.chapterStats.map((chapter) => (
                    <div key={chapter.chapterName} className="bg-surface-container p-4 sm:p-5 rounded-sm border border-white/10 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-base font-medium text-white">{chapter.chapterName}</h4>
                          <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 text-[11px] font-mono text-white/50 uppercase tracking-widest">
                            <span>{chapter.aligned}/{chapter.total} topics</span>
                            {chapter.avgAccuracy !== null && <span>&middot; Accuracy: {chapter.avgAccuracy}%</span>}
                            {chapter.avgConfidence && <span>&middot; Conf: {chapter.avgConfidence}/10</span>}
                          </div>
                        </div>

                        {/* Priority Badge */}
                        <div className={`px-2 py-0.5 rounded-xs text-[10px] font-mono uppercase tracking-wider border whitespace-nowrap font-bold ${
                          chapter.priority === 'critical' ? 'bg-error/15 text-error border-error/40' :
                          chapter.priority === 'high' ? 'bg-status-overconfident/15 text-status-overconfident border-status-overconfident/40' :
                          chapter.priority === 'medium' ? 'bg-status-weak/15 text-status-weak border-status-weak/40' :
                          'bg-status-aligned/15 text-status-aligned border-status-aligned/40'
                        }`}>
                          {chapter.priority}
                        </div>
                      </div>

                      {/* Mastery bar */}
                      <div className="w-full h-1.5 bg-surface-dim rounded-none overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            chapter.mastery >= 80 ? 'bg-status-aligned' :
                            chapter.mastery >= 60 ? 'bg-status-weak' :
                            'bg-error'
                          }`}
                          style={{ width: `${chapter.mastery}%` }}
                        />
                      </div>

                      {/* Status breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="text-center p-2 bg-surface-dim rounded-xs border border-white/5">
                          <div className="text-xl font-light font-mono text-status-aligned">{chapter.aligned}</div>
                          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Aligned</div>
                        </div>
                        {chapter.weak > 0 && (
                          <div className="text-center p-2 bg-surface-dim rounded-xs border border-white/5">
                            <div className="text-xl font-light font-mono text-status-weak">{chapter.weak}</div>
                            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Weak</div>
                          </div>
                        )}
                        {chapter.overconfident > 0 && (
                          <div className="text-center p-2 bg-surface-dim rounded-xs border border-white/5">
                            <div className="text-xl font-light font-mono text-status-overconfident">{chapter.overconfident}</div>
                            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Over-conf</div>
                          </div>
                        )}
                        {chapter.untested > 0 && (
                          <div className="text-center p-2 bg-surface-dim rounded-xs border border-white/5">
                            <div className="text-xl font-light font-mono text-primary">{chapter.untested}</div>
                            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Untested</div>
                          </div>
                        )}
                      </div>

                      {/* Weakest topics in this chapter */}
                      {chapter.weakestTopics.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-2">
                          <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Revision Target Topics:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {chapter.weakestTopics.map((topic) => (
                              <button
                                key={topic.topic_id}
                                onClick={() => navigate(`/topics/${topic.topic_id}`)}
                                className={`px-2 py-0.5 rounded-xs text-[11px] font-mono uppercase tracking-wider border transition-colors ${
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

                      {/* Action button */}
                      {chapter.priority !== 'low' && (
                        <button
                          onClick={() => navigate(`/plan?chapter=${chapter.chapterName}`)}
                          className="w-full px-4 py-2 bg-surface-dim border border-white/10 hover:border-primary text-primary text-xs font-mono uppercase tracking-widest rounded-sm transition-colors mt-2"
                        >
                          Focus on this chapter &rarr;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Overall Stats Cards */}
      {subjectMastery.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-5 bg-surface-container border border-white/10 rounded-sm">
            <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1">Strongest Subject</div>
            <div className="text-2xl font-light text-status-aligned">
              {subjectMastery[subjectMastery.length - 1].subjectName}
            </div>
            <div className="text-xs font-mono text-white/40 mt-1">
              {subjectMastery[subjectMastery.length - 1].mastery}% mastery
            </div>
          </div>

          <div className="p-5 bg-surface-container border border-white/10 rounded-sm">
            <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1">Needs Attention</div>
            <div className="text-2xl font-light text-error">
              {subjectMastery[0].subjectName}
            </div>
            <div className="text-xs font-mono text-white/40 mt-1">
              {subjectMastery[0].mastery}% mastery
            </div>
          </div>

          <div className="p-5 bg-surface-container border border-white/10 rounded-sm">
            <div className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-1">Average Mastery</div>
            <div className={`text-2xl font-light font-mono ${
              subjectMastery.reduce((sum, s) => sum + s.mastery, 0) / subjectMastery.length >= 70 ? 'text-status-aligned' : 'text-status-weak'
            }`}>
              {Math.round(subjectMastery.reduce((sum, s) => sum + s.mastery, 0) / subjectMastery.length)}%
            </div>
            <div className="text-xs font-mono text-white/40 mt-1">
              across all subjects
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
