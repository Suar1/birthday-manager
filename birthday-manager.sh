#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "linux"
    fi
}

# Clear the terminal
clear

echo "##############################"
echo "Welcome to the Birthday Manager Setup Script"
echo "##############################"

# Detect OS
OS=$(detect_os)

# Install dependencies based on OS
if [ "$OS" = "linux" ]; then
    echo "Updating and installing dependencies..."
    sudo apt-get update -y
    sudo apt-get upgrade -y
    sudo apt-get install -y python3-pip nodejs npm sqlite3
else
    echo "Checking for Node.js installation..."
    if ! command_exists node; then
        echo "Node.js is not installed. Please install Node.js from https://nodejs.org/"
        exit 1
    fi
    if ! command_exists npm; then
        echo "npm is not installed. Please install npm from https://nodejs.org/"
        exit 1
    fi
    if ! command_exists sqlite3; then
        echo "SQLite3 is not installed. Please install SQLite3 from https://www.sqlite.org/download.html"
        exit 1
    fi
fi

# Install PM2 globally
echo "Installing PM2..."
npm install -g pm2

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p public data uploads

# Install project dependencies
echo "Initializing project and installing dependencies..."
if [ ! -f package.json ]; then
    echo "Creating package.json..."
    npm init -y
fi

# Install required packages
echo "Installing required packages..."
npm install express nodemailer node-schedule sqlite3 multer bcryptjs express-rate-limit helmet cors || { echo "Dependency installation failed."; exit 1; }

# Ask the user whether to use default or custom backend and frontend
echo "##############################"
echo "Do you want to use the pre-configured backend and frontend? (y/n)"
echo "##############################"
read -r use_default

if [[ "$use_default" =~ ^[yY]$ ]]; then
    echo "Using pre-configured backend and frontend..."
    # Create default index.js
    cat > index.js << 'EOL'
// Dependencies
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Constants
const UPLOADS_DIR = './uploads';
const PORT = 3000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

// Create directories if they don't exist
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Initialize Express
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize SQLite database
const db = new sqlite3.Database('./data/birthdays.db', (err) => {
    if (err) {
        console.error('Failed to connect to the SQLite database:', err);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create required tables with improved schema
const createTables = () => {
    // Create birthdays table with indexes and constraints
    db.run(`CREATE TABLE IF NOT EXISTS birthdays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL CHECK(length(name) > 0),
        birthday TEXT NOT NULL CHECK(birthday LIKE '____-__-__'),
        photo TEXT,
        gender TEXT CHECK(gender IN ('male', 'female')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create index on birthday for faster queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_birthdays_birthday ON birthdays(birthday)`);

    // Create SMTP settings table with encryption
    db.run(`CREATE TABLE IF NOT EXISTS smtp_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        smtpServer TEXT NOT NULL,
        smtpPort INTEGER NOT NULL CHECK(smtpPort > 0),
        smtpEmail TEXT NOT NULL CHECK(smtpEmail LIKE '%@%.%'),
        smtpPassword TEXT NOT NULL,
        recipientEmail TEXT NOT NULL CHECK(recipientEmail LIKE '%@%.%'),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
};
createTables();

// Configure file uploads with validation
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

// Helper function to send email notifications
const sendEmailNotification = async (to, subject, text) => {
    try {
        const smtpSettings = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM smtp_settings LIMIT 1', (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!smtpSettings) {
            console.error('SMTP settings not configured');
            return false;
        }

        const transporter = nodemailer.createTransport({
            host: smtpSettings.smtpServer,
            port: smtpSettings.smtpPort,
            secure: false,
            auth: {
                user: smtpSettings.smtpEmail,
                pass: smtpSettings.smtpPassword
            }
        });

        await transporter.sendMail({
            from: smtpSettings.smtpEmail,
            to,
            subject,
            text
        });

        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
};

// Schedule daily birthday checks
schedule.scheduleJob('0 9 * * *', async () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(5, 10);

    db.all('SELECT * FROM birthdays WHERE strftime("%m-%d", birthday) = ?', [todayStr], async (err, rows) => {
        if (err) {
            console.error('Failed to check birthdays:', err);
            return;
        }

        for (const birthday of rows) {
            const age = today.getFullYear() - new Date(birthday.birthday).getFullYear();
            const message = `🎉 Today is ${birthday.name}'s birthday! They are turning ${age} years old.`;
            
            // Get recipient email from SMTP settings
            db.get('SELECT recipientEmail FROM smtp_settings LIMIT 1', async (err, row) => {
                if (err || !row) {
                    console.error('Failed to get recipient email:', err);
                    return;
                }
                await sendEmailNotification(row.recipientEmail, 'Birthday Reminder', message);
            });
        }
    });
});

