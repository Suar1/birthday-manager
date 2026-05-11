"""Simple ZIP backup and restore support for Birthday Manager."""
from __future__ import annotations

import base64
import io
import json
import os
import platform
import re
import shutil
import sqlite3
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from config import get_config_path, get_smtp_settings, load_config, save_config, save_smtp_settings


BACKUP_FORMAT = "birthday-manager-backup"
BACKUP_VERSION = "2.0"
ENCRYPTION_METHOD = "Fernet"
ENC_PREFIX = "ENC:"
MAX_BACKUP_BYTES = 512 * 1024 * 1024
ALLOWED_CONFIG_KEYS = {"smtp", "reminders"}
ALLOWED_SMTP_KEYS = {
    "authType",
    "smtpServer",
    "smtpPort",
    "smtpEmail",
    "recipientEmail",
    "smtpPassword",
    "smtpPasswordEncrypted",
    "googleClientId",
    "googleClientSecret",
    "googleClientSecretEncrypted",
    "googleRefreshToken",
    "googleRefreshTokenEncrypted",
}
ALLOWED_REMINDER_OFFSETS = {0, 1, 7, 14}
SENSITIVE_KEY_RE = re.compile(
    r"(password|passwd|client[_-]?secret|refresh[_-]?token|api[_-]?key|credential|secret|token)",
    re.IGNORECASE,
)
HASH_KEY_RE = re.compile(r"(password[_-]?hash|hashed[_-]?password|hash)", re.IGNORECASE)


class SecureBackupError(Exception):
    """Raised for backup and restore validation failures."""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def sanitize_filename_part(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "backup"


def backup_cipher() -> Fernet:
    secret = os.environ.get("BACKUP_SECRET_KEY", "")
    if not secret:
        raise SecureBackupError("Backup secret key is not configured.")

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"birthday_manager_backup_secret_v1",
        iterations=390_000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret.encode("utf-8")))
    return Fernet(key)


def encrypt_backup_value(value: str) -> str:
    token = backup_cipher().encrypt(value.encode("utf-8")).decode("ascii")
    return ENC_PREFIX + token


def decrypt_backup_value(value: str) -> str:
    try:
        return backup_cipher().decrypt(value[len(ENC_PREFIX):].encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, TypeError) as exc:
        raise SecureBackupError("Backup could not be decrypted with the configured key.") from exc


def is_sensitive_key(key: str) -> bool:
    return bool(SENSITIVE_KEY_RE.search(key)) and not HASH_KEY_RE.search(key)


def encrypt_sensitive_values(value, key_name: str = ""):
    if isinstance(value, dict):
        return {key: encrypt_sensitive_values(item, key) for key, item in value.items()}
    if isinstance(value, list):
        return [encrypt_sensitive_values(item, key_name) for item in value]
    if isinstance(value, str) and value and is_sensitive_key(key_name) and not value.startswith(ENC_PREFIX):
        return encrypt_backup_value(value)
    return value


def decrypt_enc_values(value):
    if isinstance(value, dict):
        return {key: decrypt_enc_values(item) for key, item in value.items()}
    if isinstance(value, list):
        return [decrypt_enc_values(item) for item in value]
    if isinstance(value, str) and value.startswith(ENC_PREFIX):
        return decrypt_backup_value(value)
    return value


def iter_upload_files(uploads_dir: Path) -> Iterable[Path]:
    if not uploads_dir.exists():
        return []
    root = uploads_dir.resolve()

    def safe_files():
        for path in uploads_dir.rglob("*"):
            if path.is_symlink() or not path.is_file():
                continue
            try:
                path.resolve().relative_to(root)
            except ValueError:
                continue
            yield path

    return safe_files()


def read_birthdays(db_path: Path) -> List[Dict]:
    if not db_path.exists():
        return []
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        return [dict(row) for row in conn.execute("SELECT * FROM birthdays ORDER BY id")]


def build_calendar_ics(birthdays: List[Dict]) -> str:
    output = io.StringIO()
    output.write("BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Birthday Manager//Backup//EN\nCALSCALE:GREGORIAN\n")
    for birthday in birthdays:
        date_value = birthday.get("birthday")
        if not date_value:
            continue
        try:
            birthday_date = datetime.strptime(date_value, "%Y-%m-%d")
        except ValueError:
            continue
        name = str(birthday.get("name", "Unknown")).replace("\n", " ")
        output.write("BEGIN:VEVENT\n")
        output.write(f"UID:backup-birthday-{birthday.get('id', '')}@birthday-manager\n")
        output.write(f"DTSTART;VALUE=DATE:{birthday_date.strftime('%Y%m%d')}\n")
        output.write("RRULE:FREQ=YEARLY\n")
        output.write(f"SUMMARY:{name}'s Birthday\n")
        output.write("END:VEVENT\n")
    output.write("END:VCALENDAR\n")
    return output.getvalue()


