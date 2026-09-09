import { request } from '@/shared/lib/apiClient';
import { clientCache } from '@/shared/lib/clientCache';

export const questionsService = {
  getQuestions: (params) => {
    const qs = new URLSearchParams(params).toString();
    return clientCache.fetch(`/questions?${qs}`, () => request('GET', `/questions?${qs}`), { ttl: 3 * 60 * 1000 });
  },
  createQuestion: (body) => {
    clientCache.invalidate('/questions');
    return request('POST', '/questions', body);
  },
  browseQuestions: ({ topic_id, topic_ids, chapter_id, chapter_ids, difficulty, source_type } = {}, force = false) => {
    const params = new URLSearchParams();
    if (topic_ids && Array.isArray(topic_ids) && topic_ids.length > 0) {
      params.append('topic_ids', topic_ids.join(','));
    } else if (topic_id) {
      params.append('topic_id', topic_id);
    }
    if (chapter_ids && Array.isArray(chapter_ids) && chapter_ids.length > 0) {
      params.append('chapter_ids', chapter_ids.join(','));
    } else if (chapter_id) {
      params.append('chapter_id', chapter_id);
    }
    if (difficulty) params.append('difficulty', difficulty);
    if (source_type) params.append('source_type', source_type);
    const qs = params.toString();
    const cacheKey = `/questions/browse?${qs}`;
    return clientCache.fetch(cacheKey, () => request('GET', `/questions?${qs}`), {
      ttl: 3 * 60 * 1000,
      force
    });
  },
  adminListQuestions: ({ topic_id, topic_ids, chapter_id, chapter_ids, difficulty, source_type, exam_year, sort } = {}, force = false) => {
    const params = new URLSearchParams();
    if (topic_ids && Array.isArray(topic_ids) && topic_ids.length > 0) {
      params.append('topic_ids', topic_ids.join(','));
    } else if (topic_id) {
      params.append('topic_id', topic_id);
    }
    if (chapter_ids && Array.isArray(chapter_ids) && chapter_ids.length > 0) {
      params.append('chapter_ids', chapter_ids.join(','));
    } else if (chapter_id) {
      params.append('chapter_id', chapter_id);
    }
    if (difficulty) params.append('difficulty', difficulty);
    if (source_type) params.append('source_type', source_type);
    if (exam_year) params.append('exam_year', exam_year);
    if (sort) params.append('sort', sort);
    const qs = params.toString();
    const cacheKey = `/questions/admin?${qs}`;
    return clientCache.fetch(cacheKey, () => request('GET', `/questions/admin?${qs}`), {
      ttl: 2 * 60 * 1000,
      force
    });
  },
  updateQuestion: (id, data) => {
    clientCache.invalidate('/questions');
    return request('PUT', `/questions/${id}`, data);
  },
  deleteQuestion: (id) => {
    clientCache.invalidate('/questions');
    return request('DELETE', `/questions/${id}`);
  },
  toggleVerify: (id, verified) => {
    clientCache.invalidate('/questions');
    return request('PATCH', `/questions/${id}/verify`, { verified });
  },
  bulkVerify: (question_ids, verified) => {
    clientCache.invalidate('/questions');
    return request('POST', '/questions/bulk-verify', { question_ids, verified });
  },
  bulkDelete: (question_ids) => {
    clientCache.invalidate('/questions');
    return request('POST', '/questions/bulk-delete', { question_ids });
  },
  bulkMove: (ids, topic_id) => {
    clientCache.invalidate('/questions');
    clientCache.invalidate('/topics');
    return request('POST', '/questions/bulk-move', { ids, topic_id });
  },
  bulkImport: (questions, default_topic_id) => {
    clientCache.invalidate('/questions');
    clientCache.invalidate('/topics');
    return request('POST', '/questions/bulk-import', { questions, default_topic_id });
  },
  reportQuestion: (id, { reason, notes }) => request('POST', `/questions/${id}/report`, { reason, notes }),
  listReports: ({ status = 'ALL', limit = 50 } = {}) => request('GET', `/questions/reports?status=${status}&limit=${limit}`),
  updateReportStatus: (reportId, { status, resolution_notes }) => request('PATCH', `/questions/reports/${reportId}`, { status, resolution_notes }),
};
