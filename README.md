Birthday Reminder Application
A Node.js-based Birthday Reminder application that sends multilingual email reminders for upcoming birthdays. This project features a backend API with SQLite database integration and a user-friendly frontend for managing birthdays and SMTP settings.
________________________________________
Features
•	Manage Birthdays: Add, modify, and delete birthdays with optional photo uploads.
•	Email Reminders: Sends multilingual email reminders for today's birthdays with embedded photos.
•	SMTP Configuration: Configure email server settings directly via the frontend.
•	Automated Setup: All dependencies and configurations are handled by a single setup script.
•	Persistent Data: Stores data in an SQLite database.
•	Scheduled Jobs: Automatically sends reminders every day at a specified time using node-schedule.
________________________________________
Automated Setup
Follow these simple steps to set up the Birthday Reminder application:
1.	Clone the Repository
2.	git clone https://github.com/your-username/birthday-reminder.git
3.	cd birthday-reminder
4.	Run the Setup Script Execute the provided script to automatically install all dependencies, initialize the database, and configure the application:
5.	bash setup.sh
6.	Access the Application
o	Open your browser and navigate to http://localhost:3000.
________________________________________
File Structure
birthday-reminder/
├── data/                    # SQLite database and JSON configuration files
│   ├── birthdays.db         # SQLite database file
│   ├── smtp.json            # SMTP settings file (if used)
├── public/                  # Frontend files
│   ├── index.html           # Main frontend file
├── index.js                 # Main backend file (Node.js server)
├── setup.sh                 # Automated setup script
├── package.json             # Project metadata and dependencies
└── README.md                # Project documentation
________________________________________
Backend API Endpoints
1.	Fetch All Birthdays
o	GET /api/birthdays
o	Returns a list of all birthdays in the database.
2.	Add a Birthday
o	POST /api/birthdays
o	Accepts name, birthday, gender, and optional photo.
3.	Modify a Birthday
o	PUT /api/birthdays/:id
o	Updates a birthday by ID.
4.	Delete a Birthday
o	DELETE /api/birthdays/:id
o	Deletes a birthday by ID.
5.	SMTP Settings
o	GET /api/smtp-settings: Fetches current SMTP settings.
o	POST /api/smtp-settings: Updates SMTP settings.
6.	Send Test Email
o	POST /api/test-email
o	Sends a test email using the current SMTP settings.
7.	Send Test Reminder
o	GET /api/test-reminder
o	Sends reminder emails for today's birthdays.
________________________________________
Frontend Features
•	Add new birthdays with name, date, gender, and optional photo.
•	Modify existing birthdays and update their details.
•	View all birthdays sorted by age.
•	View today's birthdays in a separate section.
•	Configure SMTP settings for sending emails.
•	Test SMTP settings and reminder emails.
________________________________________
How It Works
•	Email Reminders: The application sends daily reminders at the specified time using node-schedule. Emails are sent in multiple languages, and photos are embedded directly in the email.
•	Data Storage: All birthday and SMTP data is stored in an SQLite database, ensuring data persistence across server restarts.
•	User-Friendly Frontend: A clean and simple interface allows users to manage birthdays and SMTP settings.
________________________________________
Technologies Used
•	Node.js: Backend server
•	Express.js: API framework
•	SQLite: Database for persistent storage
•	Multer: File upload handling
•	Node-Schedule: Task scheduling for daily reminders
•	Bootstrap: Frontend design
