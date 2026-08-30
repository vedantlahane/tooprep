import { request } from '@/shared/lib/apiClient';

export const questionsService = {
  getQuestions: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/questions?${qs}`);
  },
  createQuestion: (body) => request('POST', '/questions', body),
  browseQuestions: ({ topic_id, difficulty, source_type } = {}) => {
    const params = new URLSearchParams();
    if (topic_id) params.append('topic_id', topic_id);
    if (difficulty) params.append('difficulty', difficulty);
    if (source_type) params.append('source_type', source_type);
    return request('GET', `/questions?${params.toString()}`);
  },
  adminListQuestions: ({ topic_id, difficulty } = {}) => {
    const params = new URLSearchParams();
    if (topic_id) params.append('topic_id', topic_id);
    if (difficulty) params.append('difficulty', difficulty);
    return request('GET', `/questions/admin?${params.toString()}`);
  },
};
