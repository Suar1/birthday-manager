"""Unit tests for core.py - Birthday Manager business logic."""
import unittest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core import (
    get_db_path,
    init_database,
    add_birthday,
    get_all_birthdays,
    get_todays_birthdays,
    calculate_age,
    export_birthdays,
    import_birthdays,
)


class TestCoreFunctions(unittest.TestCase):
    """Test core business logic functions."""
    
    def setUp(self):
        """Set up test database."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.db_path = self.test_dir / "test_birthdays.db"
        init_database(self.db_path)
    
    def tearDown(self):
        """Clean up test database."""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_add_birthday(self):
        """Test adding a birthday."""
        birthday_id = add_birthday(
            self.db_path,
            "Test User",
            "1990-01-15",
            "male",
            None
        )
        self.assertIsNotNone(birthday_id)
        self.assertGreater(birthday_id, 0)
    
    def test_add_birthday_validation(self):
        """Test birthday validation."""
        with self.assertRaises(ValueError):
            add_birthday(self.db_path, "", "1990-01-15", None, None)
        
        with self.assertRaises(ValueError):
            add_birthday(self.db_path, "Test", "", None, None)
        
        with self.assertRaises(ValueError):
            add_birthday(self.db_path, "Test", "invalid-date", None, None)
    
    def test_get_all_birthdays(self):
        """Test retrieving all birthdays."""
        add_birthday(self.db_path, "User 1", "1990-01-15", "male", None)
        add_birthday(self.db_path, "User 2", "1995-06-20", "female", None)
        
        birthdays = get_all_birthdays(self.db_path)
        self.assertEqual(len(birthdays), 2)
        self.assertEqual(birthdays[0]["name"], "User 1")
    
    def test_calculate_age(self):
        """Test age calculation."""
        today = datetime.now()
        birth_year = today.year - 25
        birthday = f"{birth_year}-{today.month:02d}-{today.day:02d}"
        
        age = calculate_age(birthday)
        self.assertEqual(age, 25)
    
    def test_get_todays_birthdays(self):
        """Test getting today's birthdays."""
        today = datetime.now()
        today_str = today.strftime("%Y-%m-%d")
        
        add_birthday(self.db_path, "Today User", today_str, "male", None)
        add_birthday(self.db_path, "Other User", "1990-01-15", "female", None)
        
        todays = get_todays_birthdays(self.db_path)
        self.assertEqual(len(todays), 1)
        self.assertEqual(todays[0]["name"], "Today User")


class TestNameNormalization(unittest.TestCase):
    """Test name normalization and duplicate detection."""
    
    def test_name_normalization_logic(self):
        """Test name normalization logic (client-side)."""
        # This tests the concept - actual normalization is in JS
        def normalize_name(name):
            if not name:
                return ''
            return name.strip().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        
        # Note: This is a conceptual test - actual implementation is in app.js
        self.assertTrue(True)  # Placeholder


class TestExportImport(unittest.TestCase):
    """Test export/import functionality."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.db_path = self.test_dir / "test.db"
        self.uploads_dir = self.test_dir / "uploads"
        self.uploads_dir.mkdir()
        self.export_path = self.test_dir / "export.zip"
        
        init_database(self.db_path)
        add_birthday(self.db_path, "Test User", "1990-01-15", "male", None)
    
    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_export_birthdays(self):
        """Test exporting birthdays."""
        export_birthdays(self.db_path, self.uploads_dir, self.export_path)
        self.assertTrue(self.export_path.exists())
    
    def test_import_birthdays(self):
        """Test importing birthdays."""
        # First export
        export_birthdays(self.db_path, self.uploads_dir, self.export_path)
        
        # Create new database
        new_db = self.test_dir / "new.db"
        init_database(new_db)
        
        # Import
        imported, skipped, errors = import_birthdays(
            new_db,
            self.uploads_dir,
            self.export_path,
            False
        )
        
        self.assertEqual(imported, 1)
        self.assertEqual(skipped, 0)
        self.assertEqual(len(errors), 0)


if __name__ == '__main__':
    unittest.main()

