const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

router.get('/', async (req, res) => {
  try {
    // Find the "other-services" profession (slug)
    const professionResult = await pool.query(
      'SELECT id, name, slug, icon FROM professions WHERE slug = $1 AND is_active = true',
      ['other-services']
    );

    if (professionResult.rows.length === 0) {
      return res.json({
        success: true,
        data: { category: null, services: [] },
      });
    }

    const profession = professionResult.rows[0];

    // Get active services under this profession
    const servicesResult = await pool.query(
      'SELECT id, label AS name, base_price, sort_order FROM profession_services WHERE profession_id = $1 AND is_active = true ORDER BY sort_order, id',
      [profession.id]
    );

    return res.json({
      success: true,
      data: {
        category: {
          id: profession.id,
          name: profession.name,
          slug: profession.slug,
          icon: profession.icon,
        },
        services: servicesResult.rows.map(s => ({
          ...s,
          is_active: true,
        })),
      },
    });
  } catch (err) {
    console.error('otherServices error:', err);
    return res.status(500).json({ error: 'Failed to fetch other services' });
  }
});

module.exports = router;