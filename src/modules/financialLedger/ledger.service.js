// sajilo-backend/src/modules/financialLedger/ledger.service.js
const { pool } = require('../../config/database');
const { onLedgerEntryCreated } = require('../accounting/ledgerEventListener');

class LedgerService {
  /**
   * Core insert – append-only, never mutate after creation.
   */
  async createEntry({
    booking_id,
    payment_id,
    worker_id,
    customer_id,
    event_type,
    amount,
    currency = 'NPR',
    metadata = {},
    created_by_role = null,
    created_by_user = null,
  }) {
    const result = await pool.query(
      `INSERT INTO financial_ledger
         (booking_id, payment_id, worker_id, customer_id, event_type, amount, currency, metadata, created_by_role, created_by_user)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        booking_id || null,
        payment_id || null,
        worker_id || null,
        customer_id || null,
        event_type,
        amount,
        currency,
        JSON.stringify(metadata),
        created_by_role,
        created_by_user,
      ]
    );
    const entry = result.rows[0];
    // Fire‑and‑forget accounting hook – never blocks ledger
    onLedgerEntryCreated(entry);
    return entry;
  }

  /**
   * Called after confirmInvoice.
   * Snapshots commission at invoice finalization time.
   */
  async createInvoiceFinalizedEntry(payment, workerId) {
    const commissionPercent = 5; // hardcoded for now; move to config later
    const finalTotal = parseFloat(payment.final_total || payment.total || 0);
    const commissionAmount = Math.round(finalTotal * (commissionPercent / 100) * 100) / 100;
    const workerNet = Math.round((finalTotal - commissionAmount) * 100) / 100;

    return this.createEntry({
      booking_id: payment.booking_id,
      payment_id: payment.id,
      worker_id: payment.worker_id,
      customer_id: payment.customer_id,
      event_type: 'invoice_finalized',
      amount: finalTotal,
      currency: payment.currency || 'NPR',
      metadata: {
        subtotal: parseFloat(payment.subtotal || 0),
        discount: parseFloat(payment.discount_amount || 0),
        extra_charges: payment.extra_items_json || [],
        payment_method: payment.method,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        worker_net_amount: workerNet,
        invoice_confirmed_at: payment.invoice_confirmed_at,
      },
      created_by_role: 'worker',
      created_by_user: workerId,
    });
  }

  /**
   * Called after markCashPaid (and future digital confirmations).
   */
  async createPaymentConfirmedEntry(payment, confirmedByRole, confirmedByUser) {
    const metadata = {
      method: payment.method,
      paid_at: payment.paid_at || new Date().toISOString(),
      confirmed_by: confirmedByRole,
    };

    // Attach digital payment metadata when present
    if (payment.payment_provider) metadata.provider = payment.payment_provider;
    if (payment.payment_channel_id) metadata.payment_channel_id = payment.payment_channel_id;
    if (payment.confirmation_source) metadata.confirmation_source = payment.confirmation_source;

    return this.createEntry({
      booking_id: payment.booking_id,
      payment_id: payment.id,
      worker_id: payment.worker_id,
      customer_id: payment.customer_id,
      event_type: 'payment_confirmed',
      amount: parseFloat(payment.final_total || payment.total || 0),
      currency: payment.currency || 'NPR',
      metadata,
      created_by_role: confirmedByRole,
      created_by_user: confirmedByUser,
    });
  }

  /**
   * Get ledger entries for a worker (future earnings statement).
   */
  async getWorkerLedger(workerId, limit = 50) {
    const result = await pool.query(
      `SELECT * FROM financial_ledger
       WHERE worker_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [workerId, limit]
    );
    return result.rows;
  }

  async getLedgerTimeline(limit = 50) {
    const result = await pool.query(
      `SELECT fl.*, u.name AS worker_name, u.client_id AS worker_client_id
       FROM financial_ledger fl
       LEFT JOIN users u ON u.id = fl.worker_id
       ORDER BY fl.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
}

  /**
   * Get total commission owed by a worker (unpaid).
   */
  async getCommissionDue(workerId) {
    const result = await pool.query(
      `SELECT
         COALESCE(SUM((metadata->>'commission_amount')::numeric), 0) AS total_commission,
         COALESCE(SUM((metadata->>'commission_amount')::numeric)
           FILTER (WHERE event_type = 'commission_settled'), 0) AS settled_commission
       FROM financial_ledger
       WHERE worker_id = $1
         AND event_type IN ('invoice_finalized', 'commission_settled')`,
      [workerId]
    );
    const row = result.rows[0];
    const total = parseFloat(row.total_commission) || 0;
    const settled = parseFloat(row.settled_commission) || 0;
    return { total, settled, due: Math.round((total - settled) * 100) / 100 };
  }

  /**
   * Admin: get financial overview.
   */
  async getOverview() {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_events,
         COALESCE(SUM(amount) FILTER (WHERE event_type = 'invoice_finalized'), 0) AS total_invoiced,
         COALESCE(SUM(amount) FILTER (WHERE event_type = 'payment_confirmed'), 0) AS total_paid,
         COALESCE(SUM((metadata->>'commission_amount')::numeric)
           FILTER (WHERE event_type = 'invoice_finalized'), 0) AS total_commission,
         COALESCE(SUM((metadata->>'commission_amount')::numeric)
           FILTER (WHERE event_type = 'commission_settled'), 0) AS settled_commission
       FROM financial_ledger`
    );
    const row = result.rows[0];
    return {
      totalEvents: row.total_events,
      totalInvoiced: parseFloat(row.total_invoiced) || 0,
      totalPaid: parseFloat(row.total_paid) || 0,
      totalCommission: parseFloat(row.total_commission) || 0,
      settledCommission: parseFloat(row.settled_commission) || 0,
      unpaidCommission: Math.round(
        ((parseFloat(row.total_commission) || 0) - (parseFloat(row.settled_commission) || 0)) * 100
      ) / 100,
    };
  }
}

module.exports = new LedgerService();