// Support Ticket Service
// Creates & manages support tickets attached to conversations

const { pool } = require('../../config/database');

const supportCategories = require('./supportCategories.constants');
const CATEGORIES = supportCategories.map(c => c.key);
const STATUSES   = ['open', 'in_progress', 'resolved', 'escalated'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

function generateToken(category) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) token += chars[Math.floor(Math.random() * chars.length)];
  const prefix = (category || 'other').substring(0, 3).toUpperCase();
  return `${prefix}-${token}`;
}

async function createTicket(conversationId, clientId, category = 'other', priority = 'normal') {
  if (!CATEGORIES.includes(category)) throw new Error(`Invalid category: ${category}`);
  if (!PRIORITIES.includes(priority)) throw new Error(`Invalid priority: ${priority}`);

  const token = generateToken(category);

  const result = await pool.query(
    `INSERT INTO support_tickets (ticket_token, conversation_id, category, status, priority, client_id)
     VALUES ($1, $2, $3, 'open', $4, $5) RETURNING *`,
    [token, conversationId, category, priority, clientId]
  );

  return result.rows[0];
}

async function getTicketByConversation(conversationId) {
  const result = await pool.query(
    `SELECT * FROM support_tickets WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [conversationId]
  );
  return result.rows[0] || null;
}

async function getTicketById(ticketId) {
  const result = await pool.query(
    `SELECT t.*, u.name AS client_name, u.client_id AS client_code
     FROM support_tickets t
     JOIN users u ON u.id = t.client_id
     WHERE t.id = $1`,
    [ticketId]
  );
  return result.rows[0] || null;
}

async function updateTicketStatus(ticketId, status) {
  if (!STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  const result = await pool.query(
    `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, ticketId]
  );
  return result.rows[0] || null;
}

async function getAllTickets() {
  const result = await pool.query(
    `SELECT t.*, u.name AS client_name, u.client_id AS client_code
     FROM support_tickets t
     JOIN users u ON u.id = t.client_id
     ORDER BY t.created_at DESC`
  );
  return result.rows;
}

module.exports = { createTicket, getTicketByConversation, getTicketById, updateTicketStatus, getAllTickets };