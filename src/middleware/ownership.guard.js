// sajilo-backend/src/middleware/ownership.guard.js
// Ensures the authenticated user can only access their own data.
// Assumes req.user.id is set by authGuard, and req.params.id contains the target user ID.

module.exports = (req, res, next) => {
  const targetId = parseInt(req.params.id, 10);
  if (!targetId) {
    return res.status(400).json({ success: false, error: 'Invalid user ID' });
  }

  if (req.user.id !== targetId) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  next();
};