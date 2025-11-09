// Modern Birthday Manager Frontend - Enhanced Edition
// All UI logic, dark mode, search, validation, i18n, pagination, sorting, and interactions

// ============================================================================
// CONFIGURATION & STATE
// ============================================================================
const API_BASE = '';
let allBirthdays = [];
let filteredBirthdays = [];
let paginatedBirthdays = [];
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Pagination state
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = null;
let sortDirection = 'asc';

// Search debounce
let searchTimeout = null;

// Focus trap state
let focusTrapElements = [];
let lastFocusedElement = null;

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initI18n();
    loadConfig();
    fetchBirthdays();
    setupEventListeners();
    setupModalDrag();
    setupKeyboardShortcuts();
    setupTableSorting();
    setupPagination();
    updateUIWithTranslations();
});

// ============================================================================
// DARK MODE MANAGEMENT
// ============================================================================
function initDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    updateThemeIcon();
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    document.getElementById('sun-icon').classList.toggle('hidden', !isDark);
    document.getElementById('moon-icon').classList.toggle('hidden', isDark);
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================
function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', toggleDarkMode);
    
    // Language selector
    document.getElementById('lang-selector')?.addEventListener('change', (e) => {
        i18n.setLang(e.target.value);
    });
    
    // Forms
    document.getElementById('add-birthday-form')?.addEventListener('submit', handleAddBirthday);
    document.getElementById('smtp-form')?.addEventListener('submit', handleSaveSMTP);
    
    // Real-time validation
    document.getElementById('name')?.addEventListener('input', validateName);
    
    // Photo input - EXIF removal
    document.getElementById('photo')?.addEventListener('change', handlePhotoUpload);
    document.getElementById('edit-photo')?.addEventListener('change', handlePhotoUpload);
    
    // Buttons
    document.getElementById('reset-config-btn')?.addEventListener('click', handleResetConfig);
    document.getElementById('test-smtp-btn')?.addEventListener('click', handleTestSMTP);
    document.getElementById('test-reminder-btn')?.addEventListener('click', handleTestReminder);
    document.getElementById('export-zip-btn')?.addEventListener('click', () => handleExport('zip'));
    document.getElementById('export-csv-btn')?.addEventListener('click', () => handleExport('csv'));
    document.getElementById('export-ics-btn')?.addEventListener('click', () => handleExport('ics'));
    document.getElementById('import-file')?.addEventListener('change', handleImport);
    document.getElementById('import-csv-preview-btn')?.addEventListener('click', handleCSVPreview);
    document.getElementById('confirm-csv-import')?.addEventListener('click', handleCSVImport);
    document.getElementById('cancel-csv-import')?.addEventListener('click', () => {
        document.getElementById('csv-preview-modal').classList.add('hidden');
    });
    document.getElementById('close-csv-preview')?.addEventListener('click', () => {
        document.getElementById('csv-preview-modal').classList.add('hidden');
    });
    
    // Daily Digest
    document.getElementById('preview-digest-btn')?.addEventListener('click', handlePreviewDigest);
    document.getElementById('send-digest-btn')?.addEventListener('click', handleSendDigest);
    
    // Modal
    document.getElementById('edit-birthday-form')?.addEventListener('submit', handleUpdateBirthday);
    document.getElementById('cancel-edit-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('modal-close')?.addEventListener('click', closeEditModal);
    
    // Search with debounce
    document.getElementById('search-input')?.addEventListener('input', handleSearchDebounced);
    
    // Pagination
    document.getElementById('per-page')?.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        applyPagination();
    });
    
    // SMTP toggle
    document.getElementById('smtp-toggle')?.addEventListener('click', () => {
        const form = document.getElementById('smtp-form');
        const icon = document.querySelector('#smtp-toggle svg');
        form.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    });
    
    // Shortcuts modal
    document.getElementById('shortcuts-btn')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal').classList.remove('hidden');
        setupFocusTrap('shortcuts-modal');
    });
    document.getElementById('close-shortcuts')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal').classList.add('hidden');
        releaseFocusTrap();
    });
    
    // Close modals on background click
    document.getElementById('edit-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') {
            closeEditModal();
        }
    });
    document.getElementById('csv-preview-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'csv-preview-modal') {
            document.getElementById('csv-preview-modal').classList.add('hidden');
        }
    });
    document.getElementById('shortcuts-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'shortcuts-modal') {
            document.getElementById('shortcuts-modal').classList.add('hidden');
        }
    });
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            // Allow ESC to close modals even when in inputs
            if (e.key === 'Escape') {
                const editModal = document.getElementById('edit-modal');
                const csvModal = document.getElementById('csv-preview-modal');
                const shortcutsModal = document.getElementById('shortcuts-modal');
                
                if (!editModal.classList.contains('hidden')) {
                    closeEditModal();
                } else if (!csvModal.classList.contains('hidden')) {
                    csvModal.classList.add('hidden');
                } else if (!shortcutsModal.classList.contains('hidden')) {
                    shortcutsModal.classList.add('hidden');
                }
            }
            return;
        }
        
        // / - Focus search
        if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            return;
        }
        
        // n - New birthday (focus name input)
        if (e.key === 'n' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.getElementById('name')?.focus();
            document.getElementById('name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        
        // g t - Go to Today section
        if (e.key === 'g' && !window.gKeyPressed) {
            window.gKeyPressed = true;
            setTimeout(() => { window.gKeyPressed = false; }, 1000);
            return;
        }
        if (e.key === 't' && window.gKeyPressed) {
            e.preventDefault();
            document.querySelector('#today-birthday-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.gKeyPressed = false;
            return;
        }
        
        // g a - Go to All birthdays table
        if (e.key === 'a' && window.gKeyPressed) {
            e.preventDefault();
            document.getElementById('birthday-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.gKeyPressed = false;
            return;
        }
        
        // ? - Show shortcuts
        if (e.key === '?' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.getElementById('shortcuts-modal').classList.remove('hidden');
            setupFocusTrap('shortcuts-modal');
            return;
        }
        
        // ESC to close any modal
        if (e.key === 'Escape') {
            const editModal = document.getElementById('edit-modal');
            const csvModal = document.getElementById('csv-preview-modal');
            const shortcutsModal = document.getElementById('shortcuts-modal');
            
            if (!editModal.classList.contains('hidden')) {
                closeEditModal();
            } else if (!csvModal.classList.contains('hidden')) {
                csvModal.classList.add('hidden');
            } else if (!shortcutsModal.classList.contains('hidden')) {
                shortcutsModal.classList.add('hidden');
            }
        }
    });
}

// ============================================================================
// MODAL DRAG FUNCTIONALITY
// ============================================================================
function setupModalDrag() {
    const modal = document.getElementById('edit-modal');
    const dialog = document.getElementById('modal-dialog');
    const header = document.getElementById('modal-header');
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.id === 'modal-close' || e.target.closest('#modal-close')) return;
        
        isDragging = true;
        const rect = dialog.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        dialog.style.transition = 'none';
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    });
    
    function onDrag(e) {
        if (!isDragging) return;
        const maxX = window.innerWidth - dialog.offsetWidth;
        const maxY = window.innerHeight - dialog.offsetHeight;
        
        let x = e.clientX - dragOffset.x;
        let y = e.clientY - dragOffset.y;
        
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));
        
        dialog.style.left = x + 'px';
        dialog.style.top = y + 'px';
        dialog.style.margin = '0';
    }
    
    function stopDrag() {
        isDragging = false;
        dialog.style.transition = '';
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }
}

