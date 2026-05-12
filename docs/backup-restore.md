# Sajilo – Database Backup & Restore

This document explains how to back up and restore the Sajilo database in production
using native PostgreSQL tools.

---

## Prerequisites

- PostgreSQL client tools installed (`pg_dump`, `pg_restore`, `psql`).
- Network access to the production database.
- Database connection details (host, port, database name, user, password).

---

## 1. Create a Backup

Run the following command from your terminal (replace the placeholders):

```bash
export PGPASSWORD="your_db_password"

pg_dump \
  -h your_db_host \
  -p 5432 \
  -U your_db_user \
  -d your_db_name \
  -F c \                     # Custom format (compressed, suitable for pg_restore)
  -f sajilo_backup_$(date +%Y%m%d_%H%M%S).dump