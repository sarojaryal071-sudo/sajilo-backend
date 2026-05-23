// sajilo-backend/src/modules/admin/documents.routes.js
const express = require('express');
const router = express.Router();
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');
const { pool } = require('../../config/database');

// GET /api/admin/documents/:workerId
// Returns all verification documents for a worker
router.get('/:workerId',
  authGuard,
  roleGuard('admin'),
  async (req, res, next) => {
    try {
      const { workerId } = req.params;

      // Find the latest verification for this worker
      const verifResult = await pool.query(
        `SELECT id FROM worker_verifications WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [workerId]
      );

      if (verifResult.rows.length === 0) {
        return res.json({ success: true, data: { verificationId: null, documents: [] } });
      }

      const verificationId = verifResult.rows[0].id;

      // Fetch documents
      const docsResult = await pool.query(
        `SELECT * FROM verification_documents WHERE verification_id = $1 ORDER BY uploaded_at ASC`,
        [verificationId]
      );

      return res.json({ success: true, data: { verificationId, documents: docsResult.rows } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;