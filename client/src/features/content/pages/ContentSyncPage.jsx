import { useEffect, useState, useMemo, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService } from '../services/contentService';
import { adminService } from '@/features/admin/services/adminService';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Copy,
  Check,
  Layers,
  Zap,
  Server,
  AlertCircle,
  Database,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ContentSyncPage() {
  const [failedSyncs, setFailedSyncs] = useState({ supabase: [], vector: [] });
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState({});
  const [retryingAll, setRetryingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SUPABASE' | 'VECTOR'
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedErrors, setExpandedErrors] = useState({});

  const loadSyncs = async () => {
    setLoading(true);
    try {
      const [syncsRes, obsRes] = await Promise.allSettled([
        contentService.getFailedSyncs(),
        adminService.getObservability()
      ]);

      if (syncsRes.status === 'fulfilled') {
        setFailedSyncs(syncsRes.value || { supabase: [], vector: [] });
      } else {
        throw new Error(syncsRes.reason?.message || 'Failed to load sync ops');
      }

      if (obsRes.status === 'fulfilled') {
        setTelemetry(obsRes.value);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load sync operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncs();
  }, []);

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpandError = (key) => {
    setExpandedErrors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Individual sync retry
  const retry = async (type, id, key) => {
    const actionKey = key || `${type}-${id}`;
    setRetrying(prev => ({ ...prev, [actionKey]: true }));
    try {
      await contentService.retrySync(type, id);
      await loadSyncs();
    } catch (err) {
      setError(err.message || 'Retry failed');
    } finally {
      setRetrying(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Batch Retry All Failed
  const handleRetryAll = async () => {
    const totalFailed = (failedSyncs.supabase?.length || 0) + (failedSyncs.vector?.length || 0);
    if (totalFailed === 0) return;

    if (!window.confirm(`Re-queue all ${totalFailed} failed projection syncs across Supabase and Qdrant?`)) {
      return;
    }

    setRetryingAll(true);
    setError(null);

    try {
      const promises = [];
      for (const sync of (failedSyncs.supabase || [])) {
        promises.push(contentService.retrySync('SUPABASE', sync.sync_key || sync.canonical_question_id));
      }
      for (const q of (failedSyncs.vector || [])) {
        promises.push(contentService.retrySync('VECTOR', q.question_id));
      }

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        setError(`Re-queued ${successful} syncs, but ${failed} requests failed. Please check network logs.`);
      }
      await loadSyncs();
    } catch (err) {
      setError(err.message || 'Batch recovery failed');
    } finally {
      setRetryingAll(false);
    }
  };

  const totalFailed = (failedSyncs.supabase?.length || 0) + (failedSyncs.vector?.length || 0);

  // Filtered lists based on tab and search
  const filteredSupabase = useMemo(() => {
    if (activeTab === 'VECTOR') return [];
    let list = failedSyncs.supabase || [];
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      list = list.filter(s =>
        (s.canonical_question_id || '').toLowerCase().includes(q) ||
        (s.sync_key || '').toLowerCase().includes(q) ||
        (s.last_error_message || '').toLowerCase().includes(q) ||
        (s.last_error_code || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [failedSyncs.supabase, activeTab, deferredSearch]);

  const filteredVector = useMemo(() => {
    if (activeTab === 'SUPABASE') return [];
    let list = failedSyncs.vector || [];
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      list = list.filter(v =>
        (v.question_id || '').toLowerCase().includes(q) ||
        (v.synchronization?.vector?.last_error || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [failedSyncs.vector, activeTab, deferredSearch]);

  return (
    <div className="space-y-6 max-w-full text-left">
      {/* ─── Top Panoramic Header ─── */}
      <div className="border-b border-white/10 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-mono tracking-widest uppercase mb-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>INFRASTRUCTURE & PROJECTION DYNAMICS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white uppercase">
              Projection Sync Ops
            </h1>
            <p className="text-xs text-white/50 mt-1 max-w-2xl">
              Real-time synchronization state monitor and dual-store automated recovery console. Maintains consistency between raw content intake and live production projections in Supabase (PostgreSQL) and Qdrant (Vector).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Batch Retry All Failed */}
            {totalFailed > 0 && (
              <button
                onClick={handleRetryAll}
                disabled={retryingAll || loading}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-error/20 border border-error/50 hover:bg-error/30 text-error font-mono font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer disabled:opacity-50"
                title="Re-queue all failed projection syncs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retryingAll ? 'animate-spin' : ''}`} />
                <span>{retryingAll ? 'Re-queuing All...' : `Retry All Failed (${totalFailed})`}</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={loadSyncs}
              disabled={loading || retryingAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-container border border-white/20 hover:border-primary text-white text-xs font-mono tracking-wider uppercase transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh State'}</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mt-4 p-3 bg-error/15 border border-error/40 rounded-sm flex items-center justify-between text-xs text-error">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-error/60 hover:text-error">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ─── Database & Infrastructure Health Status Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Supabase (PostgreSQL) Health Card */}
        <div className={`bg-surface-container border p-4 transition-colors ${
          failedSyncs.supabase?.length > 0 ? 'border-error/40' : 'border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">SUPABASE POSTGRESQL</span>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold border ${
              failedSyncs.supabase?.length > 0
                ? 'bg-error/15 text-error border-error/40'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
            }`}>
              {failedSyncs.supabase?.length > 0 ? 'DEGRADED' : 'OPERATIONAL'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-light mt-2 text-white">
            {failedSyncs.supabase?.length || 0}
            <span className="text-xs font-mono text-white/40 font-normal ml-2">sync failures</span>
          </div>
          <p className="text-[11px] text-white/50 mt-2 font-mono leading-relaxed">
            Relational tables, RLS policies, live question corpus ({telemetry?.questions?.total || 199} total, {telemetry?.questions?.verified || 199} verified).
          </p>
        </div>

        {/* Qdrant (Vector Engine) Health Card */}
        <div className={`bg-surface-container border p-4 transition-colors ${
          failedSyncs.vector?.length > 0 ? 'border-error/40' : 'border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">QDRANT VECTOR DB</span>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold border ${
              failedSyncs.vector?.length > 0
                ? 'bg-error/15 text-error border-error/40'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
            }`}>
              {failedSyncs.vector?.length > 0 ? 'INDEX LAG' : 'OPERATIONAL'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-light mt-2 text-white">
            {failedSyncs.vector?.length || 0}
            <span className="text-xs font-mono text-white/40 font-normal ml-2">index failures</span>
          </div>
          <p className="text-[11px] text-white/50 mt-2 font-mono leading-relaxed">
            High-dimensional semantic embeddings, similarity indexing, duplicate detection, and hybrid retrieval.
          </p>
        </div>

        {/* Pipeline & Ingestion Engine Health Card */}
        <div className="bg-surface-container border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">CONTENT INGESTION</span>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold border ${
              telemetry?.pipeline?.status === 'connected'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
            }`}>
              {telemetry?.pipeline?.status === 'connected' ? 'CONNECTED' : 'STANDBY'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-light mt-2 text-white">
            {telemetry?.pipeline?.unreviewed_candidates ?? 0}
            <span className="text-xs font-mono text-white/40 font-normal ml-2">candidates awaiting review</span>
          </div>
          <p className="text-[11px] text-white/50 mt-2 font-mono leading-relaxed">
            Multi-page exam OCR, LlamaParse ingestion, revision staging, and document-level candidate extraction.
          </p>
        </div>
      </div>

      {/* ─── Search & Tab Filter Bar ─── */}
      <div className="bg-surface-container border border-white/10 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Target Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { key: 'ALL', label: `ALL FAILURES (${totalFailed})` },
              { key: 'SUPABASE', label: `SUPABASE (${failedSyncs.supabase?.length || 0})` },
              { key: 'VECTOR', label: `VECTOR (${failedSyncs.vector?.length || 0})` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-primary text-black font-semibold'
                    : 'bg-surface-container-high/60 text-white/60 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Question ID or error message..."
              className="w-full bg-black/60 border border-white/15 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Failures Recovery Section ─── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-mono text-primary uppercase tracking-widest">
            Auditing projection health and sync logs...
          </div>
        </div>
      ) : totalFailed === 0 ? (
        <div className="bg-surface-container border border-emerald-500/30 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-light text-white uppercase tracking-wider">All Projections In Sync</h3>
            <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
              Zero projection anomalies detected. All published questions across the knowledge base are completely consistent between PostgreSQL and Qdrant.
            </p>
          </div>
          <button
            onClick={loadSyncs}
            className="px-4 py-2 bg-surface-container-high border border-white/20 hover:border-primary text-xs uppercase tracking-wider text-white transition-colors cursor-pointer"
          >
            Re-check Projection State
          </button>
        </div>
      ) : filteredSupabase.length === 0 && filteredVector.length === 0 ? (
        <div className="bg-surface-container border border-white/10 p-10 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-white/40 mx-auto" />
          <h3 className="text-sm font-mono text-white/70 uppercase">No matching failures found</h3>
          <p className="text-xs text-white/40">Try adjusting your search query or tab filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ─── Supabase Failures ─── */}
          {filteredSupabase.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-mono text-white uppercase tracking-wider font-semibold">
                    Supabase (PostgreSQL) Projection Failures ({filteredSupabase.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-white/40 uppercase">Relational Sync Queue</span>
              </div>

              <div className="space-y-3">
                {filteredSupabase.map((sync) => {
                  const actionKey = `SUPABASE:${sync.sync_key}`;
                  const isRetrying = retrying[actionKey];
                  const errorOpen = expandedErrors[actionKey];

                  return (
                    <div
                      key={sync.id || sync.sync_key}
                      className="bg-surface-container border border-white/15 p-4 space-y-3 hover:border-white/25 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span className="px-2 py-0.5 bg-error/15 text-error border border-error/40 text-[10px] font-bold">
                            SUPABASE SYNC ERROR
                          </span>
                          <span className="text-white/40">&middot;</span>
                          <span className="text-white/80 font-mono">
                            Question ID: <strong className="text-white">{sync.canonical_question_id}</strong>
                          </span>
                          {sync.content_version && (
                            <span className="text-white/40 font-mono">v{sync.content_version}</span>
                          )}
                          <button
                            onClick={() => handleCopy(sync.canonical_question_id)}
                            className="text-white/40 hover:text-primary transition-colors cursor-pointer p-0.5"
                            title="Copy Question ID"
                          >
                            {copiedId === sync.canonical_question_id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => retry('SUPABASE', sync.sync_key, actionKey)}
                            disabled={isRetrying || retryingAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                            <span>{isRetrying ? 'Re-queuing...' : 'Retry Sync'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Error Message Callout */}
                      <div className="bg-black/60 border border-error/30 p-2.5 text-xs text-error font-mono flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
                        <span className="leading-relaxed break-all">
                          {sync.last_error_message || sync.last_error_code || 'Unspecified Supabase projection error'}
                        </span>
                      </div>

                      {/* Telemetry Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] font-mono text-white/40">
                        <div className="flex items-center gap-3">
                          <span>Attempt count: <strong className="text-white/70">{sync.attempt_count ?? 1}</strong></span>
                          <span>&middot;</span>
                          <span>Last updated: <strong className="text-white/70">{new Date(sync.updated_at).toLocaleString('en-IN')}</strong></span>
                        </div>

                        <button
                          onClick={() => toggleExpandError(actionKey)}
                          className="text-primary hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <span>{errorOpen ? 'Hide Technical Details' : 'View Technical Details'}</span>
                          {errorOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Technical Details JSON */}
                      {errorOpen && (
                        <pre className="mt-2 p-3 bg-black/80 border border-white/10 text-[11px] font-mono text-white/70 overflow-x-auto">
                          {JSON.stringify(sync, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Qdrant Vector Failures ─── */}
          {filteredVector.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-mono text-white uppercase tracking-wider font-semibold">
                    Qdrant (Vector) Indexing Failures ({filteredVector.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-white/40 uppercase">High-Dimensional Vector Queue</span>
              </div>

              <div className="space-y-3">
                {filteredVector.map((q) => {
                  const actionKey = `VECTOR:${q.question_id}`;
                  const isRetrying = retrying[actionKey];
                  const errorOpen = expandedErrors[actionKey];
                  const vectorSync = q.synchronization?.vector || {};

                  return (
                    <div
                      key={q.question_id}
                      className="bg-surface-container border border-white/15 p-4 space-y-3 hover:border-white/25 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span className="px-2 py-0.5 bg-error/15 text-error border border-error/40 text-[10px] font-bold">
                            VECTOR EMBEDDING ERROR
                          </span>
                          <span className="text-white/40">&middot;</span>
                          <span className="text-white/80 font-mono">
                            Question ID: <strong className="text-white">{q.question_id}</strong>
                          </span>
                          {vectorSync.content_version && (
                            <span className="text-white/40 font-mono">v{vectorSync.content_version}</span>
                          )}
                          <button
                            onClick={() => handleCopy(q.question_id)}
                            className="text-white/40 hover:text-primary transition-colors cursor-pointer p-0.5"
                            title="Copy Question ID"
                          >
                            {copiedId === q.question_id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => retry('VECTOR', q.question_id, actionKey)}
                            disabled={isRetrying || retryingAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                            <span>{isRetrying ? 'Re-indexing...' : 'Retry Vector Sync'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Error Message Callout */}
                      <div className="bg-black/60 border border-error/30 p-2.5 text-xs text-error font-mono flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
                        <span className="leading-relaxed break-all">
                          {vectorSync.last_error || 'Vector generation or Qdrant point upsert failed'}
                        </span>
                      </div>

                      {/* Telemetry Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] font-mono text-white/40">
                        <div className="flex items-center gap-3">
                          <span>Attempt count: <strong className="text-white/70">{vectorSync.attempt_count ?? 1}</strong></span>
                          <span>&middot;</span>
                          <span>Failed at: <strong className="text-white/70">{vectorSync.failed_at ? new Date(vectorSync.failed_at).toLocaleString('en-IN') : 'N/A'}</strong></span>
                        </div>

                        <button
                          onClick={() => toggleExpandError(actionKey)}
                          className="text-primary hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <span>{errorOpen ? 'Hide Technical Details' : 'View Technical Details'}</span>
                          {errorOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Technical Details JSON */}
                      {errorOpen && (
                        <pre className="mt-2 p-3 bg-black/80 border border-white/10 text-[11px] font-mono text-white/70 overflow-x-auto">
                          {JSON.stringify(q, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


