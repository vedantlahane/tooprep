import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminService } from '../services/adminService';
import QuestionEditModal from '@/features/questions/components/QuestionEditModal';
import Icon, {
  Activity,
  BookOpen,
  Users,
  Timer,
  UploadCloud,
  RefreshCw,
  Plus,
  ArrowRight,
  Sparkles,
  Server,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Layers,
  ShieldAlert,
  Target
} from '@/shared/components/Icon';

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Auto-refresh engine
  const [pollInterval, setPollInterval] = useState(30); // 0 = off, 15, 30, 60s
  const [countdown, setCountdown] = useState(30);
  const [activityTab, setActivityTab] = useState('evaluations'); // 'evaluations' | 'practice'

  const fetchTelemetry = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const data = await adminService.getObservability();
      setTelemetry(data);
    } catch (err) {
      setError(err.message || 'Failed to load system observability.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry(false);
  }, [fetchTelemetry]);

  // Live countdown ticker
  useEffect(() => {
    if (pollInterval <= 0) {
      setCountdown(0);
      return;
    }
    setCountdown(pollInterval);
    const ticker = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          fetchTelemetry(true);
          return pollInterval;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [pollInterval, fetchTelemetry]);

  const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header & Telemetry Control Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Mission Control
            </p>
            {pollInterval > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-status-aligned/10 border border-status-aligned/40 text-status-aligned text-[10px] font-mono uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-status-aligned animate-ping" />
                <span>Live Feed ({countdown}s)</span>
              </span>
            )}
          </div>
          <h1 className="text-display text-on-surface mt-1 font-light lowercase">
            System Observability
          </h1>
          <p className="text-body-md text-on-surface-variant font-light mt-1">
            Real-time platform telemetry across syllabus readiness, student cohorts, duplicate detection, and pipeline syncs.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Polling Interval Selector */}
          <div className="flex items-center border border-white/15 bg-surface-container text-xs font-mono">
            <span className="px-2.5 py-1.5 text-white/50 text-[10px] uppercase tracking-wider border-r border-white/10">
              Poll:
            </span>
            {[
              { label: 'Off', val: 0 },
              { label: '15s', val: 15 },
              { label: '30s', val: 30 },
              { label: '60s', val: 60 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setPollInterval(opt.val)}
                className={`px-2.5 py-1.5 uppercase transition-colors ${
                  pollInterval === opt.val
                    ? 'bg-primary text-white font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchTelemetry(false)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3.5 py-2 border border-white/15 bg-surface-container hover:border-primary text-white text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            title="Force immediate telemetry refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? 'animate-spin text-primary' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Question</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 border-l-4 border-error bg-error/10 text-error text-xs font-mono">
          {error}
        </div>
      )}

      {/* ─── Windows Phone Metro Start Screen Live Tiles Grid ─── */}
      {telemetry && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tile 1: Lumia Cyan Wide Question Bank Tile */}
          <div
            onClick={() => navigate('/admin/questions')}
            className="cursor-pointer md:col-span-2 p-6 bg-gradient-to-br from-[#00BFFF]/20 via-[#00BFFF]/5 to-surface-dim border-2 border-[#00BFFF]/40 hover:border-[#00BFFF] transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-[#00BFFF] uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#00BFFF]" />
                  <span>Question Bank Corpus</span>
                </span>
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
                  Live Database
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-4">
                <span className="text-6xl font-extralight text-white font-mono">
                  {telemetry.questions.total}
                </span>
                <div className="text-xs font-mono space-y-0.5">
                  <div className="text-status-aligned font-bold">{telemetry.questions.verified} Verified</div>
                  <div className="text-white/50">{telemetry.questions.unverified} Draft / Unreviewed</div>
                </div>
              </div>
            </div>

            {/* Subject Distribution Bars */}
            <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <div className="text-white/50 uppercase tracking-wider text-[10px]">Physics</div>
                <div className="text-lg font-light text-white">{telemetry.questions.by_subject.Physics || 0}</div>
              </div>
              <div>
                <div className="text-white/50 uppercase tracking-wider text-[10px]">Chemistry</div>
                <div className="text-lg font-light text-white">{telemetry.questions.by_subject.Chemistry || 0}</div>
              </div>
              <div>
                <div className="text-white/50 uppercase tracking-wider text-[10px]">Mathematics</div>
                <div className="text-lg font-light text-white">{telemetry.questions.by_subject.Mathematics || 0}</div>
              </div>
            </div>
          </div>

          {/* Tile 2: Deduplication Alert Tile (Crimson / Mango) */}
          <div
            onClick={() => navigate('/admin/duplicates')}
            className={`cursor-pointer p-6 bg-gradient-to-br transition-all group flex flex-col justify-between border-2 ${
              telemetry.deduplication?.pending_count > 0
                ? 'from-[#FF8C00]/25 via-[#FF8C00]/10 to-surface-dim border-[#FF8C00] hover:brightness-110'
                : 'from-surface-container to-surface-dim border-white/15 hover:border-white/40'
            }`}
          >
            <div>
              <div className="flex justify-between items-start">
                <span className={`text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 ${
                  telemetry.deduplication?.pending_count > 0 ? 'text-[#FF8C00]' : 'text-white/70'
                }`}>
                  <Copy className="w-4 h-4" />
                  <span>Deduplication</span>
                </span>
                <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 ${
                  telemetry.deduplication?.pending_count > 0 ? 'bg-[#FF8C00]/20 text-[#FF8C00] font-bold' : 'text-white/40'
                }`}>
                  {telemetry.deduplication?.pending_count > 0 ? 'Audit Action' : 'Clean'}
                </span>
              </div>

              <div className="mt-4">
                <span className={`text-6xl font-extralight font-mono ${
                  telemetry.deduplication?.pending_count > 0 ? 'text-[#FF8C00]' : 'text-white'
                }`}>
                  {telemetry.deduplication?.pending_count ?? 0}
                </span>
                <span className="text-xs font-mono text-white/50 block mt-1">
                  potential duplicate pairs flagged
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono space-y-1">
              <div className="flex justify-between text-white/70">
                <span>Exact 100% Matches:</span>
                <span className="text-white font-bold">{telemetry.deduplication?.exact_matches ?? 0}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Total Resolved:</span>
                <span className="text-status-aligned font-bold">{telemetry.deduplication?.total_resolved ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Tile 3: Syllabus Coverage & Depth Readiness Tile */}
          <div
            onClick={() => navigate('/admin/curriculum')}
            className="cursor-pointer p-6 bg-gradient-to-br from-[#107C10]/20 via-[#107C10]/5 to-surface-dim border-2 border-[#107C10]/40 hover:border-[#107C10] transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-[#107C10] uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#107C10]" />
                  <span>Syllabus Depth</span>
                </span>
                <span className="text-[10px] font-mono text-white/50 uppercase">JEE Readiness</span>
              </div>

              <div className="mt-4">
                <span className="text-6xl font-extralight text-white font-mono">
                  {telemetry.syllabus?.readiness_percentage ?? 0}%
                </span>
                <span className="text-xs font-mono text-white/50 block mt-1">
                  curriculum topics populated
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono space-y-1">
              <div className="flex justify-between text-white/70">
                <span>Zero Coverage Blindspots:</span>
                <span className="text-error font-bold">{telemetry.syllabus?.zero_coverage ?? 0}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Fully Ready (5+ Qs):</span>
                <span className="text-status-aligned font-bold">{telemetry.syllabus?.ready_topics ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Tile 4: Mango Orange Student Cohort Tile */}
          <div className="p-6 bg-gradient-to-br from-[#FF8C00]/20 via-[#FF8C00]/5 to-surface-dim border-2 border-[#FF8C00]/40 hover:border-[#FF8C00] transition-all group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-[#FF8C00] uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#FF8C00]" />
                  <span>Student Candidates</span>
                </span>
                <span className="text-[10px] font-mono text-white/50 uppercase">Active Cohort</span>
              </div>

              <div className="mt-4">
                <span className="text-6xl font-extralight text-white font-mono">
                  {telemetry.students.total_profiles}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono space-y-1">
              <div className="flex justify-between text-white/70">
                <span>Evaluations Taken:</span>
                <span className="text-white font-bold">{telemetry.evaluations.total_evaluations}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Practice Drills:</span>
                <span className="text-white font-bold">{telemetry.practice.total_sessions}</span>
              </div>
            </div>
          </div>

          {/* Tile 5: Xbox Emerald Platform Accuracy Tile */}
          <div className="p-6 bg-gradient-to-br from-[#107C10]/20 via-[#107C10]/5 to-surface-dim border-2 border-[#107C10]/40 hover:border-[#107C10] transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-[#107C10] uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#107C10]" />
                  <span>Cohort Accuracy</span>
                </span>
                <span className="text-[10px] font-mono text-white/50 uppercase">Avg Score</span>
              </div>

              <div className="mt-4">
                <span className="text-6xl font-extralight text-white font-mono">
                  {telemetry.evaluations.platform_accuracy}%
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono space-y-1">
              <div className="flex justify-between text-white/70">
                <span>Questions Attempted:</span>
                <span className="text-white font-bold">{telemetry.evaluations.total_attempts}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Confidence Ratings:</span>
                <span className="text-white font-bold">{telemetry.confidence.total_ratings}</span>
              </div>
            </div>
          </div>

          {/* Tile 6: Crimson Red Pipeline Alert Tile */}
          <div
            onClick={() => navigate('/admin/content')}
            className="cursor-pointer p-6 bg-gradient-to-br from-[#FF2E55]/20 via-[#FF2E55]/5 to-surface-dim border-2 border-[#FF2E55]/40 hover:border-[#FF2E55] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-[#FF2E55] uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-[#FF2E55]" />
                  <span>Content Pipeline</span>
                </span>
                <span className="text-[10px] font-mono text-white/50 uppercase">OCR Ingestion</span>
              </div>

              <div className="mt-4">
                <span className="text-6xl font-extralight text-white font-mono">
                  {telemetry.content_pipeline.unreviewed_candidates}
                </span>
                <span className="text-xs font-mono text-white/50 block mt-1">
                  candidates awaiting review
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono space-y-1">
              <div className="flex justify-between text-white/70">
                <span>Ingestion Jobs:</span>
                <span className="text-white font-bold">{telemetry.content_pipeline.total_jobs}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Pipeline Status:</span>
                <span className={`font-bold ${telemetry.content_pipeline.status === 'connected' ? 'text-status-aligned' : 'text-[#FF8C00]'}`}>
                  {telemetry.content_pipeline.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Tile 7: Deep Slate Runtime Telemetry */}
          <div className="p-6 bg-surface-container border-2 border-white/15 hover:border-white/40 transition-all flex flex-col justify-between font-mono md:col-span-2 lg:col-span-3">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-primary uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-primary" />
                  <span>Runtime & Infrastructure</span>
                </span>
                <span className="text-[10px] text-status-aligned uppercase">Online</span>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline gap-4">
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-widest">Server Uptime</div>
                  <div className="text-3xl font-light text-white mt-1">
                    {formatUptime(telemetry.runtime.uptime_seconds)}
                  </div>
                </div>
                <div className="sm:ml-auto grid grid-cols-3 gap-6 text-xs">
                  <div>
                    <div className="text-white/50 uppercase text-[10px]">Node.js</div>
                    <div className="text-white font-bold mt-0.5">{telemetry.runtime.node_version}</div>
                  </div>
                  <div>
                    <div className="text-white/50 uppercase text-[10px]">Heap Memory</div>
                    <div className="text-white font-bold mt-0.5">{telemetry.runtime.memory.heap_used_mb} MB</div>
                  </div>
                  <div>
                    <div className="text-white/50 uppercase text-[10px]">RSS Memory</div>
                    <div className="text-white font-bold mt-0.5">{telemetry.runtime.memory.rss_mb} MB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5-Module Quick Operations Command Strip ─── */}
      <div className="border border-white/15 bg-surface-container p-6 space-y-4">
        <h2 className="text-xs font-mono text-primary uppercase tracking-widest font-bold">
          Quick Administrative Navigation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
          <button
            onClick={() => navigate('/admin/questions')}
            className="p-4 bg-black border border-white/15 hover:border-primary text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#00BFFF]" />
                <span>Question Bank</span>
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">Bulk verify, edit & sort</div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/admin/duplicates')}
            className="p-4 bg-black border border-white/15 hover:border-primary text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-[#FF8C00]" />
                <span>Deduplication</span>
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">Resolve & merge duplicates</div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/admin/curriculum')}
            className="p-4 bg-black border border-white/15 hover:border-primary text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#107C10]" />
                <span>Curriculum Matrix</span>
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">Coverage gap audit & CSV</div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/admin/content')}
            className="p-4 bg-black border border-white/15 hover:border-primary text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-[#FF2E55]" />
                <span>Content Ops</span>
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">Upload PDFs & crop diagrams</div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/admin/syncs')}
            className="p-4 bg-black border border-white/15 hover:border-primary text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span>Projection Sync</span>
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">Vector & DB recovery</div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* ─── Dual Tabbed Cohort Activity Feed ─── */}
      <div className="border border-white/15 bg-surface-container p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-mono text-primary uppercase tracking-widest font-bold">
              Real-Time Cohort Activity Feed
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActivityTab('evaluations')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                activityTab === 'evaluations'
                  ? 'bg-primary text-white font-bold'
                  : 'border border-white/15 text-white/60 hover:text-white'
              }`}
            >
              Evaluations ({telemetry?.evaluations?.recent_evaluations?.length || 0})
            </button>
            <button
              onClick={() => setActivityTab('practice')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                activityTab === 'practice'
                  ? 'bg-primary text-white font-bold'
                  : 'border border-white/15 text-white/60 hover:text-white'
              }`}
            >
              Practice Drills ({telemetry?.practice?.recent_sessions?.length || 0})
            </button>
          </div>
        </div>

        {/* Tab 1: Evaluations Feed */}
        {activityTab === 'evaluations' && (
          <div className="divide-y divide-white/10 text-xs font-mono">
            {telemetry?.evaluations?.recent_evaluations?.length > 0 ? (
              telemetry.evaluations.recent_evaluations.map((ev) => (
                <div key={ev.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 border text-[10px] font-bold ${
                      ev.accuracy >= 70
                        ? 'bg-status-aligned/20 border-status-aligned/40 text-status-aligned'
                        : ev.accuracy >= 40
                        ? 'bg-status-weak/20 border-status-weak/40 text-status-weak'
                        : 'bg-error/20 border-error/40 text-error'
                    }`}>
                      {ev.accuracy}%
                    </span>
                    <span className="text-white font-medium">{ev.topic_name}</span>
                    <span className="text-white/40 text-[11px]">
                      ({ev.correct_count}/{ev.total_questions} correct)
                    </span>
                  </div>

                  <div className="text-white/50 text-[11px]">
                    {new Date(ev.started_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-white/40">No evaluation attempts recorded yet.</p>
            )}
          </div>
        )}

        {/* Tab 2: Practice Drills Feed */}
        {activityTab === 'practice' && (
          <div className="divide-y divide-white/10 text-xs font-mono">
            {telemetry?.practice?.recent_sessions?.length > 0 ? (
              telemetry.practice.recent_sessions.map((ps) => (
                <div key={ps.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 border text-[10px] font-bold ${
                      ps.accuracy >= 70
                        ? 'bg-status-aligned/20 border-status-aligned/40 text-status-aligned'
                        : ps.accuracy >= 40
                        ? 'bg-status-weak/20 border-status-weak/40 text-status-weak'
                        : 'bg-error/20 border-error/40 text-error'
                    }`}>
                      {ps.accuracy}%
                    </span>
                    <span className="text-white font-medium">{ps.topic_name}</span>
                    <span className="text-white/40 text-[11px]">
                      ({ps.correct_count}/{ps.total_questions} solved)
                    </span>
                  </div>

                  <div className="text-white/50 text-[11px]">
                    {new Date(ps.started_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-white/40">No practice sessions recorded yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Modal Editor */}
      <QuestionEditModal
        isOpen={modalOpen}
        question={null}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchTelemetry(true)}
      />
    </div>
  );
}
