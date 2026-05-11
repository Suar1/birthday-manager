"""Tests for simple ZIP backups with encrypted secret values."""
import io
import json
import os
import shutil
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import get_smtp_settings, load_config, save_config, save_smtp_settings
from core import add_birthday, get_all_birthdays, init_database
from secure_backup import (
    BACKUP_FORMAT,
    BACKUP_VERSION,
    ENC_PREFIX,
    SecureBackupError,
    create_secure_backup,
    preview_secure_backup,
    restore_secure_backup,
)


class SecureBackupTestCase(unittest.TestCase):
    def setUp(self):
        self.test_dir = Path(tempfile.mkdtemp())
        self.home_dir = self.test_dir / "home"
        self.home_dir.mkdir()
        self.env = patch.dict(
            os.environ,
            {
                "HOME": str(self.home_dir),
                "BIRTHDAY_REMINDER_MACHINE_ID": "test-machine",
                "BACKUP_SECRET_KEY": "unit-test-backup-secret",
            },
            clear=False,
        )
        self.env.start()
        self.home_patch = patch("config.Path.home", return_value=self.home_dir)
        self.home_patch.start()

        self.db_path = self.test_dir / "birthdays.db"
        self.uploads_dir = self.test_dir / "uploads"
        self.uploads_dir.mkdir()
        init_database(self.db_path)
        add_birthday(self.db_path, "Ada Lovelace", "1815-12-10", "female", None)
        (self.uploads_dir / "avatar.txt").write_text("file-data", encoding="utf-8")

    def tearDown(self):
        self.home_patch.stop()
        self.env.stop()
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def create_backup(self):
        return create_secure_backup(self.db_path, self.uploads_dir, False)

    def backup_config(self, archive):
        with zipfile.ZipFile(io.BytesIO(archive), "r") as zipf:
            return json.loads(zipf.read("settings/application_config.json").decode("utf-8"))

    def set_photo(self, db_path, photo):
        with sqlite3.connect(str(db_path)) as conn:
            conn.execute("UPDATE birthdays SET photo = ? WHERE name = ?", (photo, "Ada Lovelace"))
            conn.commit()

    def test_backup_succeeds_when_secret_key_exists(self):
        archive, metadata = self.create_backup()
        self.assertTrue(zipfile.is_zipfile(io.BytesIO(archive)))
        self.assertEqual(metadata["backup_version"], BACKUP_VERSION)
        self.assertEqual(metadata["filename"].split(".")[-1], "zip")

        with zipfile.ZipFile(io.BytesIO(archive), "r") as zipf:
            manifest = json.loads(zipf.read("manifest.json").decode("utf-8"))
        self.assertEqual(manifest["format"], BACKUP_FORMAT)

    def test_backup_fails_when_secret_key_is_missing(self):
        with patch.dict(os.environ, {"BACKUP_SECRET_KEY": ""}, clear=False):
            with self.assertRaisesRegex(SecureBackupError, "Backup secret key is not configured."):
                self.create_backup()

    def test_secrets_in_zip_are_encrypted_and_not_plaintext(self):
        save_smtp_settings(
            {
                "authType": "oauth2",
                "smtpServer": "smtp.example.com",
                "smtpPort": 587,
                "smtpEmail": "from@example.com",
                "recipientEmail": "to@example.com",
                "smtpPassword": "smtp-password-secret",
                "googleClientId": "client-id",
                "googleClientSecret": "google-client-secret",
                "googleRefreshToken": "refresh-token-secret",
            },
            False,
        )
        archive, _ = self.create_backup()
        self.assertNotIn(b"smtp-password-secret", archive)
        self.assertNotIn(b"google-client-secret", archive)
        self.assertNotIn(b"refresh-token-secret", archive)

        smtp = self.backup_config(archive)["smtp"]
        self.assertTrue(smtp["smtpPassword"].startswith(ENC_PREFIX))
        self.assertTrue(smtp["googleClientSecret"].startswith(ENC_PREFIX))
        self.assertTrue(smtp["googleRefreshToken"].startswith(ENC_PREFIX))
        self.assertEqual(smtp["smtpEmail"], "from@example.com")

    def test_restore_decrypts_enc_values_and_stores_config_encrypted(self):
        save_smtp_settings(
            {
                "authType": "app_password",
                "smtpServer": "smtp.example.com",
                "smtpPort": 587,
                "smtpEmail": "from@example.com",
                "recipientEmail": "to@example.com",
                "smtpPassword": "smtp-password-secret",
            },
            False,
        )
        archive, _ = self.create_backup()
        save_config({}, False)

        restored_db = self.test_dir / "restored.db"
        restored_uploads = self.test_dir / "restored_uploads"
        restore_secure_backup(archive, restored_db, restored_uploads, False)

        stored_smtp = load_config(False)["smtp"]
        self.assertNotIn("smtpPassword", stored_smtp)
        self.assertIn("smtpPasswordEncrypted", stored_smtp)
        self.assertEqual(get_smtp_settings(False)["smtpPassword"], "smtp-password-secret")
        self.assertEqual(get_all_birthdays(restored_db)[0]["name"], "Ada Lovelace")
        self.assertEqual((restored_uploads / "avatar.txt").read_text(encoding="utf-8"), "file-data")

    def test_restore_into_missing_data_and_uploads_directories(self):
        self.set_photo(self.db_path, "/uploads/avatar.txt")
        archive, _ = self.create_backup()
        restored_db = self.test_dir / "missing" / "data" / "birthdays.db"
        restored_uploads = self.test_dir / "missing" / "uploads"

        restore_secure_backup(archive, restored_db, restored_uploads, False)

        self.assertEqual(get_all_birthdays(restored_db)[0]["photo"], "/uploads/avatar.txt")
        self.assertEqual((restored_uploads / "avatar.txt").read_text(encoding="utf-8"), "file-data")

    def test_restore_with_missing_referenced_upload_fails_before_modifying_live_state(self):
        live_db = self.test_dir / "live.db"
        live_uploads = self.test_dir / "live_uploads"
        live_uploads.mkdir()
        init_database(live_db)
        add_birthday(live_db, "Live User", "2000-01-01", "female", "/uploads/live.txt")
        (live_uploads / "live.txt").write_text("live-file", encoding="utf-8")

        self.set_photo(self.db_path, "/uploads/missing.txt")
        archive, _ = create_secure_backup(self.db_path, self.test_dir / "empty_uploads", False)

        with self.assertRaisesRegex(SecureBackupError, "missing uploaded files"):
            restore_secure_backup(archive, live_db, live_uploads, False)

        self.assertEqual(get_all_birthdays(live_db)[0]["name"], "Live User")
        self.assertEqual((live_uploads / "live.txt").read_text(encoding="utf-8"), "live-file")
        self.assertFalse((live_uploads / "missing.txt").exists())

    def test_restore_with_valid_uploads_restores_files_successfully(self):
        self.set_photo(self.db_path, "/uploads/avatar.txt")
        archive, _ = self.create_backup()
        restored_db = self.test_dir / "valid_uploads.db"
        restored_uploads = self.test_dir / "valid_uploads"

        restore_secure_backup(archive, restored_db, restored_uploads, False)

        birthdays = get_all_birthdays(restored_db)
        self.assertEqual(birthdays[0]["photo"], "/uploads/avatar.txt")
        self.assertEqual((restored_uploads / "avatar.txt").read_text(encoding="utf-8"), "file-data")

    def test_restore_failure_leaves_previous_state_intact(self):
        self.set_photo(self.db_path, "/uploads/avatar.txt")
        archive, _ = self.create_backup()

        live_db = self.test_dir / "rollback.db"
        live_uploads = self.test_dir / "rollback_uploads"
        live_uploads.mkdir()
        init_database(live_db)
        add_birthday(live_db, "Existing User", "2001-02-03", "male", "/uploads/existing.txt")
        (live_uploads / "existing.txt").write_text("existing-file", encoding="utf-8")

        with patch("secure_backup.commit_restored_settings", side_effect=RuntimeError("forced failure")):
            with self.assertRaisesRegex(RuntimeError, "forced failure"):
                restore_secure_backup(archive, live_db, live_uploads, False)

        birthdays = get_all_birthdays(live_db)
        self.assertEqual(birthdays[0]["name"], "Existing User")
        self.assertEqual(birthdays[0]["photo"], "/uploads/existing.txt")
        self.assertEqual((live_uploads / "existing.txt").read_text(encoding="utf-8"), "existing-file")
        self.assertFalse((live_uploads / "avatar.txt").exists())

    def test_restore_fails_with_wrong_secret_key(self):
        save_smtp_settings(
            {
                "authType": "app_password",
                "smtpServer": "smtp.example.com",
                "smtpPort": 587,
                "smtpEmail": "from@example.com",
                "recipientEmail": "to@example.com",
                "smtpPassword": "smtp-password-secret",
            },
            False,
        )
        archive, _ = self.create_backup()
        with patch.dict(os.environ, {"BACKUP_SECRET_KEY": "wrong-secret"}, clear=False):
            with self.assertRaisesRegex(SecureBackupError, "Backup could not be decrypted with the configured key."):
                restore_secure_backup(archive, self.test_dir / "unused.db", self.test_dir / "unused", False)

    def test_user_login_passwords_remain_hashed(self):
        with sqlite3.connect(str(self.db_path)) as conn:
            conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, password_hash TEXT)")
            conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                ("admin@example.com", "pbkdf2:sha256:hashed-login-password"),
            )
            conn.commit()

        archive, _ = self.create_backup()
        restored_db = self.test_dir / "users-restored.db"
        restore_secure_backup(archive, restored_db, self.test_dir / "users-uploads", False)

        with sqlite3.connect(str(restored_db)) as conn:
            value = conn.execute("SELECT password_hash FROM users").fetchone()[0]
        self.assertEqual(value, "pbkdf2:sha256:hashed-login-password")
        self.assertNotEqual(value, "plaintext-password")

    def test_zip_path_traversal_is_rejected(self):
        archive_buffer = io.BytesIO()
        with zipfile.ZipFile(archive_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            zipf.writestr("../evil.txt", "owned")
            zipf.writestr(
                "manifest.json",
                json.dumps({"format": BACKUP_FORMAT, "backup_version": BACKUP_VERSION, "metadata": {}}),
            )

        with self.assertRaisesRegex(SecureBackupError, "unsafe file paths"):
            restore_secure_backup(
                archive_buffer.getvalue(),
                self.test_dir / "unused.db",
                self.test_dir / "safe_uploads",
                False,
            )
        self.assertFalse((self.test_dir / "evil.txt").exists())

    def test_preview_does_not_show_plaintext_secrets(self):
        save_smtp_settings(
            {
                "authType": "app_password",
                "smtpServer": "smtp.example.com",
                "smtpPort": 587,
                "smtpEmail": "from@example.com",
                "recipientEmail": "to@example.com",
                "smtpPassword": "smtp-password-secret",
            },
            False,
        )
        archive, _ = self.create_backup()
        preview = preview_secure_backup(archive)
        preview_text = json.dumps(preview)
        self.assertNotIn("smtp-password-secret", preview_text)
        self.assertIn("birthday-manager", preview_text)


class SecureBackupEndpointAuthTest(unittest.TestCase):
    def setUp(self):
        self.test_dir = Path(tempfile.mkdtemp())
        self.home_dir = self.test_dir / "home"
        self.home_dir.mkdir()
        self.env = patch.dict(
            os.environ,
            {
                "HOME": str(self.home_dir),
                "BIRTHDAY_REMINDER_ADMIN_TOKEN": "admin-token",
                "BIRTHDAY_REMINDER_MACHINE_ID": "test-machine",
                "BACKUP_SECRET_KEY": "endpoint-backup-secret",
            },
            clear=False,
        )
        self.env.start()
        self.home_patch = patch("config.Path.home", return_value=self.home_dir)
        self.home_patch.start()
        self.core_home_patch = patch("core.Path.home", return_value=self.home_dir)
        self.core_home_patch.start()

        import server

        self.server = server
        self.server.UPLOADS_DIR = self.test_dir / "endpoint_uploads"
        self.server.UPLOADS_DIR.mkdir()
        self.client = server.app.test_client()

    def tearDown(self):
        self.core_home_patch.stop()
        self.home_patch.stop()
        self.env.stop()
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def auth_headers(self):
        return {"Authorization": "Bearer admin-token"}

    def test_admin_authorization_required(self):
        response = self.client.post("/api/backup/secure", json={"confirmed": True})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["error"], "Admin authorization required")

    def test_upload_type_validation(self):
        response = self.client.post(
            "/api/backup/secure/preview",
            headers=self.auth_headers(),
            data={"file": (io.BytesIO(b"not a backup"), "backup.txt")},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(".zip", response.get_json()["error"])

    def test_oversized_backup_upload_rejected(self):
        with patch.object(self.server, "SECURE_BACKUP_MAX_BYTES", 8):
            response = self.client.post(
                "/api/backup/secure/preview",
                headers=self.auth_headers(),
                data={"file": (io.BytesIO(b"123456789"), "backup.zip")},
                content_type="multipart/form-data",
            )
        self.assertEqual(response.status_code, 400)
        self.assertIn("too large", response.get_json()["error"])

    def test_successful_create_preview_restore_endpoint_flow(self):
        db_path = self.home_dir / ".birthday_reminder" / "birthdays.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        init_database(db_path)
        add_birthday(db_path, "Endpoint User", "1999-09-09", "female", None)
        (self.server.UPLOADS_DIR / "endpoint.txt").write_text("endpoint-file", encoding="utf-8")

        create_response = self.client.post(
            "/api/backup/secure",
            headers=self.auth_headers(),
            json={"confirmed": True},
        )
        self.assertEqual(create_response.status_code, 200)
        archive = create_response.data
        self.assertTrue(zipfile.is_zipfile(io.BytesIO(archive)))

        preview_response = self.client.post(
            "/api/backup/secure/preview",
            headers=self.auth_headers(),
            data={"file": (io.BytesIO(archive), "backup.zip")},
            content_type="multipart/form-data",
        )
        self.assertEqual(preview_response.status_code, 200)

        restore_response = self.client.post(
            "/api/backup/secure/restore",
            headers=self.auth_headers(),
            data={
                "confirmed": "true",
                "file": (io.BytesIO(archive), "backup.zip"),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(restore_response.status_code, 200)
        self.assertEqual(get_all_birthdays(db_path)[0]["name"], "Endpoint User")
        self.assertTrue((self.server.UPLOADS_DIR / "endpoint.txt").exists())

    def test_restore_confirmation_required(self):
        archive, _ = create_secure_backup(
            self.home_dir / ".birthday_reminder" / "birthdays.db",
            self.server.UPLOADS_DIR,
            False,
        )
        response = self.client.post(
            "/api/backup/secure/restore",
            headers=self.auth_headers(),
            data={"file": (io.BytesIO(archive), "backup.zip")},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("confirmation", response.get_json()["error"].lower())


if __name__ == "__main__":
    unittest.main()
