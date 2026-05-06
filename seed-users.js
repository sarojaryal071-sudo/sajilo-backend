const { pool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

(async () => {
  const hash = await bcrypt.hash('sajilo123', 10);

  await pool.query(
    'INSERT INTO users (email, password_hash, role, name, status, client_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
        ['sajilo@admin.com', hash, 'admin', 'Admin', 'active', 'A001']
  );

  await pool.query(
    'INSERT INTO users (email, password_hash, role, name, status, client_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
        ['sajilo@worker.com', hash, 'worker', 'Test Worker', 'active', 'W001']
  );

  await pool.query(
    'INSERT INTO users (email, password_hash, role, name, status, client_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
        ['sajilo@client.com', hash, 'customer', 'Test Client', 'active', 'C0100']
  );

  console.log('All users seeded');
  process.exit();
})();