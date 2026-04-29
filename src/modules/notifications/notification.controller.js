const notificationService = require('./notification.service')

async function send(req, res, next) {
  try {
    const result = await notificationService.sendNotification(req.body, req.user.id)
    res.json({
      success: true,
      data: {
        id: result.notification.id,
        recipientCount: result.recipientCount,
      },
    })
  } catch (err) {
    next(err)
  }
}

async function list(req, res, next) {
  try {
    const notificationModel = require('./notification.model')
    const notifications = await notificationModel.getAll()
    res.json({ success: true, data: notifications })
  } catch (err) {
    next(err)
  }
}

module.exports = { send, list }