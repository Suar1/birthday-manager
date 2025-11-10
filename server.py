"""Flask server for birthday reminder application."""
import argparse
import os
import csv
import io
import re
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory, send_file, Response
from werkzeug.utils import secure_filename
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from email.message import EmailMessage
import logging
import urllib.request
import urllib.parse
import urllib.error
import json
import base64
from typing import Dict, Tuple

# Configure logging - sanitize sensitive data
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom formatter to sanitize logs
class SanitizedFormatter(logging.Formatter):
    def format(self, record):
        # Remove potential password/sensitive data from logs
        msg = super().format(record)
        # Replace common password patterns
        msg = re.sub(r'(password|passwd|pwd)\s*[:=]\s*\S+', r'\1: [REDACTED]', msg, flags=re.IGNORECASE)
        msg = re.sub(r'smtpPassword["\']?\s*[:=]\s*["\']?[^"\']+', 'smtpPassword: [REDACTED]', msg, flags=re.IGNORECASE)
        return msg

handler = logging.StreamHandler()
handler.setFormatter(SanitizedFormatter())
logger.addHandler(handler)

from core import (
    get_db_path,
    init_database,
    get_todays_birthdays,
    get_all_birthdays,
    add_birthday,
    update_birthday,
    delete_birthday,
    get_birthday_by_id,
    generate_email_content,
    export_birthdays,
    import_birthdays,
)
from config import (
    get_smtp_settings,
    save_smtp_settings,
    validate_smtp_settings,
    reset_config as reset_config_file,
)

