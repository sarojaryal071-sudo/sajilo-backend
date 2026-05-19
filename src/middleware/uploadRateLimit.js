// sajilo-backend/src/middleware/uploadRateLimit.js
// Simple in‑memory rate limiter: max 10 uploads per minute per user.

const userUploads = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_UPLOADS = 10;

module.exports = function uploadRateLimit(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next(); // pass through if no user (shouldn't happen with authGuard)

  const now = Date.now();
  const record = userUploads.get(userId);

  if (record) {
    // Clear old entries
    record.timestamps = record.timestamps.filter(t => now - t < WINDOW_MS);
    if (record.timestamps.length >= MAX_UPLOADS) {
      return res.status(429).json({
        success: false,
        error: 'Upload limit exceeded. Please try again later.',
      });
    }
    record.timestamps.push(now);
  } else {
    userUploads.set(userId, { timestamps: [now] });
  }

  next();
};