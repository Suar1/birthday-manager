# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Run the application:**
```bash
python3 server.py                              # Default (port 5000, ~/.birthday_reminder/)
python3 server.py --portable                   # Portable mode (./data/)
python3 server.py --host 0.0.0.0 --port 8080
```

**Python unit tests:**
```bash
python3 -m pytest tests/test_core.py -v
python3 -m pytest tests/test_core.py::TestClassName::test_method -v  # Single test
```

**E2E tests (Playwright):**
```bash
npm install -D @playwright/test && npx playwright install
npx playwright test
npx playwright test --project=chromium --headed  # Specific browser, visible
```

**Docker:**
```bash
docker-compose up -d
docker build -t birthday-manager . && docker run -d -p 4040:4040 birthday-manager
```

**Logging:**
```bash
LOG_LEVEL=DEBUG LOG_TO_CONSOLE=true python3 server.py
```

## Architecture

This is a Flask SPA with SQLite storage. The frontend is a single `static/index.html` page driven by `static/app.js` (vanilla JS, no build step). The backend exposes a REST API from `server.py`.

### Module Responsibilities

- **`server.py`** — Flask app, all API routes (~25 endpoints), file upload handling, OAuth2 redirect handler
- **`core.py`** — Database CRUD (SQLite), age calculation, multilingual email content generation, ZIP/CSV/ICS export-import logic
- **`config.py`** — Loads/saves SMTP config as JSON; encrypts OAuth2 refresh tokens with a machine-specific Fernet key (`.oauth_key`)
- **`mail_oauth.py`** — Sends email via Gmail App Password (STARTTLS/SSL) or OAuth2 (XOAUTH2); maps SMTP errors to HTTP status codes
- **`logger.py`** — Rotating file logger with a `SanitizedFormatter` that redacts passwords/tokens from all log output

### Data Storage

| What | Where (default) | Where (portable) |
|------|----------------|-----------------|
| SQLite DB | `~/.birthday_reminder/birthdays.db` | `./data/birthdays.db` |
| Config JSON | `~/.birthday_reminder/birthday_reminder_config.json` | `./data/birthday_reminder_config.json` |
| OAuth key | `~/.birthday_reminder/.oauth_key` | `./data/.oauth_key` |
| Photos | `./uploads/` | same |
| Logs | `./logs/app.log` | same |

**Database schema** (single table):
```sql
CREATE TABLE birthdays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birthday TEXT NOT NULL,  -- YYYY-MM-DD
    photo TEXT,              -- /uploads/<filename>
    gender TEXT              -- male / female / null
)
```

### Frontend

`static/app.js` is a monolithic vanilla-JS SPA (~2,400 lines). It communicates exclusively via the `/api/*` endpoints. `static/i18n.js` provides translations for English, Deutsch, Kurdî, and العربية. There is no build/bundle step — files are served directly by Flask from `static/`.

### SMTP / OAuth2 Config Shape

`config.py` validates and stores settings with these required fields:
- `authType`: `"app_password"` or `"oauth2"`
- `senderEmail`, `smtpHost`, `smtpPort`
- App Password path: `smtpPassword`
- OAuth2 path: `clientId`, `clientSecret`, `refreshToken` (encrypted at rest)

API endpoints never return `smtpPassword`, `clientSecret`, or `refreshToken` to the client.
