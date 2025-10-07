import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DownloadOption {
  label: string;
  description: string;
  quality: 'original';
}

const downloadOptions: DownloadOption[] = [
  {
    label: 'High Quality',
    description: 'Full resolution, original quality',
    quality: 'original'
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
            Download Image
          </DialogTitle>
          <DialogDescription>
            Download the image in high quality
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {downloadOptions.map((option) => (
            <Button
              key={option.quality}
              variant="outline"
              className="w-full h-auto p-4 flex items-center justify-between hover:bg-accent transition-all"
              onClick={() => handleDownload(option)}
              disabled={downloading !== null}
            >
              <div className="flex items-center gap-3 text-left">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-semibold">
                    {option.label}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
              {downloading === option.quality ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
