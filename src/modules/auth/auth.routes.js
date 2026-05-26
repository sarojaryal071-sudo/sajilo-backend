const express = require('express')
const router = express.Router()
const authController = require('./auth.controller')
const authGuard = require('../../middleware/auth.guard')
const { authLimiter } = require('../../middleware/rateLimiter')
const sanitizeRequest = require('../../middleware/sanitizer')
const { pool } = require('../../config/database')

// Apply sanitizer to all auth routes, then rate limiter, then handler
router.post('/register', sanitizeRequest, authLimiter, authController.register)
router.post('/login', sanitizeRequest, authLimiter, authController.login)
router.post('/worker/apply', authGuard, sanitizeRequest, authController.submitWorkerApplication)
router.post('/change-password', authGuard, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Invalid password' });
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(password, 10);
  await pool.query(`UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2`, [hash, req.user.id]);

  // Audit password change (safe)
  try {
    const { logAuditEvent } = require('../../services/audit.service');
    const userRes = await pool.query('SELECT client_id FROM users WHERE id = $1', [req.user.id]);
    const clientId = userRes.rows[0]?.client_id || `user ${req.user.id}`;
    await logAuditEvent({
      req,
      actorId: req.user.id,
      action: 'auth.password_changed',
      entityType: 'user',
      entityId: req.user.id,
      entityDisplay: clientId,
      summary: `Password changed for ${clientId}`,
      severity: 'medium',
      category: 'security',
      outcome: 'success',
      reason: req.user.must_change_password ? 'Force password reset completed' : 'Voluntary password change',
      contextSnapshot: { must_change_password: req.user.must_change_password },
    });
  } catch (auditErr) {
    console.error('AUDIT FAILED (password change):', auditErr);
  }

  res.json({ success: true });
});

router.get('/me', authGuard, authController.me)

module.exports = router