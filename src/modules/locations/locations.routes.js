const router = require('express').Router()
const { pool } = require('../../config/database')

router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'available'
    const result = await pool.query(
      `SELECT city_name AS value, city_name AS label, status FROM locations WHERE status = $1 ORDER BY city_name`,
      [status]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router