const { pool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

(async () => {
  const hash = await bcrypt.hash('sajilo123', 10);
  await pool.query(
    'INSERT INTO users (email, password_hash, role, name, status, display_id) VALUES ($1, $2, $3, $4, $5, $6)',
    ['sajilo@admin.com', hash, 'admin', 'Admin', 'active', 'A001']
  );
  console.log('Admin created: A001');
  process.exit();
})();