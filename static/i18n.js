// Internationalization (i18n) System
// Supports English (EN), German (DE), Arabic (AR) with RTL support, Kurdish Kurmanci (KU)

const i18n = {
    currentLang: localStorage.getItem('i18n_lang') || 'en',
    translations: {
        en: {
            // Navigation
            appName: 'Birthday Manager',
            tagline: 'Never miss a celebration',
            
            // Stats
            today: 'Today',
            thisWeek: 'This Week',
            total: 'Total',
            birthdaysToday: 'Birthdays today',
            upcomingBirthdays: 'Upcoming birthdays',
            peopleTracked: 'People tracked',
            
            // Sections
            todaysBirthdays: "Today's Birthdays",
            addBirthday: 'Add Birthday',
            upcomingDays: 'Upcoming (7 Days)',
            dataManagement: 'Data Management',
            smtpSettings: 'SMTP Settings',
            allBirthdays: 'All Birthdays',
            
            // Form labels
            name: 'Name',
            birthday: 'Birthday',
            gender: 'Gender',
            photo: 'Photo',
            selectGender: 'Select Gender',
            male: 'Male',
            female: 'Female',
            optional: 'optional',
            
            // Actions
            add: 'Add Birthday',
            save: 'Save',
            cancel: 'Cancel',
            edit: 'Edit',
            delete: 'Delete',
            share: 'Share',
            export: 'Export All',
            import: 'Import',
            replaceExisting: 'Replace existing',
            reset: 'Reset',
            testSMTP: 'Test SMTP',
            testReminder: 'Test Reminder',
            saveChanges: 'Save Changes',
            
            // Table
            photo: 'Photo',
            age: 'Age',
            daysUntil: 'Days Until',
            actions: 'Actions',
            searchPlaceholder: 'Search by name...',
            noBirthdays: 'No birthdays found',
            loading: 'Loading...',
            
            // SMTP
            smtpServer: 'SMTP Server',
            smtpPort: 'SMTP Port',
            smtpEmail: 'SMTP Email',
            smtpPassword: 'SMTP Password',
            recipientEmail: 'Recipient Email',
            
            // Messages
            noBirthdaysToday: 'No birthdays today',
            checkBackTomorrow: 'Check back tomorrow! 🎈',
            noUpcoming: 'No upcoming birthdays in the next 7 days',
            today: 'Today!',
            tomorrow: 'Tomorrow',
            days: 'days',
            daysAgo: 'days ago',
            turningAge: 'Turning {age} years old today! 🎂',
            copiedToClipboard: 'Copied to clipboard!',
            
            // Validation
            nameRequired: 'Name is required',
            birthdayRequired: 'Birthday is required',
            invalidDate: 'Invalid date format',
            duplicateFound: 'A birthday with this name already exists',
            
            // Export/Import
            exportSuccess: 'Birthdays exported successfully!',
            importSuccess: 'Import completed successfully!',
            importErrors: 'errors',
            
            // Pagination
            showing: 'Showing',
            to: 'to',
            of: 'of',
            results: 'results',
            previous: 'Previous',
            next: 'Next',
            perPage: 'per page',
            
            // 30 Day View
            upcoming30Days: 'Upcoming 30 Days',
            monday: 'Monday',
            tuesday: 'Tuesday',
            wednesday: 'Wednesday',
            thursday: 'Thursday',
            friday: 'Friday',
            saturday: 'Saturday',
            sunday: 'Sunday',
            
            // Daily Digest
            dailyDigest: 'Daily Digest',
            previewDigest: 'Preview Digest',
            sendDigest: 'Send Digest',
            noBirthdaysInDigest: 'No birthdays in the selected period',
            
            // Keyboard shortcuts
            shortcuts: 'Keyboard Shortcuts',
            search: 'Search',
            newBirthday: 'New Birthday',
            goToToday: 'Go to Today',
            goToAll: 'Go to All',
            goToAdd: 'Go to Add',
            
            // Additional UI elements
            exportZIP: 'Export ZIP',
            exportCSV: 'Export CSV',
            exportICS: 'Export ICS',
            previewCSVImport: 'Preview CSV Import',
            enterFullName: 'Enter full name',
            show: 'Show:',
            editBirthday: 'Edit Birthday',
            photoOptional: 'Photo (optional)',
            daysAhead: 'Days ahead:',
            preview: 'Preview',
            send: 'Send',
            closeModal: 'Close Modal',
            selectLanguage: 'Select language',
            toggleDarkMode: 'Toggle dark mode',
            keyboardShortcuts: 'Keyboard shortcuts',
            csvImportPreview: 'CSV Import Preview',
            import: 'Import',
            confirm: 'Confirm',
            cancel: 'Cancel',
            
            // Error and success messages
            failedToLoad: 'Failed to load birthdays',
            birthdayNotFound: 'Birthday not found',
            copiedToClipboard: 'Copied to clipboard!',
            failedToCopy: 'Failed to copy',
            addSuccess: 'Birthday added successfully!',
            failedToAdd: 'Failed to add birthday',
            updateSuccess: 'Birthday updated successfully!',
            failedToUpdate: 'Failed to update birthday',
            deleteSuccess: 'Birthday deleted successfully!',
            failedToDelete: 'Failed to delete birthday',
            deleteConfirm: 'Are you sure you want to delete this birthday?',
            smtpSaveSuccess: 'SMTP settings saved successfully!',
            failedToSaveSMTP: 'Failed to save SMTP settings',
            resetConfirm: 'Are you sure you want to reset the configuration?',
            resetSuccess: 'Configuration reset successfully!',
            failedToReset: 'Failed to reset configuration',
            testEmailSuccess: 'Test email sent successfully!',
            failedToSendTestEmail: 'Failed to send test email',
            testReminderSuccess: 'Test reminder sent successfully!',
            failedToSendTestReminder: 'Failed to send test reminder',
            failedToExport: 'Failed to export birthdays',
            pleaseSelectFile: 'Please select a ZIP or CSV file',
            importConfirm: 'This will import birthdays from the ZIP file. Continue?',
            failedToImport: 'Failed to import birthdays',
            failedToPreviewCSV: 'Failed to preview CSV',
            failedToImportCSV: 'Failed to import CSV',
            failedToPreviewDigest: 'Failed to preview digest',
            digestSendSuccess: 'Digest sent successfully!',
            failedToSendDigest: 'Failed to send digest',
            successfully: 'successfully!',
            minCharacters: '(min 2 characters)',
            na: 'N/A',
            
            // CSV Preview
            total: 'Total',
            new: 'New',
            duplicates: 'Duplicates',
            invalid: 'Invalid',
            newEntriesSample: 'New Entries (sample):',
            duplicatesWillBeSkipped: 'Duplicates (will be skipped):',
            
            // Buy Me a Coffee
            buyMeACoffee: 'Buy me a coffee',
            
            // Footer
            aServiceBy: 'A service by',
            contact: 'Contact',
        },
        de: {
            appName: 'Geburtstags-Manager',
            tagline: 'Verpasse keine Feier',
            today: 'Heute',
            thisWeek: 'Diese Woche',
            total: 'Gesamt',
            birthdaysToday: 'Geburtstage heute',
            upcomingBirthdays: 'Anstehende Geburtstage',
            peopleTracked: 'Personen erfasst',
            todaysBirthdays: "Heutige Geburtstage",
            addBirthday: 'Geburtstag hinzufügen',
            upcomingDays: 'Anstehend (7 Tage)',
            dataManagement: 'Datenverwaltung',
            smtpSettings: 'SMTP-Einstellungen',
            allBirthdays: 'Alle Geburtstage',
            name: 'Name',
            birthday: 'Geburtstag',
            gender: 'Geschlecht',
            photo: 'Foto',
            selectGender: 'Geschlecht auswählen',
            male: 'Männlich',
            female: 'Weiblich',
            optional: 'optional',
            add: 'Geburtstag hinzufügen',
            save: 'Speichern',
            cancel: 'Abbrechen',
            edit: 'Bearbeiten',
            delete: 'Löschen',
            share: 'Teilen',
            export: 'Alle exportieren',
            import: 'Importieren',
            replaceExisting: 'Vorhandene ersetzen',
            reset: 'Zurücksetzen',
            testSMTP: 'SMTP testen',
            testReminder: 'Erinnerung testen',
            saveChanges: 'Änderungen speichern',
            photo: 'Foto',
            age: 'Alter',
            daysUntil: 'Tage bis',
            actions: 'Aktionen',
            searchPlaceholder: 'Nach Namen suchen...',
            noBirthdays: 'Keine Geburtstage gefunden',
            loading: 'Lädt...',
            smtpServer: 'SMTP-Server',
            smtpPort: 'SMTP-Port',
            smtpEmail: 'SMTP-E-Mail',
            smtpPassword: 'SMTP-Passwort',
            recipientEmail: 'Empfänger-E-Mail',
            noBirthdaysToday: 'Heute keine Geburtstage',
            checkBackTomorrow: 'Schauen Sie morgen wieder vorbei! 🎈',
            noUpcoming: 'Keine anstehenden Geburtstage in den nächsten 7 Tagen',
            today: 'Heute!',
            tomorrow: 'Morgen',
            days: 'Tage',
            daysAgo: 'Tage her',
            turningAge: 'Wird heute {age} Jahre alt! 🎂',
            copiedToClipboard: 'In Zwischenablage kopiert!',
            nameRequired: 'Name ist erforderlich',
            birthdayRequired: 'Geburtstag ist erforderlich',
            invalidDate: 'Ungültiges Datumsformat',
            duplicateFound: 'Ein Geburtstag mit diesem Namen existiert bereits',
            exportSuccess: 'Geburtstage erfolgreich exportiert!',
            importSuccess: 'Import erfolgreich abgeschlossen!',
            importErrors: 'Fehler',
            showing: 'Zeige',
            to: 'bis',
            of: 'von',
            results: 'Ergebnisse',
            previous: 'Zurück',
            next: 'Weiter',
            perPage: 'pro Seite',
            upcoming30Days: 'Anstehende 30 Tage',
            monday: 'Montag',
            tuesday: 'Dienstag',
            wednesday: 'Mittwoch',
            thursday: 'Donnerstag',
            friday: 'Freitag',
            saturday: 'Samstag',
            sunday: 'Sonntag',
            dailyDigest: 'Tägliche Zusammenfassung',
            previewDigest: 'Vorschau anzeigen',
            sendDigest: 'Zusammenfassung senden',
            noBirthdaysInDigest: 'Keine Geburtstage im ausgewählten Zeitraum',
            shortcuts: 'Tastenkürzel',
            search: 'Suchen',
            newBirthday: 'Neuer Geburtstag',
            goToToday: 'Zu Heute',
            goToAll: 'Zu Alle',
            goToAdd: 'Zu Hinzufügen',
            exportZIP: 'ZIP exportieren',
            exportCSV: 'CSV exportieren',
            exportICS: 'ICS exportieren',
            previewCSVImport: 'CSV-Import-Vorschau',
            enterFullName: 'Vollständigen Namen eingeben',
            show: 'Anzeigen:',
            editBirthday: 'Geburtstag bearbeiten',
            photoOptional: 'Foto (optional)',
            daysAhead: 'Tage im Voraus:',
            preview: 'Vorschau',
            send: 'Senden',
            closeModal: 'Modal schließen',
            selectLanguage: 'Sprache auswählen',
            toggleDarkMode: 'Dunkelmodus umschalten',
            keyboardShortcuts: 'Tastenkürzel',
            csvImportPreview: 'CSV-Import-Vorschau',
            import: 'Importieren',
            confirm: 'Bestätigen',
            cancel: 'Abbrechen',
            
            // Error and success messages
            failedToLoad: 'Geburtstage konnten nicht geladen werden',
            birthdayNotFound: 'Geburtstag nicht gefunden',
            copiedToClipboard: 'In Zwischenablage kopiert!',
            failedToCopy: 'Kopieren fehlgeschlagen',
            addSuccess: 'Geburtstag erfolgreich hinzugefügt!',
            failedToAdd: 'Geburtstag konnte nicht hinzugefügt werden',
            updateSuccess: 'Geburtstag erfolgreich aktualisiert!',
            failedToUpdate: 'Geburtstag konnte nicht aktualisiert werden',
            deleteSuccess: 'Geburtstag erfolgreich gelöscht!',
            failedToDelete: 'Geburtstag konnte nicht gelöscht werden',
            deleteConfirm: 'Sind Sie sicher, dass Sie diesen Geburtstag löschen möchten?',
            smtpSaveSuccess: 'SMTP-Einstellungen erfolgreich gespeichert!',
            failedToSaveSMTP: 'SMTP-Einstellungen konnten nicht gespeichert werden',
            resetConfirm: 'Sind Sie sicher, dass Sie die Konfiguration zurücksetzen möchten?',
            resetSuccess: 'Konfiguration erfolgreich zurückgesetzt!',
            failedToReset: 'Konfiguration konnte nicht zurückgesetzt werden',
            testEmailSuccess: 'Test-E-Mail erfolgreich gesendet!',
            failedToSendTestEmail: 'Test-E-Mail konnte nicht gesendet werden',
            testReminderSuccess: 'Test-Erinnerung erfolgreich gesendet!',
            failedToSendTestReminder: 'Test-Erinnerung konnte nicht gesendet werden',
            failedToExport: 'Geburtstage konnten nicht exportiert werden',
            pleaseSelectFile: 'Bitte wählen Sie eine ZIP- oder CSV-Datei aus',
            importConfirm: 'Dies importiert Geburtstage aus der ZIP-Datei. Fortfahren?',
            failedToImport: 'Geburtstage konnten nicht importiert werden',
            failedToPreviewCSV: 'CSV-Vorschau konnte nicht geladen werden',
            failedToImportCSV: 'CSV konnte nicht importiert werden',
            failedToPreviewDigest: 'Vorschau konnte nicht geladen werden',
            digestSendSuccess: 'Zusammenfassung erfolgreich gesendet!',
            failedToSendDigest: 'Zusammenfassung konnte nicht gesendet werden',
            successfully: 'erfolgreich!',
            minCharacters: '(mindestens 2 Zeichen)',
            na: 'N/V',
            
            // CSV Preview
            total: 'Gesamt',
            new: 'Neu',
            duplicates: 'Duplikate',
            invalid: 'Ungültig',
            newEntriesSample: 'Neue Einträge (Beispiel):',
            duplicatesWillBeSkipped: 'Duplikate (werden übersprungen):',
            
            // Buy Me a Coffee
            buyMeACoffee: 'Kauf mir einen Kaffee',
            
            // Footer
            aServiceBy: 'Ein Service von',
            contact: 'Kontakt',
        },
        ar: {
            appName: 'مدير أعياد الميلاد',
            tagline: 'لا تفوت أي احتفال',
            today: 'اليوم',
            thisWeek: 'هذا الأسبوع',
            total: 'الإجمالي',
            birthdaysToday: 'أعياد ميلاد اليوم',
            upcomingBirthdays: 'أعياد ميلاد قادمة',
            peopleTracked: 'أشخاص متتبعون',
            todaysBirthdays: 'أعياد ميلاد اليوم',
            addBirthday: 'إضافة عيد ميلاد',
            upcomingDays: 'القادمة (7 أيام)',
            dataManagement: 'إدارة البيانات',
            smtpSettings: 'إعدادات SMTP',
            allBirthdays: 'جميع أعياد الميلاد',
            name: 'الاسم',
            birthday: 'عيد الميلاد',
            gender: 'الجنس',
            photo: 'الصورة',
            selectGender: 'اختر الجنس',
            male: 'ذكر',
            female: 'أنثى',
            optional: 'اختياري',
            add: 'إضافة عيد ميلاد',
            save: 'حفظ',
            cancel: 'إلغاء',
            edit: 'تعديل',
            delete: 'حذف',
            share: 'مشاركة',
            export: 'تصدير الكل',
            import: 'استيراد',
            replaceExisting: 'استبدال الموجود',
            reset: 'إعادة تعيين',
            testSMTP: 'اختبار SMTP',
            testReminder: 'اختبار التذكير',
            saveChanges: 'حفظ التغييرات',
            photo: 'الصورة',
            age: 'العمر',
            daysUntil: 'الأيام حتى',
            actions: 'الإجراءات',
            searchPlaceholder: 'البحث بالاسم...',
            noBirthdays: 'لم يتم العثور على أعياد ميلاد',
            loading: 'جاري التحميل...',
            smtpServer: 'خادم SMTP',
            smtpPort: 'منفذ SMTP',
            smtpEmail: 'بريد SMTP الإلكتروني',
            smtpPassword: 'كلمة مرور SMTP',
            recipientEmail: 'البريد الإلكتروني للمستلم',
            noBirthdaysToday: 'لا توجد أعياد ميلاد اليوم',
            checkBackTomorrow: 'ارجع غداً! 🎈',
            noUpcoming: 'لا توجد أعياد ميلاد قادمة في الأيام السبعة القادمة',
            today: 'اليوم!',
            tomorrow: 'غداً',
            days: 'أيام',
            daysAgo: 'أيام مضت',
            turningAge: 'يصبح {age} سنة اليوم! 🎂',
            copiedToClipboard: 'تم النسخ إلى الحافظة!',
            nameRequired: 'الاسم مطلوب',
            birthdayRequired: 'عيد الميلاد مطلوب',
            invalidDate: 'تنسيق تاريخ غير صالح',
            duplicateFound: 'يوجد بالفعل عيد ميلاد بهذا الاسم',
            exportSuccess: 'تم تصدير أعياد الميلاد بنجاح!',
            importSuccess: 'اكتمل الاستيراد بنجاح!',
            importErrors: 'أخطاء',
            showing: 'عرض',
            to: 'إلى',
            of: 'من',
            results: 'نتائج',
            previous: 'السابق',
            next: 'التالي',
            perPage: 'لكل صفحة',
            upcoming30Days: 'الـ 30 يوم القادمة',
            monday: 'الاثنين',
            tuesday: 'الثلاثاء',
            wednesday: 'الأربعاء',
            thursday: 'الخميس',
            friday: 'الجمعة',
            saturday: 'السبت',
            sunday: 'الأحد',
            dailyDigest: 'الملخص اليومي',
            previewDigest: 'معاينة الملخص',
            sendDigest: 'إرسال الملخص',
            noBirthdaysInDigest: 'لا توجد أعياد ميلاد في الفترة المحددة',
            shortcuts: 'اختصارات لوحة المفاتيح',
            search: 'بحث',
            newBirthday: 'عيد ميلاد جديد',
            goToToday: 'انتقل إلى اليوم',
            goToAll: 'انتقل إلى الكل',
            goToAdd: 'انتقل إلى الإضافة',
            exportZIP: 'تصدير ZIP',
            exportCSV: 'تصدير CSV',
            exportICS: 'تصدير ICS',
            previewCSVImport: 'معاينة استيراد CSV',
            enterFullName: 'أدخل الاسم الكامل',
            show: 'عرض:',
            editBirthday: 'تعديل عيد الميلاد',
            photoOptional: 'الصورة (اختياري)',
            daysAhead: 'الأيام القادمة:',
            preview: 'معاينة',
            send: 'إرسال',
            closeModal: 'إغلاق النافذة',
            selectLanguage: 'اختر اللغة',
            toggleDarkMode: 'تبديل الوضع الداكن',
            keyboardShortcuts: 'اختصارات لوحة المفاتيح',
            csvImportPreview: 'معاينة استيراد CSV',
            import: 'استيراد',
            confirm: 'تأكيد',
            cancel: 'إلغاء',
            
            // Error and success messages
            failedToLoad: 'فشل تحميل أعياد الميلاد',
            birthdayNotFound: 'عيد الميلاد غير موجود',
            copiedToClipboard: 'تم النسخ إلى الحافظة!',
            failedToCopy: 'فشل النسخ',
            addSuccess: 'تمت إضافة عيد الميلاد بنجاح!',
            failedToAdd: 'فشلت إضافة عيد الميلاد',
            updateSuccess: 'تم تحديث عيد الميلاد بنجاح!',
            failedToUpdate: 'فشل تحديث عيد الميلاد',
            deleteSuccess: 'تم حذف عيد الميلاد بنجاح!',
            failedToDelete: 'فشل حذف عيد الميلاد',
            deleteConfirm: 'هل أنت متأكد أنك تريد حذف عيد الميلاد هذا؟',
            smtpSaveSuccess: 'تم حفظ إعدادات SMTP بنجاح!',
            failedToSaveSMTP: 'فشل حفظ إعدادات SMTP',
            resetConfirm: 'هل أنت متأكد أنك تريد إعادة تعيين الإعدادات؟',
            resetSuccess: 'تم إعادة تعيين الإعدادات بنجاح!',
            failedToReset: 'فشلت إعادة تعيين الإعدادات',
            testEmailSuccess: 'تم إرسال البريد الإلكتروني التجريبي بنجاح!',
            failedToSendTestEmail: 'فشل إرسال البريد الإلكتروني التجريبي',
            testReminderSuccess: 'تم إرسال التذكير التجريبي بنجاح!',
            failedToSendTestReminder: 'فشل إرسال التذكير التجريبي',
            failedToExport: 'فشل تصدير أعياد الميلاد',
            pleaseSelectFile: 'يرجى اختيار ملف ZIP أو CSV',
            importConfirm: 'سيتم استيراد أعياد الميلاد من ملف ZIP. متابعة؟',
            failedToImport: 'فشل استيراد أعياد الميلاد',
            failedToPreviewCSV: 'فشل معاينة CSV',
            failedToImportCSV: 'فشل استيراد CSV',
            failedToPreviewDigest: 'فشل معاينة الملخص',
            digestSendSuccess: 'تم إرسال الملخص بنجاح!',
            failedToSendDigest: 'فشل إرسال الملخص',
            successfully: 'بنجاح!',
            minCharacters: '(الحد الأدنى حرفان)',
            na: 'غير متاح',
            
            // CSV Preview
            total: 'الإجمالي',
            new: 'جديد',
            duplicates: 'مكرر',
            invalid: 'غير صالح',
            newEntriesSample: 'إدخالات جديدة (عينة):',
            duplicatesWillBeSkipped: 'مكررات (سيتم تخطيها):',
            
            // Buy Me a Coffee
            buyMeACoffee: 'اشتري لي قهوة',
            
            // Footer
            aServiceBy: 'خدمة من',
            contact: 'اتصل',
        },
        ku: {
            // Navigation
            appName: 'Rêveberê Rojbûnê',
            tagline: 'Qet cejnek winda neke',
            
            // Stats
            today: 'Îro',
            thisWeek: 'Ev Hêfte',
            total: 'Bi tevahî',
            birthdaysToday: 'Rojbûnên îro',
            upcomingBirthdays: 'Rojbûnên pêşve',
            peopleTracked: 'Kesên têne şopandin',
            
            // Sections
            todaysBirthdays: 'Rojbûnên Îro',
            addBirthday: 'Rojbûnê Zêde Bike',
            upcomingDays: 'Pêşve (7 Roj)',
            dataManagement: 'Rêvebirina Daneyan',
            smtpSettings: 'Mîhengên SMTP',
            allBirthdays: 'Hemû Rojbûn',
            
            // Form labels
            name: 'Nav',
            birthday: 'Rojbûn',
            gender: 'Zayend',
            photo: 'Wêne',
            selectGender: 'Zayend Hilbijêre',
            male: 'Mêr',
            female: 'Jin',
            optional: 'neçarî',
            
            // Actions
            add: 'Rojbûnê Zêde Bike',
            save: 'Tomar Bike',
            cancel: 'Betal Bike',
            edit: 'Guhertin',
            delete: 'Jêbirin',
            share: 'Parve Bike',
            export: 'Hemû Derxe',
            import: 'Têxe',
            replaceExisting: 'Yên heyî biguherîne',
            reset: 'Dîsa Saz Bike',
            testSMTP: 'SMTP-yê Test Bike',
            testReminder: 'Bîra Xatirê Test Bike',
            saveChanges: 'Guhertinên Tomar Bike',
            
            // Table
            photo: 'Wêne',
            age: 'Temen',
            daysUntil: 'Rojên Mayî',
            actions: 'Çalakî',
            searchPlaceholder: 'Bi navê bigere...',
            noBirthdays: 'Rojbûn nehate dîtin',
            loading: 'Tê barkirin...',
            
            // SMTP
            smtpServer: 'Pêşkêşkara SMTP',
            smtpPort: 'Porta SMTP',
            smtpEmail: 'E-nameya SMTP',
            smtpPassword: 'Şîfreya SMTP',
            recipientEmail: 'E-nameya Wergir',
            
            // Messages
            noBirthdaysToday: 'Îro rojbûn tune',
            checkBackTomorrow: 'Sibê dîsa kontrol bike! 🎈',
            noUpcoming: 'Di 7 rojên pêş de rojbûn tune',
            today: 'Îro!',
            tomorrow: 'Sibê',
            days: 'roj',
            daysAgo: 'roj berê',
            turningAge: 'Îro {age} salî dibe! 🎂',
            copiedToClipboard: 'Li clipboardê hate kopîkirin!',
            
            // Validation
            nameRequired: 'Nav pêwîst e',
            birthdayRequired: 'Rojbûn pêwîst e',
            invalidDate: 'Formata tarîxê nederbasdar e',
            duplicateFound: 'Rojbûnek bi vî navî jixwe heye',
            
            // Export/Import
            exportSuccess: 'Rojbûn bi serkeftî hatin derxistin!',
            importSuccess: 'Têxistin bi serkeftî qediya!',
            importErrors: 'çewtî',
            
            // Pagination
            showing: 'Tê nîşandan',
            to: 'heta',
            of: 'ji',
            results: 'encam',
            previous: 'Berê',
            next: 'Pêşve',
            perPage: 'li ser rûpelê',
            
            // 30 Day View
            upcoming30Days: '30 Rojên Pêşve',
            monday: 'Duşem',
            tuesday: 'Sêşem',
            wednesday: 'Çarşem',
            thursday: 'Pêncşem',
            friday: 'În',
            saturday: 'Şemî',
            sunday: 'Yekşem',
            
            // Daily Digest
            dailyDigest: 'Kurteya Rojane',
            previewDigest: 'Kurteya Pêşdîtinê',
            sendDigest: 'Kurteyê Bişîne',
            noBirthdaysInDigest: 'Di dema hilbijartî de rojbûn tune',
            
            // Keyboard shortcuts
            shortcuts: 'Kurteyên Klavyeyê',
            search: 'Gerr',
            newBirthday: 'Rojbûna Nû',
            goToToday: 'Biçe Îro',
            goToAll: 'Biçe Hemû',
            goToAdd: 'Biçe Zêdekirinê',
            
            // Additional UI elements
            exportZIP: 'ZIP Derxe',
            exportCSV: 'CSV Derxe',
            exportICS: 'ICS Derxe',
            previewCSVImport: 'Pêşdîtina Têxistina CSV',
            enterFullName: 'Navê tevahî binivîse',
            show: 'Nîşan Bide:',
            editBirthday: 'Rojbûnê Biguherîne',
            photoOptional: 'Wêne (neçarî)',
            daysAhead: 'Rojên pêşve:',
            preview: 'Pêşdîtin',
            send: 'Bişîne',
            closeModal: 'Modalê Bigire',
            selectLanguage: 'Zimanê hilbijêre',
            toggleDarkMode: 'Moda tarî biguherîne',
            keyboardShortcuts: 'Kurteyên klavyeyê',
            csvImportPreview: 'Pêşdîtina Têxistina CSV',
            import: 'Têxe',
            confirm: 'Tesdîq Bike',
            cancel: 'Betal Bike',
            
            // Error and success messages
            failedToLoad: 'Barkirina rojbûnan bi ser neket',
            birthdayNotFound: 'Rojbûn nehate dîtin',
            copiedToClipboard: 'Li clipboardê hate kopîkirin!',
            failedToCopy: 'Kopîkirin bi ser neket',
            addSuccess: 'Rojbûn bi serkeftî hate zêdekirin!',
            failedToAdd: 'Zêdekirina rojbûnê bi ser neket',
            updateSuccess: 'Rojbûn bi serkeftî hate nûkirin!',
            failedToUpdate: 'Nûkirina rojbûnê bi ser neket',
            deleteSuccess: 'Rojbûn bi serkeftî hate jêbirin!',
            failedToDelete: 'Jêbirina rojbûnê bi ser neket',
            deleteConfirm: 'Ma tu rastî dixwazî vê rojbûnê jêbikî?',
            smtpSaveSuccess: 'Mîhengên SMTP bi serkeftî hatin tomarkirin!',
            failedToSaveSMTP: 'Tomarkirina mîhenganên SMTP bi ser neket',
            resetConfirm: 'Ma tu rastî dixwazî mîhengên dîsa saz bikî?',
            resetSuccess: 'Mîheng bi serkeftî hatin dîsa sazkirin!',
            failedToReset: 'Dîsa sazkirina mîhengan bi ser neket',
            testEmailSuccess: 'E-nameya testê bi serkeftî hate şandin!',
            failedToSendTestEmail: 'Şandina e-nameya testê bi ser neket',
            testReminderSuccess: 'Bîra xatirê ya testê bi serkeftî hate şandin!',
            failedToSendTestReminder: 'Şandina bîra xatirê ya testê bi ser neket',
            failedToExport: 'Derxistina rojbûnan bi ser neket',
            pleaseSelectFile: 'Ji kerema xwe pelê ZIP an CSV hilbijêre',
            importConfirm: 'Ev dê rojbûn ji pelê ZIP-ê têxe. Bidomîne?',
            failedToImport: 'Têxistina rojbûnan bi ser neket',
            failedToPreviewCSV: 'Pêşdîtina CSV bi ser neket',
            failedToImportCSV: 'Têxistina CSV bi ser neket',
            failedToPreviewDigest: 'Pêşdîtina kurteyê bi ser neket',
            digestSendSuccess: 'Kurte bi serkeftî hate şandin!',
            failedToSendDigest: 'Şandina kurteyê bi ser neket',
            successfully: 'bi serkeftî!',
            minCharacters: '(kêmî 2 tîp)',
            na: 'N/A',
            
            // CSV Preview
            total: 'Bi tevahî',
            new: 'Nû',
            duplicates: 'Dudilî',
            invalid: 'Nederbasdar',
            newEntriesSample: 'Têketinên Nû (mînak):',
            duplicatesWillBeSkipped: 'Dudilî (dê werin derbas kirin):',
            
            // Buy Me a Coffee
            buyMeACoffee: 'Qehweyekê ji min re bikire',
            
            // Footer
            aServiceBy: 'Xizmetek ji',
            contact: 'Têkilî',
        }
    },
    
    // Get translation with placeholder support
    t(key, params = {}) {
        const translation = this.translations[this.currentLang]?.[key] || 
                          this.translations.en[key] || 
                          key;
        
        // Replace placeholders like {age}
        return translation.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    },
    
    // Set language and update UI
    setLang(lang) {
        if (!this.translations[lang]) {
            console.warn(`Language ${lang} not supported`);
            return;
        }
        
        this.currentLang = lang;
        localStorage.setItem('i18n_lang', lang);
        
        // Update HTML dir attribute for RTL
        if (lang === 'ar') {
            document.documentElement.setAttribute('dir', 'rtl');
            document.documentElement.setAttribute('lang', 'ar');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
            document.documentElement.setAttribute('lang', lang === 'ku' ? 'ku' : lang);
        }
        
        // Trigger UI update
        if (typeof updateUIWithTranslations === 'function') {
            updateUIWithTranslations();
        }
    },
    
    // Initialize on load
    init() {
        const savedLang = localStorage.getItem('i18n_lang') || 'en';
        this.setLang(savedLang);
    }
};

// Initialize i18n on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}

