import { request } from '@/shared/lib/apiClient';
import { clientCache } from '@/shared/lib/clientCache';

export const dashboardService = {
  /**
   * Fetches dashboard data via SWR cache engine.
   * Returns cached data immediately if available, revalidates in background if stale.
   * @param {boolean} force - Force a network fetch
   */
  getDashboard: async (force = false) => {
    return clientCache.fetch('/dashboard', () => request('GET', '/dashboard'), {
      ttl: 5 * 60 * 1000, // 5 minutes fresh
      force
    });
  },

  /**
   * Synchronous peek at current cached data for 0ms initial render without flicker.
   */
  getCachedDashboard: () => {
    const item = clientCache.get('/dashboard');
    return item ? item.data : null;
  },

  /**
   * Optimistically updates a single topic row in the reactive cache.
   */
  updateTopicInCache: (topicId, updates) => {
    clientCache.mutate('/dashboard', (current) => {
      if (!Array.isArray(current)) return current;
      return current.map(t =>
        t.topic_id === topicId ? { ...t, ...updates } : t
      );
    });
  },

  /**
   * Invalidates dashboard cache across memory and session storage.
   */
  invalidateCache: () => {
    clientCache.invalidate('/dashboard');
  },

  /**
   * Proactive prefetch without blocking execution.
   */
  prefetchDashboard: () => {
    clientCache.prefetch('/dashboard', () => request('GET', '/dashboard'));
  },

  getBiggestGap: () => request('GET', '/dashboard/insights/biggest-gap'),
};
