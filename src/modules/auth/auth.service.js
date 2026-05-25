const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const authModel = require('./auth.model')
const config = require('../../config/environment')
const { pool } = require('../../config/database');


async function register({ email, password, role, name, legalName, phone }) {
  const existing = await authModel.findByEmail(email)
  if (existing) {
    throw new Error('Email already registered')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const status = role === 'worker' ? 'pending' : 'active'
  const user = await authModel.createUser({ email, passwordHash, role, name, legalName, phone, status })

  // client_id is already set by createUser – nothing extra needed
  const token = generateToken(user)
  return { user, token }
}

async function login({ email, password }) {
  const user = await authModel.findByEmail(email)
  if (!user) {
    throw new Error('Invalid email or password')
  }

  if (!password) throw new Error('Password is required')
  
  const isMatch = await bcrypt.compare(password, user.password_hash)
  if (!isMatch) throw new Error('Invalid email or password')

  // Backend computes lifecycle truth – never from frontend cache
  const application_submitted =
    user.role === 'worker'
      ? await authModel.hasWorkerApplication(user.id)
      : false

  const token = generateToken(user)

    // Block suspended/terminated staff
  if (user.role_id) {
    const profileResult = await pool.query(
      `SELECT status FROM staff_profiles WHERE user_id = $1`,
      [user.id]
    );
    const profileStatus = profileResult.rows[0]?.status;
    if (profileStatus === 'suspended') {
      throw new Error('STAFF_SUSPENDED');
    }
    if (profileStatus === 'terminated') {
      throw new Error('STAFF_TERMINATED');
    }
  }

      return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        name: user.name,
        status: user.status,
        client_id: user.client_id,
        welcomed: user.welcomed || false,
        application_submitted,
        must_change_password: user.must_change_password || false,   // ← add this
      },
      token,
    };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, client_id: user.client_id, role_id: user.role_id || null },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

async function getProfile(userId) {
  const user = await authModel.findById(userId)
  if (!user) return null

  if (user.role === 'worker') {
    user.application_submitted = await authModel.hasWorkerApplication(userId)
    user.welcomed = !!user.welcomed   // ensure it's a boolean
  }
  return user
}

module.exports = { register, login, getProfile }