/**
 * Utility functions for handling different image formats
 */

/**
 * Check if a file is a HEIC/DNG format that needs conversion
 */
export const needsConversion = (filename: string): boolean => {
  const lowercaseFilename = filename.toLowerCase();
  return lowercaseFilename.endsWith('.heic') || lowercaseFilename.endsWith('.dng');
};

/**
 * Get display URL for an image, handling HEIC/DNG formats
 */
export const getDisplayImageUrl = (imageUrl: string, filename: string): string => {
  // For HEIC/DNG files, we'll show a placeholder since browsers can't display them natively
  if (needsConversion(filename)) {
    // Return a placeholder or try to convert if we have conversion service
    return '/placeholder.svg'; // Use the existing placeholder
  }
  
  return imageUrl;
};

/**
 * Check if the browser can display this image format natively
 */
export const isSupportedFormat = (filename: string): boolean => {
  const lowercaseFilename = filename.toLowerCase();
  const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return supportedFormats.some(format => lowercaseFilename.endsWith(format));
};

/**
 * Get a user-friendly format name
 */
export const getFormatName = (filename: string): string => {
  const lowercaseFilename = filename.toLowerCase();
  if (lowercaseFilename.endsWith('.heic')) return 'HEIC';
  if (lowercaseFilename.endsWith('.dng')) return 'DNG (RAW)';
  if (lowercaseFilename.endsWith('.jpg') || lowercaseFilename.endsWith('.jpeg')) return 'JPEG';
  if (lowercaseFilename.endsWith('.png')) return 'PNG';
  if (lowercaseFilename.endsWith('.gif')) return 'GIF';
  if (lowercaseFilename.endsWith('.webp')) return 'WebP';
  return 'Image';
};