app = Flask(__name__, static_folder="static", static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max file size

# Configuration
UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def fetch_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    """
    Fetch OAuth2 access token from Google using refresh token.
    
    Args:
        client_id: Google OAuth2 client ID
        client_secret: Google OAuth2 client secret
        refresh_token: OAuth2 refresh token
        
    Returns:
        Access token string
        
    Raises:
        Exception: If token fetch fails
    """
    token_url = "https://oauth2.googleapis.com/token"
    
    data = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }).encode("utf-8")
    
    req = urllib.request.Request(token_url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            if "access_token" not in result:
                raise Exception(f"Token response missing access_token: {result.get('error', 'Unknown error')}")
            return result["access_token"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else "Unknown error"
        try:
            error_json = json.loads(error_body)
            error_msg = error_json.get("error_description", error_json.get("error", "Unknown error"))
        except:
            error_msg = error_body
        raise Exception(f"Failed to fetch access token: {error_msg}")
    except Exception as e:
        raise Exception(f"Failed to fetch access token: {str(e)}")


def build_xoauth2_string(email: str, access_token: str) -> str:
    """
    Build XOAUTH2 authentication string for SMTP.
    
    Args:
        email: Gmail address
        access_token: OAuth2 access token
        
    Returns:
        Base64-encoded XOAUTH2 string
    """
    auth_string = f"user={email}\x01auth=Bearer {access_token}\x01\x01"
    return base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")


def send_gmail_oauth2(
    smtp_server: str,
    smtp_port: int,
    email: str,
    access_token: str,
    msg: EmailMessage,
    timeout: int = 20
) -> None:
    """
    Send email via Gmail SMTP using XOAUTH2 authentication.
    
    Args:
        smtp_server: SMTP server address
        smtp_port: SMTP port
        email: Gmail address
        access_token: OAuth2 access token
        msg: EmailMessage object to send
        timeout: Connection timeout in seconds
        
    Raises:
        smtplib.SMTPException: If sending fails
    """
    xoauth2_string = build_xoauth2_string(email, access_token)
    
    with smtplib.SMTP(smtp_server, smtp_port, timeout=timeout) as s:
        s.ehlo()
        s.starttls()
        s.ehlo()
        # Authenticate using XOAUTH2
        # Send AUTH XOAUTH2 command with base64-encoded string
        code, response = s.docmd("AUTH", "XOAUTH2 " + xoauth2_string)
        if code != 235:
            raise smtplib.SMTPAuthenticationError(code, response)
        s.send_message(msg)


def should_use_oauth2(settings: Dict) -> bool:
    """
    Determine if OAuth2 should be used for SMTP authentication.
    
    Args:
        settings: SMTP settings dictionary
        
    Returns:
        True if OAuth2 should be used, False otherwise
    """
    smtp_server = settings.get("smtpServer", "").lower()
    is_gmail = "gmail.com" in smtp_server or smtp_server == "smtp.gmail.com"
    
    if not is_gmail:
        return False
    
    # Check if OAuth2 credentials are present (refresh token can be encrypted or plain)
    has_refresh_token = bool(settings.get("googleRefreshToken") or settings.get("googleRefreshTokenEncrypted"))
    has_oauth2 = all([
        settings.get("googleClientId"),
        settings.get("googleClientSecret"),
        has_refresh_token
    ])
    
    return has_oauth2


def send_email_with_auth(settings: Dict, msg) -> None:
    """
    Send email using appropriate authentication method (OAuth2 or password).
    Supports both EmailMessage and MIMEMultipart.
    
    Args:
        settings: SMTP settings dictionary
        msg: EmailMessage or MIMEMultipart object to send
        
    Raises:
        smtplib.SMTPException: If sending fails
        Exception: If OAuth2 token fetch fails
    """
    smtp_server = settings["smtpServer"]
    smtp_port = int(settings["smtpPort"])
    smtp_email = settings["smtpEmail"]
    
    if should_use_oauth2(settings):
        # Use OAuth2 authentication
        try:
            access_token = fetch_access_token(
                settings["googleClientId"],
                settings["googleClientSecret"],
                settings["googleRefreshToken"]
            )
            # For OAuth2, we need EmailMessage - convert if needed
            if isinstance(msg, MIMEMultipart):
                # Convert MIMEMultipart to EmailMessage for OAuth2
                email_msg = EmailMessage()
                email_msg["From"] = msg["From"]
                email_msg["To"] = msg["To"]
                email_msg["Subject"] = msg["Subject"]
                # Extract text/html content from MIMEMultipart
                html_content = None
                text_content = None
                for part in msg.walk():
                    content_type = part.get_content_type()
                    if content_type == "text/html":
                        html_content = part.get_payload(decode=True).decode("utf-8")
                    elif content_type == "text/plain":
                        text_content = part.get_payload(decode=True).decode("utf-8")
                
                # Set content (prefer HTML if available)
                if html_content:
                    email_msg.set_content(html_content, subtype="html")
                elif text_content:
                    email_msg.set_content(text_content)
                else:
                    # Fallback: get all text parts
                    email_msg.set_content(str(msg))
                
                send_gmail_oauth2(smtp_server, smtp_port, smtp_email, access_token, email_msg)
            else:
                send_gmail_oauth2(smtp_server, smtp_port, smtp_email, access_token, msg)
        except Exception as e:
            # Log error without exposing secrets
            sanitized_error = re.sub(r'(client_secret|refresh_token|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', str(e), flags=re.IGNORECASE)
            logger.error(f"OAuth2 authentication failed: {sanitized_error}")
            raise
    else:
        # Use password authentication
        smtp_password = settings["smtpPassword"]
        with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as s:
            s.ehlo()
            s.starttls()
            s.ehlo()
            s.login(smtp_email, smtp_password)
            s.send_message(msg)


def get_smtp_error_message(error: Exception) -> Tuple[str, int]:
    """
    Get user-friendly error message for SMTP errors.
    
    Returns:
        Tuple of (error_message, http_status_code)
    """
    error_str = str(error)
    error_code = getattr(error, 'smtp_code', None)
    
    # Map authentication errors to 401
    if isinstance(error, smtplib.SMTPAuthenticationError) or error_code in [535, 534]:
        if error_code == 534 or "Application-specific password required" in error_str or "InvalidSecondFactor" in error_str:
            return (
                "Gmail requires an App Password or OAuth2. "
                "Use OAuth2 (recommended) or generate an App Password in Google Account settings.",
                401
            )
        return ("SMTP authentication failed. Check your credentials.", 401)
    
    # Check for Gmail App Password requirement (legacy)
    if "Application-specific password required" in error_str or "InvalidSecondFactor" in error_str:
        return (
            "Gmail requires an App Password instead of your regular password. "
            "Please follow these steps:\n\n"
            "1. Go to your Google Account settings\n"
            "2. Enable 2-Step Verification (if not already enabled)\n"
            "3. Go to Security → App passwords\n"
            "4. Generate a new App Password for 'Mail'\n"
            "5. Use that 16-character App Password in the SMTP Password field\n\n"
            "For more help: https://support.google.com/mail/?p=InvalidSecondFactor",
            401
        )
    
    return (f"SMTP error: {error_str}", 500)


def get_portable_mode() -> bool:
    """Check if running in portable mode."""
    return os.environ.get("BIRTHDAY_REMINDER_PORTABLE", "").lower() == "true"


@app.route("/")
def index():
    """Serve the main HTML page."""
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/birthdays", methods=["GET"])
def api_get_birthdays():
    """Get all birthdays."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        birthdays = get_all_birthdays(db_path)
        return jsonify(birthdays)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/birthdays/today", methods=["GET"])
def api_get_todays_birthdays():
    """Get today's birthdays."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        birthdays = get_todays_birthdays(db_path)
        return jsonify(birthdays)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/birthdays", methods=["POST"])
def api_add_birthday():
    """Add a new birthday."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        name = request.form.get("name", "").strip()
        birthday = request.form.get("birthday", "").strip()
        gender = request.form.get("gender", "").strip() or None
        
        if not name or not birthday:
            return jsonify({"error": "Name and birthday are required"}), 400
        
        # Handle photo upload
        photo_path = None
        if "photo" in request.files:
            file = request.files["photo"]
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{os.urandom(8).hex()}-{filename}"
                file_path = UPLOADS_DIR / unique_filename
                file.save(str(file_path))
                photo_path = f"/uploads/{unique_filename}"
        
        birthday_id = add_birthday(db_path, name, birthday, gender, photo_path)
        return jsonify({"message": "Birthday added successfully!", "id": birthday_id})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/birthdays/<int:birthday_id>", methods=["PUT"])
def api_update_birthday(birthday_id):
    """Update an existing birthday."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        name = request.form.get("name", "").strip()
        birthday = request.form.get("birthday", "").strip()
        gender = request.form.get("gender", "").strip() or None
        
        if not name or not birthday:
            return jsonify({"error": "Name and birthday are required"}), 400
        
        # Handle photo upload
        photo_path = None
        if "photo" in request.files:
            file = request.files["photo"]
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{os.urandom(8).hex()}-{filename}"
                file_path = UPLOADS_DIR / unique_filename
                file.save(str(file_path))
                photo_path = f"/uploads/{unique_filename}"
        
        # Get old photo path to delete it
        old_birthday = get_birthday_by_id(db_path, birthday_id)
        if old_birthday and old_birthday.get("photo"):
            old_photo_path = Path(__file__).parent / old_birthday["photo"].lstrip("/")
            if old_photo_path.exists():
                old_photo_path.unlink()
        
        success = update_birthday(db_path, birthday_id, name, birthday, gender, photo_path)
        if success:
            return jsonify({"message": "Birthday updated successfully!"})
        else:
            return jsonify({"error": "Birthday not found"}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/birthdays/<int:birthday_id>", methods=["DELETE"])
def api_delete_birthday(birthday_id):
    """Delete a birthday."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        success, photo_path = delete_birthday(db_path, birthday_id)
        if not success:
            return jsonify({"error": "Birthday not found"}), 404
        
        # Delete photo file if exists
        if photo_path:
            photo_file = Path(__file__).parent / photo_path.lstrip("/")
            if photo_file.exists():
                photo_file.unlink()
        
        return jsonify({"message": "Birthday deleted successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/config", methods=["GET"])
def api_get_config():
    """Get SMTP configuration. Never returns passwords or secrets."""
    try:
        portable = get_portable_mode()
        settings = get_smtp_settings(portable)
        # Security: Never return passwords or OAuth2 secrets in any response
        # googleClientId is safe to return (it's public), but secrets are not
        safe_settings = {
            k: v for k, v in settings.items() 
            if k not in ["smtpPassword", "googleClientSecret", "googleRefreshToken"]
        }
        return jsonify(safe_settings)
    except Exception as e:
        logger.error(f"Error getting config: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/config", methods=["POST"])
def api_save_config():
    """Save SMTP configuration."""
    try:
        portable = get_portable_mode()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        is_valid, error_msg = validate_smtp_settings(data)
        if not is_valid:
            return jsonify({"error": error_msg}), 400
        
        save_smtp_settings(data, portable)
        return jsonify({"message": "Configuration saved successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/config/reset", methods=["POST"])
def api_reset_config():
    """Reset configuration to defaults."""
    try:
        portable = get_portable_mode()
        reset_config_file(portable)
        return jsonify({"message": "Configuration reset successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/oauth/device/init", methods=["POST"])
def api_oauth_device_init():
    """Initialize Gmail OAuth2 device flow."""
    try:
        portable = get_portable_mode()
        settings = get_smtp_settings(portable)
        
        # Check if client ID and secret are configured
        client_id = settings.get("googleClientId")
        client_secret = settings.get("googleClientSecret")
        
        if not client_id or not client_secret:
            return jsonify({
                "error": "Google Client ID and Secret must be configured first. Please enter them in SMTP Settings."
            }), 400
        
        # Call Google device code endpoint
        device_url = "https://oauth2.googleapis.com/device/code"
        data = urllib.parse.urlencode({
            "client_id": client_id,
            "scope": "https://mail.google.com/"
        }).encode("utf-8")
        
        req = urllib.request.Request(device_url, data=data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode("utf-8"))
                
                if "device_code" not in result or "user_code" not in result:
                    return jsonify({
                        "error": f"Failed to initialize device flow: {result.get('error', 'Unknown error')}"
                    }), 500
                
                # Store device_code temporarily (in-memory, expires after interval)
                # In production, you might want to use Redis or similar
                # For now, return it to client to poll with
                return jsonify({
                    "device_code": result["device_code"],
                    "user_code": result["user_code"],
                    "verification_url": result.get("verification_url", "https://www.google.com/device"),
                    "interval": result.get("interval", 5),
                    "expires_in": result.get("expires_in", 1800)
                })
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else "Unknown error"
            try:
                error_json = json.loads(error_body)
                error_msg = error_json.get("error_description", error_json.get("error", "Unknown error"))
            except:
                error_msg = error_body
            sanitized = re.sub(r'(client_id|client_secret)\s*[:=]\s*\S+', r'\1: [REDACTED]', error_msg, flags=re.IGNORECASE)
            logger.error(f"Device flow init failed: {sanitized}")
            return jsonify({"error": f"Failed to initialize device flow: {error_msg}"}), 500
    except Exception as e:
        sanitized = re.sub(r'(client_id|client_secret|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', str(e), flags=re.IGNORECASE)
        logger.error(f"Error initializing device flow: {sanitized}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/oauth/device/poll", methods=["POST"])
def api_oauth_device_poll():
    """Poll for OAuth2 device flow authorization and store refresh token."""
    try:
        portable = get_portable_mode()
        data = request.get_json()
        
        if not data or not data.get("device_code"):
            return jsonify({"error": "device_code is required"}), 400
        
        device_code = data["device_code"]
        settings = get_smtp_settings(portable)
        
        client_id = settings.get("googleClientId")
        client_secret = settings.get("googleClientSecret")
        
        if not client_id or not client_secret:
            return jsonify({"error": "Google Client ID and Secret must be configured"}), 400
        
        # Poll Google token endpoint
        token_url = "https://oauth2.googleapis.com/token"
        poll_data = urllib.parse.urlencode({
            "client_id": client_id,
            "client_secret": client_secret,
            "device_code": device_code,
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
        }).encode("utf-8")
        
        req = urllib.request.Request(token_url, data=poll_data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode("utf-8"))
                
                if "error" in result:
                    error = result["error"]
                    if error == "authorization_pending":
                        return jsonify({"status": "pending", "message": "Waiting for authorization..."}), 200
                    elif error == "slow_down":
                        return jsonify({"status": "slow_down", "message": "Please wait before polling again"}), 200
                    elif error == "expired_token":
                        return jsonify({"status": "expired", "error": "Device code expired. Please start over."}), 400
                    else:
                        return jsonify({"status": "error", "error": result.get("error_description", error)}), 400
                
                if "refresh_token" not in result:
                    return jsonify({"status": "error", "error": "No refresh token in response"}), 500
                
                # Store refresh token (encrypted) and update settings
                refresh_token = result["refresh_token"]
                settings["googleRefreshToken"] = refresh_token
                save_smtp_settings(settings, portable)
                
                # Never return the refresh token to client
                return jsonify({
                    "status": "success",
                    "message": "Gmail OAuth2 connected successfully!"
                })
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else "Unknown error"
            try:
                error_json = json.loads(error_body)
                error = error_json.get("error", "unknown_error")
                if error == "authorization_pending":
                    return jsonify({"status": "pending", "message": "Waiting for authorization..."}), 200
                error_msg = error_json.get("error_description", error)
            except:
                error_msg = error_body
            sanitized = re.sub(r'(client_id|client_secret|refresh_token|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', error_msg, flags=re.IGNORECASE)
            logger.error(f"Device flow poll failed: {sanitized}")
            return jsonify({"status": "error", "error": error_msg}), 500
    except Exception as e:
        sanitized = re.sub(r'(client_id|client_secret|refresh_token|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', str(e), flags=re.IGNORECASE)
        logger.error(f"Error polling device flow: {sanitized}")
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/test-email", methods=["POST"])
def api_test_email():
    """Send a test email using SMTP settings (OAuth2 or password auth)."""
    try:
        portable = get_portable_mode()
        settings = get_smtp_settings(portable)
        
        if not settings:
            return jsonify({"error": "SMTP settings are not configured"}), 400
        
        # Create email using EmailMessage
        msg = EmailMessage()
        msg["Subject"] = "Birthday Manager – SMTP test"
        msg["From"] = settings["smtpEmail"]
        msg["To"] = settings["recipientEmail"]
        msg.set_content("SMTP is working. 🎉")
        
        # Send email using appropriate authentication method
        send_email_with_auth(settings, msg)
        
        return jsonify({"message": "Test email sent successfully!"})
    except smtplib.SMTPException as e:
        error_msg, status_code = get_smtp_error_message(e)
        # Never log secrets - sanitize error message
        sanitized_error = re.sub(r'(client_secret|refresh_token|password|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', str(e), flags=re.IGNORECASE)
        logger.error(f"SMTP error sending test email: {sanitized_error}")
        return jsonify({"error": error_msg}), status_code
    except Exception as e:
        # Check if it's an OAuth2 token fetch error
        error_str = str(e)
        if "access token" in error_str.lower() or "oauth" in error_str.lower():
            sanitized_error = re.sub(r'(client_secret|refresh_token|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', error_str, flags=re.IGNORECASE)
            logger.error(f"OAuth2 error sending test email: {sanitized_error}")
            return jsonify({"error": "OAuth2 authentication failed. Check your Client ID, Secret, and Refresh Token."}), 401
        logger.error(f"Error sending test email: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/test-reminder", methods=["POST"])
def api_test_reminder():
    """Send test reminder emails for today's birthdays."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        settings = get_smtp_settings(portable)
        if not settings:
            return jsonify({"error": "SMTP settings are not configured"}), 400
        
        birthdays = get_todays_birthdays(db_path)
        if not birthdays:
            return jsonify({"message": "No birthdays today"})
        
        sent_count = 0
        for birthday in birthdays:
            try:
                subject, html_body = generate_email_content(birthday)
                
                msg = MIMEMultipart()
                msg["From"] = settings["smtpEmail"]
                msg["To"] = settings["recipientEmail"]
                msg["Subject"] = subject
                msg.attach(MIMEText(html_body, "html"))
                
                # Attach photo if exists
                if birthday.get("photo"):
                    photo_path = Path(__file__).parent / birthday["photo"].lstrip("/")
                    if photo_path.exists():
                        with open(photo_path, "rb") as f:
                            img = MIMEImage(f.read())
                            img.add_header("Content-ID", f"<photo_{birthday['id']}>")
                            msg.attach(img)
                
                # Send email using appropriate authentication method
                send_email_with_auth(settings, msg)
                
                sent_count += 1
            except (smtplib.SMTPException, Exception) as e:
                # Log error but continue with other birthdays
                sanitized_error = re.sub(r'(client_secret|refresh_token|password|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', str(e), flags=re.IGNORECASE)
                logger.error(f"Failed to send reminder for {birthday.get('name', 'unknown')}: {sanitized_error}")
        
        return jsonify({"message": f"Test reminder emails sent for {sent_count} birthday(s)"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/uploads/<filename>")
def serve_upload(filename):
    """Serve uploaded files."""
    return send_from_directory(str(UPLOADS_DIR), filename)


@app.route("/api/export", methods=["GET"])
def api_export():
    """Export all birthdays with images as a ZIP file."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        # Create temporary export file
        export_dir = Path(__file__).parent / "exports"
        export_dir.mkdir(exist_ok=True)
        export_filename = f"birthdays_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        export_path = export_dir / export_filename
        
        # Export birthdays
        export_birthdays(db_path, UPLOADS_DIR, export_path)
        
        # Send file
        return send_file(
            str(export_path),
            mimetype='application/zip',
            as_attachment=True,
            download_name=export_filename
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/import", methods=["POST"])
def api_import():
    """Import birthdays from a ZIP file."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.endswith('.zip'):
            return jsonify({"error": "File must be a ZIP file"}), 400
        
        # Save uploaded file temporarily
        import_dir = Path(__file__).parent / "imports"
        import_dir.mkdir(exist_ok=True)
        import_filename = f"import_{os.urandom(8).hex()}.zip"
        import_path = import_dir / import_filename
        
        file.save(str(import_path))
        
        # Get replace option
        replace_existing = request.form.get('replace', 'false').lower() == 'true'
        
        # Import birthdays
        imported, skipped, errors = import_birthdays(
            db_path,
            UPLOADS_DIR,
            import_path,
            replace_existing
        )
        
        # Clean up import file
        if import_path.exists():
            import_path.unlink()
        
        result = {
            "message": f"Import completed: {imported} imported, {skipped} skipped",
            "imported": imported,
            "skipped": skipped
        }
        
        if errors:
            result["errors"] = errors[:10]  # Limit to first 10 errors
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/export/csv", methods=["GET"])
def api_export_csv():
    """Export birthdays as CSV file."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        birthdays = get_all_birthdays(db_path)
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Name', 'Birthday', 'Age', 'Gender', 'Photo'])
        
        for bday in birthdays:
            writer.writerow([
                bday.get('name', ''),
                bday.get('birthday', ''),
                bday.get('age', ''),
                bday.get('gender', ''),
                bday.get('photo', '')
            ])
        
        filename = f"birthdays_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
    except Exception as e:
        logger.error(f"Error exporting CSV: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/export/ics", methods=["GET"])
def api_export_ics():
    """Export birthdays as ICS (iCalendar) file."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        birthdays = get_all_birthdays(db_path)
        
        output = io.StringIO()
        output.write("BEGIN:VCALENDAR\n")
        output.write("VERSION:2.0\n")
        output.write("PRODID:-//Birthday Manager//EN\n")
        output.write("CALSCALE:GREGORIAN\n")
        
        for bday in birthdays:
            name = bday.get('name', 'Unknown')
            birthday = bday.get('birthday', '')
            if not birthday:
                continue
            
            # Create recurring event for each year
            bday_date = datetime.strptime(birthday, "%Y-%m-%d")
            age = bday.get('age', 0)
            
            output.write("BEGIN:VEVENT\n")
            output.write(f"UID:birthday-{bday.get('id', '')}@birthday-manager\n")
            output.write(f"DTSTART;VALUE=DATE:{bday_date.strftime('%Y%m%d')}\n")
            output.write(f"RRULE:FREQ=YEARLY\n")
            output.write(f"SUMMARY:{name}'s Birthday ({age} years old)\n")
            output.write(f"DESCRIPTION:Happy Birthday to {name}!\n")
            output.write("END:VEVENT\n")
        
        output.write("END:VCALENDAR\n")
        
        filename = f"birthdays_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ics"
        
        return Response(
            output.getvalue(),
            mimetype='text/calendar',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
    except Exception as e:
        logger.error(f"Error exporting ICS: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/import/csv/preview", methods=["POST"])
def api_import_csv_preview():
    """Preview CSV import and show differences."""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "File must be a CSV file"}), 400
        
        # Read CSV
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        rows = []
        for row in csv_reader:
            rows.append({
                'name': row.get('Name', '').strip(),
                'birthday': row.get('Birthday', '').strip(),
                'gender': row.get('Gender', '').strip() or None,
                'photo': row.get('Photo', '').strip() or None
            })
        
        # Get existing birthdays for comparison
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        existing = get_all_birthdays(db_path)
        existing_names = {b['name'].lower().strip() for b in existing}
        
        # Analyze differences
        new_entries = []
        duplicates = []
        invalid = []
        
        for row in rows:
            if not row['name'] or not row['birthday']:
                invalid.append(row)
                continue
            
            # Check for duplicates
            if row['name'].lower().strip() in existing_names:
                duplicates.append(row)
            else:
                new_entries.append(row)
        
        return jsonify({
            "preview": {
                "total": len(rows),
                "new": len(new_entries),
                "duplicates": len(duplicates),
                "invalid": len(invalid)
            },
            "new_entries": new_entries[:10],  # First 10
            "duplicates": duplicates[:10],
            "invalid": invalid[:10]
        })
    except Exception as e:
        logger.error(f"Error previewing CSV: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/import/csv", methods=["POST"])
def api_import_csv():
    """Import birthdays from CSV file."""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "File must be a CSV file"}), 400
        
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        replace_existing = request.form.get('replace', 'false').lower() == 'true'
        
        if replace_existing:
            with sqlite3.connect(str(db_path)) as conn:
                conn.execute("DELETE FROM birthdays")
                conn.commit()
        
        # Read and import CSV
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        imported = 0
        skipped = 0
        errors = []
        
        for row in csv_reader:
            try:
                name = row.get('Name', '').strip()
                birthday = row.get('Birthday', '').strip()
                
                if not name or not birthday:
                    skipped += 1
                    continue
                
                # Validate date
                try:
                    datetime.strptime(birthday, "%Y-%m-%d")
                except ValueError:
                    skipped += 1
                    errors.append(f"Invalid date for {name}")
                    continue
                
                gender = row.get('Gender', '').strip() or None
                
                add_birthday(db_path, name, birthday, gender, None)
                imported += 1
            except Exception as e:
                skipped += 1
                errors.append(f"Error importing {row.get('Name', 'unknown')}: {str(e)}")
        
        return jsonify({
            "message": f"Import completed: {imported} imported, {skipped} skipped",
            "imported": imported,
            "skipped": skipped,
            "errors": errors[:10]
        })
    except Exception as e:
        logger.error(f"Error importing CSV: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/digest/preview", methods=["GET"])
def api_digest_preview():
    """Preview daily digest for upcoming birthdays."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        days_ahead = int(request.args.get('days', 7))
        end_date = datetime.now() + timedelta(days=days_ahead)
        
        birthdays = get_all_birthdays(db_path)
        upcoming = []
        
        for bday in birthdays:
            bday_date = datetime.strptime(bday['birthday'], "%Y-%m-%d")
            this_year = datetime.now().replace(month=bday_date.month, day=bday_date.day)
            next_year = datetime.now().replace(year=datetime.now().year + 1, month=bday_date.month, day=bday_date.day)
            
            target = this_year if this_year >= datetime.now() else next_year
            
            if target <= end_date:
                days_until = (target - datetime.now()).days
                upcoming.append({
                    **bday,
                    'days_until': days_until,
                    'target_date': target.strftime('%Y-%m-%d')
                })
        
        upcoming.sort(key=lambda x: x['days_until'])
        
        return jsonify({
            "upcoming": upcoming,
            "count": len(upcoming),
            "period_days": days_ahead
        })
    except Exception as e:
        logger.error(f"Error previewing digest: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/digest/send", methods=["POST"])
def api_digest_send():
    """Send daily digest email."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        settings = get_smtp_settings(portable)
        if not settings:
            return jsonify({"error": "SMTP settings are not configured"}), 400
        
        days_ahead = int(request.json.get('days', 7) if request.json else 7)
        end_date = datetime.now() + timedelta(days=days_ahead)
        
        birthdays = get_all_birthdays(db_path)
        upcoming = []
        
        for bday in birthdays:
            bday_date = datetime.strptime(bday['birthday'], "%Y-%m-%d")
            this_year = datetime.now().replace(month=bday_date.month, day=bday_date.day)
            next_year = datetime.now().replace(year=datetime.now().year + 1, month=bday_date.month, day=bday_date.day)
            
            target = this_year if this_year >= datetime.now() else next_year
            
            if target <= end_date:
                days_until = (target - datetime.now()).days
                upcoming.append({
                    **bday,
                    'days_until': days_until,
                    'target_date': target.strftime('%Y-%m-%d')
                })
        
        if not upcoming:
            return jsonify({"message": "No upcoming birthdays in the selected period"})
        
        # Generate email content
        html_content = "<h2>Upcoming Birthdays</h2><ul>"
        for bday in sorted(upcoming, key=lambda x: x['days_until']):
            days_text = "Today!" if bday['days_until'] == 0 else f"in {bday['days_until']} days"
            html_content += f"<li><strong>{bday['name']}</strong> - {bday['target_date']} ({days_text})</li>"
        html_content += "</ul>"
        
        msg = MIMEMultipart()
        msg["From"] = settings["smtpEmail"]
        msg["To"] = settings["recipientEmail"]
        msg["Subject"] = f"Birthday Digest - Next {days_ahead} Days"
        msg.attach(MIMEText(html_content, "html"))
        
        # Send email using appropriate authentication method
        send_email_with_auth(settings, msg)
        
        return jsonify({
            "message": f"Digest sent successfully with {len(upcoming)} birthdays",
            "count": len(upcoming)
        })
    except smtplib.SMTPException as e:
        error_msg, status_code = get_smtp_error_message(e)
        sanitized_error = re.sub(r'(client_secret|refresh_token|password|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', str(e), flags=re.IGNORECASE)
        logger.error(f"SMTP error sending digest: {sanitized_error}")
        return jsonify({"error": error_msg}), status_code
    except Exception as e:
        error_str = str(e)
        if "access token" in error_str.lower() or "oauth" in error_str.lower():
            sanitized_error = re.sub(r'(client_secret|refresh_token|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', error_str, flags=re.IGNORECASE)
            logger.error(f"OAuth2 error sending digest: {sanitized_error}")
            return jsonify({"error": "OAuth2 authentication failed. Check your Client ID, Secret, and Refresh Token."}), 401
        logger.error(f"Error sending digest: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/birthdays/upcoming30", methods=["GET"])
def api_get_upcoming30():
    """Get birthdays in next 30 days grouped by weekday."""
    try:
        portable = get_portable_mode()
        db_path = get_db_path(portable)
        init_database(db_path)
        
        birthdays = get_all_birthdays(db_path)
        end_date = datetime.now() + timedelta(days=30)
        
        grouped = {}
        weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for weekday in weekdays:
            grouped[weekday] = []
        
        for bday in birthdays:
            bday_date = datetime.strptime(bday['birthday'], "%Y-%m-%d")
            this_year = datetime.now().replace(month=bday_date.month, day=bday_date.day)
            next_year = datetime.now().replace(year=datetime.now().year + 1, month=bday_date.month, day=bday_date.day)
            
            target = this_year if this_year >= datetime.now() else next_year
            
            if target <= end_date:
                days_until = (target - datetime.now()).days
                weekday_name = weekdays[target.weekday()]
                grouped[weekday_name].append({
                    **bday,
                    'days_until': days_until,
                    'target_date': target.strftime('%Y-%m-%d')
                })
        
        # Sort each group by days_until
        for weekday in weekdays:
            grouped[weekday].sort(key=lambda x: x['days_until'])
        
        return jsonify(grouped)
    except Exception as e:
        logger.error(f"Error getting upcoming 30 days: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/static/manifest.webmanifest", methods=["GET"])
def serve_manifest():
    """Serve PWA manifest."""
    return send_from_directory("static", "manifest.webmanifest", mimetype="application/manifest+json")


@app.route("/static/sw.js", methods=["GET"])
def serve_sw():
    """Serve service worker."""
    return send_from_directory("static", "sw.js", mimetype="application/javascript")


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Birthday Reminder Flask Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=5000, help="Port to bind to")
    parser.add_argument("--portable", action="store_true", help="Use portable mode (local config)")
    
    args = parser.parse_args()
    
    if args.portable:
        os.environ["BIRTHDAY_REMINDER_PORTABLE"] = "true"
    
    # Initialize database
    portable = get_portable_mode()
    db_path = get_db_path(portable)
    init_database(db_path)
    
    # Run Flask app - single process, no reloader, no threads
    app.run(
        host=args.host,
        port=args.port,
        debug=False,
        use_reloader=False,
        threaded=False
    )


if __name__ == "__main__":
    main()

