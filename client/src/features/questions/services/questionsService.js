import { request } from '@/shared/lib/apiClient';

export const questionsService = {
  getQuestions: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/questions?${qs}`);
  },
  createQuestion: (body) => request('POST', '/questions', body),
};
