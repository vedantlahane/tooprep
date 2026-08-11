import { supabase } from './supabase';

const API_BASE = '/api';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
}

async function request(method, path, body = null) {
  const headers = await getAuthHeaders();
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export const api = {
  // Profile
  getProfile: () => request('GET', '/profile'),
  updateProfile: (body) => request('POST', '/profile', body),

  // Dashboard
  getDashboard: () => request('GET', '/dashboard'),
  getBiggestGap: () => request('GET', '/dashboard/insights/biggest-gap'),

  // Topics
  getTopics: () => request('GET', '/topics'),
  getTopicDetail: (id) => request('GET', `/topics/${id}`),

  // Confidence
  setConfidence: (topicId, confidence, trigger) =>
    request('POST', `/topics/${topicId}/confidence`, { confidence, trigger }),
  getConfidenceHistory: (topicId) =>
    request('GET', `/topics/${topicId}/confidence-history`),

  // Questions
  getQuestions: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/questions?${qs}`);
  },
  createQuestion: (body) => request('POST', '/questions', body),

  // Practice
  startPractice: (topicId, questionCount) =>
    request('POST', '/practice-sessions', { topic_id: topicId, question_count: questionCount }),
  getPracticeSession: (id) => request('GET', `/practice-sessions/${id}`),
  submitPracticeAttempt: (sessionId, body) =>
    request('POST', `/practice-sessions/${sessionId}/attempts`, body),
  completePractice: (sessionId) =>
    request('POST', `/practice-sessions/${sessionId}/complete`),

  // Evaluations
  startEvaluation: (topicId, questionCount, durationSeconds) =>
    request('POST', '/evaluations', { topic_id: topicId, question_count: questionCount, duration_seconds: durationSeconds }),
  getEvaluation: (id) => request('GET', `/evaluations/${id}`),
  submitEvalAttempt: (evalId, body) =>
    request('POST', `/evaluations/${evalId}/attempts`, body),
  completeEvaluation: (evalId) =>
    request('POST', `/evaluations/${evalId}/complete`),
};
