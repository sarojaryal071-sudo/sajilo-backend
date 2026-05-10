const reviewsService = require('./reviews.service')

async function createReview(req, res, next) {
  try {
    const { booking_id, rating, review_text } = req.body
    const review = await reviewsService.createReview(booking_id, req.user.id, rating, review_text)
    res.status(201).json({ success: true, data: review })
  } catch (err) {
    next(err)
  }
}

async function getWorkerReviews(req, res, next) {
  try {
    const workerId = parseInt(req.params.workerId, 10)
    const [rating, reviews] = await Promise.all([
      reviewsService.getWorkerRating(workerId),
      reviewsService.getWorkerReviews(workerId),
    ])
    res.json({ success: true, data: { ...rating, reviews } })
  } catch (err) {
    next(err)
  }
}

module.exports = { createReview, getWorkerReviews }