/**
 * Verification Service
 * Phase 17 — Worker Verification & Professional Onboarding System
 * 
 * Handles full verification lifecycle:
 * - Document submission
 * - Admin review (approve/reject)
 * - Status management
 * - Badge integration
 */

const { pool } = require('../../config/database');
const VERIFICATION_REGISTRY = require('../../config/verificationRegistry');

class VerificationService {
  /**
   * Get verification status for a worker
   * @param {number} workerId
   * @returns {Object} Verification record with documents
   */
  async getVerification(workerId) {
    const result = await pool.query(
      `SELECT * FROM worker_verifications WHERE worker_id = $1`,
      [workerId]
    );

    if (result.rows.length === 0) {
      return this._defaultVerification(workerId);
    }

    const verification = result.rows[0];
    const docs = await this._getDocuments(verification.id);

    return {
      ...verification,
      documents: docs,
      statusConfig: VERIFICATION_REGISTRY.statuses[verification.status] || null,
    };
  }

  /**
   * Submit verification with documents.
   * Creates verification record + document references.
   * @param {number} workerId
   * @param {Array} documents - [{ document_type, file_url, original_filename, file_size_bytes, mime_type }]
   */
  async submitVerification(workerId, documents) {
    // Validate document types
    const requiredTypes = Object.keys(VERIFICATION_REGISTRY.documentTypes).filter(
      t => VERIFICATION_REGISTRY.documentTypes[t].required
    );
    const submittedTypes = documents.map(d => d.document_type);
    const missingTypes = requiredTypes.filter(t => !submittedTypes.includes(t));

    if (missingTypes.length > 0) {
      throw new Error(`Missing required documents: ${missingTypes.join(', ')}`);
    }

    // Upsert verification record
    const existing = await pool.query(
      `SELECT id, status FROM worker_verifications WHERE worker_id = $1`,
      [workerId]
    );

    let verificationId;
    if (existing.rows.length > 0) {
      const currentStatus = existing.rows[0].status;
      const statusConfig = VERIFICATION_REGISTRY.statuses[currentStatus];
      
      if (!statusConfig?.allowsResubmit) {
        throw new Error(`Cannot resubmit verification in '${currentStatus}' status`);
      }

      // Update existing
      const updated = await pool.query(
        `UPDATE worker_verifications 
         SET status = 'submitted', submitted_at = NOW(), 
             rejection_reason = NULL, rejection_note = NULL,
             reviewed_at = NULL, reviewed_by = NULL, verified_at = NULL,
             updated_at = NOW()
         WHERE id = $1 RETURNING id`,
        [existing.rows[0].id]
      );
      verificationId = updated.rows[0].id;

      // Remove old documents
      await pool.query(
        `DELETE FROM verification_documents WHERE verification_id = $1`,
        [verificationId]
      );
    } else {
      // Create new
      const created = await pool.query(
        `INSERT INTO worker_verifications (worker_id, status, submitted_at)
         VALUES ($1, 'submitted', NOW()) RETURNING id`,
        [workerId]
      );
      verificationId = created.rows[0].id;
    }

    // Insert new documents
    for (const doc of documents) {
      await pool.query(
        `INSERT INTO verification_documents (verification_id, document_type, file_url, original_filename, file_size_bytes, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [verificationId, doc.document_type, doc.file_url, doc.original_filename || null, doc.file_size_bytes || null, doc.mime_type || null]
      );
    }

    return this.getVerification(workerId);
  }

  /**
   * Admin: Approve verification
   * @param {number} workerId
   * @param {number} adminId - Admin who approved
   */
  async approveVerification(workerId, adminId) {
    const result = await pool.query(
      `UPDATE worker_verifications 
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $2,
           verified_at = NOW(), rejection_reason = NULL, rejection_note = NULL,
           expires_at = $3, updated_at = NOW()
       WHERE worker_id = $1
       RETURNING *`,
      [
        workerId,
        adminId,
        VERIFICATION_REGISTRY.access.expiryDays
          ? `NOW() + INTERVAL '${VERIFICATION_REGISTRY.access.expiryDays} days'`
          : null,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('No verification record found for this worker');
    }

    return this.getVerification(workerId);
  }

  /**
   * Admin: Reject verification
   * @param {number} workerId
   * @param {number} adminId
   * @param {string} reason - Rejection reason ID from registry
   * @param {string} note - Optional admin note
   */
  async rejectVerification(workerId, adminId, reason, note = null) {
    // Validate reason
    const validReasons = VERIFICATION_REGISTRY.rejectionReasons.map(r => r.id);
    if (!validReasons.includes(reason)) {
      throw new Error(`Invalid rejection reason: ${reason}`);
    }

    const result = await pool.query(
      `UPDATE worker_verifications 
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $2,
           rejection_reason = $3, rejection_note = $4, updated_at = NOW()
       WHERE worker_id = $1
       RETURNING *`,
      [workerId, adminId, reason, note]
    );

    if (result.rows.length === 0) {
      throw new Error('No verification record found for this worker');
    }

    return this.getVerification(workerId);
  }

  /**
   * Get all pending verifications for admin queue
   */
  async getPendingVerifications() {
    const result = await pool.query(
      `SELECT v.*, u.name AS worker_name, u.client_id AS worker_client_id,
              u.created_at AS worker_created_at
       FROM worker_verifications v
       JOIN users u ON u.id = v.worker_id
       WHERE v.status = 'submitted'
       ORDER BY v.submitted_at ASC`
    );

    const verifications = [];
    for (const row of result.rows) {
      const docs = await this._getDocuments(row.id);
      verifications.push({ ...row, documents: docs });
    }

    return verifications;
  }

  /**
   * Check if worker is verified (for middleware/guards)
   */
  async isVerified(workerId) {
    const result = await pool.query(
      `SELECT status FROM worker_verifications WHERE worker_id = $1`,
      [workerId]
    );
    return result.rows.length > 0 && result.rows[0].status === 'approved';
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  async _getDocuments(verificationId) {
    const result = await pool.query(
      `SELECT * FROM verification_documents WHERE verification_id = $1 ORDER BY uploaded_at ASC`,
      [verificationId]
    );
    return result.rows;
  }

  _defaultVerification(workerId) {
    return {
      worker_id: workerId,
      status: 'pending',
      documents: [],
      statusConfig: VERIFICATION_REGISTRY.statuses.pending,
      submitted_at: null,
      reviewed_at: null,
      verified_at: null,
    };
  }
}

module.exports = new VerificationService();