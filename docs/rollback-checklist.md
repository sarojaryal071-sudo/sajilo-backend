# Sajilo – Rollback Checklist

If a deployment causes critical issues, follow these steps to restore service quickly.

## 1. Backend Rollback (Render)

- [ ] Go to Render dashboard → your web service
- [ ] Click "Manual Deploy" → "Deploy a previous commit"
- [ ] Choose the last known good commit
- [ ] Wait for the deploy to finish
- [ ] Verify `/health` and `/api/system/status`

## 2. Frontend Rollback (Vercel)

- [ ] Go to Vercel dashboard → Deployments
- [ ] Find the last successful production deployment
- [ ] Click "..." → "Promote to Production"
- [ ] Wait for the promotion to complete
- [ ] Open the app and check the console for the correct build timestamp

## 3. Database Rollback (if migrations caused problems)

- [ ] Restore the latest backup (see `backup-restore.md`)
  ```bash
  pg_restore -h <host> -U <user> -d <db_name> --clean --if-exists <backup_file>