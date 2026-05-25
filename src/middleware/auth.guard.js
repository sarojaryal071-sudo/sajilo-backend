const jwt = require('jsonwebtoken')
const config = require('../config/environment')
const { pool } = require('../config/database')

module.exports = async (req, res, next) => {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }

  const token = header.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    req.user = decoded

    // If the user has a role_id, check staff profile status
    if (decoded.role_id) {
      const result = await pool.query(
        `SELECT status FROM staff_profiles WHERE user_id = $1`,
        [decoded.id]
      );
      const profileStatus = result.rows[0]?.status;
      if (profileStatus === 'suspended' || profileStatus === 'terminated') {
        return res.status(403).json({ success: false, error: 'Account suspended or terminated' });
      }
    }

    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Invalid token' })
    }
    // Pass other errors (e.g., database errors) to the error handler
    next(err)
  }
}