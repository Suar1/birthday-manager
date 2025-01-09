#!/bin/bash

# Update and Upgrade System
echo "Updating and upgrading the system..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js, npm, and SQLite
echo "Installing Node.js, npm, and SQLite..."
sudo apt install -y nodejs npm sqlite3

# Create Project Directory
echo "Setting up the project directory..."
mkdir -p ~/birthday_reminder/{data,public}
cd ~/birthday_reminder

# Initialize Node.js Project
echo "Initializing Node.js project..."
npm init -y

# Install Required Packages
echo "Installing required packages..."
npm install express nodemailer node-schedule sqlite3 multer

# Create SQLite Database and Tables
echo "Creating SQLite database and tables..."
sqlite3 data/birthdays.db <<EOF
CREATE TABLE IF NOT EXISTS birthdays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birthday TEXT NOT NULL,
    photo TEXT,
    gender TEXT
);

CREATE TABLE IF NOT EXISTS smtp_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    smtpServer TEXT NOT NULL,
    smtpPort INTEGER NOT NULL,
    smtpEmail TEXT NOT NULL,
    smtpPassword TEXT NOT NULL,
    recipientEmail TEXT NOT NULL
);
EOF
#!/bin/bash

# Ask for Backend Code
echo "#################################################"
echo "### Please paste your backend code (index.js) ###"
echo "### Press Ctrl+D to finish                    ###"
echo "#################################################"
cat > index.js

# Ask for Frontend Code
echo "###############################################"
echo "### Please paste your frontend code (index.html) ###"
echo "### Press Ctrl+D to finish                       ###"
echo "###############################################"
cat > public/index.html


# Test the Server
echo "Testing the server..."
node index.js & sleep 5
kill $!

# Install PM2
echo "Installing PM2..."
npm install -g pm2

# Start the Server with PM2
echo "Starting the server with PM2..."
pm2 start index.js --name birthday-manager
pm2 save
pm2 startup

# Set Timezone (Optional)
echo "Setting timezone to Europe/Berlin..."
sudo timedatectl set-timezone Europe/Berlin

# Final Output
echo "Setup completed successfully!"
echo "Navigate to ~/birthday_reminder to manage your server."
echo "Use 'pm2 list' to check server status."
