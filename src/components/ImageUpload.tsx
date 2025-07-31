import React, { useState, useCallback } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadProps {
  galleryId: string;
  sectionId?: string;
  onUploadComplete?: (images: UploadedImage[]) => void;
}

interface UploadedImage {
  id: string;
  filename: string;
  url: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export function ImageUpload({ galleryId, sectionId, onUploadComplete }: ImageUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFiles = async (files: File[]) => {
    // Check existing image count first
    const { count, error: countError } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', galleryId);

    if (countError) {
      toast({
        title: "Error",
        description: "Failed to check image count",
        variant: "destructive"
      });
      return;
    }

    const currentCount = count || 0;
    const maxImages = 5;
    const availableSlots = maxImages - currentCount;

    if (availableSlots <= 0) {
      toast({
        title: "Upload limit reached",
        description: `This gallery can only contain ${maxImages} images maximum`,
        variant: "destructive"
      });
      return;
    }

    if (files.length > availableSlots) {
      toast({
        title: "Too many files",
        description: `You can only upload ${availableSlots} more image(s) to this gallery`,
        variant: "destructive"
      });
      return;
    }

    const newUploads: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploads(prev => [...prev, ...newUploads]);

    const uploadedImages: UploadedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadIndex = uploads.length + i;

      try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${galleryId}/${fileName}`;

        // Update progress to processing
        setUploads(prev => prev.map((upload, index) => 
          index === uploadIndex 
            ? { ...upload, status: 'processing', progress: 50 }
            : upload
        ));

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('gallery-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('gallery-images')
          .getPublicUrl(filePath);

        // Create image record in database
        const { data: imageData, error: dbError } = await supabase
          .from('images')
          .insert({
            gallery_id: galleryId,
            section_id: sectionId || null,
            filename: fileName,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            full_path: filePath
          })
          .select()
          .single();

        if (dbError) throw dbError;

        uploadedImages.push({
          id: imageData.id,
          filename: imageData.original_filename,
          url: publicUrl
        });

        // Update progress to complete
        setUploads(prev => prev.map((upload, index) => 
          index === uploadIndex 
            ? { ...upload, status: 'complete', progress: 100 }
            : upload
        ));

      } catch (error) {
        console.error('Upload error:', error);
        setUploads(prev => prev.map((upload, index) => 
          index === uploadIndex 
            ? { 
                ...upload, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : upload
        ));

        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });
      }
    }

    if (uploadedImages.length > 0) {
      onUploadComplete?.(uploadedImages);
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${uploadedImages.length} image(s)`
      });
    }

    // Clear completed uploads after 3 seconds
    setTimeout(() => {
      setUploads(prev => prev.filter(upload => upload.status !== 'complete'));
    }, 3000);
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Images</h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop images here, or click to select files
          </p>
          <Button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = 'image/*';
              input.onchange = (e) => {
                const files = Array.from((e.target as HTMLInputElement).files || []);
                if (files.length > 0) {
                  handleFiles(files);
                }
              };
              input.click();
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Images
          </Button>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploads</h4>
          {uploads.map((upload, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">
                      {upload.file.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {upload.status === 'error' ? (
                    <p className="text-xs text-destructive">{upload.error}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      {upload.status === 'uploading' && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      <Progress value={upload.progress} className="flex-1" />
                      <span className="text-xs text-muted-foreground">
                        {upload.progress}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}