import { request } from '@/shared/lib/apiClient';

export const evaluationsService = {
  startEvaluation: (topicId, questionCount, durationSeconds) =>
    request('POST', '/evaluations', { topic_id: topicId, question_count: questionCount, duration_seconds: durationSeconds }),
  getEvaluation: (id) => request('GET', `/evaluations/${id}`),
  submitEvalAttempt: (evalId, body) =>
    request('POST', `/evaluations/${evalId}/attempts`, body),
  completeEvaluation: (evalId) =>
    request('POST', `/evaluations/${evalId}/complete`),
};