def add_file_if_exists(zipf: zipfile.ZipFile, path: Path, arcname: str) -> None:
    if path.exists() and path.is_file():
        zipf.writestr(arcname, path.read_bytes())


def create_secure_backup(db_path: Path, uploads_dir: Path, portable: bool) -> tuple[bytes, Dict]:
    # Validate the configured key before building the archive.
    backup_cipher()

    birthdays = read_birthdays(db_path)
    timestamp = now_iso()
    filename = f"birthday-manager-backup-{sanitize_filename_part(timestamp)}.zip"
    metadata = {
        "filename": filename,
        "timestamp": timestamp,
        "backup_version": BACKUP_VERSION,
        "encryption_method": ENCRYPTION_METHOD,
        "contents": {
            "database_records": len(birthdays),
            "uploaded_files": 0,
            "application_settings": True,
            "calendar_data": True,
            "restorable_secrets": True,
        },
    }

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
        add_file_if_exists(zipf, db_path, "database/birthdays.sqlite")

        backup_config = load_config(portable)
        smtp_settings = get_smtp_settings(portable)
        if smtp_settings:
            backup_config["smtp"] = smtp_settings
        encrypted_config = encrypt_sensitive_values(backup_config)
        zipf.writestr(
            "settings/application_config.json",
            json.dumps(encrypted_config, indent=2, sort_keys=True).encode("utf-8"),
        )

        zipf.writestr("calendar/birthdays.ics", build_calendar_ics(birthdays).encode("utf-8"))

        uploaded_count = 0
        for upload in iter_upload_files(uploads_dir):
            relative = upload.relative_to(uploads_dir).as_posix()
            zipf.writestr(f"uploads/{relative}", upload.read_bytes())
            uploaded_count += 1
        metadata["contents"]["uploaded_files"] = uploaded_count

        restore_context = {
            "created_at": timestamp,
            "python": platform.python_version(),
            "portable_mode": portable,
            "database_filename": "birthdays.sqlite",
            "config_filename": "application_config.json",
            "uploads_directory": "uploads",
        }
        zipf.writestr(
            "server/restore_context.json",
            json.dumps(restore_context, indent=2, sort_keys=True).encode("utf-8"),
        )

        for path_name in ["requirements.txt", "Dockerfile", "docker-compose.yml", "DOCKER.md"]:
            add_file_if_exists(zipf, Path(__file__).parent / path_name, f"server/{path_name}")

        manifest = {
            "format": BACKUP_FORMAT,
            "backup_version": BACKUP_VERSION,
            "metadata": metadata,
        }
        zipf.writestr("manifest.json", json.dumps(manifest, indent=2, sort_keys=True).encode("utf-8"))

    archive = buffer.getvalue()
    metadata["compressed_size"] = len(archive)
    return archive, metadata


def validate_zip_paths(zipf: zipfile.ZipFile) -> None:
    for name in zipf.namelist():
        normalized = Path(name)
        if normalized.is_absolute() or ".." in normalized.parts or name.startswith(("/", "\\")):
            raise SecureBackupError("Backup contains unsafe file paths.")


def read_manifest(zipf: zipfile.ZipFile) -> Dict:
    try:
        manifest = json.loads(zipf.read("manifest.json").decode("utf-8"))
    except Exception as exc:
        raise SecureBackupError("Backup archive is corrupt or missing metadata.") from exc
    if manifest.get("format") != BACKUP_FORMAT:
        raise SecureBackupError("Backup archive metadata is incompatible.")
    return manifest


def read_backup_zip(archive: bytes) -> tuple[zipfile.ZipFile, Dict]:
    if len(archive) > MAX_BACKUP_BYTES:
        raise SecureBackupError("Backup file is too large")
    try:
        zipf = zipfile.ZipFile(io.BytesIO(archive), "r")
    except zipfile.BadZipFile as exc:
        raise SecureBackupError("Invalid backup ZIP file.") from exc
    validate_zip_paths(zipf)
    return zipf, read_manifest(zipf)


