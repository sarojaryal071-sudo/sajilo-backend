const usersService = require('./users.service')

async function getMe(req, res, next) {
  try {
    const user = await usersService.getProfile(req.user.id)
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await usersService.updateProfile(req.user.id, req.body)
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

async function getWorkerMe(req, res, next) {
  try {
    const profile = await usersService.getWorkerProfile(req.user.id)
    res.json({ success: true, data: profile })
  } catch (err) { next(err) }
}

async function updateWorkerMe(req, res, next) {
  try {
    const profile = await usersService.updateWorkerProfile(req.user.id, req.body)
    res.json({ success: true, data: profile })
  } catch (err) { next(err) }
}

async function getWorkerEarnings(req, res, next) {
  try {
    const earnings = await usersService.getWorkerEarnings(req.user.id)
    res.json({ success: true, data: earnings })
  } catch (err) { next(err) }
}

async function getSchedule(req, res, next) {
  try {
    const schedule = await usersService.getWorkerSchedule(req.user.id)
    res.json({ success: true, data: schedule })
  } catch (err) { next(err) }
}

async function saveSchedule(req, res, next) {
  try {
    const schedule = await usersService.saveWorkerSchedule(req.user.id, req.body.schedule)
    res.json({ success: true, data: schedule })
  } catch (err) { next(err) }
}
module.exports = { getMe, updateMe, getWorkerMe, updateWorkerMe, getWorkerEarnings, getSchedule, saveSchedule }