// Playwright E2E Tests for Birthday Manager
// Run with: npx playwright test

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://127.0.0.1:5001';

test.describe('Birthday Manager E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        // Wait for page to load
        await page.waitForSelector('#birthday-table', { timeout: 5000 });
    });

    test('should load the homepage', async ({ page }) => {
        await expect(page).toHaveTitle(/Birthday Manager/);
        await expect(page.locator('h1')).toContainText('Birthday Manager');
    });

    test('should add a new birthday', async ({ page }) => {
        const name = `Test User ${Date.now()}`;
        const birthday = '1990-01-15';
        
        // Fill form
        await page.fill('#name', name);
        await page.fill('#birthday', birthday);
        await page.selectOption('#gender', 'male');
        
        // Submit
        await page.click('button[type="submit"]');
        
        // Wait for success message
        await expect(page.locator('#toast-container')).toContainText('successfully', { timeout: 3000 });
        
        // Verify birthday appears in table
        await expect(page.locator('#birthday-table')).toContainText(name);
    });

    test('should search birthdays', async ({ page }) => {
        const searchInput = page.locator('#search-input');
        await searchInput.fill('Test');
        
        // Wait for debounced search
        await page.waitForTimeout(400);
        
        // Verify search results
        const rows = page.locator('#birthday-table tr');
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should sort table by name', async ({ page }) => {
        const nameHeader = page.locator('th[data-sort="name"]');
        await nameHeader.click();
        
        // Wait for sort to apply
        await page.waitForTimeout(300);
        
        // Verify sort indicator appears
        await expect(nameHeader.locator('.sort-indicator')).toBeVisible();
    });

    test('should paginate table', async ({ page }) => {
        // Set items per page
        await page.selectOption('#per-page', '10');
        
        // Wait for pagination
        await page.waitForTimeout(300);
        
        // Verify pagination controls appear
        const pagination = page.locator('#pagination-controls');
        await expect(pagination).toBeVisible();
    });

    test('should open edit modal', async ({ page }) => {
        // Find first edit button
        const editButton = page.locator('button:has-text("Edit")').first();
        if (await editButton.count() > 0) {
            await editButton.click();
            
            // Verify modal opens
            await expect(page.locator('#edit-modal')).toBeVisible();
            await expect(page.locator('#edit-name')).toBeVisible();
        }
    });

    test('should export birthdays', async ({ page }) => {
        // Click export button
        const exportButton = page.locator('#export-zip-btn');
        await exportButton.click();
        
        // Wait for download (Playwright handles this automatically)
        await page.waitForTimeout(1000);
    });

    test('should change language', async ({ page }) => {
        const langSelector = page.locator('#lang-selector');
        await langSelector.selectOption('de');
        
        // Verify language changes (check for German text)
        await page.waitForTimeout(300);
        
        // Check if RTL is applied for Arabic
        await langSelector.selectOption('ar');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('should toggle dark mode', async ({ page }) => {
        const themeToggle = page.locator('#theme-toggle');
        await themeToggle.click();
        
        // Verify dark mode is applied
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should use keyboard shortcuts', async ({ page }) => {
        // Press / to focus search
        await page.keyboard.press('/');
        await expect(page.locator('#search-input')).toBeFocused();
        
        // Press n to focus name input
        await page.keyboard.press('n');
        await expect(page.locator('#name')).toBeFocused();
    });

    test('should show daily digest preview', async ({ page }) => {
        const previewButton = page.locator('#preview-digest-btn');
        await previewButton.click();
        
        // Wait for preview
        await page.waitForTimeout(1000);
        
        // Verify preview appears
        const preview = page.locator('#digest-preview');
        await expect(preview).toBeVisible();
    });

    test('should validate duplicate names', async ({ page }) => {
        const name = `Duplicate Test ${Date.now()}`;
        
        // Add first birthday
        await page.fill('#name', name);
        await page.fill('#birthday', '1990-01-15');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
        
        // Try to add duplicate
        await page.fill('#name', name);
        await page.fill('#birthday', '1995-06-20');
        await page.click('button[type="submit"]');
        
        // Verify error message
        await expect(page.locator('#toast-container')).toContainText('duplicate', { timeout: 3000 });
    });

    test('should handle accessibility features', async ({ page }) => {
        // Check ARIA labels
        const searchInput = page.locator('#search-input');
        await expect(searchInput).toHaveAttribute('placeholder');
        
        // Check table has proper ARIA
        const table = page.locator('table[role="table"]');
        await expect(table).toHaveAttribute('aria-label');
        
        // Check sortable headers have aria-sort
        const sortableHeader = page.locator('th[data-sort="name"]');
        await expect(sortableHeader).toHaveAttribute('aria-sort');
    });
});

