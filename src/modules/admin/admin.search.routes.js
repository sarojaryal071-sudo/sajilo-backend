// sajilo-backend/src/modules/admin/admin.search.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

/**
 * GET /api/admin/search?q=...
 * Returns matching items from across the platform, grouped by type.
 */
router.get(
  '/',
  authGuard,
  roleGuard('admin'),
  async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      if (!q) {
        return res.json({ success: true, results: [] });
      }

      const like = `%${q}%`;
      const results = [];

      // ── Bookings ────────────────────────────────────
      const bookings = await pool.query(
        `SELECT id, service_name AS title, status AS subtitle, 'booking' AS type
         FROM bookings
         WHERE CAST(id AS TEXT) ILIKE $1 OR service_name ILIKE $1
         LIMIT 10`,
        [like]
      );
      results.push(...bookings.rows.map(r => ({
        type: r.type,
        id: r.id,
        title: `Booking #${r.id} — ${r.title || 'General Service'}`,
        subtitle: r.subtitle,
        url: `/admin/bookings`,
      })));

      // ── Payments ────────────────────────────────────
      const payments = await pool.query(
        `SELECT id, payment_id AS title, status AS subtitle, 'payment' AS type
         FROM payments
         WHERE payment_id::TEXT ILIKE $1 OR CAST(booking_id AS TEXT) ILIKE $1
         LIMIT 10`,
        [like]
      );
      results.push(...payments.rows.map(r => ({
        type: r.type,
        id: r.id,
        title: `Payment ${r.title}`,
        subtitle: r.subtitle,
        url: `/admin/payments`,
      })));

      // ── Workers ─────────────────────────────────────
      const workers = await pool.query(
        `SELECT id, name AS title, email AS subtitle, 'worker' AS type
         FROM users
         WHERE role = 'worker' AND (name ILIKE $1 OR email ILIKE $1 OR CAST(id AS TEXT) ILIKE $1)
         LIMIT 10`,
        [like]
      );
      results.push(...workers.rows.map(r => ({
        type: r.type,
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        url: `/admin/workers`,
      })));

      // ── Clients ─────────────────────────────────────
      const clients = await pool.query(
        `SELECT id, name AS title, email AS subtitle, 'customer' AS type
         FROM users
         WHERE role = 'customer' AND (name ILIKE $1 OR email ILIKE $1 OR CAST(id AS TEXT) ILIKE $1)
         LIMIT 10`,
        [like]
      );
      results.push(...clients.rows.map(r => ({
        type: r.type,
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        url: `/admin/customers`,
      })));

      // ── Support Tickets ─────────────────────────────
      const tickets = await pool.query(
        `SELECT id, category AS title, description AS subtitle, 'ticket' AS type
         FROM support_tickets
         WHERE description ILIKE $1 OR CAST(id AS TEXT) ILIKE $1
         LIMIT 10`,
        [like]
      );
      results.push(...tickets.rows.map(r => ({
        type: r.type,
        id: r.id,
        title: `Ticket #${r.id} — ${r.title}`,
        subtitle: r.subtitle?.slice(0, 100),
        url: `/admin/support`,
      })));

      // ── Reviews ─────────────────────────────────────
      const reviews = await pool.query(
        `SELECT r.id, r.rating::TEXT AS title, r.review_text AS subtitle, 'review' AS type
         FROM reviews r
         WHERE r.review_text ILIKE $1 OR CAST(r.booking_id AS TEXT) ILIKE $1
         LIMIT 10`,
        [like]
      );
      results.push(...reviews.rows.map(r => ({
        type: r.type,
        id: r.id,
        title: `Review (${r.title}★)`,
        subtitle: r.subtitle?.slice(0, 100) || 'No text',
        url: `/admin/reviews`,
      })));

      return res.json({ success: true, results });
    } catch (err) {
      console.error('Admin search error:', err);
      return res.status(500).json({ error: 'Search failed' });
    }
  }
);

module.exports = router;