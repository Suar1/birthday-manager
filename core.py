"""Core business logic for birthday reminder application."""
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import sqlite3
import json
import zipfile
import shutil
import os
from pathlib import Path


def get_db_path(portable: bool = False) -> Path:
    """Get the database path based on portable mode."""
    if portable:
        return Path(__file__).parent / "data" / "birthdays.db"
    else:
        db_dir = Path.home() / ".birthday_reminder"
        db_dir.mkdir(exist_ok=True)
        return db_dir / "birthdays.db"


def init_database(db_path: Path) -> None:
    """Initialize database tables if they don't exist."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS birthdays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                birthday TEXT NOT NULL,
                photo TEXT,
                gender TEXT
            )
        """)
        conn.commit()


def calculate_age(birthday: str) -> int:
    """Calculate age from birthday string (YYYY-MM-DD)."""
    try:
        birth_date = datetime.strptime(birthday, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year
        if (today.month, today.day) < (birth_date.month, birth_date.day):
            age -= 1
        return age
    except (ValueError, TypeError):
        return 0


def format_birthday_date(birthday: str) -> str:
    """Format birthday string for display."""
    try:
        date_obj = datetime.strptime(birthday, "%Y-%m-%d")
        return date_obj.strftime("%B %d, %Y")
    except (ValueError, TypeError):
        return birthday


def get_todays_birthdays(db_path: Path) -> List[Dict]:
    """Get all birthdays that occur today."""
    today = datetime.now()
    formatted_today = today.strftime("%m-%d")
    
    birthdays = []
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT * FROM birthdays WHERE strftime('%m-%d', birthday) = ?",
            (formatted_today,)
        )
        for row in cursor.fetchall():
            birthday_dict = dict(row)
            birthday_dict["age"] = calculate_age(birthday_dict["birthday"])
            birthdays.append(birthday_dict)
    
    return birthdays


def get_all_birthdays(db_path: Path) -> List[Dict]:
    """Get all birthdays from database."""
    birthdays = []
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT * FROM birthdays ORDER BY birthday")
        for row in cursor.fetchall():
            birthday_dict = dict(row)
            birthday_dict["age"] = calculate_age(birthday_dict["birthday"])
            birthdays.append(birthday_dict)
    
    return birthdays


def add_birthday(
    db_path: Path,
    name: str,
    birthday: str,
    gender: Optional[str] = None,
    photo: Optional[str] = None
) -> int:
    """Add a new birthday entry. Returns the ID of the created entry."""
    # Validate and clean inputs
    name = name.strip() if name else ""
    birthday = birthday.strip() if birthday else ""
    
    if not name or not birthday:
        raise ValueError("Name and birthday are required")
    
    # Validate date format
    try:
        datetime.strptime(birthday, "%Y-%m-%d")
    except ValueError:
        raise ValueError("Invalid date format. Use YYYY-MM-DD")
    
    with sqlite3.connect(str(db_path)) as conn:
        cursor = conn.execute(
            "INSERT INTO birthdays (name, birthday, photo, gender) VALUES (?, ?, ?, ?)",
            (name, birthday, photo, gender)
        )
        conn.commit()
        return cursor.lastrowid


def update_birthday(
    db_path: Path,
    birthday_id: int,
    name: str,
    birthday: str,
    gender: Optional[str] = None,
    photo: Optional[str] = None
) -> bool:
    """Update an existing birthday entry."""
    name = name.strip() if name else ""
    birthday = birthday.strip() if birthday else ""
    
    if not name or not birthday:
        raise ValueError("Name and birthday are required")
    
    # Validate date format
    try:
        datetime.strptime(birthday, "%Y-%m-%d")
    except ValueError:
        raise ValueError("Invalid date format. Use YYYY-MM-DD")
    
    with sqlite3.connect(str(db_path)) as conn:
        if photo:
            conn.execute(
                "UPDATE birthdays SET name = ?, birthday = ?, photo = ?, gender = ? WHERE id = ?",
                (name, birthday, photo, gender, birthday_id)
            )
        else:
            conn.execute(
                "UPDATE birthdays SET name = ?, birthday = ?, gender = ? WHERE id = ?",
                (name, birthday, gender, birthday_id)
            )
        conn.commit()
        return conn.total_changes > 0


