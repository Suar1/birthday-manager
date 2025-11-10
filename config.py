"""Configuration management for birthday reminder application."""
import json
import os
import base64
from pathlib import Path
from typing import Dict, Optional, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def get_config_path(portable: bool = False) -> Path:
    """Get the config file path based on portable mode."""
    if portable:
        return Path(__file__).parent / "data" / "birthday_reminder_config.json"
    else:
        config_dir = Path.home() / ".birthday_reminder"
        config_dir.mkdir(exist_ok=True)
        return config_dir / "birthday_reminder_config.json"


def get_encryption_key(portable: bool = False) -> bytes:
    """
    Get or generate encryption key for OAuth2 refresh tokens.
    Uses a machine-specific key derived from a fixed salt.
    """
    key_file = get_config_path(portable).parent / ".oauth_key"
    
    if key_file.exists():
        # Load existing key
        with open(key_file, "rb") as f:
            return f.read()
    else:
        # Generate new key using machine-specific identifier
        machine_id = os.environ.get("BIRTHDAY_REMINDER_MACHINE_ID", "default")
        salt = b"birthday_reminder_oauth_salt_2024"
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(machine_id.encode()))
        
        # Save key for future use
        key_file.parent.mkdir(parents=True, exist_ok=True)
        with open(key_file, "wb") as f:
            f.write(key)
        
        return key


def encrypt_refresh_token(token: str, portable: bool = False) -> str:
    """Encrypt OAuth2 refresh token for storage."""
    try:
        key = get_encryption_key(portable)
        f = Fernet(key)
        encrypted = f.encrypt(token.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    except Exception:
        # Fallback: return as-is if encryption fails (shouldn't happen)
        return token


def decrypt_refresh_token(encrypted_token: str, portable: bool = False) -> Optional[str]:
    """Decrypt OAuth2 refresh token from storage."""
    try:
        key = get_encryption_key(portable)
        f = Fernet(key)
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_token.encode())
        decrypted = f.decrypt(encrypted_bytes)
        return decrypted.decode()
    except Exception:
        return None


def load_config(portable: bool = False) -> Dict:
    """Load configuration from JSON file."""
    config_path = get_config_path(portable)
    
    if not config_path.exists():
        return {}
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_config(config: Dict, portable: bool = False) -> None:
    """Save configuration to JSON file."""
    config_path = get_config_path(portable)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def reset_config(portable: bool = False) -> None:
    """Reset configuration to default empty state."""
    config_path = get_config_path(portable)
    if config_path.exists():
        config_path.unlink()


