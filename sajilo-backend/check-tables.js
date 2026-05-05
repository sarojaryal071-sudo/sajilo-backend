const { pool } = require('./src/config/database');
(async () => {
  const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(r.rows.map(r => r.table_name));
  process.exit();
})();