// API endpoints with improved error handling
app.get('/api/birthdays', (req, res) => {
    db.all('SELECT * FROM birthdays ORDER BY birthday', (err, rows) => {
        if (err) {
            console.error('Failed to fetch birthdays:', err);
            return res.status(500).json({ error: 'Failed to fetch birthdays.' });
        }
        res.json(rows);
    });
});

app.post('/api/birthdays', upload.single('photo'), (req, res) => {
    const { name, birthday, gender } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    // Validate input
    if (!name || !birthday || !gender) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    db.run(
        `INSERT INTO birthdays (name, birthday, photo, gender) VALUES (?, ?, ?, ?)`,
        [name, birthday, photo, gender],
        function (err) {
            if (err) {
                console.error('Failed to add birthday:', err);
                return res.status(500).json({ error: 'Failed to add birthday.' });
            }
            res.json({ message: 'Birthday added successfully!', id: this.lastID });
        }
    );
});

app.put('/api/birthdays/:id', upload.single('photo'), (req, res) => {
    const { id } = req.params;
    const { name, birthday, gender } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    // Validate input
    if (!name || !birthday || !gender) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    db.get(`SELECT photo FROM birthdays WHERE id = ?`, [id], (err, row) => {
        if (err) {
            console.error('Failed to fetch birthday for modification:', err);
            return res.status(500).json({ error: 'Failed to fetch birthday for modification.' });
        }

        const updateQuery = photo
            ? `UPDATE birthdays SET name = ?, birthday = ?, photo = ?, gender = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
            : `UPDATE birthdays SET name = ?, birthday = ?, gender = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

        const params = photo
            ? [name, birthday, photo, gender, id]
            : [name, birthday, gender, id];

        db.run(updateQuery, params, function (updateErr) {
            if (updateErr) {
                console.error('Failed to modify birthday:', updateErr);
                return res.status(500).json({ error: 'Failed to modify birthday.' });
            }

            // Delete the old photo if a new one is uploaded
            if (photo && row && row.photo) {
                const oldPhotoPath = path.join(__dirname, row.photo);
                if (fs.existsSync(oldPhotoPath)) {
                    fs.unlinkSync(oldPhotoPath);
                }
            }

            res.json({ message: 'Birthday modified successfully!' });
        });
    });
});

app.delete('/api/birthdays/:id', (req, res) => {
    const { id } = req.params;

    db.get(`SELECT photo FROM birthdays WHERE id = ?`, [id], (err, row) => {
        if (err) {
            console.error('Failed to fetch birthday for deletion:', err);
            return res.status(500).json({ error: 'Failed to fetch birthday for deletion.' });
        }

        db.run(`DELETE FROM birthdays WHERE id = ?`, [id], function (deleteErr) {
            if (deleteErr) {
                console.error('Failed to delete birthday:', deleteErr);
                return res.status(500).json({ error: 'Failed to delete birthday.' });
            }

            // Delete the photo file
            if (row && row.photo) {
                const photoPath = path.join(__dirname, row.photo);
                if (fs.existsSync(photoPath)) {
                    fs.unlinkSync(photoPath);
                }
            }

            res.json({ message: 'Birthday deleted successfully!' });
        });
    });
});

