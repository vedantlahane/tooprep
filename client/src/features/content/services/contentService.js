import { request } from '@/shared/lib/apiClient';
import { supabase } from '@/shared/lib/supabase';

// Same base URL resolution as apiClient — critical for production where
// VITE_API_URL is set to https://tooprep.onrender.com (absolute URL).
// EventSource must use absolute URL; relative /api/* would hit Vercel's
// SPA rewrite and return index.html instead of text/event-stream.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';




const base = '/admin/content';

export const contentService = {
  listJobs: () => request('GET', `${base}/ingestion-jobs`),
  getCandidates: (jobId) => request('GET', `${base}/ingestion-jobs/${jobId}/candidates`),
  uploadPdf: (file, metadata) => {
    const form = new FormData();
    form.append('file', file);
    form.append('filename', file.name);
    if (metadata.exam) form.append('exam', metadata.exam);
    if (metadata.year) form.append('year', metadata.year);
    return request('POST', `${base}/ingestion-jobs/upload`, form);
  },
  acceptCandidate: (jobId, candidateKey, draft) =>
    request('POST', `${base}/ingestion-jobs/${jobId}/candidates/${candidateKey}/accept`, draft),
  rejectCandidate: (jobId, candidateKey, reason) =>
    request('POST', `${base}/ingestion-jobs/${jobId}/candidates/${candidateKey}/reject`, { reason }),
  bulkAcceptCandidates: (jobId, candidates) =>
    request('POST', `${base}/ingestion-jobs/${jobId}/candidates/bulk-accept`, { candidates }),
  bulkRejectCandidates: (jobId, candidateKeys, reason) =>
    request('POST', `${base}/ingestion-jobs/${jobId}/candidates/bulk-reject`, { candidateKeys, reason }),
  bulkAssignTopic: (jobId, candidateKeys, topicId, curriculum) =>
    request('POST', `${base}/ingestion-jobs/${jobId}/candidates/bulk-assign-topic`, { candidateKeys, topicId, curriculum }),
  searchQuestions: (query, limit = 5) =>
    request('GET', `${base}/questions/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  getFailedSyncs: () => request('GET', `${base}/syncs/failed`),
  retrySync: (type, id) => request('POST', `${base}/syncs/retry`, { type, id }),
  uploadImage: (fileOrDataUrl, filename) => {
    if (typeof fileOrDataUrl === 'string') {
      return request('POST', `${base}/images/upload`, { dataUrl: fileOrDataUrl, filename });
    }
    const form = new FormData();
    form.append('file', fileOrDataUrl);
    if (filename) form.append('filename', filename);
    return request('POST', `${base}/images/upload`, form);
  },
  renderPdfPage: (jobId, pageNum, dpi = 150) =>
    request('GET', `${base}/ingestion-jobs/${jobId}/pages/${pageNum}/render?dpi=${dpi}`),
  cropPdfDiagram: (jobId, pageNum, rect, dpi = 300) =>
    request('POST', `${base}/ingestion-jobs/${jobId}/pages/${pageNum}/crop`, { rect, dpi }),
  deleteJob: (jobId) =>
    request('DELETE', `${base}/ingestion-jobs/${jobId}`),
  uploadSourcePdf: (jobId, file) => {
    const form = new FormData();
    form.append('file', file);
    return request('POST', `${base}/ingestion-jobs/${jobId}/source-pdf`, form);
  },
  getJob: (jobId) =>
    request('GET', `${base}/ingestion-jobs/${jobId}`),
  transitionJob: (jobId, stage, reason) =>
    request('POST', `${base}/ingestion-jobs/${jobId}/transitions`, { stage, reason }),
  getSourcePdfUrl: (jobId) =>
    `/api${base}/ingestion-jobs/${jobId}/pdf`,

  /**
   * Subscribe to real-time pipeline progress events for a job using SSE.
   *
   * EventSource cannot set custom Authorization headers, so we pass the
   * Supabase JWT as a ?token= query parameter. The server accepts this on
   * GET requests only (see auth.js requireAuth middleware).
   *
   * @param {string} jobId
   * @param {(event: object) => void} onEvent
   * @param {(error: Event) => void} [onError]
   * @returns {() => void} unsubscribe function
   */
  async subscribeToJobEvents(jobId, onEvent, onError) {
    // Get current auth token from Supabase (same source as apiClient)
    let token = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || '';
    } catch {
      // proceed without token — server returns 401 and SSE won't connect
    }

    const url = `${API_BASE}${base}/ingestion-jobs/${jobId}/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data));
      } catch {
        // ignore malformed frames
      }
    };

    if (onError) es.onerror = onError;

    // Return sync unsubscribe (EventSource.close is sync)
    return () => es.close();
  }
};