def delete_birthday(db_path: Path, birthday_id: int) -> Tuple[bool, Optional[str]]:
    """Delete a birthday entry. Returns (success, photo_path)."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT photo FROM birthdays WHERE id = ?", (birthday_id,))
        row = cursor.fetchone()
        photo_path = row["photo"] if row else None
        
        conn.execute("DELETE FROM birthdays WHERE id = ?", (birthday_id,))
        conn.commit()
        success = conn.total_changes > 0
        
        return (success, photo_path)


def get_birthday_by_id(db_path: Path, birthday_id: int) -> Optional[Dict]:
    """Get a single birthday by ID."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT * FROM birthdays WHERE id = ?", (birthday_id,))
        row = cursor.fetchone()
        if row:
            birthday_dict = dict(row)
            birthday_dict["age"] = calculate_age(birthday_dict["birthday"])
            return birthday_dict
        return None


def generate_email_content(birthday: Dict) -> Tuple[str, str]:
    """Generate email subject and HTML body for a birthday reminder."""
    name = birthday["name"]
    age = birthday.get("age", calculate_age(birthday["birthday"]))
    gender = birthday.get("gender", "male")
    has_photo = bool(birthday.get("photo"))
    
    is_male = gender == "male"
    
    # Multilingual content
    subject = f"Birthday Reminder: {name}"
    
    # Gender-aware pronouns
    pronoun_en = "he" if is_male else "she"
    pronoun_de = "er" if is_male else "sie"
    pronoun_ar = "هو يبلغ" if is_male else "هي تبلغ"
    
    # Kurdish text
    kurdish_text = f"Îro rojbûna {name} ye, dibe {age} salî."
    
    # English text
    english_text = f"Today is {name}'s birthday, and {pronoun_en} is turning {age} years old."
    
    # German text
    german_text = f"Heute ist der Geburtstag von {name}, und {pronoun_de} wird {age} Jahre alt."
    
    # Arabic text
    arabic_text = f"اليوم هو عيد ميلاد {name}، و {pronoun_ar} من العمر {age} عامًا."
    
    photo_html = ""
    if has_photo:
        photo_path = birthday["photo"]
        photo_html = f'<p><img src="cid:photo_{birthday["id"]}" alt="Photo of {name}" style="max-width: 150px; border-radius: 10px"></p>'
    
    html_body = f"""
    <html>
    <body>
        <p><strong>Kurdish (Kurmanci):</strong> {kurdish_text}</p>
        <p><strong>English:</strong> {english_text}</p>
        <p><strong>German:</strong> {german_text}</p>
        <p><strong>Arabic:</strong> {arabic_text}</p>
        {photo_html}
    </body>
    </html>
    """
    
    return subject, html_body


