const express = require('express');
const router = express.Router();
const staffController = require('./admin.staff.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');
const upload = require('../../middleware/upload.middleware');
const storageService = require('../../services/storage.service');
const staffProfileService = require('./staffProfile.service');

// All routes require authentication and manage_staff permission
router.use(authGuard);
router.use(permissionGuard('manage_staff'));

// List and create
router.get('/', staffController.listStaff);
router.post('/', staffController.createStaff);

// Upload document
router.post('/upload-document', upload.single('file'), async (req, res, next) => {
  try {
    const { staffCode, documentType } = req.body;
    if (!staffCode || !documentType) return res.status(400).json({ error: 'staffCode and documentType required' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const folder = `sajilo/staff/${staffCode}/${documentType}`;
    const result = await storageService.uploadFile(req.file, folder);
    return res.json({ success: true, url: result.url, publicId: result.publicId });
  } catch (err) {
    next(err);
  }
});

// Detail, role, status, profile update, password reset
router.get('/:id', staffController.getStaffById);
router.put('/:userId/role', staffController.changeStaffRole);
router.put('/:userId/status', staffController.changeStaffStatus);
router.put('/:userId/profile', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const updated = await staffProfileService.updateProfile(userId, req.body);
    if (!updated) return res.status(404).json({ error: 'Staff profile not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.post('/:userId/reset-password', staffController.resetStaffPassword);

module.exports = router;