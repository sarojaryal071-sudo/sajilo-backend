const jwt = require('jsonwebtoken')
const config = require('../config/environment')

module.exports = (req, res, next) => {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }

  const token = header.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' })
  }
}