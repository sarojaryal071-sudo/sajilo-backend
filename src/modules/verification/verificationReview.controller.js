const reviewService = require('./verificationReview.service');

async function createReview(req, res, next) {
  try {
    const { workerId, verificationId, documentId, documentType, status, reasonCode, reasonText } = req.body;
    if (!workerId || !verificationId || !status) {
      return res.status(400).json({ success: false, message: 'workerId, verificationId, and status are required' });
    }
    const review = await reviewService.createReview({
      workerId, verificationId, documentId: documentId || null,
      documentType: documentType || null, status,
      reasonCode: reasonCode || null, reasonText: reasonText || null,
      reviewedBy: req.user.id,
    });
    res.json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

async function getWorkerReviews(req, res, next) {
  try {
    const reviews = await reviewService.getWorkerReviews(req.params.workerId);
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

async function getMyReviewStatus(req, res, next) {
  try {
    const status = await reviewService.getMyReviewStatus(req.user.id);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
}

async function getPendingDocuments(req, res, next) {
  try {
    const documents = await reviewService.getPendingDocuments();
    res.json({ success: true, data: documents });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReview, getWorkerReviews, getMyReviewStatus, getPendingDocuments };