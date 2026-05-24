const { pool } = require('../../config/database');

const CATEGORIES = ['billing', 'service_quality', 'misconduct', 'other'];
const STATUSES   = ['open', 'investigating', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'DSP-';
  for (let i = 0; i < 6; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

async function escalateToDispute(supportTicketId, adminId, adminName, { workerId, bookingId, category, priority, supportNote } = {}) {
  if (!CATEGORIES.includes(category)) throw new Error(`Invalid category: ${category}`);
  if (!PRIORITIES.includes(priority)) throw new Error(`Invalid priority: ${priority}`);

  const token = generateToken();

  const result = await pool.query(
    `INSERT INTO disputes (dispute_token, support_ticket_id, client_id, worker_id, booking_id, category, status, priority, support_note, handled_by_admin_id, handled_by_admin_name)
     SELECT $1, $2, st.client_id, $3, $4, $5, 'open', $6, $7, $8, $9
     FROM support_tickets st WHERE st.id = $2
     RETURNING *`,
    [token, supportTicketId, workerId || null, bookingId || null, category, priority, supportNote || null, adminId, adminName]
  );

  // Mark ticket as escalated
  await pool.query(`UPDATE support_tickets SET status = 'escalated', updated_at = NOW() WHERE id = $1`, [supportTicketId]);

  return result.rows[0];
}

async function getDisputeById(disputeId) {
  const result = await pool.query(
    `SELECT d.*, 
            u1.name AS client_name, u1.client_id AS client_code,
            u2.name AS worker_name, u2.client_id AS worker_code
     FROM disputes d
     JOIN users u1 ON u1.id = d.client_id
     LEFT JOIN users u2 ON u2.id = d.worker_id
     WHERE d.id = $1`,
    [disputeId]
  );
  return result.rows[0] || null;
}

async function getAllDisputes() {
  const result = await pool.query(
    `SELECT d.*,
            u1.name AS client_name, u1.client_id AS client_code,
            u2.name AS worker_name, u2.client_id AS worker_code
     FROM disputes d
     JOIN users u1 ON u1.id = d.client_id
     LEFT JOIN users u2 ON u2.id = d.worker_id
     ORDER BY d.created_at DESC`
  );
  return result.rows;
}

async function updateDisputeStatus(disputeId, status) {
  if (!STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  const result = await pool.query(
    `UPDATE disputes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, disputeId]
  );
  return result.rows[0] || null;
}

module.exports = { escalateToDispute, getDisputeById, getAllDisputes, updateDisputeStatus };