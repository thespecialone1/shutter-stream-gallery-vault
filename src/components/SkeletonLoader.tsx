import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonLoaderProps {
  type: 'gallery' | 'sections' | 'favorites';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type, count = 12 }) => {
  const getRandomHeight = () => {
    const heights = ['h-48', 'h-64', 'h-56', 'h-72', 'h-80', 'h-96'];
    return heights[Math.floor(Math.random() * heights.length)];
  };

  if (type === 'gallery') {
    return (
      <div className="skeleton-masonry px-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={`skeleton-item ${getRandomHeight()} bg-muted rounded-lg`} />
        ))}
      </div>
    );
  }

  if (type === 'sections') {
    return (
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-32 rounded-full" />
        ))}
      </div>
    );
  }

  if (type === 'favorites') {
    return (
      <div className="skeleton-masonry px-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={`skeleton-item ${getRandomHeight()} bg-muted rounded-lg`} />
        ))}
      </div>
    );
  }

  return null;
};