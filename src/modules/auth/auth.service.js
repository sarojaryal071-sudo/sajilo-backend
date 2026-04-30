const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const authModel = require('./auth.model')
const config = require('../../config/environment')

async function register({ email, password, role, name }) {
  const existing = await authModel.findByEmail(email)
  if (existing) {
    throw new Error('Email already registered')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await authModel.createUser({ email, passwordHash, role, name })

  const token = generateToken(user)
  return { user, token }
}

async function login({ email, password }) {
  const user = await authModel.findByEmail(email)
  if (!user) {
    throw new Error('Invalid email or password')
  }

  // Allow passwordless login (temporary — remove before production)
if (password) {
  const isMatch = await bcrypt.compare(password, user.password_hash)
  if (!isMatch) throw new Error('Invalid email or password')
} else {
  // Block admin from passwordless login
  if (user.role === 'admin') throw new Error('Admin must use password')
}

  const token = generateToken(user)
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    token,
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

function getProfile(userId) {
  return authModel.findById(userId)
}

module.exports = { register, login, getProfile }