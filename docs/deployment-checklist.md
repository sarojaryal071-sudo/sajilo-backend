# Sajilo – Deployment Checklist

Use this checklist for every production deployment to avoid regressions.

## 1. Pre‑deployment

- [ ] All changes tested locally (booking lifecycle, payments, chat, admin panel)
- [ ] All new migrations created in `src/migrations/`
- [ ] Database backup created (see `docs/backup-restore.md`)
- [ ] Environment variables reviewed (`.env` or hosting dashboard)
- [ ] `NODE_ENV` set to `production` on the backend
- [ ] `VITE_SENTRY_DSN` set in the frontend (optional)
- [ ] `BYPASS_RATE_LIMITER` is **NOT** set in production
- [ ] `VITE_API_URL` (or `API_URL`) points to the production backend

## 2. Database Migrations

- [ ] Run pending migrations on the production database:
  ```bash
  psql -h <host> -U <user> -d <db_name> -f src/migrations/017_create_audit_logs.sql
  psql -h <host> -U <user> -d <db_name> -f src/migrations/018_create_moderation_actions.sql
  psql -h <host> -U <user> -d <db_name> -f src/migrations/019_add_moderation_status_to_users.sql
  psql -h <host> -U <user> -d <db_name> -f src/migrations/020_create_support_tickets.sql
  psql -h <host> -U <user> -d <db_name> -f src/migrations/021_create_announcements.sql
  psql -h <host> -U <user> -d <db_name> -f src/migrations/022_create_system_activity_log.sql
  psql -h <host> -U <user> -d <db_name> -f src/migrations/023_add_created_by_to_users.sql
  psql -h <host> -U <user> -d <db_name> -f src/migrations/024_update_users_role_constraint.sql
  psql -h <host> -U <user> -d <db_name> -f src/migrations/025_create_platform_policies.sql