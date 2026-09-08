import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../services/adminService';
import Icon, {
  Users,
  Search,
  RefreshCw,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Timer,
  Play,
  BookOpen,
  ArrowRight,
  Shield,
  ShieldAlert,
  GraduationCap,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Activity,
  Layers
} from '@/shared/components/Icon';

const STATUS_BADGE_STYLES = {
  OVERCONFIDENT: 'bg-error/20 text-error border-error/50',
  UNDERCONFIDENT: 'bg-primary/20 text-primary border-primary/50',
  ALIGNED: 'bg-status-aligned/20 text-status-aligned border-status-aligned/50',
  WEAK_ALIGNED: 'bg-status-weak/20 text-status-weak border-status-weak/50',
  PRELIMINARY: 'bg-white/10 text-white/70 border-white/20',
  INSUFFICIENT_DATA: 'bg-white/5 text-white/40 border-white/10'
};

export default function AdminStudentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [targetYear, setTargetYear] = useState('ALL');
  const [sortField, setSortField] = useState('last_active');

  // Student Dossier Drawer / Modal
  const [selectedStudentId, setSelectedStudentId] = useState(searchParams.get('student') || null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState('knowledge_map'); // 'knowledge_map' | 'evaluations' | 'practice' | 'mistakes'
  const [updatingRole, setUpdatingRole] = useState(false);

  const fetchStudents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await adminService.getStudents({
        search: searchQuery,
        target_year: targetYear,
        sort: sortField
      });
      setStudents(res.students || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch student cohort');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, targetYear, sortField]);

  useEffect(() => {
    fetchStudents(false);
  }, [fetchStudents]);

  // Load student detail when selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentDetail(null);
      return;
    }
    loadStudentDetail(selectedStudentId);
  }, [selectedStudentId]);

  const loadStudentDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const data = await adminService.getStudentDetail(id);
      setStudentDetail(data);
    } catch (err) {
      setError(err.message || 'Failed to load student dossier');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleAdminRole = async () => {
    if (!studentDetail?.student) return;
    const newRole = !studentDetail.student.is_admin;
    setUpdatingRole(true);
    try {
      await adminService.updateUserRole(studentDetail.student.id, newRole);
      setStudentDetail(prev => ({
        ...prev,
        student: { ...prev.student, is_admin: newRole }
      }));
      // update in roster list
      setStudents(prev => prev.map(s => s.id === studentDetail.student.id ? { ...s, is_admin: newRole } : s));
    } catch (err) {
      alert(`Failed to update admin role: ${err.message}`);
    } finally {
      setUpdatingRole(false);
    }
  };

  // Cohort aggregate stats
  const cohortStats = useMemo(() => {
    const total = students.length;
    let totalAttempts = 0;
    let totalCorrect = 0;
    let overconfidentTotal = 0;

    students.forEach(s => {
      totalAttempts += (s.total_attempts || 0);
      totalCorrect += (s.total_correct || 0);
      overconfidentTotal += (s.overconfident_topics_count || 0);
    });

    const avgAcc = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    return {
      total,
      totalAttempts,
      avgAcc,
      overconfidentTotal
    };
  }, [students]);

  const formatDate = (isoStr) => {
    if (!isoStr) return 'Never';
    return new Date(isoStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16 text-left">
      {/* ─── Top Ambient Bar & Navigation ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#FF8C00] font-bold">
            <Users className="w-4 h-4" />
            <span>Administrative Intelligence // Candidate Cohort</span>
          </div>
          <h1 className="text-display text-on-surface mt-1 font-light">
            Student Observability
          </h1>
          <p className="text-body-md text-on-surface-variant font-light mt-1">
            Real-time candidate telemetry, individual confidence gap diagnosis, mistake audits, and evaluation dossiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="px-3 py-2 bg-surface-container border border-white/15 hover:border-white/40 text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
          >
            Mission Control
          </button>

          <button
            onClick={() => fetchStudents(false)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3.5 py-2 border border-white/15 bg-surface-container hover:border-primary text-white text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh candidate roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? 'animate-spin text-primary' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-error/30 bg-error/10 text-error text-xs font-mono">
          {error}
        </div>
      )}

      {/* ─── Metric KPI Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-5 bg-surface-container border border-white/10 rounded-sm">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">Registered Candidates</div>
          <div className="text-3xl font-light text-white font-mono mt-1">{cohortStats.total}</div>
        </div>
        <div className="p-5 bg-surface-container border border-white/10 rounded-sm">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">Cohort Accuracy</div>
          <div className="text-3xl font-light text-status-aligned font-mono mt-1">{cohortStats.avgAcc}%</div>
        </div>
        <div className="p-5 bg-surface-container border border-white/10 rounded-sm">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">Total Questions Solved</div>
          <div className="text-3xl font-light text-white font-mono mt-1">{cohortStats.totalAttempts}</div>
        </div>
        <div className="p-5 bg-surface-container border border-[#FF8C00]/40 bg-[#FF8C00]/5 rounded-sm">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#FF8C00]">Overconfident Blindspots</div>
          <div className="text-3xl font-light text-[#FF8C00] font-mono mt-1">{cohortStats.overconfidentTotal}</div>
        </div>
      </div>

      {/* ─── Filter & Search Bar ─── */}
      <div className="p-4 bg-surface-container border border-white/10 rounded-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-white/40 ml-2 absolute" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name or email..."
            className="w-full pl-9 pr-8 py-2 bg-black border border-white/15 focus:border-primary text-white text-xs outline-none rounded-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-white/40 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Target Year Selector */}
          <div className="flex items-center border border-white/15 bg-black">
            <span className="px-2.5 py-1.5 text-white/40 text-[10px] uppercase tracking-wider border-r border-white/10">
              Exam Year:
            </span>
            {['ALL', '2025', '2026', '2027'].map((yr) => (
              <button
                key={yr}
                onClick={() => setTargetYear(yr)}
                className={`px-2.5 py-1.5 uppercase transition-colors ${
                  targetYear === yr
                    ? 'bg-primary text-black font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center border border-white/15 bg-black">
            <span className="px-2.5 py-1.5 text-white/40 text-[10px] uppercase tracking-wider border-r border-white/10">
              Sort:
            </span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-black text-white text-xs px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value="last_active">Last Active</option>
              <option value="accuracy">Highest Accuracy</option>
              <option value="attempts">Most Attempts</option>
              <option value="overconfident">Most Overconfident Gaps</option>
              <option value="name">Candidate Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Student Roster Grid ─── */}
      <div className="border border-white/15 rounded-sm overflow-hidden bg-black shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead className="bg-surface-container border-b border-white/15 text-white/70">
              <tr>
                <th className="py-3 px-4 font-semibold">Candidate</th>
                <th className="py-3 px-4 font-semibold">Target Year</th>
                <th className="py-3 px-4 text-center font-semibold">Tests & Drills</th>
                <th className="py-3 px-4 text-center font-semibold">Questions Solved</th>
                <th className="py-3 px-4 text-center font-semibold">Overall Accuracy</th>
                <th className="py-3 px-4 text-center font-semibold">Knowledge Risk</th>
                <th className="py-3 px-4 font-semibold">Last Active</th>
                <th className="py-3 px-4 text-center font-semibold">Role</th>
                <th className="py-3 px-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-white/40">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span>Loading candidate roster telemetry...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-white/40">
                    No candidates found matching the selected filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const hasOverconfident = student.overconfident_topics_count > 0;

                  return (
                    <tr
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className="hover:bg-surface-container/60 transition-colors cursor-pointer group"
                    >
                      {/* Candidate Avatar & Display Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                            {student.display_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-primary transition-colors">
                              {student.display_name}
                            </div>
                            <div className="text-[11px] text-white/40 truncate max-w-[200px]">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Target Year */}
                      <td className="py-3 px-4 text-white/70">
                        {student.target_exam_year ? (
                          <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold rounded-xs">
                            JEE {student.target_exam_year}
                          </span>
                        ) : (
                          <span className="text-white/30">Not specified</span>
                        )}
                      </td>

                      {/* Tests & Practice Count */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2 text-white/80">
                          <span>{student.evaluations_count} evals</span>
                          <span className="text-white/20">&middot;</span>
                          <span>{student.practice_sessions_count} drills</span>
                        </div>
                      </td>

                      {/* Solved */}
                      <td className="py-3 px-4 text-center font-bold text-white">
                        {student.total_attempts || 0}
                      </td>

                      {/* Accuracy */}
                      <td className="py-3 px-4 text-center">
                        {student.accuracy !== null ? (
                          <span className={`px-2 py-0.5 border text-[11px] font-bold rounded-xs ${
                            student.accuracy >= 70
                              ? 'bg-status-aligned/20 text-status-aligned border-status-aligned/40'
                              : student.accuracy >= 40
                              ? 'bg-status-weak/20 text-status-weak border-status-weak/40'
                              : 'bg-error/20 text-error border-error/40'
                          }`}>
                            {student.accuracy}%
                          </span>
                        ) : (
                          <span className="text-white/30">--</span>
                        )}
                      </td>

                      {/* Risk */}
                      <td className="py-3 px-4 text-center">
                        {hasOverconfident ? (
                          <span className="px-2 py-0.5 bg-error/20 border border-error/40 text-error text-[10px] font-bold uppercase rounded-xs">
                            {student.overconfident_topics_count} Overconfident
                          </span>
                        ) : student.aligned_topics_count > 0 ? (
                          <span className="px-2 py-0.5 bg-status-aligned/20 border border-status-aligned/40 text-status-aligned text-[10px] font-bold uppercase rounded-xs">
                            Aligned
                          </span>
                        ) : (
                          <span className="text-white/30 text-[11px]">Calibrating</span>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-4 text-white/50 text-[11px]">
                        {formatDate(student.last_active_at)}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4 text-center">
                        {student.is_admin ? (
                          <span className="px-2 py-0.5 bg-status-weak/20 border border-status-weak/50 text-status-weak text-[10px] font-bold uppercase rounded-xs">
                            Admin
                          </span>
                        ) : (
                          <span className="text-white/30 text-[10px] uppercase">
                            Student
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentId(student.id);
                          }}
                          className="px-3 py-1 bg-surface-container border border-white/15 hover:border-primary text-white hover:text-primary rounded-xs text-xs transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Interactive Student Dossier Drawer / Modal ─── */}
      <AnimatePresence>
        {selectedStudentId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-5xl bg-neutral-950 border border-white/20 rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Top Header */}
              <div className="p-6 border-b border-white/15 bg-surface-container flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary text-2xl font-bold uppercase shrink-0">
                    {studentDetail?.student?.display_name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-2xl font-light text-white">
                        {studentDetail?.student?.display_name || 'Loading Candidate...'}
                      </h2>
                      {studentDetail?.student?.target_exam_year && (
                        <span className="px-2.5 py-0.5 bg-primary/15 border border-primary/40 text-primary text-xs font-mono uppercase tracking-wider rounded-xs font-bold">
                          Target: JEE {studentDetail.student.target_exam_year}
                        </span>
                      )}
                      {studentDetail?.student?.is_admin && (
                        <span className="px-2 py-0.5 bg-status-weak/20 border border-status-weak/40 text-status-weak text-xs font-mono uppercase tracking-wider rounded-xs font-bold">
                          Platform Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-white/50 mt-1 flex items-center gap-3 flex-wrap">
                      <span>{studentDetail?.student?.email}</span>
                      <span className="text-white/20">&middot;</span>
                      <span>UUID: <span className="font-mono text-white/40">{studentDetail?.student?.id}</span></span>
                      <span className="text-white/20">&middot;</span>
                      <span>Joined: {formatDate(studentDetail?.student?.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleAdminRole}
                    disabled={updatingRole || loadingDetail}
                    className="px-3 py-1.5 border border-white/20 hover:border-white/50 text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Toggle admin rights for this user"
                  >
                    {studentDetail?.student?.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                  </button>
                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="p-1.5 border border-white/20 hover:border-white text-white/60 hover:text-white rounded-xs transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Dossier Content Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingDetail ? (
                  <div className="py-24 text-center text-white/40 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs font-mono">Aggregating student Knowledge Map, tests & mistake logs...</span>
                  </div>
                ) : studentDetail ? (
                  <>
                    {/* Summary KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 bg-surface-container border border-white/10 rounded-sm font-mono">
                        <div className="text-[10px] text-white/50 uppercase">Total Solved</div>
                        <div className="text-2xl font-light text-white mt-1">
                          {studentDetail.summary.total_solved}
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5">
                          {studentDetail.summary.total_correct} correct
                        </div>
                      </div>

                      <div className="p-4 bg-surface-container border border-white/10 rounded-sm font-mono">
                        <div className="text-[10px] text-white/50 uppercase">Overall Accuracy</div>
                        <div className="text-2xl font-light text-status-aligned mt-1">
                          {studentDetail.summary.overall_accuracy !== null ? `${studentDetail.summary.overall_accuracy}%` : '--'}
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5">
                          Eval: {studentDetail.summary.eval_accuracy ?? '--'}% &middot; Drill: {studentDetail.summary.practice_accuracy ?? '--'}%
                        </div>
                      </div>

                      <div className="p-4 bg-surface-container border border-white/10 rounded-sm font-mono">
                        <div className="text-[10px] text-white/50 uppercase">Confidence Ratings</div>
                        <div className="text-2xl font-light text-primary mt-1">
                          {studentDetail.summary.confidence_ratings_count}
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5">
                          {studentDetail.knowledge_map.length} topics calibrated
                        </div>
                      </div>

                      <div className="p-4 bg-surface-container border border-error/40 bg-error/5 rounded-sm font-mono">
                        <div className="text-[10px] text-error uppercase">Overconfident Gaps</div>
                        <div className="text-2xl font-light text-error mt-1">
                          {studentDetail.summary.overconfident_count}
                        </div>
                        <div className="text-[10px] text-error/70 mt-0.5">
                          Dangerous blindspots flagged
                        </div>
                      </div>
                    </div>

                    {/* Navigation Tabs inside Dossier */}
                    <div className="border-b border-white/15 flex gap-2 font-mono text-xs">
                      {[
                        { id: 'knowledge_map', label: `Knowledge Map & Gaps (${studentDetail.knowledge_map.length})`, icon: Layers },
                        { id: 'evaluations', label: `Evaluations (${studentDetail.evaluations.length})`, icon: Timer },
                        { id: 'practice', label: `Practice Drills (${studentDetail.practice_sessions.length})`, icon: Play },
                        { id: 'mistakes', label: 'Mistake Diagnostics', icon: AlertTriangle }
                      ].map((tb) => {
                        const IconComp = tb.icon;
                        return (
                          <button
                            key={tb.id}
                            onClick={() => setDetailTab(tb.id)}
                            className={`px-4 py-2 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                              detailTab === tb.id
                                ? 'border-primary text-primary font-bold bg-white/5'
                                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                            <span>{tb.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab 1: Personal Knowledge Map & Gaps */}
                    {detailTab === 'knowledge_map' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono text-white/50">
                          <span>Topics calibrated with confidence ratings or test attempts:</span>
                        </div>

                        {studentDetail.knowledge_map.length === 0 ? (
                          <div className="p-8 text-center bg-surface-container border border-white/10 rounded-sm text-white/40 text-xs font-mono">
                            No calibrated topics recorded yet for this candidate.
                          </div>
                        ) : (
                          <div className="border border-white/10 rounded-sm overflow-hidden">
                            <table className="w-full text-left font-mono text-xs border-collapse">
                              <thead className="bg-surface-container border-b border-white/10 text-white/70">
                                <tr>
                                  <th className="py-2.5 px-3">Subject & Chapter</th>
                                  <th className="py-2.5 px-3">Topic</th>
                                  <th className="py-2.5 px-3 text-center">Confidence</th>
                                  <th className="py-2.5 px-3 text-center">Accuracy</th>
                                  <th className="py-2.5 px-3 text-center">Computed Gap</th>
                                  <th className="py-2.5 px-3 text-center">Status Classification</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/10 bg-black">
                                {studentDetail.knowledge_map.map((row) => (
                                  <tr key={row.topic_id} className="hover:bg-surface-container/40 transition-colors">
                                    <td className="py-2 px-3 text-white/50 text-[11px]">
                                      {row.subject_name} &middot; {row.chapter_name}
                                    </td>
                                    <td className="py-2 px-3 text-white font-medium">
                                      {row.topic_name}
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold text-primary">
                                      {row.confidence !== null ? `${row.confidence}/10` : '--'}
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold text-white">
                                      {row.evaluation_accuracy !== null ? `${row.evaluation_accuracy}%` : '--'}
                                    </td>
                                    <td className={`py-2 px-3 text-center font-bold ${
                                      row.gap === null ? 'text-white/40' : row.gap < 0 ? 'text-error' : row.gap > 0 ? 'text-primary' : 'text-status-aligned'
                                    }`}>
                                      {row.gap !== null ? (row.gap > 0 ? `+${row.gap}%` : `${row.gap}%`) : '--'}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase rounded-xs ${
                                        STATUS_BADGE_STYLES[row.status] || 'bg-white/10 text-white/60 border-white/20'
                                      }`}>
                                        {row.status.replace('_', ' ')}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Evaluations Sessions */}
                    {detailTab === 'evaluations' && (
                      <div className="space-y-3 font-mono text-xs">
                        {studentDetail.evaluations.length === 0 ? (
                          <div className="p-8 text-center bg-surface-container border border-white/10 rounded-sm text-white/40">
                            No timed evaluations recorded yet.
                          </div>
                        ) : (
                          studentDetail.evaluations.map((ev) => (
                            <div key={ev.id} className="p-4 bg-surface-container border border-white/10 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold text-white text-sm">{ev.topic_name}</div>
                                <div className="text-[11px] text-white/50 mt-0.5">
                                  {formatDate(ev.started_at)} &middot; {Math.round(ev.duration_seconds / 60)} minutes duration
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="font-bold text-white text-sm">
                                    {ev.correct_count} / {ev.total_questions} correct
                                  </div>
                                  <div className="text-[10px] text-white/40">{ev.mistakes?.length || 0} mistakes recorded</div>
                                </div>
                                <span className={`px-3 py-1 border text-sm font-bold rounded-xs ${
                                  ev.accuracy >= 70
                                    ? 'bg-status-aligned/20 text-status-aligned border-status-aligned/40'
                                    : ev.accuracy >= 40
                                    ? 'bg-status-weak/20 text-status-weak border-status-weak/40'
                                    : 'bg-error/20 text-error border-error/40'
                                }`}>
                                  {ev.accuracy}%
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Tab 3: Practice Drills */}
                    {detailTab === 'practice' && (
                      <div className="space-y-3 font-mono text-xs">
                        {studentDetail.practice_sessions.length === 0 ? (
                          <div className="p-8 text-center bg-surface-container border border-white/10 rounded-sm text-white/40">
                            No practice sessions recorded yet.
                          </div>
                        ) : (
                          studentDetail.practice_sessions.map((pr) => (
                            <div key={pr.id} className="p-4 bg-surface-container border border-white/10 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold text-white text-sm">{pr.topic_name}</div>
                                <div className="text-[11px] text-white/50 mt-0.5">
                                  {formatDate(pr.started_at)}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="font-bold text-white text-sm">
                                    {pr.correct_count} / {pr.total_questions} solved
                                  </div>
                                </div>
                                <span className={`px-3 py-1 border text-sm font-bold rounded-xs ${
                                  pr.accuracy >= 70
                                    ? 'bg-status-aligned/20 text-status-aligned border-status-aligned/40'
                                    : pr.accuracy >= 40
                                    ? 'bg-status-weak/20 text-status-weak border-status-weak/40'
                                    : 'bg-error/20 text-error border-error/40'
                                }`}>
                                  {pr.accuracy}%
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Tab 4: Mistake Diagnostics */}
                    {detailTab === 'mistakes' && (
                      <div className="p-5 bg-surface-container border border-white/10 rounded-sm space-y-4 font-mono text-xs">
                        <h4 className="font-bold text-white uppercase tracking-wider text-xs">
                          Candidate Cognitive Mistake Distribution
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(studentDetail.mistake_distribution).map(([type, count]) => (
                            <div key={type} className="p-3.5 bg-black border border-white/10 rounded-xs">
                              <div className="text-[10px] text-white/50 uppercase">{type.replace('_', ' ')}</div>
                              <div className="text-2xl font-light text-white mt-1">{count}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
