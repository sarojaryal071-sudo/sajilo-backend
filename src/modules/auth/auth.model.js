const { pool } = require('../../config/database')

async function createUserTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'worker', 'admin')),
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(15),
      photo_url TEXT,
      client_id VARCHAR(20),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
  await pool.query(query)

  const alterations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earnings INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_jobs INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate INTEGER DEFAULT 500`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id VARCHAR(20)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS display_id VARCHAR(20)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS document_url TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_skill VARCHAR(100)`,
  ]

  for (const sql of alterations) {
    await pool.query(sql)
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
      target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('all', 'online', 'category')),
      target_category VARCHAR(100),
      created_by INTEGER REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS worker_availability (
      id SERIAL PRIMARY KEY,
      worker_id INTEGER REFERENCES users(id),
      day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
      morning BOOLEAN DEFAULT false,
      afternoon BOOLEAN DEFAULT false,
      evening BOOLEAN DEFAULT false,
      UNIQUE(worker_id, day_of_week)
    )
  `)

    // Pending worker applications — separate from users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS worker_applications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      full_name VARCHAR(255) NOT NULL,
      display_name VARCHAR(255),
      phone VARCHAR(15),
      email VARCHAR(255),
      dob DATE,
      primary_role VARCHAR(100),
      secondary_roles TEXT[] DEFAULT '{}',
      address TEXT,
      service_area VARCHAR(255),
      gov_id VARCHAR(50),
      selfie_url TEXT,
      availability VARCHAR(50),
      notify_email BOOLEAN DEFAULT false,
      notify_sms BOOLEAN DEFAULT false,
      notify_app BOOLEAN DEFAULT false,
      notify_later BOOLEAN DEFAULT false,
      accept_terms BOOLEAN DEFAULT false,
      background_check BOOLEAN DEFAULT false,
      safety_agreement BOOLEAN DEFAULT false,
      status VARCHAR(20) DEFAULT 'pending',
      admin_notes TEXT,
      submitted_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  return result.rows[0] || null
}

async function findById(id) {
    const result = await pool.query('SELECT id, email, role, name, legal_name, phone, photo_url, document_url, client_id, display_id, primary_skill, skills, hourly_rate, bio, status, created_at FROM users WHERE id = $1', [id])
  return result.rows[0] || null
}

async function createUser({ email, passwordHash, role, name, legalName, phone, status = 'active' }) {
  const displayId = await generateDisplayId(role)

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role, name, legal_name, phone, status, display_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, role, name, legal_name, phone, status, display_id, created_at`,
    [email, passwordHash, role, name, legalName || name, phone, status, displayId]
  )
  return result.rows[0]
}// Updates client_id for a user after registration
async function updateClientId(userId, clientId) {
  await pool.query('UPDATE users SET client_id = $1 WHERE id = $2', [clientId, userId])
}

// Generates role-prefixed display ID: C0001, P0001, WEL001, A001
async function generateDisplayId(role, professionCode = '') {
  let prefix
  switch (role) {
    case 'customer': prefix = 'C'; break
    case 'worker':   prefix = 'P'; break   // Pending until approved
    case 'admin':    prefix = 'A'; break
    default:         prefix = 'U'  // Unknown
  }

  // Count existing users with same prefix for sequential number
  const result = await pool.query(
    `SELECT COUNT(*) FROM users WHERE display_id LIKE $1`,
    [`${prefix}%`]
  )
  const count = parseInt(result.rows[0].count) + 1
  const number = String(count).padStart(prefix === 'A' ? 3 : 4, '0')

  return `${prefix}${number}`
}

// Updates display ID when worker is approved (P → W + profession code)
async function approveWorkerDisplayId(userId, professionCode) {
  const prefix = `W${professionCode.toUpperCase()}`  // e.g., WEL, WPL
  
  const result = await pool.query(
    `SELECT COUNT(*) FROM users WHERE display_id LIKE $1`,
    [`${prefix}%`]
  )
  const count = parseInt(result.rows[0].count) + 1
  const number = String(count).padStart(3, '0')
  const displayId = `${prefix}${number}`

  await pool.query(
    `UPDATE users SET display_id = $1, status = 'active', role = 'worker' WHERE id = $2`,
    [displayId, userId]
  )
  return displayId
}

module.exports = { createUserTable, findByEmail, findById, createUser, updateClientId, generateDisplayId, approveWorkerDisplayId }