import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Global In-Memory + SessionStorage Reactive SWR Cache
 * 
 * Provides:
 *  - 0ms perceived read latency (returns stale data immediately)
 *  - Silent background revalidation
 *  - Event subscription for live database sync
 *  - Optimistic mutations with automatic rollback on error
 *  - Route & hover prefetching
 */

class ClientCache {
  constructor() {
    this.memoryCache = new Map();
    this.subscribers = new Set();
    this.inFlight = new Map();
    this.defaultTtl = 5 * 60 * 1000; // 5 minutes fresh
  }

  _getKey(key) {
    return typeof key === 'string' ? key : JSON.stringify(key);
  }

  get(key) {
    const k = this._getKey(key);
    // 1. In-memory
    if (this.memoryCache.has(k)) {
      return this.memoryCache.get(k);
    }
    // 2. SessionStorage
    try {
      const raw = sessionStorage.getItem(`tooprep_swr_${k}`);
      if (raw) {
        const item = JSON.parse(raw);
        this.memoryCache.set(k, item);
        return item;
      }
    } catch (_) {}
    return null;
  }

  set(key, data, ttl = this.defaultTtl) {
    const k = this._getKey(key);
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.memoryCache.set(k, item);
    try {
      sessionStorage.setItem(`tooprep_swr_${k}`, JSON.stringify(item));
    } catch (_) {}

    this._notify(k, data);
    return data;
  }

  has(key) {
    return this.get(key) !== null;
  }

  isStale(key) {
    const item = this.get(key);
    if (!item) return true;
    return Date.now() - item.timestamp > item.ttl;
  }

  invalidate(prefixOrKey) {
    const target = this._getKey(prefixOrKey);
    const keysToDelete = [];

    for (const k of this.memoryCache.keys()) {
      if (k === target || k.startsWith(target)) {
        keysToDelete.push(k);
      }
    }

    for (const k of keysToDelete) {
      this.memoryCache.delete(k);
      try {
        sessionStorage.removeItem(`tooprep_swr_${k}`);
      } catch (_) {}
      this._notify(k, null, true);
    }
  }

  /**
   * Fetch with SWR semantics:
   * Returns cached data immediately if available, revalidates in background if stale.
   */
  async fetch(key, fetcher, { ttl = this.defaultTtl, force = false } = {}) {
    const k = this._getKey(key);
    const cached = this.get(k);

    // If fresh and not forced, return immediately
    if (!force && cached && !this.isStale(k)) {
      return cached.data;
    }

    // Coalesce duplicate in-flight requests for the exact same key
    if (this.inFlight.has(k)) {
      return this.inFlight.get(k);
    }

    const promise = (async () => {
      try {
        const freshData = await fetcher();
        this.set(k, freshData, ttl);
        return freshData;
      } finally {
        this.inFlight.delete(k);
      }
    })();

    this.inFlight.set(k, promise);

    // If stale cached data exists and not forced, return cached data while background promise runs
    if (!force && cached) {
      return cached.data;
    }

    return promise;
  }

  /**
   * Proactive prefetch without blocking UI
   */
  prefetch(key, fetcher, ttl = this.defaultTtl) {
    const k = this._getKey(key);
    if (this.get(k) && !this.isStale(k)) return;
    this.fetch(k, fetcher, { ttl }).catch(() => {});
  }

  /**
   * Optimistic update helper
   */
  async mutate(key, updaterFn, asyncPersistFn = null) {
    const k = this._getKey(key);
    const current = this.get(k);
    const previousData = current ? current.data : null;

    const optimisticData = typeof updaterFn === 'function' ? updaterFn(previousData) : updaterFn;
    this.set(k, optimisticData);

    if (asyncPersistFn) {
      try {
        const serverResult = await asyncPersistFn(optimisticData);
        if (serverResult !== undefined) {
          this.set(k, serverResult);
        }
        return serverResult;
      } catch (err) {
        // Rollback on error
        if (previousData !== null) {
          this.set(k, previousData);
        } else {
          this.invalidate(k);
        }
        throw err;
      }
    }
    return optimisticData;
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  _notify(key, data, isInvalidated = false) {
    for (const sub of this.subscribers) {
      try {
        sub({ key, data, isInvalidated });
      } catch (e) {
        console.error('[clientCache] Listener error:', e);
      }
    }
  }
}

export const clientCache = new ClientCache();

/**
 * React Hook for seamless SWR caching with zero flicker
 */
export function useCachedData(key, fetcher, { ttl = 5 * 60 * 1000, enabled = true, revalidateOnFocus = true } = {}) {
  const cacheKey = key ? clientCache._getKey(key) : null;
  const initial = cacheKey ? clientCache.get(cacheKey) : null;

  const [data, setData] = useState(() => (initial ? initial.data : null));
  const [loading, setLoading] = useState(() => (enabled && !initial));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const revalidate = useCallback(async (force = false) => {
    if (!cacheKey || !enabled) return;
    setIsRefreshing(true);
    try {
      const fresh = await clientCache.fetch(cacheKey, () => fetcherRef.current(), { ttl, force: true });
      setData(fresh);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [cacheKey, enabled, ttl]);

  useEffect(() => {
    if (!cacheKey || !enabled) return;

    const currentCached = clientCache.get(cacheKey);
    if (currentCached) {
      setData(currentCached.data);
      setLoading(false);
      // If stale, trigger background revalidation
      if (clientCache.isStale(cacheKey)) {
        revalidate();
      }
    } else {
      setLoading(true);
      revalidate(true);
    }

    // Subscribe to cache updates (from real-time WebSocket or other components)
    const unsubscribe = clientCache.subscribe(({ key: updatedKey, data: updatedData, isInvalidated }) => {
      if (updatedKey === cacheKey) {
        if (isInvalidated) {
          revalidate(true);
        } else {
          setData(updatedData);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [cacheKey, enabled, revalidate]);

  // Optional: revalidate on window focus
  useEffect(() => {
    if (!revalidateOnFocus || !enabled || !cacheKey) return;
    const handleFocus = () => {
      if (clientCache.isStale(cacheKey)) {
        revalidate();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, enabled, cacheKey, revalidate]);

  const mutate = useCallback((updater, persistFn) => {
    return clientCache.mutate(cacheKey, updater, persistFn);
  }, [cacheKey]);

  return { data, loading, isRefreshing, error, revalidate, mutate };
}
