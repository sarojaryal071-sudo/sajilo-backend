// sajilo-backend/src/modules/expenses/vendorService.js
const { pool } = require('../../config/database');

async function createVendor({ vendor_code, name, type, contact_person, email, phone, address, tax_number, payment_details, notes }) {
  const result = await pool.query(
    `INSERT INTO vendors (vendor_code, name, type, contact_person, email, phone, address, tax_number, payment_details, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [vendor_code, name, type || null, contact_person || null, email || null, phone || null, address || null, tax_number || null, payment_details || null, notes || null]
  );
  return result.rows[0];
}

async function getAllVendors() {
  const result = await pool.query('SELECT * FROM vendors ORDER BY name');
  return result.rows;
}

module.exports = { createVendor, getAllVendors };