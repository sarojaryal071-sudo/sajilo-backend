// Support Ticket Service
// Creates & manages support tickets attached to conversations

const { pool } = require('../../config/database');
const { logAuditEvent } = require('../../services/audit.service');

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

async function updateTicketStatus(ticketId, status, adminUser = null) {
  if (!STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);

  // Capture old state
  const oldResult = await pool.query(`SELECT status, ticket_token FROM support_tickets WHERE id = $1`, [ticketId]);
  const oldStatus = oldResult.rows[0]?.status || 'unknown';
  const ticketToken = oldResult.rows[0]?.ticket_token || 'unknown';

  const result = await pool.query(
    `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, ticketId]
  );
  const updatedTicket = result.rows[0];

  // Audit logging for resolve/escalate
  if (updatedTicket && (status === 'resolved' || status === 'escalated')) {
    await logAuditEvent({
      actor: adminUser || { id: null, role: 'system' },
      action: `ticket.${status}`,
      entityType: 'support_ticket',
      entityId: ticketId,
      entityLabel: ticketToken,
      oldValues: { status: oldStatus },
      newValues: { status },
    });
  }

  return updatedTicket || null;
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

async function assignAdminIfNeeded(ticketId, adminId) {
  const ticketRes = await pool.query(`SELECT * FROM support_tickets WHERE id = $1`, [ticketId]);
  const ticket = ticketRes.rows[0];
  if (!ticket) return null;

  // Already assigned – do nothing
  if (ticket.assigned_admin_id) return ticket;

  // Cannot claim resolved or escalated tickets
  if (ticket.status === 'resolved' || ticket.status === 'escalated') return ticket;

  const adminRes = await pool.query(`SELECT name, role FROM users WHERE id = $1`, [adminId]);
  const admin = adminRes.rows[0];
  if (!admin) return null;

  const now = new Date().toISOString();

  // Claim: set assigned admin and move status to in_progress
  const updated = await pool.query(
    `UPDATE support_tickets 
     SET assigned_admin_id = $1, assigned_admin_name = $2, assigned_admin_role = $3, assigned_at = $4, status = 'in_progress', updated_at = $5
     WHERE id = $6
     RETURNING *`,
    [adminId, admin.name, admin.role, now, now, ticketId]
  );

  // Insert system join message into conversation
  const joinText = `${admin.name} joined the conversation\n${admin.role}`;
  await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, text, read, created_at, is_system)
     VALUES ($1, $2, $3, $4, TRUE, NOW(), TRUE)`,
    [ticket.conversation_id, adminId, adminId, joinText]
  );

  await pool.query(
    `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
    [joinText, ticket.conversation_id]
  );

  const claimedTicket = updated.rows[0];

  // Audit logging
  await logAuditEvent({
    actor: { id: adminId, name: admin.name, role: admin.role, client_id: admin.client_id },
    action: 'ticket.claimed',
    entityType: 'support_ticket',
    entityId: ticketId,
    entityLabel: claimedTicket.ticket_token,
    oldValues: { status: 'open', assigned_admin_id: null },
    newValues: { status: 'in_progress', assigned_admin_id: adminId },
  });

  return claimedTicket;
}

async function releaseTicket(ticketId, adminId) {
  const ticketRes = await pool.query(`SELECT * FROM support_tickets WHERE id = $1`, [ticketId]);
  const ticket = ticketRes.rows[0];
  if (!ticket) throw new Error('Ticket not found');

  // Only the assigned admin can release
  if (ticket.assigned_admin_id !== adminId) throw new Error('Only the assigned admin can release this ticket');

  // Cannot release resolved or escalated tickets
  if (ticket.status === 'resolved' || ticket.status === 'escalated') throw new Error('Cannot release a resolved or escalated ticket');

  const now = new Date().toISOString();

  const updated = await pool.query(
    `UPDATE support_tickets SET assigned_admin_id = NULL, released_at = $1, status = 'open', updated_at = $2 WHERE id = $3 RETURNING *`,
    [now, now, ticketId]
  );

  // Insert system release message
  const releaseText = `Ticket released back to support queue`;
  await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, text, read, created_at, is_system)
     VALUES ($1, $2, $3, $4, TRUE, NOW(), TRUE)`,
    [ticket.conversation_id, adminId, adminId, releaseText]
  );

  await pool.query(
    `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
    [releaseText, ticket.conversation_id]
  );

  const releasedTicket = updated.rows[0];

  await logAuditEvent({
    actor: { id: adminId },
    action: 'ticket.released',
    entityType: 'support_ticket',
    entityId: ticketId,
    entityLabel: releasedTicket.ticket_token,
    oldValues: { status: 'in_progress', assigned_admin_id: adminId },
    newValues: { status: 'open', assigned_admin_id: null },
  });

  return releasedTicket;
}

module.exports = { createTicket, getTicketByConversation, getTicketById, updateTicketStatus, getAllTickets, assignAdminIfNeeded, releaseTicket };