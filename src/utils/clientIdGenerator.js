// Client ID Generator — creates unique role-based IDs
// Format: C-00001 (customer), P-00001 (pending worker), WPL-00005 (approved worker plumber), A-00001 (admin)

const { pool } = require('../config/database')

async function generateClientId(role, status = 'active', profession = null) {
  let prefix = 'C' // Customer default

  if (role === 'worker') {
    if (status === 'pending' || status !== 'active') {
      prefix = 'P' // Pending worker
    } else {
      const { getProfessionCode } = require('../config/workerCategories')
const profCode = profession ? getProfessionCode(profession) : 'WK'
      prefix = `W${profCode}`
    }
  } else if (role === 'admin') {
    prefix = 'A'
  }

  const result = await pool.query(
    `SELECT COUNT(*) + 1 as next_id FROM users WHERE client_id LIKE $1`,
    [`${prefix}-%`]
  )
  const nextNum = parseInt(result.rows[0].next_id)
  const paddedNum = String(nextNum).padStart(5, '0')
  
  return `${prefix}-${paddedNum}`
}

module.exports = { generateClientId }