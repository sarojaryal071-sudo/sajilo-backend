// sajilo-backend/src/middleware/sanitizer.js
// Lightweight input sanitization and size protection.

const MAX_BODY_SIZE = 1_000_000; // 1 MB

/**
 * Recursively sanitize string values in an object or array.
 * Removes <script> tags, inline event handlers, and
 * javascript: URLs to prevent basic stored XSS.
 */
function deepSanitize(value) {
  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/ on\w+="[^"]*"/gi, '')          // inline event handlers
      .replace(/javascript:\s*/gi, '');          // javascript: URLs
  }
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      sanitized[key] = deepSanitize(value[key]);
    }
    return sanitized;
  }
  return value;
}

/**
 * Express middleware:
 * 1. Rejects requests with a body larger than MAX_BODY_SIZE.
 * 2. Recursively sanitizes req.body strings.
 */
function sanitizeRequest(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'], 10);
  if (!isNaN(contentLength) && contentLength > MAX_BODY_SIZE) {
    return res.status(413).json({ error: 'Request body too large' });
  }

  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }

  next();
}

module.exports = sanitizeRequest;