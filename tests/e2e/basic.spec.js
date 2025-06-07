import { test, expect } from '@playwright/test';

test('app loads successfully', async ({ page }) => {
  await page.goto('/');
  
  // Check that the main heading is present
  await expect(page.locator('h1')).toContainText('Task Bracketology Ranking Tool');
  
  // Check that the load tasks section is visible
  await expect(page.locator('h2')).toContainText('Start New Bracket');
  
  // Check that file input exists (may be hidden by CSS)
  await expect(page.locator('input[type="file"]')).toHaveCount(1);
});

test('page title is correct', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Vite + Vue');
});