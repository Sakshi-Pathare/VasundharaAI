# EcoWatch AI / Vasundhara AI — Database Backup & Recovery Guide

This operational manual documents zero-downtime, non-blocking database backup, verification, and disaster-recovery procedures for **Vasundhara AI**.

---

## 1. Architectural Strategy

Vasundhara AI supports both **SQLite (Development / Edge)** and **PostgreSQL (Cloud Production)**.

### A. SQLite Online Hot Backups
- **WAL Mode Compatibility**: SQLite is configured with Write-Ahead Logging (`PRAGMA journal_mode=WAL`) and `PRAGMA synchronous=NORMAL`.
- **Zero Downtime**: Backups are performed using the SQLite C-level Online Backup API (`sqlite3.connect.backup`), enabling hot backups while live read/write queries continue without locking collisions.
- **Integrity Validation**: Every backup copy is verified using `PRAGMA integrity_check` before compression.
- **Compression**: Backups are compressed with gzip (`.db.gz`) to reduce disk utilization by over 80%.

### B. PostgreSQL Production Backups
- Uses native `pg_dump` streaming into gzip archives.
- Can be scheduled as a sidecar cron job or managed Cloud SQL automated snapshot.

---

## 2. Using the Automated CLI Tool (`app.backup`)

The backend provides a built-in backup CLI: `backend/app/backup.py`.

### Create a Live Backup
```powershell
# From the project root
$env:PYTHONPATH='backend'
python -m app.backup create
```
*Output:*
```text
[INFO] vasundhara_ai: Initiating online SQLite hot backup from .../ecowatch.db to .../ecowatch_backup_20261127_041422.db...
[INFO] vasundhara_ai: Online backup page copy completed successfully.
[INFO] vasundhara_ai: Backup integrity check verified: status OK.
[INFO] vasundhara_ai: Compressed backup generated: .../ecowatch_backup_20261127_041422.db.gz
Backup created: backend/backups/ecowatch_backup_20261127_041422.db.gz
```

### Verify an Existing Backup Archive
```powershell
$env:PYTHONPATH='backend'
python -m app.backup verify --file 'backend/backups/ecowatch_backup_20261127_041422.db.gz'
```
*Output:*
```text
[INFO] vasundhara_ai: Backup archive ecowatch_backup_20261127_041422.db.gz verified intact.
Verification OK
```

### Restore from a Backup Archive
```powershell
$env:PYTHONPATH='backend'
python -m app.backup restore --file 'backend/backups/ecowatch_backup_20261127_041422.db.gz'
```
*Safety Feature*: Before replacing the active database, the restore tool automatically snapshots the current database to `ecowatch.db.pre_restore_<timestamp>`.

---

## 3. Automated Backup Scheduling

### On Linux (Cron)
Add the following entry to crontab (`crontab -e`) to execute nightly at 02:00 UTC:
```bash
0 2 * * * cd /opt/vasundhara-ai && PYTHONPATH=backend /opt/vasundhara-ai/venv/bin/python -m app.backup create >> /var/log/vasundhara_backup.log 2>&1
```

### Retention Policy Script
Retain daily backups for 7 days, weekly backups for 4 weeks:
```bash
# Purge archives older than 30 days
find /opt/vasundhara-ai/backend/backups/ -name "*.gz" -mtime +30 -delete
```

---

## 4. Disaster Recovery Plan

In the event of hardware or filesystem corruption:
1. **Stop Application Server**:
   ```powershell
   Stop-Process -Name "uvicorn" -Force
   ```
2. **Select Latest Verified Backup**:
   Run `python -m app.backup verify --file <path-to-archive>` to confirm archive readability.
3. **Execute Restore**:
   ```powershell
   python -m app.backup restore --file <path-to-archive>
   ```
4. **Run Readiness Probe**:
   Start the application and invoke:
   ```bash
   curl -s http://127.0.0.1:8001/ready
   ```
   Confirm `"status": "ready"` and `"database": true`.
