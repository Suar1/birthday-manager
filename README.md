# Birthday Reminder

A modern web-based birthday reminder application with email notifications. Built with Flask backend and Tailwind CSS frontend.

## Features

- 📅 Manage birthdays with photos
- 📧 Email reminders for today's birthdays
- 🌍 Multilingual email support (English, German, Kurdish, Arabic)
- 🎨 Modern, responsive UI with Tailwind CSS
- 💾 SQLite database for data persistence
- ⚙️ Configurable SMTP settings

## Setup

### Prerequisites

- Python 3.8 or higher
- pip3 (Python package manager)

**Note**: On macOS and many Linux systems, use `python3` and `pip3` instead of `python` and `pip`.

### Installation

1. Clone or download this repository

2. (Recommended) Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip3 install -r requirements.txt
```

4. Run the application:
```bash
python3 server.py
```

The application will be available at `http://127.0.0.1:5000`

**Note**: If you get "Address already in use" on port 5000 (common on macOS due to AirPlay Receiver), you can:
- Use a different port: `python3 server.py --port 5001`
- Or disable AirPlay Receiver: System Preferences → General → AirDrop & Handoff → AirPlay Receiver

**Note**: If you encounter "externally-managed-environment" errors on macOS, use a virtual environment (step 2) or install with `pip3 install --user -r requirements.txt`

### Portable Mode

To run in portable mode (stores config and database in the project directory):

```bash
python3 server.py --portable
```

### Command Line Options

- `--host HOST`: Host to bind to (default: 127.0.0.1)
- `--port PORT`: Port to bind to (default: 5000)
- `--portable`: Use portable mode (local config and database)

Example:
```bash
python3 server.py --host 0.0.0.0 --port 8080 --portable
```

## Configuration

### Config Paths

- **Default mode**: `~/.birthday_reminder/birthday_reminder_config.json`
- **Portable mode**: `./data/birthday_reminder_config.json`

### Database Paths

- **Default mode**: `~/.birthday_reminder/birthdays.db`
- **Portable mode**: `./data/birthdays.db`

### SMTP Settings

Configure SMTP settings through the web interface. Required fields:
- SMTP Server (e.g., smtp.gmail.com)
- SMTP Port (e.g., 587)
- SMTP Email (your email address)
- SMTP Password (your email password or app password)
- Recipient Email (where reminders should be sent)

## Usage

1. **Add Birthdays**: Use the "Add Birthday" form to add new birthdays with optional photos
2. **View Birthdays**: See all birthdays in the table, with today's birthdays highlighted at the top
3. **Edit/Delete**: Use the Edit and Delete buttons in the table to manage birthdays
4. **Export/Import**: 
   - **Export**: Click "Export All Birthdays" to download a ZIP file containing all birthdays and their images
   - **Import**: Click "Import Birthdays" to upload a previously exported ZIP file. Check "Replace existing birthdays" to clear all current birthdays before importing.
5. **Configure SMTP**: Set up email settings in the SMTP Settings panel
6. **Test Email**: Use "Test SMTP" to verify your email configuration
7. **Test Reminder**: Use "Test Reminder" to send a test reminder for today's birthdays

## API Endpoints

- `GET /api/birthdays` - Get all birthdays
- `GET /api/birthdays/today` - Get today's birthdays
- `POST /api/birthdays` - Add a new birthday
- `PUT /api/birthdays/<id>` - Update a birthday
- `DELETE /api/birthdays/<id>` - Delete a birthday
- `GET /api/config` - Get SMTP configuration
- `POST /api/config` - Save SMTP configuration
- `POST /api/config/reset` - Reset configuration
- `POST /api/test-email` - Send test email
- `POST /api/test-reminder` - Send test reminder for today's birthdays
- `GET /api/export` - Export all birthdays with images as a ZIP file
- `POST /api/import` - Import birthdays from a ZIP file (requires multipart/form-data with 'file' field and optional 'replace' boolean)
- `GET /health` - Health check endpoint

## Architecture

The application follows a clean architecture:

- `core.py` - Core business logic (database operations, age calculation, email generation)
- `config.py` - Configuration management (JSON-based config storage)
- `server.py` - Flask application and API routes
- `static/index.html` - Frontend HTML with Tailwind CSS
- `static/app.js` - Frontend JavaScript logic
- `static/style.css` - Minimal custom styles

## Notes

- The application runs in single-process mode (no threads, no reloader)
- All file I/O uses context managers for proper resource management
- No background tasks or scheduled jobs (reminders must be triggered manually via API)
- The application works offline once loaded in the browser

## License

ISC

