import { useState, useEffect, useCallback } from 'react';

interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
}

const IMAGE_CACHE_SIZE = 50; // Maximum number of cached images
const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes

class ImageCacheManager {
  private cache = new Map<string, CachedImage>();
  private preloadQueue = new Set<string>();

  get(url: string): string | null {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return URL.createObjectURL(cached.blob);
    }
    if (cached) {
      this.cache.delete(url);
    }
    return null;
  }

  async preload(url: string): Promise<string> {
    // Check if already cached
    const cached = this.get(url);
    if (cached) return cached;

    // Avoid duplicate preloads
    if (this.preloadQueue.has(url)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const cachedUrl = this.get(url);
          if (cachedUrl || !this.preloadQueue.has(url)) {
            clearInterval(checkInterval);
            resolve(cachedUrl || url);
          }
        }, 100);
      });
    }

    this.preloadQueue.add(url);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      
      // Clean cache if full
      if (this.cache.size >= IMAGE_CACHE_SIZE) {
        const oldest = Array.from(this.cache.entries())
          .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
        this.cache.delete(oldest[0]);
      }

      this.cache.set(url, {
        url,
        blob,
        timestamp: Date.now()
      });

      this.preloadQueue.delete(url);
      return URL.createObjectURL(blob);
    } catch (error) {
      this.preloadQueue.delete(url);
      console.error('Failed to preload image:', error);
      return url; // Fallback to original URL
    }
  }

  clear() {
    this.cache.clear();
    this.preloadQueue.clear();
  }
}

const imageCache = new ImageCacheManager();

export const useImageCache = () => {
  const [loadedImages, setLoadedImages] = useState(new Map<string, string>());

  const preloadImage = useCallback(async (url: string): Promise<string> => {
    const cachedUrl = await imageCache.preload(url);
    setLoadedImages(prev => new Map(prev).set(url, cachedUrl));
    return cachedUrl;
  }, []);

  const preloadMultiple = useCallback(async (urls: string[]) => {
    const promises = urls.map(url => preloadImage(url));
    await Promise.allSettled(promises);
  }, [preloadImage]);

  const getCachedUrl = useCallback((url: string): string => {
    return loadedImages.get(url) || imageCache.get(url) || url;
  }, [loadedImages]);

  const clearCache = useCallback(() => {
    imageCache.clear();
    setLoadedImages(new Map());
  }, []);

  return {
    preloadImage,
    preloadMultiple,
    getCachedUrl,
    clearCache,
    isLoaded: (url: string) => loadedImages.has(url)
  };
};