def export_birthdays(db_path: Path, uploads_dir: Path, export_path: Path) -> None:
    """Export all birthdays with images to a ZIP file.
    
    Args:
        db_path: Path to the database
        uploads_dir: Path to the uploads directory containing images
        export_path: Path where the ZIP file should be created
    """
    # Get all birthdays
    birthdays = get_all_birthdays(db_path)
    
    # Prepare export data (remove age as it's calculated)
    export_data = []
    for bday in birthdays:
        export_item = {
            "name": bday["name"],
            "birthday": bday["birthday"],
            "gender": bday.get("gender"),
            "photo": bday.get("photo")
        }
        export_data.append(export_item)
    
    # Create ZIP file
    with zipfile.ZipFile(export_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add JSON file with birthday data
        json_data = json.dumps(export_data, indent=2, ensure_ascii=False)
        zipf.writestr("birthdays.json", json_data.encode('utf-8'))
        
        # Add image files
        for bday in birthdays:
            if bday.get("photo"):
                photo_path = bday["photo"].lstrip("/")
                # Remove "uploads/" prefix if present
                if photo_path.startswith("uploads/"):
                    photo_path = photo_path[8:]  # Remove "uploads/" (8 chars)
                source_path = uploads_dir / photo_path
                
                if source_path.exists():
                    # Store in images/ folder in ZIP
                    zip_path = f"images/{source_path.name}"
                    zipf.write(str(source_path), zip_path)


def import_birthdays(
    db_path: Path,
    uploads_dir: Path,
    import_path: Path,
    replace_existing: bool = False
) -> Tuple[int, int, List[str]]:
    """Import birthdays from a ZIP file.
    
    Args:
        db_path: Path to the database
        uploads_dir: Path to the uploads directory for images
        import_path: Path to the ZIP file to import
        replace_existing: If True, delete existing birthdays before import
    
    Returns:
        Tuple of (imported_count, skipped_count, errors)
    """
    imported = 0
    skipped = 0
    errors = []
    
    # Extract ZIP to temporary directory
    temp_dir = Path(__file__).parent / "temp_import"
    temp_dir.mkdir(exist_ok=True)
    
    try:
        # Extract ZIP file
        with zipfile.ZipFile(import_path, 'r') as zipf:
            zipf.extractall(temp_dir)
        
        # Read JSON file
        json_path = temp_dir / "birthdays.json"
        if not json_path.exists():
            errors.append("birthdays.json not found in import file")
            return (0, 0, errors)
        
        with open(json_path, 'r', encoding='utf-8') as f:
            birthdays_data = json.load(f)
        
        # Delete existing birthdays if requested
        if replace_existing:
            with sqlite3.connect(str(db_path)) as conn:
                conn.execute("DELETE FROM birthdays")
                conn.commit()
        
        # Import each birthday
        images_dir = temp_dir / "images"
        for bday_data in birthdays_data:
            try:
                name = bday_data.get("name", "").strip()
                birthday = bday_data.get("birthday", "").strip()
                
                if not name or not birthday:
                    skipped += 1
                    errors.append(f"Skipped entry: missing name or birthday")
                    continue
                
                # Validate date
                try:
                    datetime.strptime(birthday, "%Y-%m-%d")
                except ValueError:
                    skipped += 1
                    errors.append(f"Skipped {name}: invalid date format")
                    continue
                
                gender = bday_data.get("gender")
                photo_path = None
                
                # Handle image import
                if bday_data.get("photo"):
                    original_photo = bday_data["photo"]
                    # Extract filename from original path
                    if "/" in original_photo:
                        original_filename = original_photo.split("/")[-1]
                    else:
                        original_filename = original_photo
                    
                    # Look for image in extracted images folder
                    source_image = images_dir / original_filename
                    if not source_image.exists():
                        # Try to find by any name in images folder
                        image_files = list(images_dir.glob("*"))
                        if image_files:
                            source_image = image_files[0]  # Use first found image
                        else:
                            source_image = None
                    
                    if source_image and source_image.exists():
                        # Copy to uploads directory with unique name
                        unique_filename = f"{os.urandom(8).hex()}-{source_image.name}"
                        dest_path = uploads_dir / unique_filename
                        shutil.copy2(str(source_image), str(dest_path))
                        photo_path = f"/uploads/{unique_filename}"
                
                # Add birthday to database
                add_birthday(db_path, name, birthday, gender, photo_path)
                imported += 1
                
            except Exception as e:
                skipped += 1
                errors.append(f"Error importing {bday_data.get('name', 'unknown')}: {str(e)}")
        
    finally:
        # Clean up temporary directory
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
    
    return (imported, skipped, errors)

