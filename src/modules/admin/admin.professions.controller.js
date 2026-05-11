// sajilo-backend/src/modules/admin/admin.professions.controller.js
const professionsService = require('./professions.service');

async function getAll(req, res) {
  try {
    const professions = await professionsService.getAll();
    return res.json({ success: true, data: professions });
  } catch (err) {
    console.error('getAll professions error:', err);
    return res.status(500).json({ error: 'Failed to fetch professions' });
  }
}

async function getById(req, res) {
  try {
    const profession = await professionsService.getById(Number(req.params.id));
    if (!profession) return res.status(404).json({ error: 'Profession not found' });
    return res.json({ success: true, data: profession });
  } catch (err) {
    console.error('getById profession error:', err);
    return res.status(500).json({ error: 'Failed to fetch profession' });
  }
}

async function create(req, res) {
  try {
    const { slug, name, name_np, icon, sort_order } = req.body;
    if (!slug || !name) return res.status(400).json({ error: 'slug and name are required' });
    const profession = await professionsService.create({ slug, name, name_np, icon, sort_order });
    return res.status(201).json({ success: true, data: profession });
  } catch (err) {
    console.error('create profession error:', err);
    return res.status(500).json({ error: 'Failed to create profession' });
  }
}

async function update(req, res) {
  try {
    const updated = await professionsService.update(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Profession not found' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('update profession error:', err);
    return res.status(500).json({ error: 'Failed to update profession' });
  }
}

async function remove(req, res) {
  try {
    await professionsService.remove(Number(req.params.id));
    return res.json({ success: true });
  } catch (err) {
    console.error('remove profession error:', err);
    return res.status(500).json({ error: 'Failed to remove profession' });
  }
}

module.exports = { getAll, getById, create, update, remove };