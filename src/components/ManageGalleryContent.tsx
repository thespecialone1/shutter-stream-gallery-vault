import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Edit, Plus, Image, Eye, Download } from 'lucide-react';
import { DeleteGalleryDialog } from './DeleteGalleryDialog';
import { EnhancedImageLightbox } from './EnhancedImageLightbox';
import { DownloadOptionsDialog } from './DownloadOptionsDialog';
import { EnhancedSkeletonLoader, MasonrySkeletonLoader } from './EnhancedSkeletonLoader';
import { useImageCache } from '@/hooks/useImageCache';
import { useAuth } from '@/hooks/useAuth';

interface Gallery {
  id: string;
  name: string;
  description: string;
  client_name: string;
  created_at: string;
  updated_at?: string;
  view_count?: number;
  photographer_id?: string;
  is_public?: boolean;
}

interface GalleryImage {
  id: string;
  filename: string;
  full_path: string;
  thumbnail_path: string | null;
  upload_date: string;
  file_size: number;
}

interface ManageGalleryContentProps {
  gallery: Gallery;
  onGalleryDeleted: (galleryId: string) => void;
  onGalleryUpdated: (gallery: Gallery) => void;
}

export function ManageGalleryContent({ gallery, onGalleryDeleted, onGalleryUpdated }: ManageGalleryContentProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: gallery.name,
    description: gallery.description || '',
    client_name: gallery.client_name
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { preloadImage, preloadMultiple, getCachedUrl } = useImageCache();

  useEffect(() => {
    loadImages();
  }, [gallery.id]);

  // Preload images for performance
  useEffect(() => {
    if (images.length > 0) {
      // Preload first 10 thumbnails and full images immediately
      const firstBatch = images.slice(0, 10);
      const thumbnailUrls = firstBatch.map(img => 
        img.thumbnail_path ? getImageUrl(img.thumbnail_path) : getImageUrl(img.full_path)
      );
      const fullUrls = firstBatch.map(img => getImageUrl(img.full_path));
      
      preloadMultiple([...thumbnailUrls, ...fullUrls]);

      // Preload remaining images in background
      if (images.length > 10) {
        setTimeout(() => {
          const remainingImages = images.slice(10);
          const remainingUrls = remainingImages.flatMap(img => [
            img.thumbnail_path ? getImageUrl(img.thumbnail_path) : getImageUrl(img.full_path),
            getImageUrl(img.full_path)
          ]);
          preloadMultiple(remainingUrls);
        }, 2000);
      }
    }
  }, [images, preloadMultiple]);

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('gallery_id', gallery.id)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
      toast({
        title: "Error",
        description: "Failed to load images",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('galleries')
        .update({
          name: editForm.name,
          description: editForm.description,
          client_name: editForm.client_name
        })
        .eq('id', gallery.id)
        .select('id, name, description, client_name, created_at, updated_at, view_count, is_public, photographer_id')
        .single();

      if (error) throw error;

      onGalleryUpdated(data);
      setIsEditing(false);
      toast({
        title: "Gallery updated",
        description: "Gallery information has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating gallery:', error);
      toast({
        title: "Error",
        description: "Failed to update gallery",
        variant: "destructive"
      });
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      // Find the image to get its file path
      const imageToDelete = images.find(img => img.id === imageId);
      if (!imageToDelete) {
        throw new Error('Image not found');
      }

      // Delete from database first
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('gallery-images')
        .remove([imageToDelete.full_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Don't throw here as the database record is already deleted
      }

      setImages(prev => prev.filter(img => img.id !== imageId));
      toast({
        title: "Image deleted",
        description: "Image has been removed from the gallery and storage"
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getImageUrl = (imagePath: string) => {
    return `${supabase.storage.from("gallery-images").getPublicUrl(imagePath).data.publicUrl}`;
  };

  const openLightbox = (image: GalleryImage) => {
    setLightboxImage(image);
    setCurrentImageIndex(images.findIndex(img => img.id === image.id));
  };

  const navigateImage = (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' 
      ? (currentImageIndex + 1) % images.length
      : (currentImageIndex - 1 + images.length) % images.length;
    
    setCurrentImageIndex(newIndex);
    setLightboxImage(images[newIndex]);
  };

  const downloadImage = async (image: GalleryImage) => {
    try {
      const imageUrl = getImageUrl(image.full_path);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.filename;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `Downloading ${image.filename}`
      });
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gallery Information</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              <DeleteGalleryDialog
                gallery={gallery}
                onDelete={onGalleryDeleted}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Gallery Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={editForm.client_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, client_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateGallery}>Save Changes</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <strong>Name:</strong> {gallery.name}
              </div>
              <div>
                <strong>Client:</strong> {gallery.client_name}
              </div>
              <div>
                <strong>Description:</strong> {gallery.description || 'No description'}
              </div>
              <div>
                <strong>Created:</strong> {new Date(gallery.created_at).toLocaleDateString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Images ({images.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <MasonrySkeletonLoader count={6} />
          ) : images.length === 0 ? (
            <div className="text-center py-8">
              <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No images uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="group relative">
                  <div 
                    className="aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer"
                    onClick={() => openLightbox(image)}
                  >
                    <img
                      src={getCachedUrl(getImageUrl(image.thumbnail_path || image.full_path))}
                      alt={image.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Image failed to load:', image.full_path);
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  
                  {/* Fixed positioned overlay with actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-lg pointer-events-none">
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 pointer-events-auto z-10">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLightbox(image);
                        }}
                        className="w-10 h-10 rounded-full bg-white/95 hover:bg-white text-black backdrop-blur-sm border-0 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(image);
                        }}
                        className="w-10 h-10 rounded-full bg-white/95 hover:bg-white text-black backdrop-blur-sm border-0 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                        className="w-10 h-10 rounded-full bg-red-500/95 hover:bg-red-500 text-white backdrop-blur-sm border-0 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="truncate">{image.filename}</p>
                    <p>{formatFileSize(image.file_size)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Image Lightbox */}
      {lightboxImage && (
        <>
          <EnhancedImageLightbox
            isOpen={!!lightboxImage}
            onClose={() => setLightboxImage(null)}
            thumbnailUrl={getCachedUrl(getImageUrl(lightboxImage.thumbnail_path || lightboxImage.full_path))}
            fullUrl={getCachedUrl(getImageUrl(lightboxImage.full_path))}
            alt={lightboxImage.filename}
            filename={lightboxImage.filename}
            onNext={currentImageIndex < images.length - 1 ? () => navigateImage('next') : undefined}
            onPrevious={currentImageIndex > 0 ? () => navigateImage('prev') : undefined}
            hasNext={currentImageIndex < images.length - 1}
            hasPrevious={currentImageIndex > 0}
          />
          
          <DownloadOptionsDialog
            isOpen={showDownloadDialog}
            onClose={() => setShowDownloadDialog(false)}
            imageUrl={getCachedUrl(getImageUrl(lightboxImage.full_path))}
            filename={lightboxImage.filename}
          />
        </>
      )}
    </div>
  );
}
