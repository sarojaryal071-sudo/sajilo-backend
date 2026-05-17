const dispatchService = require('./notificationDispatcher.service');

async function dispatch(req, res) {
  try {
    const { title, message, type, target } = req.body;
    const created_by = req.user?.id || null;

    const result = await dispatchService.dispatchNotification({
      title,
      message,
      type,
      target,
      created_by,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[Notification Dispatch] Error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = { dispatch };