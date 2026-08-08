// Frontend input sanitization utilities

// Sanitize string input to prevent XSS
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
}

// Sanitize HTML content (allow safe tags only)
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return '';
  
  // Define allowed HTML tags
  const allowedTags = ['b', 'i', 'u', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em'];
  
  // Remove all tags except allowed ones
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .slice(0, 10000); // Limit length
}

// Escape HTML entities
export function escapeHtml(html: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;',
  };
  
  return html.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

// Validate and sanitize email
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

// Validate and sanitize URL
export function sanitizeUrl(url: string): string {
  const sanitized = sanitizeString(url);
  try {
    const parsed = new URL(sanitized);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return sanitized;
    }
  } catch {
    // Invalid URL
  }
  return '';
}

// Sanitize form data object
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeFormData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}