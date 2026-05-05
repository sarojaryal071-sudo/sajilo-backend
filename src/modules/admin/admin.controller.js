const adminService = require('./admin.service')

async function getWorkers(req, res, next) {
  try {
    const workers = await adminService.getAllWorkers()
    res.json({ success: true, data: workers })
  } catch (err) {
    next(err)
  }
}

async function approveWorker(req, res, next) {
  try {
    const worker = await adminService.approveWorker(req.params.id)
    res.json({ success: true, data: worker })
  } catch (err) {
    next(err)
  }
}

async function rejectWorker(req, res, next) {
  try {
    const worker = await adminService.rejectWorker(req.params.id)
    res.json({ success: true, data: worker })
  } catch (err) {
    next(err)
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await adminService.getStats()
    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
}

async function getCustomers(req, res, next) {
  try {
    const { pool } = require('../../config/database')
    const result = await pool.query(
      `SELECT id, email, name, phone, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    next(err)
  }
}

module.exports = { getWorkers, approveWorker, rejectWorker, getStats, getCustomers }