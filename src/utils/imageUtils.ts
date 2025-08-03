/**
 * Utility functions for handling different image formats
 */

/**
 * Check if a file is a DNG format that needs special handling
 * Note: HEIC files are converted during upload, so they won't need conversion here
 */
export const needsConversion = (filename: string): boolean => {
  const lowercaseFilename = filename.toLowerCase();
  return lowercaseFilename.endsWith('.dng');
};

/**
 * Get display URL for an image, handling unsupported formats
 */
export const getDisplayImageUrl = (imageUrl: string, filename: string): string => {
  // Only DNG files need placeholders now since HEIC is converted during upload
  if (filename.toLowerCase().endsWith('.dng')) {
    return '/placeholder.svg';
  }
  
  return imageUrl;
};

/**
 * Check if the browser can display this image format natively
 */
export const isSupportedFormat = (filename: string): boolean => {
  const lowercaseFilename = filename.toLowerCase();
  const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  
  // DNG files are definitely not supported
  if (lowercaseFilename.endsWith('.dng')) {
    return false;
  }
  
  // For HEIC files, let's be optimistic and try to display them
  // Modern browsers (Safari, Chrome) can often handle HEIC
  return supportedFormats.some(format => lowercaseFilename.endsWith(format)) || 
         lowercaseFilename.endsWith('.heic');
};

/**
 * Get a user-friendly format name
 */
export const getFormatName = (filename: string): string => {
  const lowercaseFilename = filename.toLowerCase();
  if (lowercaseFilename.endsWith('.heic')) return 'HEIC (Converted)';
  if (lowercaseFilename.endsWith('.dng')) return 'DNG (RAW)';
  if (lowercaseFilename.endsWith('.jpg') || lowercaseFilename.endsWith('.jpeg')) return 'JPEG';
  if (lowercaseFilename.endsWith('.png')) return 'PNG';
  if (lowercaseFilename.endsWith('.gif')) return 'GIF';
  if (lowercaseFilename.endsWith('.webp')) return 'WebP';
  return 'Image';
};