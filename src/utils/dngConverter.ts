// DNG to JPEG converter - Option A: Keep original DNG, generate JPEG preview
// Fallback to Option B: Convert to JPEG only if preview fails

export interface DNGConversionResult {
  previewBlob: Blob;
  previewFilename: string;
  keepOriginal: boolean;
}

export class DNGConverter {
  private static instance: DNGConverter;
  
  static getInstance(): DNGConverter {
    if (!DNGConverter.instance) {
      DNGConverter.instance = new DNGConverter();
    }
    return DNGConverter.instance;
  }

  /**
   * Convert DNG to JPEG for preview/thumbnail while keeping original
   * Returns the JPEG blob for preview and whether to keep the original
   */
  async convertDNGToJPEG(file: File): Promise<{ blob: Blob; filename: string }> {
    const jpegFilename = file.name.replace(/\.dng$/i, '.jpg');
    
    // Try browser-native approach first (some browsers can render DNG)
    try {
      const blob = await this.tryBrowserConversion(file);
      if (blob && blob.size > 10000) { // Must be > 10KB to be a real image
        console.log('DNG converted via browser:', jpegFilename, 'size:', blob.size);
        return { blob, filename: jpegFilename };
      }
    } catch (e) {
      console.warn('Browser DNG conversion failed:', e);
    }

    // Try canvas extraction from embedded JPEG preview
    try {
      const blob = await this.tryExtractEmbeddedPreview(file);
      if (blob && blob.size > 10000) {
        console.log('DNG preview extracted:', jpegFilename, 'size:', blob.size);
        return { blob, filename: jpegFilename };
      }
    } catch (e) {
      console.warn('Embedded preview extraction failed:', e);
    }

    // Fallback: Return a proper error so caller knows conversion failed
    // This prevents creating tiny placeholder images
    throw new Error('DNG conversion not supported in browser. Original file will be uploaded.');
  }

  /**
   * Try to convert DNG using browser's native image handling
   */
  private async tryBrowserConversion(file: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        
        // Check if image actually loaded with dimensions
        if (img.naturalWidth < 100 || img.naturalHeight < 100) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }
        
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          resolve(blob);
        }, 'image/jpeg', 0.92);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      
      img.src = objectUrl;
    });
  }

  /**
   * Try to extract embedded JPEG preview from DNG file
   * DNG files typically contain a full-size JPEG preview
   */
  private async tryExtractEmbeddedPreview(file: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          resolve(null);
          return;
        }

        const bytes = new Uint8Array(arrayBuffer);
        
        // Look for JPEG markers (FFD8 start, FFD9 end)
        let jpegStart = -1;
        let jpegEnd = -1;
        
        for (let i = 0; i < bytes.length - 1; i++) {
          // Find JPEG start marker
          if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8) {
            jpegStart = i;
          }
          // Find JPEG end marker (after finding start)
          if (jpegStart >= 0 && bytes[i] === 0xFF && bytes[i + 1] === 0xD9) {
            jpegEnd = i + 2;
            break;
          }
        }
        
        if (jpegStart >= 0 && jpegEnd > jpegStart) {
          const jpegBytes = bytes.slice(jpegStart, jpegEnd);
          const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
          
          // Validate it's a real JPEG by checking size
          if (blob.size > 50000) { // At least 50KB for a decent preview
            resolve(blob);
            return;
          }
        }
        
        resolve(null);
      };
      
      reader.onerror = () => resolve(null);
      
      // Only read first 10MB to find preview
      const slice = file.slice(0, Math.min(file.size, 10 * 1024 * 1024));
      reader.readAsArrayBuffer(slice);
    });
  }

  isDNGFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.dng') || file.type === 'image/x-adobe-dng';
  }
}

export const dngConverter = DNGConverter.getInstance();
