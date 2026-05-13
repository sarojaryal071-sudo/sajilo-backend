# Sajilo – Incident Response

What to do if the platform goes down or behaves unexpectedly.

## 1. Detect

- [ ] Check the **Deployment** page in the admin panel – any warnings?
- [ ] Check `/health` and `/api/system/status`
- [ ] Look at the backend logs (Render dashboard)
- [ ] Check Sentry (if configured) for frontend errors

## 2. Triage

- [ ] Is the database reachable? (`/health` shows `db: "ok"`)
- [ ] Are sockets connected? (Deployment page)
- [ ] Are workers and clients reporting issues? (Support tickets)

## 3. Mitigate

- [ ] If a deployment just happened, **roll back** (see `rollback-checklist.md`)
- [ ] If the database is down, check the hosting provider's status
- [ ] Turn on `MAINTENANCE_MODE` (Feature Flag) to block user actions if needed
- [ ] Restart the backend service (Render manual restart)

## 4. Communicate

- [ ] Post an **Announcement** (e.g., "We are investigating an issue...") to all users
- [ ] Notify your team via external channels
- [ ] Update the announcement when the issue is resolved

## 5. Recover

- [ ] Ensure `/health` is green
- [ ] Verify critical flows (booking, payment, chat) manually
- [ ] Turn off `MAINTENANCE_MODE`
- [ ] Post a follow‑up announcement: "Issue resolved"

## 6. Learn

- [ ] Document the root cause
- [ ] Create a support ticket for tracking
- [ ] Update this playbook if a new recovery step was needed