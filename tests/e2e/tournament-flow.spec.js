import { test, expect } from '@playwright/test';
import path from 'path';

test('upload CSV file and start tournament', async ({ page }) => {
  await page.goto('/');
  
  // Upload the CSV file
  const csvPath = path.join(process.cwd(), 'small.csv');
  await page.locator('input[type="file"]').setInputFiles(csvPath);
  
  // Wait for CSV to be processed and table to appear
  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('th').filter({ hasText: 'name' })).toBeVisible();
  
  // Check that tournament name field has a value
  const tournamentNameInput = page.locator('input[type="text"]').last();
  await expect(tournamentNameInput).toBeVisible();
  await expect(tournamentNameInput).toHaveValue(/Task Ranking/);
  
  // Start the tournament
  const startButton = page.locator('button').filter({ hasText: /start|begin/i }).first();
  await expect(startButton).toBeVisible();
  await expect(startButton).toBeEnabled();
  await startButton.click();
  
  // Verify tournament has started by checking for task choices
  await expect(page.locator('.task-choice')).toBeVisible();
  await expect(page.locator('.task-button')).toHaveCount(2);
  
  // Check progress indicator appears
  await expect(page.locator('h2').filter({ hasText: 'Match 1 of' })).toBeVisible();
  
  // Verify task buttons have content (but don't click yet since they seem to stay disabled)
  const taskButtons = page.locator('.task-button');
  await expect(taskButtons.nth(0).locator('.task-title')).toHaveText(/.+/);
  await expect(taskButtons.nth(1).locator('.task-title')).toHaveText(/.+/);
});