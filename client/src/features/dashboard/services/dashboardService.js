import { request } from '@/shared/lib/apiClient';

let cachedDashboard = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export const dashboardService = {
  /**
   * Fetches dashboard data. Returns cached data if available and not expired (< 5 mins),
   * unless force is true.
   * @param {boolean} force - Force a network fetch even if cache is fresh
   */
  getDashboard: async (force = false) => {
    const now = Date.now();
    if (!force && cachedDashboard && (now - lastFetchTime < CACHE_TTL_MS)) {
      return cachedDashboard;
    }

    if (!force && !cachedDashboard) {
      try {
        const stored = sessionStorage.getItem('tooprep_dashboard_cache');
        const storedTime = sessionStorage.getItem('tooprep_dashboard_cache_time');
        if (stored && storedTime && (now - Number(storedTime) < CACHE_TTL_MS)) {
          cachedDashboard = JSON.parse(stored);
          lastFetchTime = Number(storedTime);
          return cachedDashboard;
        }
      } catch (_) {}
    }

    const data = await request('GET', '/dashboard');
    cachedDashboard = data;
    lastFetchTime = Date.now();
    try {
      sessionStorage.setItem('tooprep_dashboard_cache', JSON.stringify(data));
      sessionStorage.setItem('tooprep_dashboard_cache_time', String(lastFetchTime));
    } catch (_) {}
    return data;
  },

  /**
   * Synchronous peek at current cached data.
   * Used to initialize component state immediately without loading spinner flicker.
   */
  getCachedDashboard: () => {
    if (cachedDashboard) return cachedDashboard;
    try {
      const stored = sessionStorage.getItem('tooprep_dashboard_cache');
      if (stored) {
        cachedDashboard = JSON.parse(stored);
        return cachedDashboard;
      }
    } catch (_) {}
    return null;
  },

  /**
   * Updates a single topic in the cache (e.g. after confidence calibration).
   */
  updateTopicInCache: (topicId, updates) => {
    if (cachedDashboard && Array.isArray(cachedDashboard)) {
      cachedDashboard = cachedDashboard.map(t =>
        t.topic_id === topicId ? { ...t, ...updates } : t
      );
      try {
        sessionStorage.setItem('tooprep_dashboard_cache', JSON.stringify(cachedDashboard));
      } catch (_) {}
    }
  },

  /**
   * Clears in-memory and sessionStorage cache.
   */
  invalidateCache: () => {
    cachedDashboard = null;
    lastFetchTime = 0;
    try {
      sessionStorage.removeItem('tooprep_dashboard_cache');
      sessionStorage.removeItem('tooprep_dashboard_cache_time');
    } catch (_) {}
  },

  getBiggestGap: () => request('GET', '/dashboard/insights/biggest-gap'),
};
