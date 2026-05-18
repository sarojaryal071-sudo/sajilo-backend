const { pool } = require('../../config/database')

console.log('LOADED ADMIN SERVICE:', __filename)
console.log('WORKER CATEGORY PATH:', require.resolve('../../config/workerCategories'))

async function getAllWorkers(statusFilter) {
  let query = `
    SELECT 
      u.id, u.email, u.role, u.name, u.phone, u.status, 
      u.client_id, u.skills, u.is_online, 
      u.completed_jobs, u.created_at,
      COALESCE(u.primary_skill, wa.primary_role) AS primary_skill
    FROM users u
    LEFT JOIN worker_applications wa ON wa.user_id = u.id
    WHERE u.role = 'worker'
  `
  const params = []

  if (statusFilter) {
    query += ` AND u.status = ANY($1)`
    params.push(statusFilter.split(','))
  }

  query += ` ORDER BY u.created_at DESC`

  const result = await pool.query(query, params)
  return result.rows
}

async function approveWorker(id) {
  const appResult = await pool.query(
    `SELECT primary_role FROM worker_applications WHERE user_id = $1`,
    [id]
  )
  const primaryRole = appResult.rows[0]?.primary_role || null

  const { getProfessionCode } = require('../../config/workerCategories')
  const professionCode = primaryRole ? getProfessionCode(primaryRole) : 'WK'

  // Get worker's current client_id BEFORE update for socket notification
  const userBefore = await pool.query(
    `SELECT client_id FROM users WHERE id = $1`,
    [id]
  )
  const oldClientId = userBefore.rows[0]?.client_id

  // Update primary_skill
  await pool.query(`UPDATE users SET primary_skill = $1 WHERE id = $2`, [primaryRole, id])

  // Generate new worker client ID
  const { approveWorkerClientId } = require('../auth/auth.model')
  const newClientId = await approveWorkerClientId(id, professionCode)

  // Final approval update
  const result = await pool.query(
    `UPDATE users SET status = 'active', client_id = $2, updated_at = NOW() WHERE id = $1 AND role = 'worker' RETURNING id, email, name, status, client_id`,
    [id, newClientId]
  )

  // Emit real‑time event to the worker's pending screen
  const { getIO } = require('../realtime/socket')
  const io = getIO()
  if (io && oldClientId) {
    io.to(`user:${oldClientId}`).emit('worker:approved', {
      status: 'active',
      client_id: newClientId,
      userId: id,
    })
  }

    // Notify worker of approval
  try {
    const notificationsService = require('../notification/notification.service');
    await notificationsService.createNotification({
      userId: id,
      userRole: 'worker',
      type: 'onboarding',
      title: 'Application Approved',
      message: 'Your worker application has been approved.',
      entityType: 'worker_application',
      entityId: null, // we don't have the application ID here, could query
      metadata: { action: 'approved', userId: id },
    });
  } catch (err) {
    console.error('Failed to notify worker of approval:', err);
  }

  return result.rows[0]
}

async function rejectWorker(id) {
  const result = await pool.query(
    `UPDATE users SET status = 'rejected', updated_at = NOW() WHERE id = $1 AND role = 'worker' RETURNING id, email, name, status`,
    [id]
  )
  if (!result.rows[0]) throw new Error('Worker not found')

      // Notify worker of rejection
  try {
    const notificationsService = require('../notification/notification.service');
    await notificationsService.createNotification({
      userId: id,
      userRole: 'worker',
      type: 'onboarding',
      title: 'Application Rejected',
      message: 'Your worker application was rejected.',
      entityType: 'worker_application',
      entityId: null,
      metadata: { action: 'rejected', userId: id },
    });
  } catch (err) {
    console.error('Failed to notify worker of rejection:', err);
  }
  
  return result.rows[0]
}

async function getStats() {
  const workers = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'worker'`)
  const bookings = await pool.query(`SELECT COUNT(*) FROM bookings`)
  const users = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'customer'`)
  
  return {
    totalWorkers: parseInt(workers.rows[0].count),
    totalBookings: parseInt(bookings.rows[0].count),
    totalUsers: parseInt(users.rows[0].count),
  }
}

module.exports = { getAllWorkers, approveWorker, rejectWorker, getStats }