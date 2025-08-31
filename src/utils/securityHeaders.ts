// Security headers and CSP utilities

/**
 * Content Security Policy configuration
 */
export const getCSPHeader = (): string => {
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  const basePolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
    "frame-src 'self' https://accounts.google.com",
    "frame-ancestors 'self' https://*.lovableproject.com https://lovable.dev",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];

  if (isDevelopment) {
    // Allow localhost connections in development
    const devPolicy = basePolicy.map(policy => {
      if (policy.includes('connect-src')) {
        return policy + " http://localhost:* ws://localhost:*";
      }
      return policy;
    });
    return devPolicy.join('; ');
  }

  return basePolicy.join('; ');
};

/**
 * Set security headers for the application
 */
export const setSecurityHeaders = (): void => {
  // Add CSP meta tag if not already present
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = getCSPHeader();
    document.head.appendChild(cspMeta);
  }

  // Add other security headers via meta tags where possible
  // Note: X-Frame-Options removed to allow iframe embedding in Lovable
  const securityMetas = [
    { name: 'referrer', content: 'strict-origin-when-cross-origin' },
    { httpEquiv: 'X-Content-Type-Options', content: 'nosniff' },
    { httpEquiv: 'X-XSS-Protection', content: '1; mode=block' }
  ];

  securityMetas.forEach(meta => {
    const identifier = meta.name ? `name="${meta.name}"` : `http-equiv="${meta.httpEquiv}"`;
    if (!document.querySelector(`meta[${identifier}]`)) {
      const metaTag = document.createElement('meta');
      if (meta.name) metaTag.name = meta.name;
      if (meta.httpEquiv) metaTag.httpEquiv = meta.httpEquiv;
      metaTag.content = meta.content;
      document.head.appendChild(metaTag);
    }
  });
};

/**
 * Security event logger with sanitization
 */
export const logSecurityEvent = (eventType: string, details: Record<string, any> = {}): void => {
  // Only log in development or with sanitized data
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Security Event: ${eventType}`, {
      timestamp: new Date().toISOString(),
      details: sanitizeLogData(details)
    });
  }
};

/**
 * Sanitize log data to remove sensitive information
 */
const sanitizeLogData = (data: Record<string, any>): Record<string, any> => {
  const sanitized = { ...data };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'session', 'auth', 'key', 'secret', 'ip', 'email'];
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};