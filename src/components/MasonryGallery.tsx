import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Eye, Square, CheckSquare } from 'lucide-react';
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
}

export const MasonryGallery: React.FC<MasonryGalleryProps> = ({
  images,
  galleryId,
  favoriteImageIds,
  onFavoriteChange,
  onImageView
}) => {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
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

    // Download each image individually (in a real app, you'd want to create a zip file)
    for (const image of selectedImageData) {
      await downloadImage(image);
      // Add a small delay to prevent overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const openLightbox = (image: GalleryImage) => {
    setLightboxImage(image);
    onImageView(image.id);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const getRandomHeight = (index: number) => {
    // Create variety in heights for masonry effect
    const heights = [250, 300, 350, 400, 280, 320, 380];
    return heights[index % heights.length];
  };

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (!isSelectionMode) {
                clearSelection();
              }
            }}
            className="flex items-center gap-2"
          >
            {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {isSelectionMode ? "Exit Selection" : "Select Images"}
          </Button>
          
          {isSelectionMode && (
            <>
              <Button variant="ghost" onClick={selectAllImages}>
                Select All ({images.length})
              </Button>
              <Button variant="ghost" onClick={clearSelection}>
                Clear Selection
              </Button>
            </>
          )}
        </div>

        {selectedImages.size > 0 && (
          <Button onClick={downloadSelectedImages} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Selected ({selectedImages.size})
          </Button>
        )}
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="group relative break-inside-avoid mb-3 overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-300"
          >
            {/* Selection Checkbox */}
            {isSelectionMode && (
              <div className="absolute top-3 left-3 z-10">
                <Checkbox
                  checked={selectedImages.has(image.id)}
                  onCheckedChange={() => toggleImageSelection(image.id)}
                  className="bg-white shadow-md"
                />
              </div>
            )}

            {/* Image */}
            <div 
              className="relative cursor-pointer"
              onClick={() => openLightbox(image)}
              style={{ height: `${getRandomHeight(index)}px` }}
            >
              <img
                src={getImageUrl(image.thumbnail_path || image.full_path)}
                alt={image.original_filename}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(image);
                    }}
                    className="bg-white/90 hover:bg-white text-black"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white text-black"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Favorite Button */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <FavoriteButton
                galleryId={galleryId}
                imageId={image.id}
                isFavorited={favoriteImageIds.has(image.id)}
                onFavoriteChange={onFavoriteChange}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={getImageUrl(lightboxImage.full_path)}
              alt={lightboxImage.original_filename}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:bg-white/20"
            >
              ✕
            </Button>
            
            {/* Download Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                downloadImage(lightboxImage);
              }}
              className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-black"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            
            {/* Favorite Button */}
            <div className="absolute bottom-4 left-4">
              <FavoriteButton
                galleryId={galleryId}
                imageId={lightboxImage.id}
                isFavorited={favoriteImageIds.has(lightboxImage.id)}
                onFavoriteChange={onFavoriteChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};