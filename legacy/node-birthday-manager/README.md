# Birthday Manager

A web application to manage birthdays and send email reminders. Built with Node.js, Express, and SQLite.

## Features

- Add, edit, and delete birthday entries
- Upload photos for birthday entries
- Email notifications for upcoming birthdays
- SMTP configuration for email settings
- Modern and responsive UI
- Secure file uploads
- Data validation and sanitization

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- SQLite3
- PM2 (will be installed automatically)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/birthday-manager.git
   cd birthday-manager
   ```

2. Make the installation script executable:
   ```bash
   chmod +x install.sh
   ```

3. Run the installation script:
   ```bash
   ./install.sh
   ```

The script will:
- Install all required dependencies
- Set up the database
- Create necessary directories
- Start the server using PM2

## Usage

1. Access the application at `http://localhost:3000`
2. Add birthdays using the web interface
3. Configure SMTP settings to enable email notifications
4. Test the email functionality using the test button

## API Endpoints

- `GET /api/birthdays` - Get all birthdays
- `POST /api/birthdays` - Add a new birthday
- `PUT /api/birthdays/:id` - Update a birthday
- `DELETE /api/birthdays/:id` - Delete a birthday
- `GET /api/smtp-settings` - Get SMTP settings
- `POST /api/smtp-settings` - Update SMTP settings
- `POST /api/test-email` - Test email configuration

## Security Features

- Input validation
- File upload restrictions
- Rate limiting
- Password hashing
- CORS protection
- Helmet security headers

## File Upload Restrictions

- Maximum file size: 5MB
- Allowed file types: JPEG, PNG, GIF
- Secure file naming
- Automatic cleanup of old files

## Database Schema

### Birthdays Table
```sql
CREATE TABLE birthdays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(name) > 0),
    birthday TEXT NOT NULL CHECK(birthday LIKE '____-__-__'),
    photo TEXT,
    gender TEXT CHECK(gender IN ('male', 'female')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### SMTP Settings Table
```sql
CREATE TABLE smtp_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    smtpServer TEXT NOT NULL,
    smtpPort INTEGER NOT NULL CHECK(smtpPort > 0),
    smtpEmail TEXT NOT NULL CHECK(smtpEmail LIKE '%@%.%'),
    smtpPassword TEXT NOT NULL,
    recipientEmail TEXT NOT NULL CHECK(recipientEmail LIKE '%@%.%'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Bootstrap for the UI components
- Node.js community for the excellent packages
- All contributors who help improve this project 