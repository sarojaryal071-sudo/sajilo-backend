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

  async updateChannel(channelId, workerId, { account_holder, account_number, qr_image_url, is_active }) {
    const result = await pool.query(
      `UPDATE worker_payment_channels
       SET account_holder = COALESCE($1, account_holder),
           account_number = COALESCE($2, account_number),
           qr_image_url = COALESCE($3, qr_image_url),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5 AND worker_id = $6
       RETURNING *`,
      [account_holder, account_number, qr_image_url, is_active, channelId, workerId]
    );
    return result.rows[0];
  }

  async deleteChannel(channelId, workerId) {
    await pool.query('DELETE FROM worker_payment_channels WHERE id = $1 AND worker_id = $2', [channelId, workerId]);
  }
}

module.exports = new PaymentChannelsService();