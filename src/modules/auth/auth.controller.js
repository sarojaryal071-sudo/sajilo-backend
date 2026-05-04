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
    
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = { register, login, me, submitWorkerApplication }