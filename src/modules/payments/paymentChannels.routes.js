const express = require('express');
const router = express.Router();
const controller = require('./paymentChannels.controller');
const authGuard = require('../../middleware/auth.guard');

router.get('/', authGuard, controller.getChannels);
router.post('/', authGuard, controller.addChannel);
router.put('/:id', authGuard, controller.updateChannel);
router.delete('/:id', authGuard, controller.deleteChannel);

module.exports = router;