def validate_restored_settings(settings: Dict) -> None:
    unexpected = set(settings) - ALLOWED_CONFIG_KEYS
    if unexpected:
        raise SecureBackupError(f"Application settings contain unsupported keys: {', '.join(sorted(unexpected))}")

    reminders = settings.get("reminders")
    if reminders is not None:
        if not isinstance(reminders, list):
            raise SecureBackupError("Reminder settings are invalid.")
        for reminder in reminders:
            if not isinstance(reminder, dict):
                raise SecureBackupError("Reminder settings are invalid.")
            if set(reminder) - {"daysOffset", "time", "enabled"}:
                raise SecureBackupError("Reminder settings contain unsupported keys.")
            if reminder.get("daysOffset") not in ALLOWED_REMINDER_OFFSETS:
                raise SecureBackupError("Reminder settings contain an invalid day offset.")

    smtp = settings.get("smtp")
    if smtp is not None:
        if not isinstance(smtp, dict):
            raise SecureBackupError("SMTP settings are invalid.")
        unexpected_smtp = set(smtp) - ALLOWED_SMTP_KEYS
        if unexpected_smtp:
            raise SecureBackupError(f"SMTP settings contain unsupported keys: {', '.join(sorted(unexpected_smtp))}")


def restore_database(zipf: zipfile.ZipFile, db_path: Path) -> None:
    data = read_valid_database_bytes(zipf)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.write_bytes(data)


def read_valid_database_bytes(zipf: zipfile.ZipFile) -> bytes:
    try:
        data = zipf.read("database/birthdays.sqlite")
    except KeyError as exc:
        raise SecureBackupError("Backup archive is missing the database.") from exc

    candidate = sqlite3.connect(":memory:")
    try:
        candidate.deserialize(data)
        table = candidate.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='birthdays'"
        ).fetchone()
        if table is None:
            raise SecureBackupError("Backup database is missing the birthdays table.")
    finally:
        candidate.close()
    return data


def read_restored_settings(zipf: zipfile.ZipFile) -> Dict:
    raw_settings = json.loads(zipf.read("settings/application_config.json").decode("utf-8"))
    if not isinstance(raw_settings, dict):
        raise SecureBackupError("Application settings are invalid.")
    settings = decrypt_enc_values(raw_settings)
    validate_restored_settings(settings)
    return settings


def restore_settings(zipf: zipfile.ZipFile, portable: bool) -> None:
    settings = read_restored_settings(zipf)
    smtp_settings = settings.pop("smtp", None)
    save_config(settings, portable)
    if isinstance(smtp_settings, dict):
        save_smtp_settings(smtp_settings, portable)


def extract_upload_filename(photo_path: str) -> str | None:
    if not photo_path:
        return None
    normalized = photo_path.replace("\\", "/").strip()
    if not normalized:
        return None
    if normalized.startswith("/uploads/"):
        normalized = normalized[len("/uploads/"):]
    elif normalized.startswith("uploads/"):
        normalized = normalized[len("uploads/"):]
    elif "/" in normalized:
        return None

    path = Path(normalized)
    if path.is_absolute() or ".." in path.parts:
        raise SecureBackupError("Backup database contains unsafe upload references.")
    return path.name if path.name else None


def referenced_upload_filenames(db_bytes: bytes) -> set[str]:
    conn = sqlite3.connect(":memory:")
    try:
        conn.deserialize(db_bytes)
        columns = {
            row[1]
            for row in conn.execute("PRAGMA table_info(birthdays)").fetchall()
        }
        if "photo" not in columns:
            return set()
        filenames = set()
        for row in conn.execute("SELECT photo FROM birthdays WHERE photo IS NOT NULL AND photo != ''"):
            filename = extract_upload_filename(row[0])
            if filename:
                filenames.add(filename)
        return filenames
    finally:
        conn.close()


def backup_upload_filenames(zipf: zipfile.ZipFile) -> set[str]:
    filenames = set()
    for name in zipf.namelist():
        if not name.startswith("uploads/") or name.endswith("/"):
            continue
        relative = Path(name).relative_to("uploads")
        if relative.name:
            filenames.add(relative.name)
    return filenames


def validate_upload_references(zipf: zipfile.ZipFile, db_bytes: bytes) -> None:
    referenced = referenced_upload_filenames(db_bytes)
    available = backup_upload_filenames(zipf)
    missing = sorted(referenced - available)
    if missing:
        sample = ", ".join(missing[:5])
        suffix = "" if len(missing) <= 5 else f" and {len(missing) - 5} more"
        raise SecureBackupError(f"Backup is missing uploaded files referenced by the database: {sample}{suffix}")


def copy_uploads_from_zip(zipf: zipfile.ZipFile, uploads_dir: Path) -> None:
    uploads_dir.mkdir(parents=True, exist_ok=True)
    for name in zipf.namelist():
        if not name.startswith("uploads/") or name.endswith("/"):
            continue
        relative = Path(name).relative_to("uploads")
        target = uploads_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(zipf.read(name))


