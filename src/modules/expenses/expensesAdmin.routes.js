const router = require('express').Router();
const ctrl = require('./expensesAdmin.controller');

router.post('/categories', ctrl.createCategory);
router.get('/categories',  ctrl.listCategories);

router.post('/vendors',    ctrl.createVendor);
router.get('/vendors',     ctrl.listVendors);

router.post('/expenses',   ctrl.createExpense);
router.get('/expenses',    ctrl.listExpenses);

router.put('/expenses/:id/status', async (req, res) => {
  try {
    const expense = await require('./expenseService').updateExpenseStatus(
      req.params.id,
      req.body.status,
      req.user?.id || req.body.userId
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/recurring/trigger', async (req, res) => {
  try {
    const scheduler = require('./recurringExpenseScheduler');
    const result = await scheduler.triggerRecurringGeneration();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;