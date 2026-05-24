const router = require('express').Router();
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');
const controller = require('./dispute.controller');

router.use(authGuard);

router.post('/escalate', roleGuard('admin'), controller.escalate);
router.get('/', roleGuard('admin'), controller.getAll);
router.get('/:id', roleGuard('admin'), controller.getById);
router.put('/:id/status', roleGuard('admin'), controller.updateStatus);

module.exports = router;