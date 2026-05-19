// sajilo-backend/src/modules/media/mediaAudit.service.js
const { pool } = require('../../config/database');

async function logAction({ userId, fileType, fileUrl, action, req }) {
  try {
    await pool.query(
      `INSERT INTO file_upload_logs (user_id, file_type, file_url, action, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, fileType, fileUrl, action, req?.ip || null, req?.headers?.['user-agent'] || null]
    );
  } catch (err) {
    console.error('[MediaAudit] Failed to log action:', err.message);
  }
}

module.exports = { logAction };