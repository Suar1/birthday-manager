// Dependencies
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs');

// Constants
const UPLOADS_DIR = './uploads';
const PORT = 3000;

// Create directories if they don't exist
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Initialize Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize SQLite database
const db = new sqlite3.Database('./data/birthdays.db', (err) => {
    if (err) {
        console.error('Failed to connect to the SQLite database:', err);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create required tables
const createTables = () => {
    db.run(`CREATE TABLE IF NOT EXISTS birthdays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        birthday TEXT NOT NULL,
        photo TEXT,
        gender TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS smtp_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        smtpServer TEXT NOT NULL,
        smtpPort INTEGER NOT NULL,
        smtpEmail TEXT NOT NULL,
        smtpPassword TEXT NOT NULL,
        recipientEmail TEXT NOT NULL
    )`);
};
createTables();

// Configure file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// Helper function to get SMTP settings
const getSMTPSettings = () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM smtp_settings LIMIT 1', (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Helper function to create an SMTP transporter
const createSMTPTransport = (settings) => {
    return nodemailer.createTransport({
        host: settings.smtpServer,
        port: settings.smtpPort,
        secure: false,
        auth: {
            user: settings.smtpEmail,
            pass: settings.smtpPassword,
        },
    });
};

// Helper function to delete old photos
const deletePhoto = (photoPath) => {
    const fullPath = path.join(__dirname, photoPath);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
};

// API: Fetch all birthdays
app.get('/api/birthdays', (req, res) => {
    db.all('SELECT * FROM birthdays', (err, rows) => {
        if (err) {
            console.error('Failed to fetch birthdays:', err);
            return res.status(500).json({ error: 'Failed to fetch birthdays.' });
        }

        const today = new Date();
        rows.forEach(row => {
            const birthDate = new Date(row.birthday);
            row.age = today.getFullYear() - birthDate.getFullYear();
        });

        res.json(rows);
    });
});

// API: Add a birthday
app.post('/api/birthdays', upload.single('photo'), (req, res) => {
    const { name, birthday, gender } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
        `INSERT INTO birthdays (name, birthday, photo, gender) VALUES (?, ?, ?, ?)`,
        [name, birthday, photo, gender],
        function (err) {
            if (err) {
                console.error('Failed to add birthday:', err);
                return res.status(500).json({ error: 'Failed to add birthday.' });
            }
            res.json({ message: 'Birthday added successfully!' });
        }
    );
});


// API: Modify a birthday
app.put('/api/birthdays/:id', upload.single('photo'), (req, res) => {
    const { id } = req.params;
    const { name, birthday, gender } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    // Fetch the current photo path
    db.get(`SELECT photo FROM birthdays WHERE id = ?`, [id], (err, row) => {
        if (err) {
            console.error('Failed to fetch birthday for modification:', err);
            return res
                .status(500)
                .json({ error: 'Failed to fetch birthday for modification.' });
        }

        const updateQuery = photo
            ? `UPDATE birthdays SET name = ?, birthday = ?, photo = ?, gender = ? WHERE id = ?`
            : `UPDATE birthdays SET name = ?, birthday = ?, gender = ? WHERE id = ?`;

        const params = photo
            ? [name, birthday, photo, gender, id]
            : [name, birthday, gender, id];

        db.run(updateQuery, params, function (updateErr) {
            if (updateErr) {
                console.error('Failed to modify birthday:', updateErr);
                return res
                    .status(500)
                    .json({ error: 'Failed to modify birthday.' });
            }

            // Delete the old photo if a new one is uploaded
            if (photo && row && row.photo) {
                deletePhoto(row.photo);
            }

            res.json({ message: 'Birthday modified successfully!' });
        });
    });
});




//API: Delete a birthday
app.delete('/api/birthdays/:id', (req, res) => {
    const { id } = req.params;

    // Fetch the photo path to delete
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
            if (row.photo) {
                deletePhoto(row.photo);
            }

            res.json({ message: 'Birthday deleted successfully!' });
        });
    });
});

