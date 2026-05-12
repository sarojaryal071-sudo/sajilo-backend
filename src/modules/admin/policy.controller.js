// sajilo-backend/src/modules/admin/policy.controller.js
const policyService = require('./policy.service');

/**
 * GET /api/admin/policies
 * List all platform policies.
 */
async function getAll(req, res) {
  try {
    const policies = await policyService.getAllPolicies();
    return res.json({ success: true, data: policies });
  } catch (err) {
    console.error('getAllPolicies error:', err);
    return res.status(500).json({ error: 'Failed to fetch policies' });
  }
}

/**
 * PUT /api/admin/policies/:key
 * Update a single policy.
 * Body: { value, description }
 */
async function update(req, res) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const adminId = req.user.id;

    if (!key) {
      return res.status(400).json({ error: 'Policy key is required' });
    }
    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }

    const policy = await policyService.setPolicy(key, value, description || null, adminId);
    return res.json({ success: true, data: policy });
  } catch (err) {
    console.error('updatePolicy error:', err);
    return res.status(500).json({ error: 'Failed to update policy' });
  }
}

module.exports = { getAll, update };