const bcrypt = require('bcryptjs')
const { pool } = require('./src/config/database')

const TEST_WORKER = {
  email: 'testworker@example.com',
  password: 'test1234',   // plain text – will be hashed
  name: 'Test Electrician',
  profession: 'electrician',  // change to plumber, cleaner, etc.
}

async function createTestWorker() {
  try {
    // 1. Hash password
    const passwordHash = await bcrypt.hash(TEST_WORKER.password, 10)

    // 2. Insert user with pending status
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, name, status, display_id)
       VALUES ($1, $2, 'worker', $3, 'pending', 'P0001')
       RETURNING id, email, name, status, display_id`,
      [TEST_WORKER.email, passwordHash, TEST_WORKER.name]
    )
    const newUser = userResult.rows[0]
    console.log('Created user:', newUser)

    // 3. Insert worker application with the chosen profession
    const appResult = await pool.query(
      `INSERT INTO worker_applications (user_id, full_name, primary_role)
       VALUES ($1, $2, $3)
       RETURNING id, primary_role`,
      [newUser.id, TEST_WORKER.name, TEST_WORKER.profession]
    )
    console.log('Created worker application:', appResult.rows[0])

    console.log('\nTest worker ready. Login email:', TEST_WORKER.email)
    console.log('Password:', TEST_WORKER.password)
    console.log('Role:', TEST_WORKER.profession)
    console.log('User ID:', newUser.id)
    console.log('Now go to Admin Approvals – you should see this worker.')
    
    process.exit(0)
  } catch (err) {
    console.error('Error creating test worker:', err.message)
    process.exit(1)
  }
}

createTestWorker()