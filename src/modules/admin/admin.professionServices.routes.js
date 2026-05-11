const express = require('express');
const router = express.Router();
const ctrl = require('./admin.professionServices.controller');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

router.use(authGuard, roleGuard('admin'));

router.get('/:professionId/services', ctrl.getByProfession);
router.post('/services', ctrl.create);
router.put('/services/:id', ctrl.update);
router.delete('/services/:id', ctrl.remove);

module.exports = router;