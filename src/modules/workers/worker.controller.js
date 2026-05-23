/*
 * Worker Controller — request handlers for worker routes
 */
const workerService = require('./worker.service')

async function getWorker(req, res, next) {
  try {
    const worker = await workerService.getWorkerProfile(req.params.id)
    res.json({ success: true, data: worker })
  } catch (err) {
    next(err)
  }
}

async function searchWorkers(req, res, next) {
  try {
    const workers = await workerService.searchWorkers(req.query)
    res.json({ success: true, data: workers })
  } catch (err) {
    next(err)
  }
}

async function getCategories(req, res, next) {
  try {
    const { pool } = require('../../config/database');
        const result = await pool.query(
      'SELECT id, slug, name, name_np, icon, icon_image_url, sort_order, is_active, display_section FROM professions WHERE is_active = true ORDER BY sort_order, id'
    );
    const categories = result.rows.map(prof => ({
      id: prof.id,
      role: prof.slug,
      label: prof.name,
      name: prof.name,
      name_np: prof.name_np,
      icon: prof.icon,
      icon_image_url: prof.icon_image_url,
      enabled: prof.is_active,
      sort_order: prof.sort_order,
      display_section: prof.display_section || 'primary',
    }));
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

module.exports = { getWorker, searchWorkers, getCategories }