// sajilo-backend/src/modules/workers/workerServices.controller.js
const workerServicesService = require('./workerServices.service');

async function getMyServices(req, res) {
  try {
    const workerId = req.user.id;
    const data = await workerServicesService.getWorkerServices(workerId);
    return res.json({ success: true, data: { professions: data } });
  } catch (err) {
    console.error('getMyServices error:', err);
    return res.status(500).json({ error: 'Failed to fetch worker services' });
  }
}

async function updateService(req, res) {
  try {
    const workerId = req.user.id;
    const { price, is_active } = req.body;
    const updated = await workerServicesService.updateWorkerService(workerId, Number(req.params.id), { price, is_active });
    if (!updated) return res.status(404).json({ error: 'Worker service not found' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateService error:', err);
    return res.status(500).json({ error: 'Failed to update service' });
  }
}

async function createCustom(req, res) {
  try {
    const workerId = req.user.id;
    const { profession_id, custom_label, price } = req.body;
    if (!profession_id || !custom_label) return res.status(400).json({ error: 'profession_id and custom_label are required' });
    const service = await workerServicesService.createCustomService(workerId, { profession_id, custom_label, price });
    return res.status(201).json({ success: true, data: service });
  } catch (err) {
    console.error('createCustom error:', err);
    return res.status(500).json({ error: 'Failed to create custom service' });
  }
}


async function activateService(req, res) {
  try {
    const workerId = req.user.id;
    const { service_id, profession_id, is_active } = req.body;
    if (!service_id || !profession_id) return res.status(400).json({ error: 'service_id and profession_id are required' });
    const row = await workerServicesService.activateService(workerId, profession_id, service_id, is_active !== false);
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('activateService error:', err);
    return res.status(500).json({ error: 'Failed to activate service' });
  }
}

async function deleteService(req, res) {
  try {
    const workerId = req.user.id;
    await workerServicesService.deleteWorkerService(workerId, Number(req.params.id));
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteService error:', err);
    return res.status(500).json({ error: 'Failed to delete service' });
  }
}

module.exports = { getMyServices, updateService, createCustom, activateService, deleteService };