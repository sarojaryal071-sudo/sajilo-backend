const uiConfigService = require('./uiConfig.service');

async function getPublished(req, res, next) {
  try {
    const config = await uiConfigService.getPublishedConfig(req.params.scope);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
}

async function getDraft(req, res, next) {
  try {
    const config = await uiConfigService.getDraftConfig(req.params.scope);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
}

async function updateDraft(req, res, next) {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ success: false, message: 'config is required' });
    const result = await uiConfigService.updateDraftConfig(req.params.scope, config, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function publishConfig(req, res, next) {
  try {
    const result = await uiConfigService.publishConfig(req.params.scope, req.user.id);
    res.json({ success: true, data: result, message: 'Config published' });
  } catch (err) { next(err); }
}

async function resetDraft(req, res, next) {
  try {
    const result = await uiConfigService.resetDraft(req.params.scope);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function getPublishedTokens(req, res, next) {
  try {
    const tokens = await uiConfigService.getPublishedTokens(req.params.scope);
    res.json({ success: true, data: tokens });
  } catch (err) { next(err); }
}

module.exports = { getPublished, getDraft, updateDraft, publishConfig, resetDraft, getPublishedTokens };