// SMTP Settings endpoints
app.post('/api/smtp-settings', async (req, res) => {
    const { smtpServer, smtpPort, smtpEmail, smtpPassword, recipientEmail } = req.body;

    // Validate input
    if (!smtpServer || !smtpPort || !smtpEmail || !smtpPassword || !recipientEmail) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(smtpPassword, 10);

    db.run(
        `INSERT OR REPLACE INTO smtp_settings (id, smtpServer, smtpPort, smtpEmail, smtpPassword, recipientEmail)
         VALUES (1, ?, ?, ?, ?, ?)`,
        [smtpServer, smtpPort, smtpEmail, hashedPassword, recipientEmail],
        function (err) {
            if (err) {
                console.error('Failed to save SMTP settings:', err);
                return res.status(500).json({ error: 'Failed to save SMTP settings.' });
            }
            res.json({ message: 'SMTP settings saved successfully!' });
        }
    );
});

app.get('/api/smtp-settings', (req, res) => {
    db.get('SELECT smtpServer, smtpPort, smtpEmail, recipientEmail FROM smtp_settings LIMIT 1', (err, row) => {
        if (err) {
            console.error('Failed to fetch SMTP settings:', err);
            return res.status(500).json({ error: 'Failed to fetch SMTP settings.' });
        }
        res.json(row || {});
    });
});

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
    try {
        const success = await sendEmailNotification(
            req.body.email,
            'Test Email from Birthday Manager',
            'This is a test email from the Birthday Manager application.'
        );

        if (success) {
            res.json({ message: 'Test email sent successfully!' });
        } else {
            res.status(500).json({ error: 'Failed to send test email.' });
        }
    } catch (error) {
        console.error('Failed to send test email:', error);
        res.status(500).json({ error: 'Failed to send test email.' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
EOL

    # Create default index.html
    cat > public/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Birthday Manager</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f9f9f9; }
        h1 { margin-bottom: 20px; font-weight: bold; }
        .card { padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); background-color: #fff; }
        .btn-primary { background-color: #007bff; border: none; }
        .btn-primary:hover { background-color: #0056b3; }
        .photo-thumbnail { max-width: 50px; max-height: 50px; object-fit: cover; }
        .d-none { display: none !important; }
        .alert { margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container mt-5">
        <h1 class="text-center">Birthday Manager</h1>
        
        <!-- Today's Birthdays -->
        <div class="card">
            <h2>Today's Birthdays 🎉</h2>
            <ul id="today-birthday-list" class="list-group">
                <li class="list-group-item">Loading today's birthdays...</li>
            </ul>
        </div>

        <!-- Add Birthday -->
        <div class="card mt-4">
            <h2>Add Birthday</h2>
            <form id="add-birthday-form">
                <div class="mb-3">
                    <label for="name" class="form-label">Name</label>
                    <input type="text" id="name" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label for="birthday" class="form-label">Birthday</label>
                    <input type="date" id="birthday" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label for="gender" class="form-label">Gender</label>
                    <select id="gender" class="form-select" required>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="photo" class="form-label">Photo (optional)</label>
                    <input type="file" id="photo" class="form-control" accept="image/*">
                    <div class="form-text">Maximum file size: 5MB. Supported formats: JPEG, PNG, GIF</div>
                </div>
                <button type="submit" class="btn btn-primary">Add Birthday</button>
            </form>
        </div>

        <!-- All Birthdays -->
        <div class="card mt-4">
            <h2>All Birthdays</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Birthday</th>
                        <th>Age</th>
                        <th>Gender</th>
                        <th>Photo</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="birthday-table">
                    <tr>
                        <td colspan="6" class="text-center">Loading birthdays...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- SMTP Settings -->
        <div class="text-center mt-4">
            <button class="btn btn-secondary" onclick="toggleSMTPSettings()">SMTP Settings</button>
        </div>

        <div id="smtp-settings-form" class="card mt-4 d-none">
            <h2>SMTP Settings</h2>
            <form id="smtp-form">
                <div class="mb-3">
                    <label for="smtp-server" class="form-label">SMTP Server</label>
                    <input type="text" id="smtp-server" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label for="smtp-port" class="form-label">SMTP Port</label>
                    <input type="number" id="smtp-port" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label for="smtp-email" class="form-label">SMTP Email</label>
                    <input type="email" id="smtp-email" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label for="smtp-password" class="form-label">SMTP Password</label>
                    <input type="password" id="smtp-password" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label for="recipient-email" class="form-label">Recipient Email</label>
                    <input type="email" id="recipient-email" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary">Save Settings</button>
            </form>
            <button class="btn btn-info mt-3" id="test-smtp-btn">Test SMTP Settings</button>
        </div>
    </div>

    <script>
        // Toggle SMTP Settings Form
        function toggleSMTPSettings() {
            const smtpForm = document.getElementById('smtp-settings-form');
            smtpForm.classList.toggle('d-none');
            if (!smtpForm.classList.contains('d-none')) {
                loadSMTPSettings();
            }
        }

        // Load SMTP Settings
        async function loadSMTPSettings() {
            try {
                const response = await fetch('/api/smtp-settings');
                const settings = await response.json();
                if (settings) {
                    document.getElementById('smtp-server').value = settings.smtpServer || '';
                    document.getElementById('smtp-port').value = settings.smtpPort || '';
                    document.getElementById('smtp-email').value = settings.smtpEmail || '';
                    document.getElementById('recipient-email').value = settings.recipientEmail || '';
                }
            } catch (error) {
                console.error('Error loading SMTP settings:', error);
            }
        }

        // Save SMTP Settings
        document.getElementById('smtp-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const settings = {
                smtpServer: document.getElementById('smtp-server').value,
                smtpPort: document.getElementById('smtp-port').value,
                smtpEmail: document.getElementById('smtp-email').value,
                smtpPassword: document.getElementById('smtp-password').value,
                recipientEmail: document.getElementById('recipient-email').value
            };

            try {
                const response = await fetch('/api/smtp-settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                if (response.ok) {
                    alert('SMTP settings saved successfully!');
                    document.getElementById('smtp-password').value = '';
                } else {
                    alert('Failed to save SMTP settings.');
                }
            } catch (error) {
                console.error('Error saving SMTP settings:', error);
                alert('Failed to save SMTP settings.');
            }
        });

        // Test SMTP Settings
        document.getElementById('test-smtp-btn').addEventListener('click', async () => {
            const recipientEmail = document.getElementById('recipient-email').value;
            if (!recipientEmail) {
                alert('Please enter a recipient email address.');
                return;
            }

            try {
                const response = await fetch('/api/test-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: recipientEmail })
                });

                if (response.ok) {
                    alert('Test email sent successfully!');
                } else {
                    alert('Failed to send test email.');
                }
            } catch (error) {
                console.error('Error sending test email:', error);
                alert('Failed to send test email.');
            }
        });

        // Fetch all birthdays
        async function fetchBirthdays() {
            try {
                const response = await fetch('/api/birthdays');
                const birthdays = await response.json();
                renderBirthdays(birthdays);
            } catch (error) {
                console.error('Error fetching birthdays:', error);
            }
        }

        // Render birthdays
        function renderBirthdays(birthdays) {
            const table = document.getElementById('birthday-table');
            table.innerHTML = '';

            birthdays.forEach(birthday => {
                const row = document.createElement('tr');
                const age = new Date().getFullYear() - new Date(birthday.birthday).getFullYear();
                row.innerHTML = `
                    <td>${birthday.name}</td>
                    <td>${new Date(birthday.birthday).toLocaleDateString()}</td>
                    <td>${age}</td>
                    <td>${birthday.gender}</td>
                    <td>${birthday.photo ? `<img src="${birthday.photo}" class="photo-thumbnail">` : 'N/A'}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="editBirthday(${birthday.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteBirthday(${birthday.id})">Delete</button>
                    </td>
                `;
                table.appendChild(row);
            });
        }

        // Add birthday form submission
        document.getElementById('add-birthday-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('name', document.getElementById('name').value);
            formData.append('birthday', document.getElementById('birthday').value);
            formData.append('gender', document.getElementById('gender').value);
            
            const photoInput = document.getElementById('photo');
            if (photoInput.files[0]) {
                formData.append('photo', photoInput.files[0]);
            }

            try {
                const response = await fetch('/api/birthdays', {
                    method: 'POST',
                    body: formData
                });
                if (response.ok) {
                    e.target.reset();
                    fetchBirthdays();
                } else {
                    alert('Failed to add birthday.');
                }
            } catch (error) {
                console.error('Error adding birthday:', error);
                alert('Failed to add birthday.');
            }
        });

        // Delete birthday
        async function deleteBirthday(id) {
            if (confirm('Are you sure you want to delete this birthday?')) {
                try {
                    const response = await fetch(`/api/birthdays/${id}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        fetchBirthdays();
                    } else {
                        alert('Failed to delete birthday.');
                    }
                } catch (error) {
                    console.error('Error deleting birthday:', error);
                    alert('Failed to delete birthday.');
                }
            }
        }

        // Edit birthday
        async function editBirthday(id) {
            const name = prompt('Enter new name:');
            if (!name) return;

            const birthday = prompt('Enter new birthday (YYYY-MM-DD):');
            if (!birthday) return;

            const gender = prompt('Enter new gender (male/female):');
            if (!gender) return;

            try {
                const response = await fetch(`/api/birthdays/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, birthday, gender })
                });
                if (response.ok) {
                    fetchBirthdays();
                } else {
                    alert('Failed to update birthday.');
                }
            } catch (error) {
                console.error('Error updating birthday:', error);
                alert('Failed to update birthday.');
            }
        }

        // Initial load
        fetchBirthdays();
    </script>
