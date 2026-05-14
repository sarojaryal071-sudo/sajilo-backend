const paymentChannelsService = require('./paymentChannels.service');

async function getChannels(req, res, next) {
  try {
    const channels = await paymentChannelsService.getChannels(req.user.id);
    res.json({ success: true, data: channels });
  } catch (err) { next(err); }
}

async function addChannel(req, res, next) {
  try {
    const channel = await paymentChannelsService.addChannel(req.user.id, req.body);
    res.json({ success: true, data: channel });
  } catch (err) { next(err); }
}

async function updateChannel(req, res, next) {
  try {
    const channel = await paymentChannelsService.updateChannel(parseInt(req.params.id), req.user.id, req.body);
    res.json({ success: true, data: channel });
  } catch (err) { next(err); }
}

async function deleteChannel(req, res, next) {
  try {
    await paymentChannelsService.deleteChannel(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'Channel removed' });
  } catch (err) { next(err); }
}

module.exports = { getChannels, addChannel, updateChannel, deleteChannel };