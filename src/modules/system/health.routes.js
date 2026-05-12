const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

router.get('/', async (req, res) => {
  let dbStatus = 'down';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'ok';
  } catch (err) {
    dbStatus = 'error';
  }

  res.json({
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;