def decrypt_password(encrypted_password: str, key: str, iv: str) -> Optional[str]:
    """Decrypt password from old encrypted format."""
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        
        # Convert hex strings to bytes
        encrypted_bytes = bytes.fromhex(encrypted_password)
        key_bytes = bytes.fromhex(key)
        iv_bytes = bytes.fromhex(iv)
        
        # Decrypt using AES-256-CBC
        cipher = Cipher(algorithms.AES(key_bytes), modes.CBC(iv_bytes), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(encrypted_bytes) + decryptor.finalize()
        
        # Remove PKCS7 padding
        padding_length = decrypted[-1]
        return decrypted[:-padding_length].decode('utf-8')
    except Exception as e:
        # If cryptography is not installed, return None
        return None


def get_old_smtp_settings(portable: bool = False) -> Optional[Dict]:
    """Check for old format SMTP settings in data/smtp.json."""
    old_path = Path(__file__).parent / "data" / "smtp.json"
    if not old_path.exists():
        return None
    
    try:
        with open(old_path, "r", encoding="utf-8") as f:
            old_config = json.load(f)
        
        # Check if it's the old encrypted format
        if "encryptedPassword" in old_config and "key" in old_config and "iv" in old_config:
            decrypted_password = decrypt_password(
                old_config["encryptedPassword"],
                old_config["key"],
                old_config["iv"]
            )
            
            if decrypted_password:
                return {
                    "smtpServer": old_config.get("smtpServer", ""),
                    "smtpPort": old_config.get("smtpPort", ""),
                    "smtpEmail": old_config.get("smtpEmail", ""),
                    "smtpPassword": decrypted_password,
                    "recipientEmail": old_config.get("recipientEmail", "")
                }
    except Exception:
        pass
    
    return None


def get_smtp_settings(portable: bool = False) -> Dict:
    """Get SMTP settings from config, with fallback to old format."""
    # First try new format
    config = load_config(portable)
    smtp_settings = config.get("smtp", {})
    
    # Decrypt refresh token if present
    if smtp_settings.get("googleRefreshTokenEncrypted"):
        decrypted = decrypt_refresh_token(smtp_settings["googleRefreshTokenEncrypted"], portable)
        if decrypted:
            smtp_settings["googleRefreshToken"] = decrypted
            # Don't expose encrypted version in returned dict
            smtp_settings.pop("googleRefreshTokenEncrypted", None)
    
    # If no settings found, try old format
    if not smtp_settings or not smtp_settings.get("smtpPassword"):
        old_settings = get_old_smtp_settings(portable)
        if old_settings:
            # Migrate old settings to new format
            save_smtp_settings(old_settings, portable)
            return old_settings
    
    return smtp_settings


def save_smtp_settings(smtp_settings: Dict, portable: bool = False) -> None:
    """Save SMTP settings to config. Encrypts refresh token if present."""
    # Create a copy to avoid modifying the original
    settings_to_save = smtp_settings.copy()
    
    # Encrypt refresh token if present (plain text)
    if "googleRefreshToken" in settings_to_save and settings_to_save["googleRefreshToken"]:
        encrypted = encrypt_refresh_token(settings_to_save["googleRefreshToken"], portable)
        settings_to_save["googleRefreshTokenEncrypted"] = encrypted
        # Remove plain text version
        settings_to_save.pop("googleRefreshToken", None)
    
    # Note: We keep googleClientSecret in config (needed for token refresh)
    # but it's never returned by API endpoints
    
    config = load_config(portable)
    config["smtp"] = settings_to_save
    save_config(config, portable)


def validate_smtp_settings(settings: Dict) -> Tuple[bool, Optional[str]]:
    """Validate SMTP settings. Returns (is_valid, error_message)."""
    required_fields = ["smtpServer", "smtpPort", "smtpEmail", "recipientEmail"]
    
    for field in required_fields:
        if not settings.get(field):
            return False, f"Missing required field: {field}"
    
    # Validate port is a number
    try:
        port = int(settings["smtpPort"])
        if port < 1 or port > 65535:
            return False, "SMTP port must be between 1 and 65535"
    except (ValueError, TypeError):
        return False, "SMTP port must be a valid number"
    
    # Basic email validation
    email_fields = ["smtpEmail", "recipientEmail"]
    for field in email_fields:
        email = settings[field]
        if "@" not in email or "." not in email.split("@")[1]:
            return False, f"Invalid email format for {field}"
    
    # For Gmail, check if OAuth2 or password is provided
    smtp_server = settings.get("smtpServer", "").lower()
    is_gmail = "gmail.com" in smtp_server or smtp_server == "smtp.gmail.com"
    
    if is_gmail:
        # Gmail: require either OAuth2 credentials OR password
        # Check for encrypted refresh token or plain text
        has_refresh_token = bool(settings.get("googleRefreshToken") or settings.get("googleRefreshTokenEncrypted"))
        has_oauth2 = all([
            settings.get("googleClientId"),
            settings.get("googleClientSecret"),
            has_refresh_token
        ])
        has_password = bool(settings.get("smtpPassword"))
        
        if not has_oauth2 and not has_password:
            return False, "Gmail requires either OAuth2 credentials (via Connect Gmail button) or App Password"
    else:
        # Non-Gmail: require password
        if not settings.get("smtpPassword"):
            return False, "SMTP password is required for non-Gmail servers"
    
    return True, None

