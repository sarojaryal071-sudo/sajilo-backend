const express = require('express');
const router = express.Router();
const professionsController = require('./admin.professions.controller');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

router.use(authGuard, roleGuard('admin'));

router.get('/', professionsController.getAll);
router.get('/:id', professionsController.getById);
router.post('/', professionsController.create);
router.put('/:id', professionsController.update);
router.delete('/:id', professionsController.remove);

module.exports = router;