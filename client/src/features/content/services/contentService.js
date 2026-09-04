import { request } from '@/shared/lib/apiClient';

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
    request('POST', `${base}/ingestion-jobs/${jobId}/pages/${pageNum}/crop`, { rect, dpi })
};
