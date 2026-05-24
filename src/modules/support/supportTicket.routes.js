const router = require('express').Router();
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');
const controller = require('./supportTicket.controller');

router.use(authGuard);

router.post('/', controller.createTicket);
router.get('/', controller.getAllTickets);
router.get('/conversation/:conversationId', controller.getTicketByConversation);

router.post('/start', controller.startSupportSession);
router.get('/categories', (req, res) => {
  res.json({ success: true, data: require('./supportCategories.constants') });
});

module.exports = router;