// ============================================================================
// CLIENT-SIDE VALIDATION
// ============================================================================
function validateName() {
    const input = document.getElementById('name');
    const value = input.value.trim();
    const validIcon = document.getElementById('name-valid');
    const invalidIcon = document.getElementById('name-invalid');
    
    if (value.length === 0) {
        validIcon.classList.add('hidden');
        invalidIcon.classList.add('hidden');
        input.classList.remove('border-green-500', 'border-red-500');
        return;
    }
    
    if (value.length >= 2) {
        validIcon.classList.remove('hidden');
        invalidIcon.classList.add('hidden');
        input.classList.add('border-green-500');
        input.classList.remove('border-red-500');
    } else {
        validIcon.classList.add('hidden');
        invalidIcon.classList.remove('hidden');
        input.classList.add('border-red-500');
        input.classList.remove('border-green-500');
    }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    toast.className = `${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md animate-slide-up transform transition-all duration-300`;
    toast.innerHTML = `
        <span class="text-xl font-bold">${icons[type]}</span>
        <span class="flex-1">${message}</span>
        <button class="text-white/80 hover:text-white" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================================================
// DATA FETCHING
// ============================================================================
async function fetchBirthdays() {
    try {
        showLoadingState();
        const response = await fetch(`${API_BASE}/api/birthdays`);
        if (!response.ok) throw new Error('Failed to fetch birthdays');
        
        allBirthdays = await response.json();
        filteredBirthdays = [...allBirthdays];
        renderAll();
        updateStats();
    } catch (error) {
        console.error('Error fetching birthdays:', error);
        showToast('Failed to load birthdays', 'error');
        hideLoadingState();
    }
}

function showLoadingState() {
    const tableBody = document.getElementById('birthday-table');
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="px-6 py-8 text-center">
                <div class="flex items-center justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </td>
        </tr>
    `;
}

