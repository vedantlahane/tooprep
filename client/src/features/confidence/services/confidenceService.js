import { request } from '@/shared/lib/apiClient';

export const confidenceService = {
  setConfidence: (topicId, confidence, trigger) =>
    request('POST', `/topics/${topicId}/confidence`, { confidence, trigger }),
  getConfidenceHistory: (topicId) =>
    request('GET', `/topics/${topicId}/confidence-history`),
};
