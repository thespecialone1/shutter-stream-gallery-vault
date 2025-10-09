import { useState, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useFeedCache<T>(key: string) {
  const [cachedData, setCachedData] = useState<T | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        const isExpired = Date.now() - entry.timestamp > CACHE_DURATION;
        
        if (!isExpired) {
          setCachedData(entry.data);
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }, [key]);

  const setCache = (data: T) => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(entry));
      setCachedData(data);
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(key);
    setCachedData(null);
  };

  return { cachedData, setCache, clearCache };
}
