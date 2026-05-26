// sajilo-backend/src/services/audit.service.js
const { pool } = require('../config/database');
const { AsyncLocalStorage } = require('async_hooks');
const { randomUUID } = require('crypto');

const auditContext = new AsyncLocalStorage();

function getCorrelationId() {
  const store = auditContext.getStore();
  return store?.correlationId || null;
}

function runWithCorrelationId(correlationId, fn) {
  const store = { correlationId, auditEmitted: false };
  return auditContext.run(store, fn);
}

/**
 * Insert an immutable audit event with operational context.
 * Never throws – failures are logged but never crash the caller.
 */
async function logAuditEvent({
  action,
  entityType  = null,
  entityId    = null,

  // Actor info – auto‑resolved if not provided
  actorId       = null,
  actorClientId = null,
  actorName     = null,
  actorRole     = 'system',
  actorRoleId   = null,
  actorRoleName = null,

  // Operational metadata
  entityDisplay = null,
  summary       = null,
  severity      = 'medium',
  category      = null,
  outcome       = null,
  reason        = null,

  metadata         = null,
  contextSnapshot  = null,

  oldValues = null,
  newValues = null,

  correlationId = null,    // explicit override

  req = null,
}) {
  try {
    // ── Resolve correlation ID: explicit > async context > new UUID ──
    const corrId = correlationId || getCorrelationId() || randomUUID();
        // Mark that an audit event was emitted in this context
    const store = auditContext.getStore();
    if (store) store.auditEmitted = true;

    // ── Auto‑resolve missing actor fields from actorId ──
    if (actorId && (!actorClientId || !actorName || !actorRoleName)) {
      try {
        const userRes = await pool.query(
          `SELECT u.client_id, u.name, u.role, r.name AS role_name
           FROM users u LEFT JOIN roles r ON r.id = u.role_id
           WHERE u.id = $1`, [actorId]
        );
        const u = userRes.rows[0] || {};
        if (!actorClientId && u.client_id)   actorClientId = u.client_id;
        if (!actorName     && u.name)        actorName     = u.name;
        if (!actorRoleName && u.role_name)   actorRoleName = u.role_name;
        if (!actorRole     && u.role)        actorRole     = u.role;
      } catch (_) { /* ignore – proceed with whatever we have */ }
    }

    // ── Build human‑readable actor label ──
    const actorLabel = actorClientId
      ? `${actorClientId} · ${actorName || 'Unknown'}`
      : (actorName || 'System');

    // ── Mask sensitive values ──
    const safeOld = maskSensitive(oldValues);
    const safeNew = maskSensitive(newValues);

    // ── Fallback summary ──
    const finalSummary = summary || `${actorRole} performed ${action}`;

    await pool.query(
      `INSERT INTO audit_logs
         (actor_id, actor_client_id, actor_name, actor_role, actor_role_id,
          actor_label, actor_role_name,
          action, entity_type, entity_id, entity_display, entity_label,
          summary, severity, category, outcome, reason,
          old_value, new_value, metadata, context_snapshot,
          ip_address, user_agent,
          correlation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,$22,$23,$24)`,
      [
        actorId, actorClientId, actorName, actorRole, actorRoleId,
        actorLabel, actorRoleName,
        action, entityType, entityId, entityDisplay, entityDisplay,
        finalSummary, severity, category, outcome, reason,
        safeOld ? JSON.stringify(safeOld) : null,
        safeNew ? JSON.stringify(safeNew) : null,
        metadata ? JSON.stringify(metadata) : null,
        contextSnapshot ? JSON.stringify(contextSnapshot) : null,
        req?.ip || null,
        req?.headers?.['user-agent'] || null,
        corrId,
      ]
    );
  } catch (err) {
    console.error('[audit.service] Failed to write audit log:', err.message);
  }
}

/** Remove sensitive fields from logged values */
function maskSensitive(values) {
  if (!values || typeof values !== 'object') return values;
  const masked = { ...values };
  if ('password' in masked) masked.password = '***';
  if ('password_hash' in masked) masked.password_hash = '***';
  if ('tempPassword' in masked) masked.tempPassword = '***';
  return masked;
}

