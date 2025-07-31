import { Skeleton } from "@/components/ui/skeleton";

export const ImageGridSkeleton = () => {
  return (
    <div className="masonry-grid">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="masonry-item">
          <Skeleton className="w-full h-48 rounded-lg" />
        </div>
      ))}
    </div>
  );
};

export const SectionTabsSkeleton = () => {
  return (
    <div className="section-nav">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const FavoritesViewSkeleton = () => {
  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="masonry-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="masonry-item">
            <Skeleton className="w-full h-40 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
};