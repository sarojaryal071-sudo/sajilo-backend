// Chat routes — Express routes for chat REST API protected by auth guard
const router = require('express').Router()
const chatController = require('./chat.controller')
const authGuard = require('../../middleware/auth.guard')

router.use(authGuard)
router.post('/send', chatController.sendMessage)
router.get('/conversations', chatController.getConversations)
router.get('/conversations/:conversationId/messages', chatController.getMessages)

module.exports = router