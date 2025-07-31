import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Eye, Square, CheckSquare, Heart, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

export const MasonryGallery: React.FC<MasonryGalleryProps> = ({
  images,
  galleryId,
  favoriteImageIds,
  onFavoriteChange,
  onImageView,
  isPublicGallery = false
}) => {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const { toast } = useToast();

  const getImageUrl = (imagePath: string) => {
    return `${supabase.storage.from("gallery-images").getPublicUrl(imagePath).data.publicUrl}`;
  };

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
              <img
                src={getImageUrl(image.thumbnail_path || image.full_path)}
                alt={image.original_filename}
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                style={{ 
                  aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : 'auto',
                }}
              />
              
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
              <FavoriteButton
                galleryId={galleryId}
                imageId={image.id}
                isFavorited={favoriteImageIds.has(image.id)}
                onFavoriteChange={onFavoriteChange}
                isPublicGallery={isPublicGallery}
              />
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
            <img
              src={getImageUrl(lightboxImage.full_path)}
              alt={lightboxImage.original_filename}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
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
                <FavoriteButton
                  galleryId={galleryId}
                  imageId={lightboxImage.id}
                  isFavorited={favoriteImageIds.has(lightboxImage.id)}
                  onFavoriteChange={onFavoriteChange}
                  isPublicGallery={isPublicGallery}
                />
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