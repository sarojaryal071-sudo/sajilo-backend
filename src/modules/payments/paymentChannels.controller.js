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

async function getPublicChannels(req, res, next) {
  try {
    const workerId = parseInt(req.params.workerId);
    if (!workerId) return res.status(400).json({ success: false, message: 'Invalid worker ID' });

    const channels = await paymentChannelsService.getChannels(workerId);
    
    // Mask sensitive data for public view
    const publicChannels = channels
      .filter(ch => ch.is_active)
      .map(ch => ({
        provider: ch.provider,
        qr_image_url: ch.qr_image_url || null,
        masked_account_number: maskAccountNumber(ch.account_number),
        display_name: maskName(ch.account_holder),
      }));

    res.json({ success: true, data: publicChannels });
  } catch (err) { next(err); }
}

function maskAccountNumber(num) {
  if (!num || num.length < 4) return num || '—';
  return num.slice(0, 2) + '••••' + num.slice(-2);
}

function maskName(name) {
  if (!name) return '—';
  return name[0] + '••••';
}

module.exports = { getChannels, addChannel, updateChannel, deleteChannel, getPublicChannels };
