const router = require('express').Router();
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');
const controller = require('./supportTicket.controller');
const { pool } = require('../../config/database');

router.use(authGuard);

router.post('/', controller.createTicket);
router.get('/', controller.getAllTickets);
router.get('/conversation/:conversationId', controller.getTicketByConversation);
router.post('/start', controller.startSupportSession);
router.get('/categories', (req, res) => {
  res.json({ success: true, data: require('./supportCategories.constants') });
});

// Update ticket status (admin only)
router.put('/:token/status', authGuard, roleGuard('admin'), async (req, res, next) => {
  try {
    const { token } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status required' });

    const validStatuses = ['open', 'in_progress', 'resolved', 'escalated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE ticket_token = $2 RETURNING *`,
      [status, token]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Ticket not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;