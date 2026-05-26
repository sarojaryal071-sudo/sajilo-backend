const workerServicesService = require('./workerServices.service');
const { getIO } = require('../realtime/socket');
const { logAuditEvent } = require('../../services/audit.service');

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

    try {
      await logAuditEvent({
        req,
        actorId: workerId,
        action: 'worker.service_updated',
        entityType: 'worker_service',
        entityId: Number(req.params.id),
        entityDisplay: `Worker #${workerId} service ${req.params.id}`,
        summary: `Worker service updated (price: ${price}, active: ${is_active})`,
        severity: 'low',
        category: 'workers',
        outcome: 'success',
        newValues: { price, is_active },
      });
    } catch (auditErr) { console.error('Audit write failed (service update):', auditErr); }

    const io = getIO();
    if (io) io.emit('worker.services.updated', { workerId });
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

    try {
      await logAuditEvent({
        req,
        actorId: workerId,
        action: 'worker.service_created',
        entityType: 'worker_service',
        entityId: service.id,
        entityDisplay: `Worker #${workerId} custom service ${custom_label}`,
        summary: `Custom service created: ${custom_label}`,
        severity: 'low',
        category: 'workers',
        outcome: 'success',
        newValues: { profession_id, custom_label, price },
      });
    } catch (auditErr) { console.error('Audit write failed (create custom):', auditErr); }

    const io = getIO();
    if (io) io.emit('worker.services.updated', { workerId });
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

    try {
      await logAuditEvent({
        req,
        actorId: workerId,
        action: 'worker.service_activated',
        entityType: 'worker_service',
        entityId: service_id,
        entityDisplay: `Worker #${workerId} service ${service_id}`,
        summary: `Worker service ${is_active ? 'activated' : 'deactivated'}`,
        severity: 'low',
        category: 'workers',
        outcome: 'success',
        newValues: { is_active },
      });
    } catch (auditErr) { console.error('Audit write failed (activate):', auditErr); }

    const io = getIO();
    if (io) io.emit('worker.services.updated', { workerId });
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

    try {
      await logAuditEvent({
        req,
        actorId: workerId,
        action: 'worker.service_deleted',
        entityType: 'worker_service',
        entityId: Number(req.params.id),
        entityDisplay: `Worker #${workerId} service ${req.params.id}`,
        summary: `Worker service deleted`,
        severity: 'low',
        category: 'workers',
        outcome: 'success',
        oldValues: { service_id: req.params.id },
      });
    } catch (auditErr) { console.error('Audit write failed (delete):', auditErr); }

    const io = getIO();
    if (io) io.emit('worker.services.updated', { workerId });
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
      profession_id, small_max_price, medium_max_price
    });

    try {
      await logAuditEvent({
        req,
        actorId: workerId,
        action: 'worker.job_size_ranges_updated',
        entityType: 'worker',
        entityId: workerId,
        entityDisplay: `Worker #${workerId}`,
        summary: `Job size ranges updated for profession ${profession_id}`,
        severity: 'low',
        category: 'workers',
        outcome: 'success',
        newValues: { small_max_price, medium_max_price },
      });
    } catch (auditErr) { console.error('Audit write failed (job sizes):', auditErr); }

    const io = getIO();
    if (io) io.emit('worker.services.updated', { workerId });
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