// sajilo-backend/src/modules/expenses/expensesAdmin.controller.js
const categoryService = require('./expenseCategoryService');
const vendorService = require('./vendorService');
const expenseService = require('./expenseService');

// ── Categories ──
async function createCategory(req, res) {
  try {
    const cat = await categoryService.createCategory(req.body);
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function listCategories(req, res) {
  try {
    const cats = await categoryService.getAllCategories();
    res.json({ success: true, data: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── Vendors ──
async function createVendor(req, res) {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function listVendors(req, res) {
  try {
    const vendors = await vendorService.getAllVendors();
    res.json({ success: true, data: vendors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── Expenses ──
async function createExpense(req, res) {
  try {
    const expense = await expenseService.createExpense(req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function listExpenses(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const expenses = await expenseService.getAllExpenses(limit);
    res.json({ success: true, data: expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createCategory, listCategories,
  createVendor, listVendors,
  createExpense, listExpenses,
};