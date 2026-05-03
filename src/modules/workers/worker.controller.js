/*
 * Worker Controller — request handlers for worker routes
 */
const workerService = require('./worker.service')

async function getWorker(req, res, next) {
  try {
    const worker = await workerService.getWorkerProfile(req.params.id)
    res.json({ success: true, data: worker })
  } catch (err) {
    next(err)
  }
}

async function searchWorkers(req, res, next) {
  try {
    const workers = await workerService.searchWorkers(req.query)
    res.json({ success: true, data: workers })
  } catch (err) {
    next(err)
  }
}

module.exports = { getWorker, searchWorkers }