def clear_directory_contents(directory: Path) -> None:
    if not directory.exists():
        return
    if not directory.is_dir():
        raise SecureBackupError(f"Restore target is not a directory: {directory}")
    for child in directory.iterdir():
        if child.is_dir() and not child.is_symlink():
            shutil.rmtree(str(child))
        else:
            child.unlink()


def replace_directory_contents(source_dir: Path, target_dir: Path) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    clear_directory_contents(target_dir)
    for source in source_dir.iterdir():
        target = target_dir / source.name
        if source.is_dir():
            shutil.copytree(str(source), str(target))
        else:
            shutil.copy2(str(source), str(target))


def restore_uploads(zipf: zipfile.ZipFile, uploads_dir: Path) -> None:
    with tempfile.TemporaryDirectory() as temp_name:
        staged_uploads = Path(temp_name) / "uploads"
        copy_uploads_from_zip(zipf, staged_uploads)
        replace_directory_contents(staged_uploads, uploads_dir)


def snapshot_file(path: Path, snapshot_dir: Path, name: str) -> tuple[bool, Path]:
    snapshot = snapshot_dir / name
    if path.exists():
        snapshot.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(path), str(snapshot))
        return True, snapshot
    return False, snapshot


def restore_file_snapshot(path: Path, existed: bool, snapshot: Path) -> None:
    if existed:
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(snapshot), str(path))
    elif path.exists():
        path.unlink()


def restore_upload_snapshot(uploads_dir: Path, existed: bool, snapshot: Path) -> None:
    if existed:
        replace_directory_contents(snapshot, uploads_dir)
    elif uploads_dir.exists():
        clear_directory_contents(uploads_dir)
        try:
            uploads_dir.rmdir()
        except OSError:
            pass


def commit_restored_settings(settings: Dict, portable: bool) -> None:
    settings = dict(settings)
    smtp_settings = settings.pop("smtp", None)
    save_config(settings, portable)
    if isinstance(smtp_settings, dict):
        save_smtp_settings(smtp_settings, portable)


def restore_secure_backup(archive: bytes, db_path: Path, uploads_dir: Path, portable: bool, mode: str = "full") -> Dict:
    if mode != "full":
        raise SecureBackupError("Unsupported restore mode.")
    zipf, manifest = read_backup_zip(archive)
    with zipf:
        db_bytes = read_valid_database_bytes(zipf)
        settings = read_restored_settings(zipf)
        validate_upload_references(zipf, db_bytes)

        with tempfile.TemporaryDirectory() as temp_name:
            temp_root = Path(temp_name)
            staged_uploads = temp_root / "uploads"
            copy_uploads_from_zip(zipf, staged_uploads)

            snapshot_root = temp_root / "snapshot"
            snapshot_root.mkdir()
            db_existed, db_snapshot = snapshot_file(db_path, snapshot_root, "birthdays.db")
            config_path = get_config_path(portable)
            config_existed, config_snapshot = snapshot_file(config_path, snapshot_root, "config.json")
            uploads_existed = uploads_dir.exists()
            uploads_snapshot = snapshot_root / "uploads"
            if uploads_existed:
                shutil.copytree(str(uploads_dir), str(uploads_snapshot))

            try:
                replace_directory_contents(staged_uploads, uploads_dir)
                db_path.parent.mkdir(parents=True, exist_ok=True)
                db_path.write_bytes(db_bytes)
                commit_restored_settings(settings, portable)
            except Exception:
                restore_upload_snapshot(uploads_dir, uploads_existed, uploads_snapshot)
                restore_file_snapshot(db_path, db_existed, db_snapshot)
                restore_file_snapshot(config_path, config_existed, config_snapshot)
                raise

    return {
        "message": "Restore completed",
        "mode": mode,
        "metadata": public_metadata(manifest.get("metadata", {})),
    }


def preview_secure_backup(archive: bytes) -> Dict:
    zipf, manifest = read_backup_zip(archive)
    zipf.close()
    metadata = manifest.get("metadata", {})
    return {
        "metadata": public_metadata(metadata),
        "restore_compatibility": {"app": "birthday-manager", "backup_format": BACKUP_FORMAT},
    }


def public_metadata(metadata: Dict) -> Dict:
    return {
        "filename": metadata.get("filename", ""),
        "timestamp": metadata.get("timestamp", ""),
        "backup_version": metadata.get("backup_version", BACKUP_VERSION),
        "encryption_method": metadata.get("encryption_method", ENCRYPTION_METHOD),
        "contents": metadata.get("contents", {}),
    }
