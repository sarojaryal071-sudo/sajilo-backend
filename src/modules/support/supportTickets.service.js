// sajilo-backend/src/modules/support/supportTickets.service.js
const { pool } = require('../../config/database');

/**
 * Create a new support ticket.
 * @param {Object} params
 * @param {number} params.reporterId     - User ID of the worker or client
 * @param {string} params.reporterRole   - 'worker' or 'customer'
 * @param {string} params.category       - e.g. 'payment', 'worker_behavior', 'client_behavior', 'booking_issue', 'technical_issue'
 * @param {string} params.description    - The problem description
 * @returns {Object} the created ticket
 */
async function createTicket({ reporterId, reporterRole, category, description }) {
  if (!reporterId || !reporterRole || !category || !description) {
    throw new Error('reporterId, reporterRole, category, and description are required');
  }

  const result = await pool.query(
    `INSERT INTO support_tickets (reporter_id, reporter_role, category, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [reporterId, reporterRole, category, description]
  );
  return result.rows[0];
}

/**
 * Update an existing ticket's status and optionally assign an admin.
 * @param {number} ticketId
 * @param {Object} updates
 * @param {string} [updates.status]         - new status ('investigating', 'resolved', 'closed')
 * @param {number} [updates.assignedAdmin]  - admin user ID
 * @param {string} [updates.resolutionNote] - explanation when closing
 * @returns {Object} the updated ticket
 */
async function updateTicket(ticketId, { status, assignedAdmin, resolutionNote }) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (status) {
    fields.push(`status = $${paramIndex++}`);
    values.push(status);
  }
  if (assignedAdmin !== undefined) {
    fields.push(`assigned_admin = $${paramIndex++}`);
    values.push(assignedAdmin);
  }
  if (resolutionNote !== undefined) {
    fields.push(`resolution_note = $${paramIndex++}`);
    values.push(resolutionNote);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push(`updated_at = NOW()`);
  values.push(ticketId);

  const result = await pool.query(
    `UPDATE support_tickets SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Get all tickets, optionally filtered by status or category.
 * @param {Object} filters - e.g. { status: 'open', category: 'payment' }
 * @returns {Array} tickets
 */
async function getTickets(filters = {}) {
  let query = 'SELECT * FROM support_tickets WHERE 1=1';
  const values = [];
  let paramIndex = 1;

  if (filters.status) {
    query += ` AND status = $${paramIndex++}`;
    values.push(filters.status);
  }
  if (filters.category) {
    query += ` AND category = $${paramIndex++}`;
    values.push(filters.category);
  }
  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, values);
  return result.rows;
}

module.exports = { createTicket, updateTicket, getTickets };