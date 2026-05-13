/**
 * Verification Review Service
 * Phase 17.2 — Document-Level Verification Review System
 * 
 * Handles per-document review operations:
 * - Create review decisions per document
 * - Get worker's review status
 * - Get pending documents for admin
 * - Update document statuses
 */

const { pool } = require('../../config/database');
const VERIFICATION_REGISTRY = require('../../config/verificationRegistry');

class VerificationReviewService {
  /**
   * Create a review decision for a document or full application.
   * @param {Object} params
   * @param {number} params.workerId
   * @param {number} params.verificationId
   * @param {number|null} params.documentId - null for full application review
   * @param {string} params.documentType
   * @param {string} params.status - 'approved' | 'rejected'
   * @param {string|null} params.reasonCode
   * @param {string|null} params.reasonText
   * @param {number} params.reviewedBy - admin ID
   */
  async createReview({ workerId, verificationId, documentId, documentType, status, reasonCode, reasonText, reviewedBy }) {
    const result = await pool.query(
      `INSERT INTO verification_reviews (worker_id, verification_id, document_id, document_type, status, reason_code, reason_text, reviewed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [workerId, verificationId, documentId || null, documentType, status, reasonCode || null, reasonText || null, reviewedBy]
    );
    return result.rows[0];
  }

  /**
   * Get all reviews for a worker's current verification.
   * @param {number} workerId
   * @returns {Object} Review status per document
   */
  async getWorkerReviews(workerId) {
    // Get current verification
    const verification = await pool.query(
      `SELECT id, status FROM worker_verifications WHERE worker_id = $1`,
      [workerId]
    );

    if (verification.rows.length === 0) {
      return { workerId, status: 'pending', documents: [], reviews: [] };
    }

    const verificationId = verification.rows[0].id;

    // Get documents
    const docs = await pool.query(
      `SELECT * FROM verification_documents WHERE verification_id = $1 ORDER BY uploaded_at ASC`,
      [verificationId]
    );

    // Get reviews
    const reviews = await pool.query(
      `SELECT vr.*, u.name AS reviewer_name
       FROM verification_reviews vr
       LEFT JOIN users u ON u.id = vr.reviewed_by
       WHERE vr.worker_id = $1 AND vr.verification_id = $2
       ORDER BY vr.created_at DESC`,
      [workerId, verificationId]
    );

    // Map reviews to documents
    const documents = docs.rows.map(doc => {
      const docReviews = reviews.rows.filter(r => r.document_id === doc.id);
      const latestReview = docReviews[0] || null;
      return {
        ...doc,
        reviewStatus: latestReview?.status || 'pending',
        rejectionReason: latestReview?.reason_code || null,
        rejectionText: latestReview?.reason_text || null,
        reviewedAt: latestReview?.created_at || null,
        reviewedBy: latestReview?.reviewer_name || null,
      };
    });

    // Also include full-application reviews (document_id IS NULL)
    const fullAppReviews = reviews.rows.filter(r => r.document_id === null);

    return {
      workerId,
      verificationId,
      status: verification.rows[0].status,
      documents,
      fullAppReviews,
      reviews: reviews.rows,
    };
  }

  /**
   * Get all documents pending admin review.
   * Returns workers with submitted verifications that have unreviewed documents.
   */
  async getPendingDocuments() {
    const result = await pool.query(
      `SELECT v.worker_id, v.id AS verification_id, v.status, v.submitted_at,
              u.name AS worker_name, u.client_id AS worker_client_id,
              COUNT(d.id) AS total_documents,
              COUNT(vr.id) FILTER (WHERE vr.status IS NOT NULL) AS reviewed_documents
       FROM worker_verifications v
       JOIN users u ON u.id = v.worker_id
       LEFT JOIN verification_documents d ON d.verification_id = v.id
       LEFT JOIN verification_reviews vr ON vr.verification_id = v.id AND vr.document_id = d.id
       WHERE v.status = 'submitted'
       GROUP BY v.worker_id, v.id, v.status, v.submitted_at, u.name, u.client_id
       ORDER BY v.submitted_at ASC`
    );

    return result.rows.map(r => ({
      ...r,
      pendingDocuments: r.total_documents - r.reviewed_documents,
    }));
  }

  /**
   * Get my review status (worker-facing).
   * @param {number} workerId
   */
  async getMyReviewStatus(workerId) {
    const reviews = await this.getWorkerReviews(workerId);
    
    const rejectedDocs = reviews.documents.filter(d => d.reviewStatus === 'rejected');
    const approvedDocs = reviews.documents.filter(d => d.reviewStatus === 'approved');
    const pendingDocs = reviews.documents.filter(d => d.reviewStatus === 'pending');

    return {
      workerId,
      status: reviews.status,
      canResubmit: reviews.status === 'rejected',
      summary: {
        total: reviews.documents.length,
        approved: approvedDocs.length,
        rejected: rejectedDocs.length,
        pending: pendingDocs.length,
      },
      rejectedDocuments: rejectedDocs.map(d => ({
        documentId: d.id,
        documentType: d.document_type,
        reason: d.rejectionReason,
        reasonText: d.rejectionText,
      })),
      documents: reviews.documents,
    };
  }

  /**
   * Update document status after admin review.
   * @param {number} reviewId
   * @param {string} status - 'approved' | 'rejected'
   */
  async updateReviewStatus(reviewId, status) {
    const result = await pool.query(
      `UPDATE verification_reviews SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, reviewId]
    );
    return result.rows[0];
  }
}

module.exports = new VerificationReviewService();