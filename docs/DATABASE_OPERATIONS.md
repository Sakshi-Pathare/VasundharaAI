# Vasundhara AI — PostgreSQL Setup, Migrations & Backup Operations

---

## 1. PostgreSQL Database Provisioning

### 1.1. Create Database & User
Connect to your PostgreSQL server with administrative credentials and execute:

```sql
-- 1. Create a dedicated database user
CREATE USER vasundhara_user WITH PASSWORD 'SecurePassword2026!';

-- 2. Create the production database owned by the new user
CREATE DATABASE vasundhara_db OWNER vasundhara_user;

-- 3. Grant schema permissions
\c vasundhara_db
GRANT ALL ON SCHEMA public TO vasundhara_user;
```

### 1.2. Configure `DATABASE_URL`
In your `backend/.env` file:

```env
# Format: postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql+psycopg://vasundhara_user:SecurePassword2026!@localhost:5432/vasundhara_db
```

---

## 2. Database Migrations (Alembic)

Vasundhara AI manages all schema evolutions through Alembic.

### 2.1. Run Migrations to Latest Schema (`upgrade head`)
```powershell
# From the backend directory
cd backend
python -m alembic upgrade head
```

### 2.2. Generate a New Schema Migration
After modifying SQLAlchemy models in `backend/app/models.py`:
```powershell
cd backend
python -m alembic revision --autogenerate -m "describe_schema_change"
```

### 2.3. Rollback the Last Migration
```powershell
cd backend
python -m alembic downgrade -1
```

### 2.4. Inspect Migration History
```powershell
cd backend
python -m alembic current
python -m alembic history --verbose
```

---

## 3. Backup and Disaster Recovery

### 3.1. Create a Full Compressed Backup (`pg_dump`)
```powershell
# Set environment variables for authentication
$env:PGPASSWORD="SecurePassword2026!"

# Export full database in custom compressed format
pg_dump -h localhost -p 5432 -U vasundhara_user -F c -b -v -f "vasundhara_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump" vasundhara_db
```

### 3.2. Plaintext SQL Backup (Schema + Data)
```powershell
pg_dump -h localhost -p 5432 -U vasundhara_user -d vasundhara_db -F p -f "vasundhara_backup.sql"
```

### 3.3. Restore from Backup (`pg_restore`)
```powershell
# Restore into an empty or recreation database
pg_restore -h localhost -p 5432 -U vasundhara_user -d vasundhara_db -v -c "vasundhara_backup.dump"
```

---

## 4. Connection Pool & Operational Safeguards

1. **Pre-Ping Verification:** `pool_pre_ping=True` is enabled on the SQLAlchemy engine to automatically detect and discard stale or closed connections before handing them to requests.
2. **Connection Pooling Parameters:**
   - `pool_size=10`: Up to 10 persistent worker connections.
   - `max_overflow=20`: Spikes can burst up to 30 concurrent connections.
   - `pool_recycle=1800`: Recycles idle connections every 30 minutes to prevent server timeouts.
3. **Atomic Transactions:** Always use the `transaction_scope(db)` context manager for multi-table writes:
   ```python
   with transaction_scope(db):
       db.add(report)
       db.add(audit_log)
       # Automatically commits on exit; automatically rolls back on any exception
   ```
4. **Health Check Command:**
   ```powershell
   curl http://localhost:8001/health
   # Returns: {"status": "ok", "database": "connected", "service": "vasundhara-ai-api"}
   ```
