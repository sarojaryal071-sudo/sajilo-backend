const usersService = require('./users.service')
const authModel = require('../auth/auth.model') 


async function getMe(req, res, next) {
  try {
    const user = await usersService.getProfile(req.user.id)
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await usersService.updateProfile(req.user.id, req.body);
    try {
      const { logAuditEvent } = require('../../services/audit.service');
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'user.profile_updated',
        entityType: 'user',
        entityId: req.user.id,
        entityDisplay: user.client_id || user.email,
        summary: `User profile updated for ${user.client_id || user.email}`,
        severity: 'low',
        category: 'workers',
        outcome: 'success',
        newValues: req.body,
      });
    } catch (auditErr) { console.error('Audit write failed (profile update):', auditErr); }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}


async function getWorkerMe(req, res, next) {
  try {
    const profile = await usersService.getWorkerProfile(req.user.id)
    res.json({ success: true, data: profile })
  } catch (err) { next(err) }
}

async function updateWorkerMe(req, res, next) {
  try {
    const profile = await usersService.updateWorkerProfile(req.user.id, req.body);
    try {
      const { logAuditEvent } = require('../../services/audit.service');
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'worker.profile_updated',
        entityType: 'worker',
        entityId: req.user.id,
        entityDisplay: profile.client_id || `worker ${req.user.id}`,
        summary: `Worker profile updated for ${profile.client_id || req.user.id}`,
        severity: 'low',
        category: 'workers',
        outcome: 'success',
        newValues: req.body,
      });
    } catch (auditErr) { console.error('Audit write failed (worker profile):', auditErr); }
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
}

async function getWorkerEarnings(req, res, next) {
  try {
    const earnings = await usersService.getWorkerEarnings(req.user.id)
    res.json({ success: true, data: earnings })
  } catch (err) { next(err) }
}

async function getSchedule(req, res, next) {
  try {
    const schedule = await usersService.getWorkerSchedule(req.user.id)
    res.json({ success: true, data: schedule })
  } catch (err) { next(err) }
}

async function saveSchedule(req, res, next) {
  try {
    const schedule = await usersService.saveWorkerSchedule(req.user.id, req.body.schedule)
    res.json({ success: true, data: schedule })
  } catch (err) { next(err) }
}

async function getMyApplication(req, res, next) {
  try {
    const userId = req.user.id
    const user = await authModel.findById(userId)   // from auth.model
    if (!user || user.role !== 'worker') {
      return res.status(404).json({ success: false, error: 'Not a worker' })
    }

    // Get application data
    const { pool } = require('../../config/database')
    const appResult = await pool.query(
      `SELECT * FROM worker_applications WHERE user_id = $1`,
      [userId]
    )
    const application = appResult.rows[0] || null

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          status: user.status,
          client_id: user.client_id,
          application_submitted: !!application,
        },
        application: application
          ? {
              fullName: application.full_name,
              displayName: application.display_name,
              phone: application.phone,
              email: application.email,
              dob: application.dob,
              primaryRole: application.primary_role,
              secondaryRoles: application.secondary_roles,
              address: application.address,
              serviceArea: application.service_area,
              govId: application.gov_id,
              selfieUrl: application.selfie_url,
              availability: application.availability,
              // … other fields you may need
            }
          : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

// sets the "welcomed" flag so the congratulations screen never appears again
async function setWelcomed(req, res, next) {
  try {
    const { pool } = require('../../config/database')
    await pool.query(`UPDATE users SET welcomed = true WHERE id = $1`, [req.user.id])
    res.json({ success: true })
  } catch (err) { next(err) }
}

module.exports = { getMe, updateMe, getWorkerMe, updateWorkerMe, getWorkerEarnings, getSchedule, saveSchedule, getMyApplication, setWelcomed }