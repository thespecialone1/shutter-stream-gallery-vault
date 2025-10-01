import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Square, CheckSquare, Heart, X, ArrowLeft, ArrowRight, FileImage } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getDisplayImageUrl, isSupportedFormat, getFormatName } from '@/utils/imageUtils';
import { EnhancedImageLightbox } from './EnhancedImageLightbox';
import { DownloadOptionsDialog } from './DownloadOptionsDialog';

type GalleryImage = {
  id: string;
  filename: string;
  full_path: string;
  thumbnail_path: string | null;
  upload_date: string;
  width: number | null;
  height: number | null;
  original_filename: string;
  signed_thumbnail_url?: string | null;
  signed_full_url?: string | null;
};

interface MasonryGalleryProps {
  images: GalleryImage[];
  galleryId: string;
  favoriteImageIds: Set<string>;
  onFavoriteChange: (imageId: string, isFavorited: boolean) => void;
  onImageView: (imageId: string) => void;
  isPublicGallery?: boolean;
  sessionToken?: string | null;
}

export const MasonryGallery: React.FC<MasonryGalleryProps> = ({
  images,
  galleryId,
  favoriteImageIds,
  onFavoriteChange,
  onImageView,
  isPublicGallery = false,
  sessionToken
}) => {
  const { user } = useAuth();
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const { toast } = useToast();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [heicFallback, setHeicFallback] = useState<Set<string>>(new Set());

const publicUrl = (path: string) => `${supabase.storage.from('gallery-images').getPublicUrl(path).data.publicUrl}`;
  const getThumbUrl = (image: GalleryImage) => image.signed_thumbnail_url || (image.thumbnail_path ? publicUrl(image.thumbnail_path) : publicUrl(image.full_path));
  const getFullUrl = (image: GalleryImage) => image.signed_full_url || publicUrl(image.full_path);

  // Intersection Observer callback for lazy loading
  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages(prev => new Set([...prev, imageId]));
  }, []);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imageId = entry.target.getAttribute('data-image-id');
            if (imageId && !loadedImages.has(imageId)) {
              handleImageLoad(imageId);
              observerRef.current?.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: '200px', // More aggressive - start loading 200px before image comes into view
        threshold: 0.01 // Very low threshold for faster triggering
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [handleImageLoad, loadedImages]);

  // Preload first few images immediately for better initial experience
  useEffect(() => {
    const firstImages = images.slice(0, 6); // Load first 6 images immediately
    firstImages.forEach(image => {
      if (!loadedImages.has(image.id)) {
        handleImageLoad(image.id);
      }
    });
  }, [images, handleImageLoad, loadedImages]);

  // Ref callback for image container observation
  const imageContainerRef = useCallback((node: HTMLDivElement | null, imageId: string) => {
    if (node && observerRef.current && !loadedImages.has(imageId)) {
      node.setAttribute('data-image-id', imageId);
      observerRef.current.observe(node);
    }
  }, [loadedImages]);

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const selectAllImages = () => {
    setSelectedImages(new Set(images.map(img => img.id)));
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
  };

  const downloadImage = async (image: GalleryImage) => {
    try {
      const imageUrl = getFullUrl(image);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.original_filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `Downloading ${image.original_filename}`,
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Download failed",
        description: "Failed to download image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadSelectedImages = async () => {
    if (selectedImages.size === 0) return;

    const selectedImageData = images.filter(img => selectedImages.has(img.id));
    
    toast({
      title: "Download started",
      description: `Downloading ${selectedImages.size} image${selectedImages.size > 1 ? 's' : ''}`,
    });

    // Download each image individually
    for (const image of selectedImageData) {
      await downloadImage(image);
      // Add a small delay to prevent overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const openLightbox = (image: GalleryImage, index: number) => {
    setLightboxImage(image);
    setLightboxIndex(index);
    onImageView(image.id);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? (lightboxIndex + 1) % images.length
      : (lightboxIndex - 1 + images.length) % images.length;
    
    setLightboxIndex(newIndex);
    setLightboxImage(images[newIndex]);
    onImageView(images[newIndex].id);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (!lightboxImage) return;
    
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      navigateLightbox('prev');
    } else if (e.key === 'ArrowRight') {
      navigateLightbox('next');
    }
  };

  useEffect(() => {
    if (lightboxImage) {
      document.addEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [lightboxImage, lightboxIndex]);

  return (
    <div className="space-y-6">
      {/* Premium Selection Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4 px-4">
        <div className="flex items-center gap-4">
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (!isSelectionMode) {
                clearSelection();
              }
            }}
            className={`transition-all duration-300 ${
              isSelectionMode 
                ? "btn-premium" 
                : "btn-premium-outline"
            }`}
          >
            {isSelectionMode ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
            {isSelectionMode ? "Exit Selection" : "Select Images"}
          </Button>
          
          {isSelectionMode && (
            <>
              <Button variant="ghost" onClick={selectAllImages} className="text-muted-foreground hover:text-foreground">
                Select All ({images.length})
              </Button>
              <Button variant="ghost" onClick={clearSelection} className="text-muted-foreground hover:text-foreground">
                Clear Selection
              </Button>
            </>
          )}
        </div>

        {selectedImages.size > 0 && (
          <Button onClick={downloadSelectedImages} className="btn-premium">
            <Download className="w-4 h-4 mr-2" />
            Download Selected ({selectedImages.size})
          </Button>
        )}
      </div>

      {/* Premium Masonry Grid */}
      <div className="masonry-grid px-2">
        {images.map((image, index) => (
          <div
            key={image.id}
            ref={(node) => imageContainerRef(node, image.id)}
            className="masonry-item group relative overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-lg transition-all duration-500"
          >
            {/* Selection Checkbox */}
            {isSelectionMode && (
              <div className="absolute top-3 left-3 z-20">
                <div className="w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <Checkbox
                    checked={selectedImages.has(image.id)}
                    onCheckedChange={() => toggleImageSelection(image.id)}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            )}

            {/* Premium Image Container */}
            <div 
              className="relative cursor-pointer image-hover-effect"
              onClick={() => openLightbox(image, index)}
            >
              {loadedImages.has(image.id) ? (
                isSupportedFormat(image.filename) ? (
                  heicFallback.has(image.id) ? (
                    <div className="w-full aspect-square bg-muted flex flex-col items-center justify-center p-6 min-h-[200px] fade-in">
                      <FileImage className="w-16 h-16 text-muted-foreground mb-3" />
                      <Badge variant="secondary" className="mb-2">HEIC</Badge>
                      <p className="text-sm text-muted-foreground text-center truncate max-w-full">
                        {image.original_filename}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Preview not available</p>
                    </div>
                  ) : (
                    <img
                      src={getThumbUrl(image)}
                      alt={image.original_filename}
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105 fade-in"
                      style={{ 
                        aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : 'auto',
                      }}
                      onError={() => {
                        if (image.filename.toLowerCase().endsWith('.heic')) {
                          setHeicFallback(prev => new Set(prev).add(image.id));
                        }
                      }}
                    />
                  )
                ) : (
                  <div className="w-full aspect-square bg-muted flex flex-col items-center justify-center p-6 min-h-[200px] fade-in">
                    <FileImage className="w-16 h-16 text-muted-foreground mb-3" />
                    <Badge variant="secondary" className="mb-2">
                      {getFormatName(image.filename)}
                    </Badge>
                    <p className="text-sm text-muted-foreground text-center truncate max-w-full">
                      {image.original_filename}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Preview not available
                    </p>
                  </div>
                )
              ) : (
                // Skeleton/placeholder while loading
                <div 
                  className="w-full loading-skeleton flex items-center justify-center"
                  style={{ 
                    aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : '1',
                    minHeight: '200px'
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-muted-foreground/30" />
                </div>
              )}
              
              {/* Premium Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              {/* Premium Action Buttons - Fixed at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                <div className="flex gap-2 justify-center pointer-events-auto">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(image);
                    }}
                    className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white text-black border-0 shadow-lg hover:scale-110 transition-all duration-200 flex items-center justify-center"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white text-black border-0 shadow-lg hover:scale-110 transition-all duration-200 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox(image, index);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Premium Favorite Button */}
            <div className={`favorite-btn ${favoriteImageIds.has(image.id) ? 'active' : ''}`}>
              <FavoriteButton
                galleryId={galleryId}
                imageId={image.id}
                user={user}
                isFavorited={favoriteImageIds.has(image.id)}
                onFavoriteChange={onFavoriteChange}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Lightbox with Progressive Loading */}
      {lightboxImage && (
        <EnhancedImageLightbox
          isOpen={!!lightboxImage}
          onClose={closeLightbox}
          thumbnailUrl={getThumbUrl(lightboxImage)}
          fullUrl={getFullUrl(lightboxImage)}
          alt={lightboxImage.original_filename}
          filename={lightboxImage.original_filename}
          onNext={lightboxIndex < images.length - 1 ? () => navigateLightbox('next') : undefined}
          onPrevious={lightboxIndex > 0 ? () => navigateLightbox('prev') : undefined}
          onFavorite={() => {
            const newFavorited = !favoriteImageIds.has(lightboxImage.id);
            onFavoriteChange(lightboxImage.id, newFavorited);
          }}
          isFavorited={favoriteImageIds.has(lightboxImage.id)}
          hasNext={lightboxIndex < images.length - 1}
          hasPrevious={lightboxIndex > 0}
        />
      )}

      {/* Download Options Dialog */}
      <DownloadOptionsDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        imageUrl={lightboxImage ? getFullUrl(lightboxImage) : ''}
        filename={lightboxImage?.original_filename || ''}
      />
    </div>
  );
};