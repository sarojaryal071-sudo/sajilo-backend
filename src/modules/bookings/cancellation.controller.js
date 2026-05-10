const cancellationModel = require('./cancellation.model')

async function getUnacknowledged(req, res, next) {
  try {
    const items = await cancellationModel.getUnacknowledgedForWorker(req.user.id)
    res.json({ success: true, data: items })
  } catch (err) { next(err) }
}

async function acknowledge(req, res, next) {
  try {
    await cancellationModel.acknowledge(req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
}

module.exports = { getUnacknowledged, acknowledge }