</body>
</html>
EOL
else
    echo "##############################"
    echo "Please paste your custom backend code (index.js). Press Ctrl+D to finish:"
    echo "##############################"
    cat > index.js

    echo "##############################"
    echo "Please paste your custom frontend code (index.html). Press Ctrl+D to finish:"
    echo "##############################"
    cat > public/index.html
fi

# Initialize SQLite database with improved schema
echo "Setting up SQLite database..."
mkdir -p data
sqlite3 data/birthdays.db <<EOF
CREATE TABLE IF NOT EXISTS birthdays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(name) > 0),
    birthday TEXT NOT NULL CHECK(birthday LIKE '____-__-__'),
    photo TEXT,
    gender TEXT CHECK(gender IN ('male', 'female')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_birthdays_birthday ON birthdays(birthday);

CREATE TABLE IF NOT EXISTS smtp_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    smtpServer TEXT NOT NULL,
    smtpPort INTEGER NOT NULL CHECK(smtpPort > 0),
    smtpEmail TEXT NOT NULL CHECK(smtpEmail LIKE '%@%.%'),
    smtpPassword TEXT NOT NULL,
    recipientEmail TEXT NOT NULL CHECK(recipientEmail LIKE '%@%.%'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
EOF

# Start the server using PM2
echo "Starting the server with PM2..."
pm2 start index.js --name birthday-manager
pm2 save

if [ "$OS" = "linux" ]; then
    pm2 startup
    echo "Setting timezone to Europe/Berlin..."
    timedatectl set-timezone Europe/Berlin
fi

echo "##############################"
echo "Setup completed successfully!"
echo "##############################"
echo "The Birthday Manager is now running on http://localhost:3000"
echo "Use 'pm2 list' to check server status"
echo "Use 'pm2 logs birthday-manager' to view server logs"
echo "Use 'pm2 stop birthday-manager' to stop the server"
echo "Use 'pm2 start birthday-manager' to start the server" 
