// sajilo-backend/src/modules/support/supportTickets.controller.js
const supportService = require('./supportTickets.service');

/**
 * POST /api/support/tickets
 * A worker or client creates a new support ticket.
 * Body: { category, description }
 */
async function createTicket(req, res) {
  try {
    const reporterId = req.user.id;
    const reporterRole = req.user.role;   // 'worker' or 'customer'
    const { category, description } = req.body;

    // Basic validation
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'category is required and must be a string' });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'description is required and must be a non‑empty string' });
    }

    const ticket = await supportService.createTicket({
      reporterId,
      reporterRole,
      category: category.trim(),
      description: description.trim(),
    });

    return res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    console.error('createTicket error:', err);
    return res.status(500).json({ error: 'Failed to create support ticket' });
  }
}

/**
 * PUT /api/admin/support/tickets/:id
 * Admin updates a ticket's status, assigns an admin, or adds a resolution note.
 * Body: { status, assignedAdmin, resolutionNote }
 */
async function updateTicket(req, res) {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId < 1) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const { status, assignedAdmin, resolutionNote } = req.body;

    // Optional validation
    if (status && !['open', 'investigating', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updated = await supportService.updateTicket(ticketId, {
      status,
      assignedAdmin: assignedAdmin ? parseInt(assignedAdmin, 10) : undefined,
      resolutionNote,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateTicket error:', err);
    return res.status(500).json({ error: 'Failed to update support ticket' });
  }
}

/**
 * GET /api/admin/support/tickets
 * Admin lists all tickets, optionally filtered by status or category.
 * Query params: ?status=open&category=payment
 */
async function getTickets(req, res) {
  try {
    const { status, category } = req.query;
    const tickets = await supportService.getTickets({ status, category });
    return res.json({ success: true, data: tickets });
  } catch (err) {
    console.error('getTickets error:', err);
    return res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
}

module.exports = { createTicket, updateTicket, getTickets };