function hideLoadingState() {
    // Loading state is replaced by renderAll()
}

// ============================================================================
// TABLE SORTING
// ============================================================================
function setupTableSorting() {
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            updateSortIndicators();
            applyPagination(); // This handles sorting internally
            announceTableUpdate();
        });
        
        // Keyboard support
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                header.click();
            }
        });
    });
}

function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        const column = header.dataset.sort;
        
        if (sortColumn === column) {
            header.setAttribute('aria-sort', sortDirection === 'asc' ? 'ascending' : 'descending');
            indicator.textContent = sortDirection === 'asc' ? '↑' : '↓';
            indicator.classList.remove('hidden');
        } else {
            header.setAttribute('aria-sort', 'none');
            indicator.textContent = '';
            indicator.classList.add('hidden');
        }
    });
}

function applySorting() {
    // Sorting is now handled in applyPagination for consistency
}

// ============================================================================
// PAGINATION
// ============================================================================
function setupPagination() {
    // Will be called after data loads
}

function applyPagination() {
    // Apply sorting first to get sorted list
    const sorted = [...filteredBirthdays];
    if (sortColumn) {
        sorted.sort((a, b) => {
            let aVal, bVal;
            switch(sortColumn) {
                case 'name':
                    aVal = normalizeName(a.name).toLowerCase();
                    bVal = normalizeName(b.name).toLowerCase();
                    break;
                case 'birthday':
                    aVal = new Date(a.birthday);
                    bVal = new Date(b.birthday);
                    break;
                case 'age':
                    aVal = a.age || calculateAge(a.birthday);
                    bVal = b.age || calculateAge(b.birthday);
                    break;
                case 'daysUntil':
                    aVal = getDaysUntilBirthday(new Date(a.birthday));
                    bVal = getDaysUntilBirthday(new Date(b.birthday));
                    break;
                default:
                    return 0;
            }
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    // Then paginate
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    paginatedBirthdays = sorted.slice(start, end);
    
    renderAllBirthdays();
    updatePaginationControls();
    updatePaginationInfo();
}

function updatePaginationControls() {
    const controls = document.getElementById('pagination-controls');
    if (!controls) return;
    
    const totalPages = Math.ceil(filteredBirthdays.length / itemsPerPage);
    
    if (totalPages <= 1) {
        controls.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} 
        onclick="goToPage(${currentPage - 1})" 
        class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        ${currentPage === 1 ? 'aria-disabled="true"' : ''}>
        ${i18n?.t('previous') || 'Previous'}
    </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button onclick="goToPage(${i})" 
                class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700'}"
                ${i === currentPage ? 'aria-current="page"' : ''}>
                ${i}
            </button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="px-2">...</span>`;
        }
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} 
        onclick="goToPage(${currentPage + 1})" 
        class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        ${currentPage === totalPages ? 'aria-disabled="true"' : ''}>
        ${i18n?.t('next') || 'Next'}
    </button>`;
    
    controls.innerHTML = html;
}

function updatePaginationInfo() {
    const info = document.getElementById('pagination-info');
    if (!info) return;
    
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, filteredBirthdays.length);
    const total = filteredBirthdays.length;
    
    if (total === 0) {
        info.textContent = i18n?.t('noBirthdays') || 'No birthdays found';
        return;
    }
    
    info.textContent = `${i18n?.t('showing') || 'Showing'} ${start} ${i18n?.t('to') || 'to'} ${end} ${i18n?.t('of') || 'of'} ${total} ${i18n?.t('results') || 'results'}`;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredBirthdays.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    applyPagination(); // This handles sorting internally
    document.getElementById('birthday-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================================
// ACCESSIBILITY: FOCUS TRAP
// ============================================================================
function setupFocusTrap(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    focusTrapElements = Array.from(focusableElements).filter(el => !el.disabled);
    lastFocusedElement = document.activeElement;
    
    if (focusTrapElements.length > 0) {
        focusTrapElements[0].focus();
    }
    
    // Trap focus within modal
    modal.addEventListener('keydown', trapFocus);
}

function trapFocus(e) {
    if (e.key !== 'Tab') return;
    
    if (focusTrapElements.length === 0) return;
    
    const firstElement = focusTrapElements[0];
    const lastElement = focusTrapElements[focusTrapElements.length - 1];
    
    if (e.shiftKey) {
        if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        }
    } else {
        if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
}

function releaseFocusTrap() {
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
    focusTrapElements = [];
}

// ============================================================================
// ACCESSIBILITY: ARIA LIVE ANNOUNCEMENTS
// ============================================================================
function announceTableUpdate() {
    const announcer = document.getElementById('table-announcements');
    if (!announcer) return;
    
    const count = filteredBirthdays.length;
    const message = count === 1 
        ? `${count} birthday displayed`
        : `${count} birthdays displayed`;
    
    announcer.textContent = message;
    setTimeout(() => {
        announcer.textContent = '';
    }, 1000);
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================
function renderAll() {
    renderTodayBirthdays();
    renderCountdownWidget();
    render30DayView();
    applyPagination(); // This handles sorting internally
    updateStats();
}

function updateStats() {
    const today = new Date();
    const todayCount = allBirthdays.filter(b => {
        const bday = new Date(b.birthday);
        return bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate();
    }).length;
    
    const weekCount = allBirthdays.filter(b => {
        const bday = new Date(b.birthday);
        const daysUntil = getDaysUntilBirthday(bday);
        return daysUntil >= 0 && daysUntil <= 7;
    }).length;
    
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('week-count').textContent = weekCount;
    document.getElementById('total-count').textContent = allBirthdays.length;
}

function renderTodayBirthdays() {
    const todayList = document.getElementById('today-birthday-list');
    const today = new Date();
    
    const todays = allBirthdays.filter(birthday => {
        const birthdayDate = new Date(birthday.birthday);
        return birthdayDate.getMonth() === today.getMonth() && 
               birthdayDate.getDate() === today.getDate();
    });
    
    if (todays.length === 0) {
        todayList.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <p class="text-lg mb-2">No birthdays today</p>
                <p class="text-sm">Check back tomorrow! 🎈</p>
            </div>
        `;
        return;
    }
    
    todayList.innerHTML = todays.map(birthday => {
        const age = birthday.age || calculateAge(birthday.birthday);
        return `
            <div class="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/50 hover:shadow-lg transition-all animate-fade-in">
                ${birthday.photo ? `
                    <img src="${birthday.photo}" alt="${birthday.name}" 
                         class="w-16 h-16 object-cover rounded-full border-4 border-white dark:border-gray-700 shadow-lg" loading="lazy">
                ` : `
                    <div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        ${birthday.name.charAt(0).toUpperCase()}
                    </div>
                `}
                <div class="flex-1">
                    <h3 class="font-bold text-lg text-gray-800 dark:text-white">${birthday.name}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Turning ${age} years old today! 🎂</p>
                </div>
                <div class="text-3xl">🎉</div>
            </div>
        `;
    }).join('');
}

function renderCountdownWidget() {
    const widget = document.getElementById('countdown-widget');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = allBirthdays
        .map(b => {
            const bday = new Date(b.birthday);
            const daysUntil = getDaysUntilBirthday(bday);
            return { ...b, daysUntil };
        })
        .filter(b => b.daysUntil >= 0 && b.daysUntil <= 7)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);
    
    if (upcoming.length === 0) {
        widget.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <p class="text-sm">No upcoming birthdays in the next 7 days</p>
            </div>
        `;
        return;
    }
    
    widget.innerHTML = upcoming.map(birthday => {
        const daysText = birthday.daysUntil === 0 ? 'Today!' : 
                        birthday.daysUntil === 1 ? 'Tomorrow' : 
                        `${birthday.daysUntil} days`;
        
        return `
            <div class="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl hover:bg-white/70 dark:hover:bg-gray-700/70 transition-all animate-fade-in">
                ${birthday.photo ? `
                    <img src="${birthday.photo}" alt="${birthday.name}" 
                         class="w-12 h-12 object-cover rounded-full border-2 border-white dark:border-gray-600" loading="lazy">
                ` : `
                    <div class="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        ${birthday.name.charAt(0).toUpperCase()}
                    </div>
                `}
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-800 dark:text-white truncate">${birthday.name}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${daysText}</p>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-purple-600 dark:text-purple-400">${birthday.daysUntil}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">days</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAllBirthdays() {
    const tableBody = document.getElementById('birthday-table');
    
    if (paginatedBirthdays.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    ${i18n?.t('noBirthdays') || 'No birthdays found'}
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = paginatedBirthdays.map(birthday => {
        const age = birthday.age || calculateAge(birthday.birthday);
        const birthdayDate = new Date(birthday.birthday);
        const daysUntil = getDaysUntilBirthday(birthdayDate);
        const formattedDate = birthdayDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const daysText = daysUntil === 0 ? 'Today!' : 
                        daysUntil === 1 ? 'Tomorrow' : 
                        daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` :
                        `${daysUntil} days`;
        
        const daysClass = daysUntil === 0 ? 'text-yellow-600 dark:text-yellow-400 font-bold' :
                         daysUntil <= 7 ? 'text-orange-600 dark:text-orange-400' :
                         'text-gray-600 dark:text-gray-400';
        
        return `
            <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors animate-fade-in">
                <td class="px-6 py-4 whitespace-nowrap">
                    ${birthday.photo ? `
                        <img src="${birthday.photo}" alt="${birthday.name}" 
                             class="w-12 h-12 object-cover rounded-full border-2 border-white dark:border-gray-600 shadow-md" loading="lazy">
                    ` : `
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                            ${birthday.name.charAt(0).toUpperCase()}
                        </div>
                    `}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">${birthday.name}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">${birthday.gender || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${formattedDate}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        ${age}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${daysClass}">${daysText}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex items-center gap-2">
                        <button onclick="shareBirthday(${birthday.id})" 
                            class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors" 
                            title="Share">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                            </svg>
                        </button>
                        <button onclick="openEditModal(${birthday.id})" 
                            class="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors" 
                            title="Edit">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="deleteBirthday(${birthday.id})" 
                            class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors" 
                            title="Delete">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function calculateAge(birthday) {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function getDaysUntilBirthday(birthdayDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisYear = new Date(today.getFullYear(), birthdayDate.getMonth(), birthdayDate.getDate());
    const nextYear = new Date(today.getFullYear() + 1, birthdayDate.getMonth(), birthdayDate.getDate());
    
    const target = thisYear >= today ? thisYear : nextYear;
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// ============================================================================
// I18N INTEGRATION
// ============================================================================
function initI18n() {
    if (typeof i18n !== 'undefined') {
        const savedLang = localStorage.getItem('i18n_lang') || 'en';
        i18n.setLang(savedLang);
        document.getElementById('lang-selector').value = savedLang;
    }
}

function updateUIWithTranslations() {
    if (typeof i18n === 'undefined') return;
    
    // Update all translatable elements
    const elements = {
        'appName': document.querySelector('h1'),
        'tagline': document.querySelector('nav p'),
        'todaysBirthdays': document.querySelector('h2'),
        // Add more as needed
    };
    
    // This will be called when language changes
}

// ============================================================================
// SEARCH FUNCTIONALITY (DEBOUNCED)
// ============================================================================
function handleSearchDebounced(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        handleSearch(e);
    }, 300); // 300ms debounce
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === '') {
        filteredBirthdays = [...allBirthdays];
    } else {
        filteredBirthdays = allBirthdays.filter(birthday => 
            normalizeName(birthday.name).toLowerCase().includes(normalizeName(query))
        );
    }
    
    currentPage = 1; // Reset to first page on search
    applyPagination(); // This handles sorting internally
    announceTableUpdate();
}

// ============================================================================
// NAME NORMALIZATION & DUPLICATE DETECTION
// ============================================================================
function normalizeName(name) {
    if (!name) return '';
    // Remove extra spaces, trim, and normalize unicode
    return name.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function checkDuplicate(name, excludeId = null) {
    const normalized = normalizeName(name).toLowerCase();
    return allBirthdays.some(bday => {
        if (excludeId && bday.id === excludeId) return false;
        return normalizeName(bday.name).toLowerCase() === normalized;
    });
}

// ============================================================================
// SHARE FUNCTIONALITY
// ============================================================================
function shareBirthday(id) {
    const birthday = allBirthdays.find(b => b.id === id);
    if (!birthday) {
        showToast('Birthday not found', 'error');
        return;
    }
    
    const birthdayDate = new Date(birthday.birthday);
    const formattedDate = birthdayDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const text = `${birthday.name}'s birthday is on ${formattedDate}! 🎉`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
    document.body.removeChild(textarea);
}

// ============================================================================
// MODAL FUNCTIONS
// ============================================================================
async function openEditModal(id) {
    const birthday = allBirthdays.find(b => b.id === id);
    if (!birthday) {
        showToast('Birthday not found', 'error');
        return;
    }
    
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = birthday.name;
    document.getElementById('edit-birthday').value = birthday.birthday;
    document.getElementById('edit-gender').value = birthday.gender || '';
    document.getElementById('edit-photo').value = '';
    
    const modal = document.getElementById('edit-modal');
    const dialog = document.getElementById('modal-dialog');
    modal.classList.remove('hidden');
    
    // Reset position
    dialog.style.left = '';
    dialog.style.top = '';
    dialog.style.margin = '';
    
    // Setup focus trap
    setupFocusTrap('edit-modal');
    
    // Animate in
    setTimeout(() => {
        dialog.style.opacity = '1';
        dialog.style.transform = 'scale(1)';
    }, 10);
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    const dialog = document.getElementById('modal-dialog');
    
    dialog.style.opacity = '0';
    dialog.style.transform = 'scale(0.95)';
    
    releaseFocusTrap();
    
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('edit-birthday-form').reset();
    }, 200);
}

// ============================================================================
// FORM HANDLERS
// ============================================================================
async function handleAddBirthday(e) {
    e.preventDefault();
    
    const name = normalizeName(document.getElementById('name').value);
    const birthday = document.getElementById('birthday').value;
    
    // Duplicate detection
    if (checkDuplicate(name)) {
        showToast(i18n?.t('duplicateFound') || 'A birthday with this name already exists', 'error');
        document.getElementById('name').focus();
        return;
    }
    
    // Validation
    if (!name || name.length < 2) {
        showToast(i18n?.t('nameRequired') || 'Name is required (min 2 characters)', 'error');
        return;
    }
    
    if (!birthday) {
        showToast(i18n?.t('birthdayRequired') || 'Birthday is required', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('birthday', birthday);
    formData.append('gender', document.getElementById('gender').value);
    
    const photoInput = document.getElementById('photo');
    if (photoInput.files[0]) {
        // Use processed photo (EXIF removed)
        const processedPhoto = await processImageForUpload(photoInput.files[0]);
        if (processedPhoto) {
            formData.append('photo', processedPhoto, photoInput.files[0].name);
        }
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/birthdays`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || i18n?.t('add') + ' successfully!', 'success');
            document.getElementById('add-birthday-form').reset();
            validateName(); // Reset validation
            fetchBirthdays();
        } else {
            showToast(result.error || 'Failed to add birthday', 'error');
        }
    } catch (error) {
        console.error('Error adding birthday:', error);
        showToast('Failed to add birthday', 'error');
    }
}

async function handleUpdateBirthday(e) {
    e.preventDefault();
    
    const id = document.getElementById('edit-id').value;
    const name = normalizeName(document.getElementById('edit-name').value);
    
    // Duplicate detection (exclude current)
    if (checkDuplicate(name, parseInt(id))) {
        showToast(i18n?.t('duplicateFound') || 'A birthday with this name already exists', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('birthday', document.getElementById('edit-birthday').value);
    formData.append('gender', document.getElementById('edit-gender').value);
    
    const photoInput = document.getElementById('edit-photo');
    if (photoInput.files[0]) {
        const processedPhoto = await processImageForUpload(photoInput.files[0]);
        if (processedPhoto) {
            formData.append('photo', processedPhoto, photoInput.files[0].name);
        }
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/birthdays/${id}`, {
            method: 'PUT',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'Birthday updated successfully!', 'success');
            closeEditModal();
            fetchBirthdays();
        } else {
            showToast(result.error || 'Failed to update birthday', 'error');
        }
    } catch (error) {
        console.error('Error updating birthday:', error);
        showToast('Failed to update birthday', 'error');
    }
}

async function deleteBirthday(id) {
    if (!confirm('Are you sure you want to delete this birthday?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/birthdays/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'Birthday deleted successfully!', 'success');
            fetchBirthdays();
        } else {
            showToast(result.error || 'Failed to delete birthday', 'error');
        }
    } catch (error) {
        console.error('Error deleting birthday:', error);
        showToast('Failed to delete birthday', 'error');
    }
}

// ============================================================================
// CONFIG & SMTP FUNCTIONS
// ============================================================================
async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE}/api/config`);
        if (!response.ok) return;
        
        const config = await response.json();
        if (config.smtpServer) document.getElementById('smtp-server').value = config.smtpServer;
        if (config.smtpPort) document.getElementById('smtp-port').value = config.smtpPort;
        if (config.smtpEmail) document.getElementById('smtp-email').value = config.smtpEmail;
        if (config.recipientEmail) document.getElementById('recipient-email').value = config.recipientEmail;
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

async function handleSaveSMTP(e) {
    e.preventDefault();
    
    const config = {
        smtpServer: document.getElementById('smtp-server').value,
        smtpPort: parseInt(document.getElementById('smtp-port').value),
        smtpEmail: document.getElementById('smtp-email').value,
        smtpPassword: document.getElementById('smtp-password').value,
        recipientEmail: document.getElementById('recipient-email').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'SMTP settings saved successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to save SMTP settings', 'error');
        }
    } catch (error) {
        console.error('Error saving SMTP settings:', error);
        showToast('Failed to save SMTP settings', 'error');
    }
}

async function handleResetConfig() {
    if (!confirm('Are you sure you want to reset the configuration?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/config/reset`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'Configuration reset successfully!', 'success');
            document.getElementById('smtp-form').reset();
        } else {
            showToast(result.error || 'Failed to reset configuration', 'error');
        }
    } catch (error) {
        console.error('Error resetting config:', error);
        showToast('Failed to reset configuration', 'error');
    }
}

async function handleTestSMTP() {
    try {
        const response = await fetch(`${API_BASE}/api/test-email`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'Test email sent successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to send test email', 'error');
        }
    } catch (error) {
        console.error('Error testing SMTP:', error);
        showToast('Failed to send test email', 'error');
    }
}

