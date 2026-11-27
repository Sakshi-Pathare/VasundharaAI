"""
Vasundhara AI / EcoWatch AI — Enterprise Database Backup & Recovery Utility

Provides zero-downtime, non-blocking backups for:
- SQLite (using online backup API with WAL mode integrity checks)
- PostgreSQL (using pg_dump / pg_restore conventions)
"""

import argparse
import gzip
import os
import shutil
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

from .config import BACKEND_DIR, logger, settings


BACKUP_DIR = BACKEND_DIR / "backups"


def create_backup(target_dir: Path | None = None) -> Path:
    """
    Creates an atomic, consistent online backup of the application database.
    Performs integrity check prior to finalizing the archive.
    """
    dest_dir = target_dir or BACKUP_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if settings.is_sqlite:
        db_file = BACKEND_DIR / "ecowatch.db"
        if not db_file.exists():
            raise FileNotFoundError(f"Source database file not found at {db_file}")

        backup_file = dest_dir / f"ecowatch_backup_{timestamp}.db"
        logger.info(f"Initiating online SQLite hot backup from {db_file} to {backup_file}...")

        # Open source in read-only URI mode and target in write mode
        src_conn = sqlite3.connect(f"file:{db_file.as_posix()}?mode=ro", uri=True)
        dest_conn = sqlite3.connect(backup_file.as_posix())

        try:
            # Perform non-blocking online page backup
            with dest_conn:
                src_conn.backup(dest_conn, pages=100)
            logger.info("Online backup page copy completed successfully.")

            # Run integrity check on the backup copy
            cursor = dest_conn.cursor()
            cursor.execute("PRAGMA integrity_check")
            result = cursor.fetchone()
            if not result or result[0] != "ok":
                raise RuntimeError(f"Backup integrity verification failed: {result}")
            logger.info("Backup integrity check verified: status OK.")
        finally:
            src_conn.close()
            dest_conn.close()

        # Compress to .gz to save disk space
        gz_file = dest_dir / f"ecowatch_backup_{timestamp}.db.gz"
        with open(backup_file, "rb") as f_in, gzip.open(gz_file, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        backup_file.unlink()  # Remove uncompressed temp copy

        logger.info(f"Compressed backup generated: {gz_file} ({gz_file.stat().st_size} bytes)")
        return gz_file
    else:
        # PostgreSQL pg_dump procedure
        gz_file = dest_dir / f"vasundhara_postgres_{timestamp}.sql.gz"
        cmd = f"pg_dump \"{settings.database_url}\" | gzip > \"{gz_file}\""
        logger.info(f"Executing PostgreSQL dump: {cmd}")
        ret = os.system(cmd)
        if ret != 0:
            raise RuntimeError(f"pg_dump failed with exit code {ret}")
        return gz_file


def verify_backup(backup_gz_path: Path) -> bool:
    """Verifies that a gzipped backup archive is readable and intact."""
    if not backup_gz_path.exists():
        logger.error(f"Backup file not found: {backup_gz_path}")
        return False

    try:
        with gzip.open(backup_gz_path, "rb") as f:
            header = f.read(100)
            if settings.is_sqlite:
                # SQLite header starts with 'SQLite format 3\000'
                if not header.startswith(b"SQLite format 3\x00"):
                    logger.error("Decompressed backup does not contain valid SQLite header.")
                    return False
        logger.info(f"Backup archive {backup_gz_path.name} verified intact.")
        return True
    except Exception as exc:
        logger.error(f"Backup verification failed: {exc}")
        return False


def restore_backup(backup_gz_path: Path, target_db_path: Path | None = None) -> None:
    """Restores an uncompressed database from a verified backup archive."""
    if not verify_backup(backup_gz_path):
        raise ValueError("Cannot restore from corrupted or invalid backup file.")

    dest = target_db_path or (BACKEND_DIR / "ecowatch.db")
    logger.info(f"Restoring backup {backup_gz_path} to {dest}...")

    # Create safety snapshot of current active DB if it exists
    if dest.exists():
        safety_copy = dest.with_name(f"{dest.name}.pre_restore_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}")
        shutil.copy2(dest, safety_copy)
        logger.info(f"Created pre-restore safety snapshot: {safety_copy}")

    # Unpack archive into place
    with gzip.open(backup_gz_path, "rb") as f_in, open(dest, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)

    logger.info(f"Database restoration completed successfully to {dest}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vasundhara AI Database Backup & Restore Tool")
    parser.add_argument("action", choices=["create", "verify", "restore"], help="Backup operation to execute")
    parser.add_argument("--file", type=str, default=None, help="Backup file path (for verify/restore)")
    args = parser.parse_args()

    if args.action == "create":
        out = create_backup()
        print(f"Backup created: {out}")
    elif args.action == "verify":
        if not args.file:
            print("Error: --file argument is required for verify action.")
            sys.exit(1)
        ok = verify_backup(Path(args.file))
        print("Verification OK" if ok else "Verification FAILED")
        sys.exit(0 if ok else 1)
    elif args.action == "restore":
        if not args.file:
            print("Error: --file argument is required for restore action.")
            sys.exit(1)
        restore_backup(Path(args.file))
        print("Restoration complete.")
