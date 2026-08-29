import { request } from '@/shared/lib/apiClient';

export const practiceService = {
  startPractice: (topicId, questionCount) =>
    request('POST', '/practice-sessions', { topic_id: topicId, question_count: questionCount }),
  getPracticeSession: (id) => request('GET', `/practice-sessions/${id}`),
  submitPracticeAttempt: (sessionId, body) =>
    request('POST', `/practice-sessions/${sessionId}/attempts`, body),
  completePractice: (sessionId) =>
    request('POST', `/practice-sessions/${sessionId}/complete`),
};
