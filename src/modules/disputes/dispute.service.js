const { pool } = require('../../config/database');

const supportCategories = require('../support/supportCategories.constants');
const CATEGORIES = supportCategories.map(c => c.key);
const STATUSES   = ['open', 'investigating', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const storageService = require('../../services/storage.service');


function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'DSP-';
  for (let i = 0; i < 6; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

async function escalateToDispute(supportTicketId, adminId, adminName, { workerId, bookingId, category, priority, supportNote, attachmentIds = [], extraFileUrls = [] } = {}) {
  if (!CATEGORIES.includes(category)) throw new Error(`Invalid category: ${category}`);
  if (!PRIORITIES.includes(priority)) throw new Error(`Invalid priority: ${priority}`);

  // Get client_id from the support ticket
  const ticketResult = await pool.query(
    `SELECT st.client_id, u.client_id AS client_code FROM support_tickets st
     JOIN users u ON u.id = st.client_id
     WHERE st.id = $1`,
    [supportTicketId]
  );
  if (ticketResult.rows.length === 0) throw new Error('Support ticket not found');
  const clientCode = ticketResult.rows[0].client_code;

  const token = generateToken();

  const result = await pool.query(
    `INSERT INTO disputes (dispute_token, support_ticket_id, client_id, worker_id, booking_id, category, status, priority, support_note, handled_by_admin_id, handled_by_admin_name)
     SELECT $1, $2, st.client_id, $3, $4, $5, 'open', $6, $7, $8, $9
     FROM support_tickets st WHERE st.id = $2
     RETURNING *`,
    [token, supportTicketId, workerId || null, bookingId || null, category, priority, supportNote || null, adminId, adminName]
  );

  const dispute = result.rows[0];

  // Copy selected chat attachments to permanent dispute folder
  for (const attachmentId of attachmentIds) {
    const attResult = await pool.query(`SELECT * FROM support_attachments WHERE id = $1`, [attachmentId]);
    if (attResult.rows.length === 0) continue;
    const att = attResult.rows[0];

    // Copy file
    const copy = await storageService.copyFile(att.file_url, `sajilo/documents/disputes/${clientCode}`);

    // Create dispute evidence record
    await pool.query(
      `INSERT INTO dispute_evidences (dispute_id, source_attachment_id, uploaded_by, file_url, public_id, evidence_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [dispute.id, attachmentId, adminId, copy.url, copy.publicId, att.attachment_type]
    );

    // Mark attachment as promoted
    await pool.query(`UPDATE support_attachments SET is_promoted_to_dispute = TRUE WHERE id = $1`, [attachmentId]);
  }

  // Add extra files (already uploaded to dispute folder from frontend)
  for (const url of extraFileUrls) {
    await pool.query(
      `INSERT INTO dispute_evidences (dispute_id, uploaded_by, file_url, evidence_type)
       VALUES ($1, $2, $3, 'image')`,
      [dispute.id, adminId, url]
    );
  }

  // Mark ticket as escalated
  await pool.query(`UPDATE support_tickets SET status = 'escalated', updated_at = NOW() WHERE id = $1`, [supportTicketId]);

  return dispute;
}

async function getDisputeById(disputeId) {
  // 1. Fetch dispute core data
  const disputeResult = await pool.query(
    `SELECT d.*, 
            u1.name AS client_name, u1.client_id AS client_code,
            u2.name AS worker_name, u2.client_id AS worker_code,
            u3.client_id AS handled_by_admin_code
     FROM disputes d
     JOIN users u1 ON u1.id = d.client_id
     LEFT JOIN users u2 ON u2.id = d.worker_id
     LEFT JOIN users u3 ON u3.id = d.handled_by_admin_id
     WHERE d.id = $1`,
    [disputeId]
  );
  if (disputeResult.rows.length === 0) return null;
  const dispute = disputeResult.rows[0];

  // 2. Fetch support ticket data
  const ticketResult = await pool.query(
    `SELECT id, ticket_token, category, status, priority, client_id
     FROM support_tickets
     WHERE id = $1`,
    [dispute.support_ticket_id]
  );
  const ticket = ticketResult.rows[0] || null;

  // 3. Fetch dispute evidences
  const evidences = await pool.query(
    `SELECT * FROM dispute_evidences WHERE dispute_id = $1 AND is_active = TRUE ORDER BY created_at ASC`,
    [disputeId]
  );

  // 4. Build timeline
  const timeline = [];

  // 4a. Support messages
  if (ticket) {
    const messagesResult = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.role AS sender_role
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = (
         SELECT conversation_id FROM support_tickets WHERE id = $1
       )
       ORDER BY m.created_at ASC`,
      [ticket.id]
    );
    messagesResult.rows.forEach((msg, idx) => {
      timeline.push({
        id: `msg-${msg.id}`,
        type: 'support_message',
        source: 'support_chat',
        created_at: msg.created_at,
        sequence: timeline.length + 1,
        author: msg.sender_name,
        role: msg.sender_role,
        text: msg.text,
        url: null,
        attachment_type: null,
        event: null,
        metadata: { messageId: msg.id, senderId: msg.sender_id }
      });
    });
  }

  // 4b. Support attachments
  if (ticket) {
    const attachmentsResult = await pool.query(
      `SELECT sa.*, u.name AS uploaded_by_name, u.role AS uploaded_by_role
       FROM support_attachments sa
       JOIN users u ON u.id = sa.uploaded_by
       WHERE sa.conversation_id = (
         SELECT conversation_id FROM support_tickets WHERE id = $1
       )
       ORDER BY sa.created_at ASC`,
      [ticket.id]
    );
    attachmentsResult.rows.forEach((att) => {
      timeline.push({
        id: `att-${att.id}`,
        type: 'attachment',
        source: 'support_attachment',
        created_at: att.created_at,
        sequence: timeline.length + 1,
        author: att.uploaded_by_name,
        role: att.uploaded_by_role,
        text: null,
        url: att.file_url,
        attachment_type: att.attachment_type,
        event: null,
        metadata: { attachmentId: att.id, isPromoted: att.is_promoted_to_dispute }
      });
    });
  }

  // 4c. System event: escalated_to_dispute
  timeline.push({
    id: `sys-escalated`,
    type: 'system_event',
    source: 'system',
    created_at: dispute.created_at,
    sequence: timeline.length + 1,
    author: dispute.handled_by_admin_name,
    role: 'admin',
    text: null,
    url: null,
    attachment_type: null,
    event: 'escalated_to_dispute',
    metadata: { disputeToken: dispute.dispute_token }
  });

  // 4d. Dispute evidences (admin‑only additions)
  evidences.rows.forEach((ev) => {
    timeline.push({
      id: `ev-${ev.id}`,
      type: 'evidence',
      source: 'dispute_evidence',
      created_at: ev.created_at,
      sequence: timeline.length + 1,
      author: 'Admin',           // evidence is uploaded by admin
      role: 'admin',
      text: null,
      url: ev.file_url,
      attachment_type: ev.evidence_type,
      event: null,
      metadata: { evidenceId: ev.id }
    });
  });

  // Sort by created_at then sequence
  timeline.sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.sequence - b.sequence);

  return {
    ...dispute,
    ticket,
    evidences: evidences.rows,
    timeline
  };
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