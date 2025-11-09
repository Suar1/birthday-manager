// Internationalization (i18n) System
// Supports English (EN), German (DE), Arabic (AR) with RTL support

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
            document.documentElement.setAttribute('lang', lang);
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

