const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const authModel = require('./auth.model')
const config = require('../../config/environment')
const { generateClientId } = require('../../utils/clientIdGenerator')

async function register({ email, password, role, name }) {
  const existing = await authModel.findByEmail(email)
  if (existing) {
    throw new Error('Email already registered')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const status = role === 'worker' ? 'pending' : 'active'
  const user = await authModel.createUser({ email, passwordHash, role, name, status })

// Generate and save client ID
const profession = role === 'worker' ? name : null // Worker gets profession from their name or future field
const clientId = await generateClientId(role, status, profession)
await authModel.updateClientId(user.id, clientId)
user.client_id = clientId

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

  const token = generateToken(user)
  return {
    user: {
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.name,
  status: user.status,
  client_id: user.client_id,
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