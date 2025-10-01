import { useState, useEffect } from 'react';

interface UseProgressiveImageProps {
  thumbnailUrl: string;
  fullUrl: string;
  enabled?: boolean;
}

export const useProgressiveImage = ({ thumbnailUrl, fullUrl, enabled = true }: UseProgressiveImageProps) => {
  const [currentSrc, setCurrentSrc] = useState(thumbnailUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullQuality, setIsFullQuality] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setCurrentSrc(thumbnailUrl);
      setIsFullQuality(false);
      return;
    }

    // Start with thumbnail
    setCurrentSrc(thumbnailUrl);
    setIsLoading(true);
    setIsFullQuality(false);

    // Preload full quality image
    const img = new Image();
    img.src = fullUrl;
    img.onload = () => {
      setCurrentSrc(fullUrl);
      setIsLoading(false);
      setIsFullQuality(true);
    };
    img.onerror = () => {
      setIsLoading(false);
    };
  }, [thumbnailUrl, fullUrl, enabled]);

  const enhanceQuality = () => {
    if (isFullQuality) return;
    setIsLoading(true);
    const img = new Image();
    img.src = fullUrl;
    img.onload = () => {
      setCurrentSrc(fullUrl);
      setIsLoading(false);
      setIsFullQuality(true);
    };
  };

  return { src: currentSrc, isLoading, isFullQuality, enhanceQuality };
};
