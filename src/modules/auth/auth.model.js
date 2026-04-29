const { pool } = require('../../config/database')

async function createUserTable() {
  // Create users table first
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'worker', 'admin')),
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(15),
      photo_url TEXT,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
  await pool.query(query)

  // Add worker-specific columns
  const alterations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earnings INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_jobs INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate INTEGER DEFAULT 500`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`,
  ]

  for (const sql of alterations) {
    await pool.query(sql)
  }
  // Create notifications table
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
  
  // Create worker availability table
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
}

async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  return result.rows[0] || null
}

async function findById(id) {
  const result = await pool.query('SELECT id, email, role, name, phone, photo_url, status, created_at FROM users WHERE id = $1', [id])
  return result.rows[0] || null
}

async function createUser({ email, passwordHash, role, name }) {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, name, created_at`,
    [email, passwordHash, role, name]
  )
  return result.rows[0]
}

module.exports = { createUserTable, findByEmail, findById, createUser }