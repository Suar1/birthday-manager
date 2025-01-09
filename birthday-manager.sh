#!/bin/bash

# Clear the terminal
clear

echo "##############################"
echo "Welcome to the Birthday Manager Setup Script"
echo "##############################"

# Install dependencies
echo "Updating and installing dependencies..."
apt-get update -y
apt-get upgrade -y
apt-get install -y nodejs npm sqlite3

# Install PM2
echo "Installing PM2..."
npm install -g pm2

# Clone the repository
echo "Cloning the repository..."
git clone https://github.com/Suar1/birthday-manager.git
cd birthday-manager || { echo "Failed to navigate to the birthday-manager directory."; exit 1; }

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Ask the user whether to use default or custom backend and frontend
echo "##############################"
echo "Do you want to use the pre-configured backend and frontend? (y/n)"
echo "##############################"
read -r use_default

if [[ "$use_default" =~ ^[yY]$ ]]; then
    echo "Using pre-configured backend and frontend..."
    # Ensure correct placement of pre-configured files
    cp index.js index.js.default
    cp index.html public/index.html.default
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

# Initialize SQLite database
echo "Setting up SQLite database..."
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

# Start the server using PM2
echo "Starting the server with PM2..."
pm2 start index.js --name birthday-manager
pm2 save
pm2 startup

# Set the timezone
echo "Setting timezone to Europe/Berlin..."
timedatectl set-timezone Europe/Berlin

echo "Setup completed successfully!"
echo "Navigate to ~/birthday-manager to manage your server."
echo "Use 'pm2 list' to check server status."
