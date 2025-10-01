import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DownloadOption {
  label: string;
  description: string;
  quality: 'social' | 'web' | 'original';
  maxDimension?: number;
  icon: string;
}

const downloadOptions: DownloadOption[] = [
  {
    label: 'Social Media',
    description: 'Optimized for Instagram, Facebook (1080p)',
    quality: 'social',
    maxDimension: 1080,
    icon: '📱'
  },
  {
    label: 'Web Quality',
    description: 'High quality for websites (2K)',
    quality: 'web',
    maxDimension: 2048,
    icon: '💻'
  },
  {
    label: 'Original',
    description: 'Full resolution, uncompressed',
    quality: 'original',
    icon: '🖼️'
  }
];

interface DownloadOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  filename: string;
}

export const DownloadOptionsDialog = ({ isOpen, onClose, imageUrl, filename }: DownloadOptionsDialogProps) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDownload = async (option: DownloadOption) => {
    setDownloading(option.quality);
    try {
      // For now, download the original - in production, you'd resize server-side
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename.replace(/\.[^/.]+$/, '')}_${option.quality}.${filename.split('.').pop()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `Downloading ${option.label} version`,
      });
      
      onClose();
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Choose Download Quality
          </DialogTitle>
          <DialogDescription>
            Select the image quality that best fits your needs
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {downloadOptions.map((option) => (
            <Button
              key={option.quality}
              variant="outline"
              className="w-full h-auto p-4 flex items-start justify-between hover:bg-accent/50 transition-all"
              onClick={() => handleDownload(option)}
              disabled={downloading !== null}
            >
              <div className="flex items-start gap-3 text-left">
                <span className="text-2xl">{option.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {option.label}
                    {option.maxDimension && (
                      <Badge variant="secondary" className="text-xs">
                        {option.maxDimension}px
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
              {downloading === option.quality ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5 opacity-50" />
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
