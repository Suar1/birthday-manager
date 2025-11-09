"""Configuration management for birthday reminder application."""
import json
from pathlib import Path
from typing import Dict, Optional, Tuple


def get_config_path(portable: bool = False) -> Path:
    """Get the config file path based on portable mode."""
    if portable:
        return Path(__file__).parent / "data" / "birthday_reminder_config.json"
    else:
        config_dir = Path.home() / ".birthday_reminder"
        config_dir.mkdir(exist_ok=True)
        return config_dir / "birthday_reminder_config.json"


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


def get_smtp_settings(portable: bool = False) -> Dict:
    """Get SMTP settings from config."""
    config = load_config(portable)
    return config.get("smtp", {})


def save_smtp_settings(smtp_settings: Dict, portable: bool = False) -> None:
    """Save SMTP settings to config."""
    config = load_config(portable)
    config["smtp"] = smtp_settings
    save_config(config, portable)


def validate_smtp_settings(settings: Dict) -> Tuple[bool, Optional[str]]:
    """Validate SMTP settings. Returns (is_valid, error_message)."""
    required_fields = ["smtpServer", "smtpPort", "smtpEmail", "smtpPassword", "recipientEmail"]
    
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
    
    return True, None

