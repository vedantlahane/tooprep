import { request } from '@/shared/lib/apiClient';

export const practiceService = {
  startPractice: (topicIdOrIds, questionCount = null) => {
    const payload = Array.isArray(topicIdOrIds)
      ? { topic_ids: topicIdOrIds, topic_id: topicIdOrIds[0], question_count: questionCount }
      : { topic_id: topicIdOrIds, question_count: questionCount };
    return request('POST', '/practice-sessions', payload);
  },
  getPracticeSession: (id) => request('GET', `/practice-sessions/${id}`),
  submitPracticeAttempt: (sessionId, body) =>
    request('POST', `/practice-sessions/${sessionId}/attempts`, body),
  completePractice: (sessionId) =>
    request('POST', `/practice-sessions/${sessionId}/complete`),
  listPracticeSessions: (topicId = null) => {
    const params = new URLSearchParams();
    if (topicId) params.append('topic_id', topicId);
    return request('GET', `/practice-sessions?${params}`);
  },
  startTargetedSession: (topicId, questionIds) =>
    request('POST', '/practice-sessions/targeted', { topic_id: topicId, question_ids: questionIds }),
};
