const { pool } = require('../../config/database');

class PaymentChannelsService {
  async getChannels(workerId) {
    const result = await pool.query(
      'SELECT * FROM worker_payment_channels WHERE worker_id = $1 ORDER BY created_at ASC',
      [workerId]
    );
    return result.rows;
  }

  async addChannel(workerId, { provider, account_holder, account_number, qr_image_url }) {
    const result = await pool.query(
      `INSERT INTO worker_payment_channels (worker_id, provider, account_holder, account_number, qr_image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [workerId, provider, account_holder, account_number, qr_image_url || null]
    );
    return result.rows[0];
  }

  async updateChannel(channelId, workerId, { provider, account_holder, account_number, qr_image_url, is_active }) {
    const result = await pool.query(
      `UPDATE worker_payment_channels
       SET provider = COALESCE($1, provider),
           account_holder = COALESCE($2, account_holder),
           account_number = COALESCE($3, account_number),
           qr_image_url = COALESCE($4, qr_image_url),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6 AND worker_id = $7
       RETURNING *`,
      [provider, account_holder, account_number, qr_image_url, is_active, channelId, workerId]
    );
    return result.rows[0];
  }

  async deleteChannel(channelId, workerId) {
    await pool.query('DELETE FROM worker_payment_channels WHERE id = $1 AND worker_id = $2', [channelId, workerId]);
  }
}

module.exports = new PaymentChannelsService();