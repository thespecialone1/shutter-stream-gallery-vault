// Security utilities for input validation and sanitization
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

/**
 * Validate and sanitize text input
 */
export function sanitizeText(input: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove any HTML tags and scripts
  const cleaned = sanitizeHtml(input);
  
  // Trim whitespace and limit length
  return cleaned.trim().substring(0, maxLength);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate and sanitize gallery name
 */
export function validateGalleryName(name: string): { valid: boolean; sanitized: string; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, sanitized: '', error: 'Gallery name is required' };
  }
  
  const sanitized = sanitizeText(name, 100);
  
  if (sanitized.length < 2) {
    return { valid: false, sanitized, error: 'Gallery name must be at least 2 characters' };
  }
  
  if (sanitized.length > 100) {
    return { valid: false, sanitized, error: 'Gallery name must be less than 100 characters' };
  }
  
  // Check for suspicious patterns
  if (/[<>'"&]/.test(sanitized)) {
    return { valid: false, sanitized, error: 'Gallery name contains invalid characters' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize client name
 */
export function validateClientName(name: string): { valid: boolean; sanitized: string; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, sanitized: '', error: 'Client name is required' };
  }
  
  const sanitized = sanitizeText(name, 100);
  
  if (sanitized.length < 2) {
    return { valid: false, sanitized, error: 'Client name must be at least 2 characters' };
  }
  
  // Allow letters, numbers, spaces, and common punctuation for names
  if (!/^[a-zA-Z0-9\s\-&'.]+$/.test(sanitized)) {
    return { valid: false, sanitized, error: 'Client name contains invalid characters' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize description
 */
export function validateDescription(description: string): { valid: boolean; sanitized: string; error?: string } {
  if (!description || typeof description !== 'string') {
    return { valid: true, sanitized: '' }; // Description is optional
  }
  
  const sanitized = sanitizeText(description, 500);
  
  if (sanitized.length > 500) {
    return { valid: false, sanitized, error: 'Description must be less than 500 characters' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Rate limiting helper for client-side
 */
export class ClientRateLimit {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  checkLimit(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= maxAttempts) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  getRemainingTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    
    const remaining = record.resetTime - Date.now();
    return Math.max(0, remaining);
  }
}

// Global rate limiter instance
export const globalRateLimit = new ClientRateLimit();

/**
 * Validate file upload security
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only image files are allowed (JPEG, PNG, WebP, HEIC)' };
  }
  
  // Check file size (50MB max)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 50MB' };
  }
  
  // Check filename for suspicious patterns
  if (/[<>:"/\\|?*]/.test(file.name)) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Generate secure session token
 */
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if running in secure context
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
}