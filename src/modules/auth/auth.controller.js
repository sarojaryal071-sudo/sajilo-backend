const authService = require('./auth.service')

async function register(req, res, next) {
  try {
    const { email, password, role, name } = req.body
    const result = await authService.register({ email, password, role, name })
    res.status(201).json({
      success: true,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const result = await authService.login({ email, password })
    res.json({
      success: true,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id)
    res.json({
      success: true,
      data: user,
    })
  } catch (err) {
    next(err)
  }
}

async function submitWorkerApplication(req, res) {
  try {
    const { pool } = require('../../config/database')
    const userId = req.user.id
    
    // ---------- DUPLICATE GUARD ----------
    const existing = await pool.query(
      `SELECT id FROM worker_applications WHERE user_id = $1`,
      [userId]
    )
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Application already submitted' })
    }
    // ------------------------------------

    const {
      fullName, displayName, phone, email, dob,
      primaryRole, secondaryRoles, address, serviceArea,
      govId, selfieUrl, availability,
      notifyEmail, notifySms, notifyApp, notifyLater,
      acceptTerms, backgroundCheck, safetyAgreement
    } = req.body

    const result = await pool.query(
      `INSERT INTO worker_applications 
       (user_id, full_name, display_name, phone, email, dob, primary_role, secondary_roles, 
        address, service_area, gov_id, selfie_url, availability,
        notify_email, notify_sms, notify_app, notify_later,
        accept_terms, background_check, safety_agreement)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [userId, fullName, displayName, phone, email, dob, primaryRole, secondaryRoles,
       address, serviceArea, govId, selfieUrl, availability,
       notifyEmail, notifySms, notifyApp, notifyLater,
       acceptTerms, backgroundCheck, safetyAgreement]
    )
    
    // Notify admins about new worker application
    try {
      const notificationsService = require('../notification/notification.service');
      const { pool } = require('../../config/database');
      const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const applicantName = userResult.rows[0]?.name || 'A worker';

      // Find all active admin user IDs
      const adminResult = await pool.query('SELECT id FROM users WHERE role = $1 AND status = $2', ['admin', 'active']);
      for (const admin of adminResult.rows) {
        await notificationsService.createNotification({
          userId: admin.id,
          userRole: 'admin',
          type: 'onboarding',
          title: 'New Worker Application',
          message: `${applicantName} submitted an application.`,
          entityType: 'worker_application',
          entityId: result.rows[0].id,
          metadata: { action: 'submitted', applicationId: result.rows[0].id, userId },
        });
      }
    } catch (err) {
      console.error('Failed to notify admins of worker application:', err);
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = { register, login, me, submitWorkerApplication }