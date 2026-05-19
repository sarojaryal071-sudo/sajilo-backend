const documentsService = require('./documents.service');

async function upload(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const { type } = req.body;
    if (!type) return res.status(400).json({ success: false, error: 'Document type is required' });

    const doc = await documentsService.uploadDocument(req.file, req.user.id, type);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function getMyDocuments(req, res) {
  try {
    const docs = await documentsService.getUserDocuments(req.user.id);
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    await documentsService.deleteDocument(Number(id), req.user.id);
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { upload, getMyDocuments, remove };