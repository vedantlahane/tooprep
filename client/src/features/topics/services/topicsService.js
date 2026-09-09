import { request } from '@/shared/lib/apiClient';
import { clientCache } from '@/shared/lib/clientCache';

export const topicsService = {
  getTopics: (force = false) => {
    return clientCache.fetch('/topics', () => request('GET', '/topics'), {
      ttl: 15 * 60 * 1000, // 15 mins fresh
      force
    });
  },

  getTopicDetail: (id, force = false) => {
    return clientCache.fetch(`/topics/${id}`, () => request('GET', `/topics/${id}`), {
      ttl: 5 * 60 * 1000, // 5 mins fresh
      force
    });
  },

  prefetchTopicDetail: (id) => {
    clientCache.prefetch(`/topics/${id}`, () => request('GET', `/topics/${id}`));
  },

  invalidateTopic: (id) => {
    clientCache.invalidate(`/topics/${id}`);
    clientCache.invalidate('/topics');
    clientCache.invalidate('/dashboard');
  }
};