/**
 * Wraps a business logic handler to automatically emit audit events
 * for success, failure, and exceptions.
 *
 * Usage:
 *   const safeHandler = withAudit(actualHandler, {
 *     action: 'payment.confirm',
 *     entityType: 'payment',
 *     entityIdResolver: (result) => result.id,
 *     entityDisplayResolver: (result) => `Payment #${result.id}`,
 *     severity: 'medium',
 *     category: 'payments',
 *     getSummary: (result, req) => 'Payment confirmed',
 *     getOldValues: (req) => ({ status: req.oldStatus }),
 *     getNewValues: (result) => ({ status: result.status }),
 *   });
 *
 * @param {Function} handler      – async (req, res, next) function
 * @param {Object}   auditConfig
 * @param {string}   auditConfig.action
 * @param {string}   auditConfig.entityType
 * @param {Function} [auditConfig.entityIdResolver]      – (result) => entityId
 * @param {Function} [auditConfig.entityDisplayResolver]  – (result) => display string
 * @param {string}   [auditConfig.severity='medium']
 * @param {string}   [auditConfig.category]
 * @param {Function} [auditConfig.getSummary]            – (result, req) => summary string
 * @param {Function} [auditConfig.getOldValues]           – (req) => oldValues object
 * @param {Function} [auditConfig.getNewValues]           – (result) => newValues object
 * @param {Function} [auditConfig.getActor]               – (req) => actorOverride object
 * @returns {Function} wrapped handler
 */
function withAudit(handler, auditConfig) {
  return async function(req, res, next) {
    try {
      // Call the original handler (expects it to throw on error)
      await handler(req, res, (err) => {
        if (err) throw err;
      });

      // If response has already been sent (handler called res.json), we can't
      // easily capture the result. We'll rely on the fact that the handler
      // usually returns the result or sets res.locals. As a convention,
      // handlers can attach result to res.locals.result.
      const result = res.locals.result;

      try {
        const entityId = auditConfig.entityIdResolver
          ? auditConfig.entityIdResolver(result, req)
          : null;
        const entityDisplay = auditConfig.entityDisplayResolver
          ? auditConfig.entityDisplayResolver(result, req)
          : null;

        await logAuditEvent({
          req,
          actorId: req.user?.id,
          action: auditConfig.action,
          entityType: auditConfig.entityType,
          entityId,
          entityDisplay,
          summary: auditConfig.getSummary
            ? auditConfig.getSummary(result, req)
            : `${auditConfig.action} completed`,
          severity: auditConfig.severity || 'medium',
          category: auditConfig.category || null,
          outcome: 'success',
          oldValues: auditConfig.getOldValues
            ? auditConfig.getOldValues(req)
            : null,
          newValues: auditConfig.getNewValues
            ? auditConfig.getNewValues(result, req)
            : null,
          ...(auditConfig.getActor
            ? auditConfig.getActor(req)
            : {}),
        });
      } catch (auditErr) {
        console.error('[withAudit] Success audit write failed:', auditErr);
      }
    } catch (err) {
      // Audit failure before sending error response
      try {
        await logAuditEvent({
          req,
          actorId: req.user?.id,
          action: auditConfig.action,
          entityType: auditConfig.entityType,
          summary: `${auditConfig.action} failed: ${err.message}`,
          severity: 'high',
          category: auditConfig.category || null,
          outcome: 'failure',
          reason: err.message,
          ...(auditConfig.getActor
            ? auditConfig.getActor(req)
            : {}),
        });
      } catch (auditErr) {
        console.error('[withAudit] Failure audit write failed:', auditErr);
      }
      // Re-throw to be handled by Express error handler
      next(err);
    }
  };
}

function wasAuditEmitted() {
  const store = auditContext.getStore();
  return store?.auditEmitted === true;
}

/**
 * AUDIT FLOW CONTRACT
 * ====================
 * Every critical business action MUST produce a structured audit event.
 *
 * REQUIRED fields (MUST be provided):
 *   action        – machine‑readable event code (e.g. 'payment.confirmed')
 *   entityType    – logical entity type ('payment', 'booking', 'user', etc.)
 *   entityId      – affected entity primary key
 *   actorId       – user ID of the actor (null for system actions)
 *   outcome       – 'success' | 'failure' | 'denied'
 *
 * STRONGLY RECOMMENDED:
 *   correlationId  – automatically provided by context; links events in a workflow
 *   severity       – 'low' | 'medium' | 'high' | 'critical'
 *   summary        – human‑readable one‑line description
 *   category       – functional grouping ('payments', 'bookings', 'security', etc.)
 *   oldValues      – snapshot before the change (for state transitions)
 *   newValues      – snapshot after the change
 *
 * OPTIONAL:
 *   metadata         – any extra structured data
 *   contextSnapshot  – operational state at the time of the event
 *   reason           – operator‑provided or system‑generated reason
 *
 * CORRELATION ID:
 *   The system automatically generates and propagates a UUID across
 *   HTTP requests, socket events, and background jobs.
 *   Do NOT pass correlationId manually unless you are bridging
 *   external workflows.
 *
 * ENFORCEMENT:
 *   Use withAudit() to guarantee audit events for critical handlers.
 *   In non‑production environments, the validation middleware warns
 *   if a mutation endpoint completes without emitting any audit event.
 */

module.exports = { logAuditEvent, getCorrelationId, runWithCorrelationId, withAudit, wasAuditEmitted };