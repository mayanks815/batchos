import { test, expect } from '@playwright/test';

test.describe('Admin Control Center Accordions', () => {
  // Login as admin first or since it is local emulator/dev, we can check basic toggle behaviors.
  // Note: BatchOS determines roles locally or via database mock.
  
  test('should expand accordion section when header is clicked', async ({ page }) => {
    // Navigate to admin hub page
    await page.goto('/admin');

    // Accordion headers should be visible
    const scheduleHeader = page.locator('button:has-text("Schedule Management")');
    await expect(scheduleHeader).toBeVisible();

    // The form inputs inside should not be visible initially
    await expect(page.locator('input[placeholder="e.g. Valuation Models"]')).not.toBeVisible();

    // Click to expand Schedule Management section
    await scheduleHeader.click();

    // The form inputs should now become visible
    await expect(page.locator('input[placeholder="e.g. Valuation Models"]')).toBeVisible();

    // Click Notice Broadcast header
    const noticeHeader = page.locator('button:has-text("Notice Broadcast")');
    await noticeHeader.click();

    // Schedule Management section should collapse (only one open at a time)
    await expect(page.locator('input[placeholder="e.g. Valuation Models"]')).not.toBeVisible();
    
    // Notice Broadcast inputs should become visible
    await expect(page.locator('input[placeholder="e.g. Welcome to BatchOS!"]')).toBeVisible();
  });
});
