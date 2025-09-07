import { cn } from '@/lib/utils';

interface EnhancedSkeletonLoaderProps {
  className?: string;
  variant?: 'default' | 'image' | 'text' | 'button';
  animate?: boolean;
}

export const EnhancedSkeletonLoader = ({ 
  className, 
  variant = 'default',
  animate = true 
}: EnhancedSkeletonLoaderProps) => {
  const baseClasses = cn(
    "skeleton-enhanced",
    animate && "animate-pulse",
    className
  );

  const variants = {
    default: "h-4 w-full",
    image: "aspect-square w-full",
    text: "h-4 w-3/4",
    button: "h-10 w-24 rounded-full"
  };

  return (
    <div className={cn(baseClasses, variants[variant])} />
  );
};

interface MasonrySkeletonProps {
  count?: number;
}

export const MasonrySkeletonLoader = ({ count = 12 }: MasonrySkeletonProps) => {
  const heights = ['h-48', 'h-64', 'h-56', 'h-72', 'h-52', 'h-60'];
  
  return (
    <div className="masonry-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="masonry-item staggered-item">
          <EnhancedSkeletonLoader 
            className={cn("w-full rounded-lg", heights[index % heights.length])}
            variant="image"
          />
        </div>
      ))}
    </div>
  );
};