async function handleTestReminder() {
    try {
        const response = await fetch(`${API_BASE}/api/test-reminder`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'Test reminder sent successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to send test reminder', 'error');
        }
    } catch (error) {
        console.error('Error testing reminder:', error);
        showToast('Failed to send test reminder', 'error');
    }
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================
// ============================================================================
// IMAGE PROCESSING (EXIF REMOVAL)
// ============================================================================
async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Process image to remove EXIF data
    const processed = await processImageForUpload(file);
    if (processed) {
        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            // Could show preview here if needed
        };
        reader.readAsDataURL(processed);
    }
}

async function processImageForUpload(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas to strip EXIF
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Convert to blob (EXIF data is removed)
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, file.type || 'image/jpeg', 0.92);
            };
            img.onerror = () => resolve(file); // Fallback to original
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file); // Fallback to original
        reader.readAsDataURL(file);
    });
}

// ============================================================================
// EXPORT FUNCTIONS (ZIP, CSV, ICS)
// ============================================================================
async function handleExport(format = 'zip') {
    try {
        let endpoint = '/api/export';
        let defaultFilename = 'birthdays_export.zip';
        let mimetype = 'application/zip';
        
        if (format === 'csv') {
            endpoint = '/api/export/csv';
            defaultFilename = 'birthdays_export.csv';
            mimetype = 'text/csv';
        } else if (format === 'ics') {
            endpoint = '/api/export/ics';
            defaultFilename = 'birthdays_export.ics';
            mimetype = 'text/calendar';
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`);
        
        if (!response.ok) {
            const error = await response.json();
            showToast(error.error || 'Failed to export birthdays', 'error');
            return;
        }
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = defaultFilename;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast(i18n?.t('exportSuccess') || 'Birthdays exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting birthdays:', error);
        showToast('Failed to export birthdays', 'error');
    }
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) {
        return;
    }
    
    const isZip = file.name.endsWith('.zip');
    const isCsv = file.name.endsWith('.csv');
    
    if (!isZip && !isCsv) {
        showToast('Please select a ZIP or CSV file', 'error');
        e.target.value = '';
        return;
    }
    
    if (isCsv) {
        // Handle CSV import via preview
        handleCSVPreviewWithFile(file);
        e.target.value = '';
        return;
    }
    
    // ZIP import
    if (!confirm('This will import birthdays from the ZIP file. Continue?')) {
        e.target.value = '';
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('replace', document.getElementById('replace-existing').checked);
        
        const response = await fetch(`${API_BASE}/api/import`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            let message = result.message || i18n?.t('importSuccess') || 'Import completed successfully!';
            if (result.errors && result.errors.length > 0) {
                message += ` (${result.errors.length} ${i18n?.t('importErrors') || 'errors'})`;
            }
            showToast(message, 'success');
            fetchBirthdays();
        } else {
            showToast(result.error || 'Failed to import birthdays', 'error');
        }
    } catch (error) {
        console.error('Error importing birthdays:', error);
        showToast('Failed to import birthdays', 'error');
    } finally {
        e.target.value = '';
    }
}

// ============================================================================
// CSV IMPORT WITH PREVIEW
// ============================================================================
async function handleCSVPreview() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        if (e.target.files[0]) {
            handleCSVPreviewWithFile(e.target.files[0]);
        }
    };
    input.click();
}

async function handleCSVPreviewWithFile(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE}/api/import/csv/preview`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayCSVPreview(result, file);
        } else {
            showToast(result.error || 'Failed to preview CSV', 'error');
        }
    } catch (error) {
        console.error('Error previewing CSV:', error);
        showToast('Failed to preview CSV', 'error');
    }
}

