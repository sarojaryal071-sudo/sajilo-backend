/*
 * Worker Service — business logic for worker operations
 */
const workerModel = require('./worker.model')
const { getProfessionCode } = require('../../config/workerCategories')

async function getWorkerProfile(id) {
  const worker = await workerModel.findById(id)
  if (!worker) throw new Error('Worker not found')
  
  return {
    ...worker,
    profession_code: worker.skills?.[0] ? getProfessionCode(worker.skills[0]) : 'WK',
  }
}

async function searchWorkers(filters) {
  return workerModel.searchWorkers(filters)
}

module.exports = { getWorkerProfile, searchWorkers }