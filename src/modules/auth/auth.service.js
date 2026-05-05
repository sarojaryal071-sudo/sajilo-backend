const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const authModel = require('./auth.model')
const config = require('../../config/environment')
const { generateClientId } = require('../../utils/clientIdGenerator')

async function register({ email, password, role, name, legalName, phone }) {
  const existing = await authModel.findByEmail(email)
  if (existing) {
    throw new Error('Email already registered')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const status = role === 'worker' ? 'pending' : 'active'
  const user = await authModel.createUser({ email, passwordHash, role, name, legalName, phone, status })

// Generate and save client ID
const profession = role === 'worker' ? name : null // Worker gets profession from their name or future field
const clientId = await generateClientId(role, status, profession)
await authModel.updateClientId(user.id, clientId)
user.client_id = clientId
user.display_id = user.display_id  // Already set by createUser

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

  // Check if worker has submitted an application
  let application_submitted = false
  if (user.role === 'worker') {
    const appResult = await authModel.hasApplication(user.id)
    application_submitted = appResult
  }

  const token = generateToken(user)
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status,
      client_id: user.client_id,
      display_id: user.display_id,
      application_submitted,   // ← new field
    },
    token,
  }
}
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, display_id: user.display_id },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

function getProfile(userId) {
  return authModel.findById(userId)
}

module.exports = { register, login, getProfile }