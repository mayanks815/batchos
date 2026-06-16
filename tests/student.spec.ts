import { test, expect } from '@playwright/test';

test.describe('Student Dashboard and Attendance Views', () => {
  test('should display dashboard stats cards and headers', async ({ page }) => {
    // Navigate to student dashboard page
    await page.goto('/dashboard');

    // Title should contain Dashboard
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Overall Attendance stats card should be visible
    await expect(page.locator('text=OVERALL ATTENDANCE')).toBeVisible();

    // Attendance Alerts widget should be visible
    await expect(page.locator('h3:has-text("Attendance Alerts")')).toBeVisible();
  });

  test('should navigate to attendance page and display track controls', async ({ page }) => {
    await page.goto('/attendance');

    // Header title check
    await expect(page.locator('h2:has-text("My Attendance")')).toBeVisible();

    // Verify Add Subject action button exists
    await expect(page.locator('button:has-text("Add Subject")')).toBeVisible();

    // Academic Regulations disclaimer should be visible
    await expect(page.locator('h4:has-text("Academic Attendance Regulations")')).toBeVisible();
  });
});
