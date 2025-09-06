import { useState, useEffect } from 'react';
import { X, Download, Heart, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  thumbnailUrl?: string;
  alt: string;
  filename: string;
  onDownload?: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export const ImageLightbox = ({
  isOpen,
  onClose,
  imageUrl,
  thumbnailUrl,
  alt,
  filename,
  onDownload,
  onFavorite,
  isFavorited,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious
}: ImageLightboxProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showFullRes, setShowFullRes] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) onPrevious();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen, hasNext, hasPrevious, onNext, onPrevious, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsImageLoaded(false);
      setShowFullRes(false);
    }
  }, [isOpen, imageUrl]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
    // Auto-load full resolution after thumbnail loads
    setTimeout(() => setShowFullRes(true), 500);
  };

  const handleDownload = async () => {
    try {
      if (onDownload) {
        onDownload();
      } else {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Download started",
          description: `Downloading ${filename}`
        });
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Download failed",
        description: "Could not download the image",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none">
        <div className="relative w-full h-full flex flex-col">
          {/* Header with controls */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
            <div className="text-white truncate mr-4">
              <h3 className="font-medium">{filename}</h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              {onFavorite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFavorite}
                  className="text-white hover:bg-white/20"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation buttons */}
          {hasPrevious && onPrevious && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-black/70"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          {hasNext && onNext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-black/70"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}

          {/* Image container */}
          <div className="flex-1 flex items-center justify-center p-16 relative">
            {!isImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
            
            {/* Progressive loading: thumbnail first, then full resolution */}
            <div className="relative max-w-full max-h-full">
              {thumbnailUrl && !showFullRes && (
                <img
                  src={thumbnailUrl}
                  alt={alt}
                  className="max-w-full max-h-full object-contain blur-sm transition-all duration-300"
                  onLoad={handleImageLoad}
                />
              )}
              <img
                src={showFullRes ? imageUrl : (thumbnailUrl || imageUrl)}
                alt={alt}
                className={`max-w-full max-h-full object-contain transition-all duration-500 ${
                  showFullRes ? 'opacity-100' : 'opacity-0 absolute inset-0'
                }`}
                onLoad={() => {
                  if (!thumbnailUrl) handleImageLoad();
                  if (showFullRes) setIsImageLoaded(true);
                }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};