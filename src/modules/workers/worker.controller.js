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

async function getCategories(req, res) {
  try {
    const { getEnabledProfessions } = require('../../config/workerCategories')
    const categories = getEnabledProfessions()
    res.json({ success: true, data: categories })
  } catch (err) {
    next(err)
  }
}

module.exports = { getWorker, searchWorkers, getCategories }