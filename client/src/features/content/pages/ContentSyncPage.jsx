import { useEffect, useState } from 'react';
import { contentService } from '../services/contentService';

export default function ContentSyncPage() {
  const [failedSyncs, setFailedSyncs] = useState({ supabase: [], vector: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(null);

  const loadSyncs = async () => {
    setLoading(true);
    try {
      const data = await contentService.getFailedSyncs();
      setFailedSyncs(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load sync ops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncs();
  }, []);

  const retry = async (type, id) => {
    setRetrying(`${type}-${id}`);
    try {
      await contentService.retrySync(type, id);
      await loadSyncs();
    } catch (err) {
      setError(err.message || 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8">
      <div>
        <h2 className="text-display text-on-surface font-light">sync ops</h2>
        <p className="text-on-surface-variant text-body-lg font-light">monitor and recover failed projection syncs to Qdrant and Supabase.</p>
      </div>

      <div className="flex gap-4">
        <button onClick={loadSyncs} disabled={loading} className="bg-surface-container border-2 border-outline-variant p-3 text-on-surface uppercase tracking-widest text-label-sm-mono hover:border-primary disabled:opacity-50">
          {loading ? 'refreshing...' : 'refresh view'}
        </button>
      </div>

      {error && <p className="border-l-4 border-error bg-error/10 p-4 text-error">{error}</p>}

      <section className="space-y-6">
        <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest border-b-2 border-outline-variant pb-2">Supabase (PostgreSQL) Projection Failures</h3>
        {failedSyncs.supabase.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No failed Supabase syncs.</p>
        ) : (
          <div className="space-y-4">
            {failedSyncs.supabase.map(sync => (
              <div key={sync.id} className="border-l-4 border-error bg-surface-dim p-4 flex justify-between items-start gap-4">
                <div>
                  <div className="text-label-sm-mono text-on-surface uppercase tracking-widest">Question ID: {sync.canonical_question_id} (v{sync.content_version})</div>
                  <div className="text-body-sm text-error mt-2">{sync.last_error_message || sync.last_error_code || 'Unknown error'}</div>
                  <div className="text-body-sm text-on-surface-variant mt-1">Failed attempts: {sync.attempt_count} · Last update: {new Date(sync.updated_at).toLocaleString()}</div>
                </div>
                <button 
                  onClick={() => retry('SUPABASE', sync.sync_key)} 
                  disabled={retrying[`SUPABASE:${sync.sync_key}`]}
                  className="bg-primary text-white px-4 py-2 uppercase tracking-widest font-semibold text-label-sm-mono disabled:opacity-50 shrink-0"
                >
                  {retrying[`SUPABASE:${sync.sync_key}`] ? 'queuing...' : 'retry sync'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest border-b-2 border-outline-variant pb-2">Qdrant (Vector) Index Failures</h3>
        {failedSyncs.vector.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No failed Vector syncs.</p>
        ) : (
          <div className="space-y-4">
            {failedSyncs.vector.map(q => (
              <div key={q.question_id} className="border-l-4 border-error bg-surface-dim p-4 flex justify-between items-start gap-4">
                <div>
                  <div className="text-label-sm-mono text-on-surface uppercase tracking-widest">Question ID: {q.question_id} (v{q.synchronization?.vector?.content_version})</div>
                  <div className="text-body-sm text-error mt-2">{q.synchronization?.vector?.last_error || 'Unknown error'}</div>
                  <div className="text-body-sm text-on-surface-variant mt-1">Failed attempts: {q.synchronization?.vector?.attempt_count} · Failed at: {new Date(q.synchronization?.vector?.failed_at).toLocaleString()}</div>
                </div>
                <button 
                  onClick={() => retry('VECTOR', q.question_id)} 
                  disabled={retrying[`VECTOR:${q.question_id}`]}
                  className="bg-primary text-white px-4 py-2 uppercase tracking-widest font-semibold text-label-sm-mono disabled:opacity-50 shrink-0"
                >
                  {retrying[`VECTOR:${q.question_id}`] ? 'queuing...' : 'retry sync'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

