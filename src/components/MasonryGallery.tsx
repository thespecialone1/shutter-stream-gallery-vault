import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Square, CheckSquare, Heart, X, ArrowLeft, ArrowRight, FileImage } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';
import AnonymousFavoriteButton from './AnonymousFavoriteButton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getDisplayImageUrl, isSupportedFormat, getFormatName } from '@/utils/imageUtils';

type GalleryImage = {
  id: string;
  filename: string;
  full_path: string;
  thumbnail_path: string | null;
  upload_date: string;
  width: number | null;
  height: number | null;
  original_filename: string;
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
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const getImageUrl = (imagePath: string) => {
    return `${supabase.storage.from("gallery-images").getPublicUrl(imagePath).data.publicUrl}`;
  };

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
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [handleImageLoad, loadedImages]);

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
      const imageUrl = getImageUrl(image.full_path);
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
                  <img
                    src={getImageUrl(image.thumbnail_path || image.full_path)}
                    alt={image.original_filename}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105 fade-in"
                    style={{ 
                      aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : 'auto',
                    }}
                    onError={(e) => {
                      // If HEIC fails to load, show fallback
                      if (image.filename.toLowerCase().endsWith('.heic')) {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full aspect-square bg-muted flex flex-col items-center justify-center p-6 min-h-[200px]">
                              <svg class="w-16 h-16 text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                              </svg>
                              <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground mb-2">HEIC</div>
                              <p class="text-sm text-muted-foreground text-center truncate max-w-full">${image.original_filename}</p>
                              <p class="text-xs text-muted-foreground mt-2">Preview not available</p>
                            </div>
                          `;
                        }
                      }
                    }}
                  />
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Premium Action Buttons */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(image);
                    }}
                    className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white text-primary border-0 shadow-lg hover:scale-110 transition-all duration-300"
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                  <Button
                    size="sm"
                    className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white text-primary border-0 shadow-lg hover:scale-110 transition-all duration-300"
                  >
                    <Eye className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Premium Favorite Button */}
            <div className={`favorite-btn ${favoriteImageIds.has(image.id) ? 'active' : ''}`}>
              {sessionToken ? (
                <AnonymousFavoriteButton
                  galleryId={galleryId}
                  imageId={image.id}
                  sessionToken={sessionToken}
                  isFavorited={favoriteImageIds.has(image.id)}
                  onFavoriteChange={onFavoriteChange}
                />
              ) : (
                <FavoriteButton
                  galleryId={galleryId}
                  imageId={image.id}
                  isFavorited={favoriteImageIds.has(image.id)}
                  onFavoriteChange={onFavoriteChange}
                  isPublicGallery={isPublicGallery}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Premium Lightbox */}
      {lightboxImage && (
        <div className="lightbox-overlay fade-in">
          <div className="relative max-w-7xl max-h-full flex items-center justify-center">
            {/* Navigation Arrows */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateLightbox('prev')}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-0"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateLightbox('next')}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-0"
            >
              <ArrowRight className="w-6 h-6" />
            </Button>

            {/* Main Image */}
            {isSupportedFormat(lightboxImage.filename) ? (
              <img
                src={getImageUrl(lightboxImage.full_path)}
                alt={lightboxImage.original_filename}
                className="max-w-[90vw] max-h-[80vh] w-auto h-auto object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="max-w-2xl bg-card rounded-lg p-12 text-center">
                <FileImage className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
                <Badge variant="secondary" className="mb-4 text-lg px-4 py-2">
                  {getFormatName(lightboxImage.filename)}
                </Badge>
                <h3 className="text-xl font-semibold mb-2">{lightboxImage.original_filename}</h3>
                <p className="text-muted-foreground mb-6">
                  This format cannot be previewed in the browser, but you can download the original file.
                </p>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(lightboxImage);
                  }}
                  className="btn-premium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Original File
                </Button>
              </div>
            )}
            
            {/* Control Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/20 backdrop-blur-md rounded-full px-6 py-3">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={closeLightbox}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <X className="w-5 h-5" />
              </Button>
              
              {/* Download Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(lightboxImage);
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <Download className="w-5 h-5" />
              </Button>
              
              {/* Favorite Button */}
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                {sessionToken ? (
                  <AnonymousFavoriteButton
                    galleryId={galleryId}
                    imageId={lightboxImage.id}
                    sessionToken={sessionToken}
                    isFavorited={favoriteImageIds.has(lightboxImage.id)}
                    onFavoriteChange={onFavoriteChange}
                  />
                ) : (
                  <FavoriteButton
                    galleryId={galleryId}
                    imageId={lightboxImage.id}
                    isFavorited={favoriteImageIds.has(lightboxImage.id)}
                    onFavoriteChange={onFavoriteChange}
                    isPublicGallery={isPublicGallery}
                  />
                )}
              </div>

              {/* Image Counter */}
              <div className="px-4 py-2 bg-white/10 rounded-full">
                <span className="text-white text-sm font-medium">
                  {lightboxIndex + 1} of {images.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};