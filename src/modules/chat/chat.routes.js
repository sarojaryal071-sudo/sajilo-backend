// Chat routes — Express routes for chat REST API protected by auth guard
const router = require('express').Router();
const chatController = require('./chat.controller');
const authGuard = require('../../middleware/auth.guard');
const upload = require('../../middleware/upload.middleware');
const storageService = require('../../services/storage.service');

router.use(authGuard);
router.post('/send', chatController.sendMessage);
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.get('/conversations/:conversationId/timeline', chatController.getTimeline);
router.delete('/conversations/:id', chatController.deleteConversation);

// Upload a file to the temp support folder
router.post('/upload', authGuard, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const { conversationId } = req.body;
    if (!conversationId) return res.status(400).json({ success: false, error: 'conversationId required' });

    // Upload to temp support folder
    const result = await storageService.uploadFile(req.file, 'sajilo/temp/support');

    // Save attachment record
    const { pool } = require('../../config/database');
    const attachment = await pool.query(
      `INSERT INTO support_attachments (conversation_id, uploaded_by, attachment_type, file_url, public_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [conversationId, req.user.id, req.file.mimetype.startsWith('image/') ? 'image' : 'document', result.url, result.publicId]
    );

    res.json({ success: true, data: attachment.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;