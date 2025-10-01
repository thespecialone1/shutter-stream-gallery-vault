import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft, ArrowRight, Download, Heart, Sparkles, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { DownloadOptionsDialog } from './DownloadOptionsDialog';

interface EnhancedImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  thumbnailUrl: string;
  fullUrl: string;
  alt: string;
  filename: string;
  onNext?: () => void;
  onPrevious?: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export const EnhancedImageLightbox: React.FC<EnhancedImageLightboxProps> = ({
  isOpen,
  onClose,
  thumbnailUrl,
  fullUrl,
  alt,
  filename,
  onNext,
  onPrevious,
  onFavorite,
  isFavorited = false,
  hasNext = false,
  hasPrevious = false,
}) => {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const { src, isLoading, isFullQuality, enhanceQuality } = useProgressiveImage({
    thumbnailUrl,
    fullUrl,
    enabled: isOpen,
  });

  useKeyboardNavigation({
    enabled: isOpen && !showDownloadDialog,
    onNext: hasNext ? onNext : undefined,
    onPrevious: hasPrevious ? onPrevious : undefined,
    onClose,
    onEnhance: !isFullQuality ? enhanceQuality : undefined,
  });

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white font-medium truncate max-w-md">{filename}</span>
                {!isFullQuality && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-200 border-yellow-500/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Compressed
                  </Badge>
                )}
                {isFullQuality && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-200 border-green-500/30">
                    Full Quality
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation Arrows */}
          {hasPrevious && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-0"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          )}
          
          {hasNext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-0"
            >
              <ArrowRight className="w-6 h-6" />
            </Button>
          )}

          {/* Main Image */}
          <div className="flex items-center justify-center min-h-[80vh] p-16">
            <div className="relative">
              <img
                src={src}
                alt={alt}
                className={`max-w-[85vw] max-h-[75vh] w-auto h-auto object-contain rounded-lg transition-all duration-500 ${
                  isLoading ? 'blur-sm' : 'blur-0'
                }`}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-full px-6 py-3 border border-white/10">
              {/* Enhance Quality Button */}
              {!isFullQuality && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={enhanceQuality}
                  disabled={isLoading}
                  className="text-white hover:bg-white/20 gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Enhance (E)
                </Button>
              )}
              
              {/* Download Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDownloadDialog(true)}
                className="text-white hover:bg-white/20"
              >
                <Download className="w-5 h-5" />
              </Button>
              
              {/* Favorite Button */}
              {onFavorite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFavorite}
                  className={`text-white hover:bg-white/20 ${isFavorited ? 'text-red-500' : ''}`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                </Button>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center">
            <p>Arrow keys to navigate • E to enhance • Esc to close</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Options Dialog */}
      <DownloadOptionsDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        imageUrl={fullUrl}
        filename={filename}
      />
    </>
  );
};
