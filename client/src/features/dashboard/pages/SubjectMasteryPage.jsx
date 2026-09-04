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
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8 pb-12">
      <div>
        <p className="text-label-sm-mono uppercase tracking-[0.2em] text-primary">subject mastery</p>
        <h2 className="text-display text-on-surface mt-2 font-light">chapter-level progress</h2>
        <p className="text-body-lg text-on-surface-variant font-light mt-2">See your depth of understanding in each subject and identify weak chapters.</p>
      </div>

      {subjectMastery.length === 0 ? (
        <div className="text-center py-20 border border-outline-variant rounded-lg bg-surface-container">
          <GraduationCap className="w-16 h-16 text-primary block opacity-50 mb-4 mx-auto" />
          <h3 className="text-headline-lg text-on-surface font-light mb-2">No data yet</h3>
          <p className="text-body-lg text-on-surface-variant">Start practicing to see your subject mastery breakdown.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subjectMastery.map((subject) => (
            <div key={subject.subjectName} className="border border-outline-variant bg-surface-container rounded-lg overflow-hidden">
              {/* Subject Header */}
              <button
                onClick={() => setExpandedSubject(expandedSubject === subject.subjectName ? null : subject.subjectName)}
                className="w-full p-6 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-headline-md text-on-surface font-light">{subject.subjectName}</h3>
                    <span className={`px-3 py-1 rounded-full text-label-sm-mono uppercase tracking-widest text-white ${
                      subject.mastery >= 80 ? 'bg-status-aligned' :
                      subject.mastery >= 60 ? 'bg-status-weak' :
                      'bg-error'
                    }`}>
                      {subject.mastery}% mastery
                    </span>
                  </div>

                  {/* Mastery bar */}
                  <div className="w-full h-2 bg-surface-dim rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all duration-500 ${
                        subject.mastery >= 80 ? 'bg-status-aligned' :
                        subject.mastery >= 60 ? 'bg-status-weak' :
                        'bg-error'
                      }`}
                      style={{ width: `${subject.mastery}%` }}
                    />
                  </div>

                  <div className="flex gap-4 text-body-sm text-on-surface-variant">
                    <span>{subject.chapters} chapters</span>
                    <span>•</span>
                    <span>{subject.topics} topics</span>
                  </div>
                </div>

                <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform duration-200 ${expandedSubject === subject.subjectName ? 'rotate-180' : ''}`} />
              </button>

              {/* Expanded: Chapter List */}
              {expandedSubject === subject.subjectName && (
                <div className="border-t border-outline-variant bg-surface-dim p-6 space-y-4">
                  {subject.chapterStats.map((chapter) => (
                    <div key={chapter.chapterName} className="bg-surface-container p-5 rounded-lg border border-outline-variant">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="text-body-lg font-semibold text-on-surface">{chapter.chapterName}</h4>
                          <div className="flex gap-3 mt-2 text-label-sm-mono text-on-surface-variant uppercase tracking-widest">
                            <span>{chapter.aligned}/{chapter.total} topics</span>
                            {chapter.avgAccuracy !== null && <span>• Accuracy: {chapter.avgAccuracy}%</span>}
                            {chapter.avgConfidence && <span>• Conf: {chapter.avgConfidence}/10</span>}
                          </div>
                        </div>

                        {/* Priority Badge */}
                        <div className={`px-3 py-1 rounded-full text-label-sm-mono uppercase tracking-widest text-white whitespace-nowrap ${
                          chapter.priority === 'critical' ? 'bg-error' :
                          chapter.priority === 'high' ? 'bg-status-overconfident' :
                          chapter.priority === 'medium' ? 'bg-primary' :
                          'bg-status-aligned'
                        }`}>
                          {chapter.priority}
                        </div>
                      </div>

                      {/* Mastery bar */}
                      <div className="w-full h-2 bg-surface-dim rounded-full overflow-hidden mb-4">
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
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                        <div className="text-center p-2 bg-surface-dim rounded-sm">
                          <div className="text-headline-sm font-light text-status-aligned">{chapter.aligned}</div>
                          <div className="text-label-xs text-on-surface-variant uppercase">Aligned</div>
                        </div>
                        {chapter.weak > 0 && (
                          <div className="text-center p-2 bg-surface-dim rounded-sm">
                            <div className="text-headline-sm font-light text-status-weak">{chapter.weak}</div>
                            <div className="text-label-xs text-on-surface-variant uppercase">Weak</div>
                          </div>
                        )}
                        {chapter.overconfident > 0 && (
                          <div className="text-center p-2 bg-surface-dim rounded-sm">
                            <div className="text-headline-sm font-light text-status-overconfident">{chapter.overconfident}</div>
                            <div className="text-label-xs text-on-surface-variant uppercase">Over-conf</div>
                          </div>
                        )}
                        {chapter.untested > 0 && (
                          <div className="text-center p-2 bg-surface-dim rounded-sm">
                            <div className="text-headline-sm font-light text-primary">{chapter.untested}</div>
                            <div className="text-label-xs text-on-surface-variant uppercase">Untested</div>
                          </div>
                        )}
                      </div>

                      {/* Weakest topics in this chapter */}
                      {chapter.weakestTopics.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Needs work:</div>
                          <div className="flex flex-wrap gap-2">
                            {chapter.weakestTopics.map((topic) => (
                              <button
                                key={topic.topic_id}
                                onClick={() => navigate(`/topics/${topic.topic_id}`)}
                                className={`px-3 py-1 rounded-full text-label-sm-mono uppercase tracking-widest border transition-colors ${
                                  topic.status === 'OVERCONFIDENT'
                                    ? 'border-status-overconfident bg-status-overconfident/10 text-status-overconfident hover:bg-status-overconfident/20'
                                    : topic.status === 'WEAK_ALIGNED'
                                      ? 'border-status-weak bg-status-weak/10 text-status-weak hover:bg-status-weak/20'
                                      : 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                                }`}
                              >
                                {topic.topic_name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {chapter.priority !== 'low' && (
                        <button
                          onClick={() => navigate(`/plan?chapter=${chapter.chapterName}`)}
                          className="mt-4 w-full px-4 py-2 bg-primary/10 border border-primary text-primary text-label-sm-mono uppercase tracking-widest rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          Focus on this chapter
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

      {/* Overall Stats */}
      {subjectMastery.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-surface-container border border-outline-variant rounded-lg">
          <div>
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Strongest Subject</div>
            <div className="text-headline-md text-status-aligned font-light">
              {subjectMastery[subjectMastery.length - 1].subjectName}
            </div>
            <div className="text-body-sm text-on-surface-variant mt-1">
              {subjectMastery[subjectMastery.length - 1].mastery}% mastery
            </div>
          </div>

          <div>
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Needs Attention</div>
            <div className="text-headline-md text-error font-light">
              {subjectMastery[0].subjectName}
            </div>
            <div className="text-body-sm text-on-surface-variant mt-1">
              {subjectMastery[0].mastery}% mastery
            </div>
          </div>

          <div>
            <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">Avg Mastery</div>
            <div className={`text-headline-md font-light ${
              subjectMastery.reduce((sum, s) => sum + s.mastery, 0) / subjectMastery.length >= 70 ? 'text-status-aligned' : 'text-status-weak'
            }`}>
              {Math.round(subjectMastery.reduce((sum, s) => sum + s.mastery, 0) / subjectMastery.length)}%
            </div>
            <div className="text-body-sm text-on-surface-variant mt-1">
              across all subjects
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