// API: Save SMTP settings
app.post('/api/smtp-settings', (req, res) => {
    const { smtpServer, smtpPort, smtpEmail, smtpPassword, recipientEmail } = req.body;

    db.run(
        `INSERT OR REPLACE INTO smtp_settings (id, smtpServer, smtpPort, smtpEmail, smtpPassword, recipientEmail)
         VALUES (1, ?, ?, ?, ?, ?)`,
        [smtpServer, smtpPort, smtpEmail, smtpPassword, recipientEmail],
        function (err) {
            if (err) {
                console.error('Failed to save SMTP settings:', err);
                return res.status(500).json({ error: 'Failed to save SMTP settings.' });
            }
            res.json({ message: 'SMTP settings saved successfully!' });
        }
    );
});

// API: Fetch SMTP settings
app.get('/api/smtp-settings', (req, res) => {
    db.get('SELECT * FROM smtp_settings LIMIT 1', (err, row) => {
        if (err) {
            console.error('Failed to fetch SMTP settings:', err);
            return res.status(500).json({ error: 'Failed to fetch SMTP settings.' });
        }
        res.json(row || {});
    });
});

// API: Send test email
app.post('/api/test-email', async (req, res) => {
    try {
        const smtpSettings = await getSMTPSettings();

        if (!smtpSettings) {
            return res.status(400).json({ error: 'SMTP settings are not configured.' });
        }

        const transporter = createSMTPTransport(smtpSettings);

        const mailOptions = {
            from: smtpSettings.smtpEmail,
            to: smtpSettings.recipientEmail,
            subject: 'Test Email from Birthday Manager',
            text: 'This is a test email from the Birthday Manager application.',
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Test email sent successfully!' });
    } catch (error) {
        console.error('Failed to send test email:', error);
        res.status(500).json({ error: 'Failed to send test email.' });
    }
});

// API: Test Reminder for Today's Birthdays
app.get('/api/test-reminder', async (req, res) => {
    try {
        const smtpSettings = await getSMTPSettings();

        if (!smtpSettings) {
            return res.status(400).json({ error: 'SMTP settings are not configured.' });
        }

        const today = new Date();
        const formattedToday = today.toISOString().slice(5, 10);

        db.all(
            `SELECT * FROM birthdays WHERE strftime('%m-%d', birthday) = ?`,
            [formattedToday],
            async (err, rows) => {
                if (err) {
                    console.error('Failed to fetch today\'s birthdays for reminder:', err);
                    return res.status(500).json({ error: 'Failed to fetch today\'s birthdays for reminder.' });
                }

                const transporter = createSMTPTransport(smtpSettings);

                for (const birthday of rows) {
                    const age = today.getFullYear() - new Date(birthday.birthday).getFullYear();
                    const isMale = birthday.gender === 'male';

                    // Constructing Arabic text based on gender
                    const arabicText = isMale
                        ? `عامًا ${age}  و هو يبلغ من العمر  ${birthday.name} اليوم هو عيد ميلاد`
                        : `عامًا ${age}  و هي تبلغ من العمر  ${birthday.name} اليوم هو عيد ميلاد`;

                    const emailBody = `
                        <p><strong>Kurdish (Kurmanci):</strong> Îro rojbûna ${birthday.name} ye, dibe ${age} salî.</p>
                        <p><strong>English:</strong> Today is ${birthday.name}'s birthday, and ${isMale ? 'he' : 'she'} is turning ${age} years old.</p>
                        <p><strong>German:</strong> Heute ist der Geburtstag von ${birthday.name}, und ${isMale ? 'er' : 'sie'} wird ${age} Jahre alt.</p>
                        <p><strong>Arabic:</strong> ${arabicText}</p>
                        ${
                            birthday.photo
                                ? `<p><img src="cid:photo_${birthday.id}" alt="Photo of ${birthday.name}" style="max-width: 150px; border-radius: 10px"></p>`
                                : ''
                        }
                    `;

                    const mailOptions = {
                        from: smtpSettings.smtpEmail,
                        to: smtpSettings.recipientEmail,
                        subject: `Birthday Reminder: ${birthday.name}`,
                        html: emailBody,
                        attachments: birthday.photo
                            ? [
                                  {
                                      filename: `photo_${birthday.id}.jpg`,
                                      path: path.join(__dirname, birthday.photo),
                                      cid: `photo_${birthday.id}` // Same as the 'cid' in the email body
                                  }
                              ]
                            : []
                    };

                    try {
                        await transporter.sendMail(mailOptions);
                        console.log(`Reminder email sent for ${birthday.name}.`);
                    } catch (emailError) {
                        console.error(`Failed to send reminder email for ${birthday.name}:`, emailError);
                    }
                }

                res.json({ message: 'Test reminder emails sent for today\'s birthdays.' });
            }
        );
    } catch (error) {
        console.error('Failed to send test reminder email:', error);
        res.status(500).json({ error: 'Failed to send test reminder email.' });
    }
});



// Schedule Daily Reminders at 9:00 AM Server Time
schedule.scheduleJob('0 9 * * *', async () => {
    const today = new Date();
    const formattedToday = today.toISOString().slice(5, 10);

    try {
        db.all(
            `SELECT * FROM birthdays WHERE strftime('%m-%d', birthday) = ?`,
            [formattedToday],
            async (err, rows) => {
                if (err) {
                    console.error('Failed to fetch today\'s birthdays for reminder:', err);
                    return;
                }

                if (rows.length === 0) {
                    console.log('No birthdays today.');
                    return;
                }

                const smtpSettings = await getSMTPSettings();

                if (!smtpSettings) {
                    console.error('SMTP settings are not configured.');
                    return;
                }

                const transporter = createSMTPTransport(smtpSettings);

                for (const birthday of rows) {
                    const age = today.getFullYear() - new Date(birthday.birthday).getFullYear();

                    // Multilingual Email Content with Gender Respect
                    const genderPronounEnglish = birthday.gender === 'male' ? 'he' : 'she';
                    const genderPronounGerman = birthday.gender === 'male' ? 'er' : 'sie';
                    const genderPronounArabic = birthday.gender === 'male' ? 'هو يبلغ' : 'هي تبلغ';
                    const genderPronounKurdish = birthday.gender === 'male' ? 'wî' : 'wê';

                    const emailBody = `
                        <p><strong>Kurdish (Kurmanci):</strong> Îro rojbûna ${birthday.name} ye, dibe ${age} salî.</p>
                        <p><strong>English:</strong> Today is ${birthday.name}'s birthday, and ${genderPronounEnglish} is turning ${age} years old.</p>
                        <p><strong>German:</strong> Heute ist der Geburtstag von ${birthday.name}, und ${genderPronounGerman} wird ${age} Jahre alt.</p>
                        <p><strong>Arabic:</strong> .عامًا ${age} من العمر ${genderPronounArabic} , ${birthday.name} اليوم هو عيد ميلاد.</p>
                        ${
                            birthday.photo
                                ? `<p><img src="cid:photo_${birthday.id}" alt="Photo of ${birthday.name}" style="max-width: 150px; border-radius: 10px"></p>`
                                : ''
                        }
                    `;

                    const mailOptions = {
                        from: smtpSettings.smtpEmail,
                        to: smtpSettings.recipientEmail,
                        subject: `Birthday Reminder: ${birthday.name}`,
                        html: emailBody,
                        attachments: birthday.photo
                            ? [
                                  {
                                      filename: `photo_${birthday.id}.jpg`,
                                      path: path.join(__dirname, birthday.photo),
                                      cid: `photo_${birthday.id}` // Same as the 'cid' in the email body
                                  }
                              ]
                            : []
 
                    };

                    try {
                        await transporter.sendMail(mailOptions);
                        console.log(`Reminder email sent for ${birthday.name}.`);
                    } catch (emailError) {
                        console.error(`Failed to send reminder email for ${birthday.name}:`, emailError);
                    }
                }
            }
        );
    } catch (error) {
        console.error('Error during the scheduled job:', error);
    }
});

// Default route to serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

