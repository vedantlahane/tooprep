import { request } from '@/shared/lib/apiClient';

export const topicsService = {
  getTopics: () => request('GET', '/topics'),
  getTopicDetail: (id) => request('GET', `/topics/${id}`),
};
