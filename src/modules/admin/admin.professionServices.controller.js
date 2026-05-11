// sajilo-backend/src/modules/admin/admin.professionServices.controller.js
const professionServicesService = require('./professionServices.service');

async function getByProfession(req, res) {
  try {
    const services = await professionServicesService.getByProfession(Number(req.params.professionId));
    return res.json({ success: true, data: services });
  } catch (err) {
    console.error('getByProfession error:', err);
    return res.status(500).json({ error: 'Failed to fetch services' });
  }
}

async function create(req, res) {
  try {
    const { profession_id, label, label_np, sort_order, base_price } = req.body;
    if (!profession_id || !label) return res.status(400).json({ error: 'profession_id and label are required' });
    const service = await professionServicesService.create({ profession_id, label, label_np, sort_order, base_price });
    return res.status(201).json({ success: true, data: service });
  } catch (err) {
    console.error('create service error:', err);
    return res.status(500).json({ error: 'Failed to create service' });
  }
}

async function update(req, res) {
  try {
    const updated = await professionServicesService.update(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Service not found' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('update service error:', err);
    return res.status(500).json({ error: 'Failed to update service' });
  }
}

async function remove(req, res) {
  try {
    await professionServicesService.remove(Number(req.params.id));
    return res.json({ success: true });
  } catch (err) {
    console.error('remove service error:', err);
    return res.status(500).json({ error: 'Failed to remove service' });
  }
}

module.exports = { getByProfession, create, update, remove };