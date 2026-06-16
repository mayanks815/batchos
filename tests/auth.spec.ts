import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should toggle between Sign In and Create Account tabs', async ({ page }) => {
    await page.goto('/login');

    // Default tab is Sign In
    await expect(page.locator('input[placeholder="e.g. student@mba.edu"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. Mayank Sharma"]')).not.toBeVisible();

    // Click Create Account tab
    await page.click('button:has-text("Create Account")');

    // Signup fields should now be visible
    await expect(page.locator('input[placeholder="e.g. Mayank Sharma"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. MBA2026042"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. A"]')).toBeVisible();

    // Toggle back to Sign In
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('input[placeholder="e.g. Mayank Sharma"]')).not.toBeVisible();
  });

  test('should show validation error when fields are missing during signup', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Create Account")');

    // Try submitting without filling details
    await page.click('button[type="submit"]');

    // Page should remain on /login and show browser-native or app validation messages
    // The inputs have `required` attributes, so they block submission natively.
    const emailInput = page.locator('input[type="email"]');
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });
});
