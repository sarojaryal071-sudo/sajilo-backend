const express = require('express');
const router = express.Router();
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');
const uiConfigService = require('../uiConfig/uiConfig.service');
const cloudinary = require('../../config/cloudinary');

// Admin uploads a brand asset → returns the Cloudinary URL
router.post(
  '/upload',
  authGuard,
  roleGuard('admin'),
  (req, res, next) => {
    // Use memory storage so we can control the upload ourselves
    const multer = require('multer');
    const uploadMem = multer({ storage: multer.memoryStorage() }).single('file');
    uploadMem(req, res, async (err) => {
      if (err) return next(err);
      try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const folder = req.body.folder || 'sajilo/brand';
        const cloudinary = require('../../config/cloudinary');

        // Upload to Cloudinary with the exact folder
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type: 'image',
              allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
              transformation: [
                { width: 512, height: 512, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        return res.json({ success: true, url: result.secure_url });
      } catch (err) {
        next(err);
      }
    });
  }
);

// Admin updates the branding config directly
router.put(
  '/branding',
  authGuard,
  roleGuard('admin'),
  async (req, res, next) => {
    try {
      const { branding } = req.body;
      if (!branding) return res.status(400).json({ error: 'branding object required' });

      const current = await uiConfigService.getDraftConfig('global');
      const updatedConfig = {
        ...current.config,
        branding: { ...(current.config.branding || {}), ...branding },
      };

      await uiConfigService.updateDraftConfig('global', updatedConfig, req.user.id);
      await uiConfigService.publishConfig('global', req.user.id);

      return res.json({ success: true, data: updatedConfig.branding });
    } catch (err) {
      next(err);
    }
  }
);

// List all images in the brand folder (Cloudinary Admin API)
router.get(
  '/list',
  authGuard,
  roleGuard('admin'),
  async (req, res, next) => {
    try {
      const prefix = req.query.folder || 'sajilo/brand/';   // default folder
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix,
        max_results: 100,
      });
      const images = (result.resources || []).map(r => ({
        url: r.secure_url,
        publicId: r.public_id,
        width: r.width,
        height: r.height,
        format: r.format,
        createdAt: r.created_at,
      }));
      return res.json({ success: true, data: images });
    } catch (err) {
      console.error('Cloudinary list error:', err);
      return res.status(500).json({ error: 'Failed to list images' });
    }
  }
);

// Delete an image by its public ID
router.delete(
  '/delete',
  authGuard,
  roleGuard('admin'),
  async (req, res, next) => {
    try {
      const { publicId } = req.body;
      if (!publicId) return res.status(400).json({ error: 'publicId is required' });
      await cloudinary.uploader.destroy(publicId);
      return res.json({ success: true });
    } catch (err) {
      console.error('Cloudinary delete error:', err);
      return res.status(500).json({ error: 'Failed to delete image' });
    }
  }
);

module.exports = router;