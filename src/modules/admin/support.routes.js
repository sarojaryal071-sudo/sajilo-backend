const express = require('express')
const router = express.Router()
const { pool } = require('../../config/database')

router.get('/', async (req, res) => {
  try {
    // Return the first active admin (we can refine later to select a specific admin)
    const result = await pool.query(
      `SELECT id, client_id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1`
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No active admin found' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router