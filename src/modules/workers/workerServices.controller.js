// sajilo-backend/src/modules/workers/workerServices.controller.js
const workerServicesService = require('./workerServices.service');
const { getIO } = require('../realtime/socket');

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

    // Notify clients so they can refetch this worker's services/prices
    const io = getIO();
    if (io) {
      io.emit('worker.services.updated', { workerId });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateService error:', err);
    return res.status(500).json({ error: 'Failed to update service' });
  }
}

async function createCustom(req, res) {
  try {
    console.log('🔧 createCustom body:', req.body);
    const workerId = req.user.id;
        const { profession_id, custom_label, custom_label_np, price } = req.body;
    if (!profession_id || !custom_label) return res.status(400).json({ error: 'profession_id and custom_label are required' });
    const service = await workerServicesService.createCustomService(workerId, { profession_id, custom_label, custom_label_np, price });
    
    // Notify clients
    const io = getIO();
    if (io) {
      io.emit('worker.services.updated', { workerId });
    }

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
    
    const io = getIO();
    if (io) {
      io.emit('worker.services.updated', { workerId });
    }

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
    
    const io = getIO();
    if (io) {
      io.emit('worker.services.updated', { workerId });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('deleteService error:', err);
    return res.status(500).json({ error: 'Failed to delete service' });
  }
}

async function getPublicServices(req, res) {
  try {
    const workerId = Number(req.params.workerId);
    const data = await workerServicesService.getPublicWorkerServices(workerId);
    return res.json({ success: true, data: { professions: data } });
  } catch (err) {
    console.error('getPublicServices error:', err);
    return res.status(500).json({ error: 'Failed to fetch worker services' });
  }
}

async function getJobSizeRanges(req, res) {
  try {
    const workerId = req.user.id;
    const ranges = await workerServicesService.getJobSizeRanges(workerId);
    return res.json({ success: true, data: ranges });
  } catch (err) {
    console.error('getJobSizeRanges error:', err);
    return res.status(500).json({ error: 'Failed to fetch job size ranges' });
  }
}

async function saveJobSizeRanges(req, res) {
  try {
    const workerId = req.user.id;
    const { profession_id, small_max_price, medium_max_price } = req.body;
    const ranges = await workerServicesService.saveJobSizeRanges(workerId, {
      profession_id,
      small_max_price,
      medium_max_price
    });

    // Emit unified refresh event for client detail pages
    const io = getIO();
    if (io) {
      io.emit('worker.services.updated', { workerId });
    }

    return res.json({ success: true, data: ranges });
  } catch (err) {
    console.error('saveJobSizeRanges error:', err);
    return res.status(400).json({ error: err.message || 'Failed to save job size ranges' });
  }
}

async function getPublicJobSizeRanges(req, res) {
  try {
    const workerId = Number(req.params.workerId);
    const ranges = await workerServicesService.getJobSizeRanges(workerId);
    return res.json({ success: true, data: ranges });
  } catch (err) {
    console.error('getPublicJobSizeRanges error:', err);
    return res.status(500).json({ error: 'Failed to fetch job size ranges' });
  }
}

module.exports = { getMyServices, updateService, createCustom, activateService, deleteService, getPublicServices, getJobSizeRanges, saveJobSizeRanges, getPublicJobSizeRanges };