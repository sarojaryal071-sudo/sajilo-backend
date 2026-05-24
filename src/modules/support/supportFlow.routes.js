const router = require('express').Router();
const authGuard = require('../../middleware/auth.guard');
const supportFlowService = require('./supportFlow.service');

// POST /api/support-flow/start
router.post('/start', authGuard, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const result = await supportFlowService.startSession(userId, userRole);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/support-flow/next
router.post('/next', authGuard, async (req, res, next) => {
  try {
    const { conversationId, currentNodeId, selectedOption, input, flowState } = req.body;
    if (!conversationId || !currentNodeId || !selectedOption) {
      return res.status(400).json({ success: false, error: 'conversationId, currentNodeId, and selectedOption are required' });
    }
    const result = await supportFlowService.nextNode(conversationId, currentNodeId, selectedOption, input || null, flowState || {});
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;