// sajilo-backend/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Pre‑built limiters for different use cases
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login/register attempts per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 booking creations per minute per IP
  message: { error: 'Too many bookings, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // max 20 chat messages per minute per IP
  message: { error: 'Message rate exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  bookingLimiter,
  messageLimiter,
};