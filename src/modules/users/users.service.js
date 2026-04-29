const usersModel = require('./users.model')

async function getProfile(userId) {
  const user = await usersModel.findById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  return user
}

async function updateProfile(userId, fields) {
  const user = await usersModel.update(userId, fields)
  if (!user) {
    throw new Error('User not found')
  }
  return user
}

async function getWorkerProfile(userId) {
  const profile = await usersModel.getWorkerProfile(userId)
  if (!profile) throw new Error('Worker not found')
  return profile
}

async function updateWorkerProfile(userId, fields) {
  const profile = await usersModel.updateWorkerProfile(userId, fields)
  if (!profile) throw new Error('Worker not found')
  return profile
}

async function getWorkerEarnings(userId) {
  return usersModel.getWorkerEarnings(userId)
}

async function getWorkerSchedule(userId) {
  return usersModel.getWorkerAvailability(userId)
}

async function saveWorkerSchedule(userId, schedule) {
  return usersModel.saveWorkerAvailability(userId, schedule)
}
module.exports = { getProfile, updateProfile, getWorkerProfile, updateWorkerProfile, getWorkerEarnings, getWorkerSchedule, saveWorkerSchedule }