function displayCSVPreview(data, file) {
    const modal = document.getElementById('csv-preview-modal');
    const content = document.getElementById('csv-preview-content');
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-4 gap-4">
                <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${data.preview.total}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total</div>
                </div>
                <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">${data.preview.new}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">New</div>
                </div>
                <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${data.preview.duplicates}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Duplicates</div>
                </div>
                <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-red-600 dark:text-red-400">${data.preview.invalid}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Invalid</div>
                </div>
            </div>
            
            ${data.new_entries.length > 0 ? `
                <div>
                    <h4 class="font-semibold mb-2">New Entries (sample):</h4>
                    <div class="space-y-1 text-sm">
                        ${data.new_entries.map(e => `<div>${e.name} - ${e.birthday}</div>`).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${data.duplicates.length > 0 ? `
                <div>
                    <h4 class="font-semibold mb-2 text-yellow-600">Duplicates (will be skipped):</h4>
                    <div class="space-y-1 text-sm">
                        ${data.duplicates.map(e => `<div>${e.name} - ${e.birthday}</div>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.remove('hidden');
    setupFocusTrap('csv-preview-modal');
    
    // Store file for import
    window.pendingCSVFile = file;
}

async function handleCSVImport() {
    if (!window.pendingCSVFile) return;
    
    try {
        const formData = new FormData();
        formData.append('file', window.pendingCSVFile);
        formData.append('replace', document.getElementById('replace-existing').checked);
        
        const response = await fetch(`${API_BASE}/api/import/csv`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'Import completed successfully!', 'success');
            document.getElementById('csv-preview-modal').classList.add('hidden');
            releaseFocusTrap();
            fetchBirthdays();
        } else {
            showToast(result.error || 'Failed to import CSV', 'error');
        }
    } catch (error) {
        console.error('Error importing CSV:', error);
        showToast('Failed to import CSV', 'error');
    } finally {
        window.pendingCSVFile = null;
    }
}

// ============================================================================
// 30-DAY UPCOMING VIEW
// ============================================================================
async function render30DayView() {
    try {
        const response = await fetch(`${API_BASE}/api/birthdays/upcoming30`);
        if (!response.ok) throw new Error('Failed to fetch 30-day view');
        
        const grouped = await response.json();
        const container = document.getElementById('upcoming30-content');
        if (!container) return;
        
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const weekdayNames = weekdays.map(d => i18n?.t(d.toLowerCase()) || d);
        
        container.innerHTML = weekdays.map((weekday, idx) => {
            const birthdays = grouped[weekday] || [];
            if (birthdays.length === 0) return '';
            
            return `
                <div class="border-l-4 border-pink-500 pl-4">
                    <h3 class="font-bold text-lg text-gray-800 dark:text-white mb-3">
                        ${weekdayNames[idx]} (${birthdays.length})
                    </h3>
                    <div class="space-y-2">
                        ${birthdays.map(bday => {
                            const daysText = bday.days_until === 0 ? i18n?.t('today') || 'Today!' :
                                          bday.days_until === 1 ? i18n?.t('tomorrow') || 'Tomorrow' :
                                          `${bday.days_until} ${i18n?.t('days') || 'days'}`;
                            return `
                                <div class="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                                    ${bday.photo ? `
                                        <img src="${bday.photo}" alt="${bday.name}" 
                                             class="w-10 h-10 object-cover rounded-full" loading="lazy">
                                    ` : `
                                        <div class="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            ${bday.name.charAt(0).toUpperCase()}
                                        </div>
                                    `}
                                    <div class="flex-1">
                                        <div class="font-semibold text-gray-800 dark:text-white">${bday.name}</div>
                                        <div class="text-sm text-gray-500 dark:text-gray-400">${bday.target_date} - ${daysText}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).filter(html => html).join('');
        
        // Show the view
        const view30 = document.getElementById('view-30days');
        if (view30 && container.innerHTML.trim()) {
            view30.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error rendering 30-day view:', error);
    }
}

// ============================================================================
// DAILY DIGEST
// ============================================================================
async function handlePreviewDigest() {
    try {
        const days = parseInt(document.getElementById('digest-days').value) || 7;
        const response = await fetch(`${API_BASE}/api/digest/preview?days=${days}`);
        
        if (!response.ok) {
            const error = await response.json();
            showToast(error.error || 'Failed to preview digest', 'error');
            return;
        }
        
        const data = await response.json();
        const preview = document.getElementById('digest-preview');
        
        if (data.count === 0) {
            preview.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${i18n?.t('noBirthdaysInDigest') || 'No birthdays in the selected period'}</p>`;
            preview.classList.remove('hidden');
            return;
        }
        
        preview.innerHTML = `
            <h4 class="font-semibold mb-3">Preview (${data.count} birthdays):</h4>
            <ul class="space-y-2">
                ${data.upcoming.map(bday => {
                    const daysText = bday.days_until === 0 ? i18n?.t('today') || 'Today!' :
                                   bday.days_until === 1 ? i18n?.t('tomorrow') || 'Tomorrow' :
                                   `${bday.days_until} ${i18n?.t('days') || 'days'}`;
                    return `<li class="text-sm">${bday.name} - ${bday.target_date} (${daysText})</li>`;
                }).join('')}
            </ul>
        `;
        preview.classList.remove('hidden');
    } catch (error) {
        console.error('Error previewing digest:', error);
        showToast('Failed to preview digest', 'error');
    }
}

async function handleSendDigest() {
    try {
        const days = parseInt(document.getElementById('digest-days').value) || 7;
        const response = await fetch(`${API_BASE}/api/digest/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'Digest sent successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to send digest', 'error');
        }
    } catch (error) {
        console.error('Error sending digest:', error);
        showToast('Failed to send digest', 'error');
    }
}
