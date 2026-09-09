import { request } from '@/shared/lib/apiClient';

export const questionsService = {
  getQuestions: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/questions?${qs}`);
  },
  createQuestion: (body) => request('POST', '/questions', body),
  browseQuestions: ({ topic_id, topic_ids, chapter_id, chapter_ids, difficulty, source_type } = {}) => {
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
    return request('GET', `/questions?${params.toString()}`);
  },
  adminListQuestions: ({ topic_id, topic_ids, chapter_id, chapter_ids, difficulty, source_type, exam_year, sort } = {}) => {
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
    return request('GET', `/questions/admin?${params.toString()}`);
  },
  updateQuestion: (id, data) => request('PUT', `/questions/${id}`, data),
  deleteQuestion: (id) => request('DELETE', `/questions/${id}`),
  toggleVerify: (id, verified) => request('PATCH', `/questions/${id}/verify`, { verified }),
  bulkVerify: (question_ids, verified) => request('POST', '/questions/bulk-verify', { question_ids, verified }),
  bulkDelete: (question_ids) => request('POST', '/questions/bulk-delete', { question_ids }),
  bulkMove: (ids, topic_id) => request('POST', '/questions/bulk-move', { ids, topic_id }),
  bulkImport: (questions, default_topic_id) => request('POST', '/questions/bulk-import', { questions, default_topic_id }),
  reportQuestion: (id, { reason, notes }) => request('POST', `/questions/${id}/report`, { reason, notes }),
  listReports: ({ status = 'ALL', limit = 50 } = {}) => request('GET', `/questions/reports?status=${status}&limit=${limit}`),
  updateReportStatus: (reportId, { status, resolution_notes }) => request('PATCH', `/questions/reports/${reportId}`, { status, resolution_notes }),
};
