import { test, expect } from '@playwright/test';
import path from 'path';

test('upload CSV file and start tournament', async ({ page }) => {
  await page.goto('/');
  
  // Upload the CSV file
  const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
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
  
  // Check progress indicator appears (might not be Match 1 if byes were skipped)
  await expect(page.locator('h2').filter({ hasText: 'Match' })).toBeVisible();
  
  // Verify task buttons have content and no "bye" is shown
  const taskButtons = page.locator('.task-button');
  await expect(taskButtons.nth(0).locator('.task-title')).toHaveText(/.+/);
  await expect(taskButtons.nth(1).locator('.task-title')).toHaveText(/.+/);
  
  // Ensure no "bye" text appears anywhere on the page
  await expect(page.locator('text=bye')).toHaveCount(0);
  
  // Verify that the first user-visible match is numbered as "Match 1"
  await expect(page.locator('text=Total match 1 of')).toBeVisible();
  
  // Make first choice by selecting alphabetically earlier option
  const button1Text = await taskButtons.nth(0).locator('.task-title').textContent();
  const button2Text = await taskButtons.nth(1).locator('.task-title').textContent();
  
  // Select the alphabetically earlier one
  if (button1Text.localeCompare(button2Text) <= 0) {
    await taskButtons.nth(0).click();
  } else {
    await taskButtons.nth(1).click();
  }
  
  // Verify we moved to the next match (should be Match 2 of 3 in Round 1)
  await expect(page.locator('text=Match 2 of 3')).toBeVisible();
  
  // Complete the rest of Round 1 (2 more matches)
  for (let i = 0; i < 2; i++) {
    const currentTaskButtons = page.locator('.task-button');
    const btn1Text = await currentTaskButtons.nth(0).locator('.task-title').textContent();
    const btn2Text = await currentTaskButtons.nth(1).locator('.task-title').textContent();
    
    // Select the alphabetically earlier one
    if (btn1Text.localeCompare(btn2Text) <= 0) {
      await currentTaskButtons.nth(0).click();
    } else {
      await currentTaskButtons.nth(1).click();
    }
    
    // Wait for UI to update
    await expect(page.locator('h2').filter({ hasText: 'Match' })).toBeVisible();
  }
  
  // Should now be in Round 2
  await expect(page.locator('text=Round 2 of 3')).toBeVisible();
  await expect(page.locator('text=Match 1 of 2')).toBeVisible();
  
  // Complete Round 2 (2 matches)
  for (let i = 0; i < 2; i++) {
    const currentTaskButtons = page.locator('.task-button');
    const btn1Text = await currentTaskButtons.nth(0).locator('.task-title').textContent();
    const btn2Text = await currentTaskButtons.nth(1).locator('.task-title').textContent();
    
    // Select the alphabetically earlier one
    if (btn1Text.localeCompare(btn2Text) <= 0) {
      await currentTaskButtons.nth(0).click();
    } else {
      await currentTaskButtons.nth(1).click();
    }
    
    // Wait for UI to update
    await expect(page.locator('h2').filter({ hasText: 'Match' })).toBeVisible();
  }
  
  // Should now be in Round 3 (final)
  await expect(page.locator('text=Round 3 of 3')).toBeVisible();
  await expect(page.locator('text=Match 1 of 1')).toBeVisible();
  
  // Complete the final match
  const finalTaskButtons = page.locator('.task-button');
  const finalBtn1Text = await finalTaskButtons.nth(0).locator('.task-title').textContent();
  const finalBtn2Text = await finalTaskButtons.nth(1).locator('.task-title').textContent();
  
  // Select the alphabetically earlier one for the winner
  if (finalBtn1Text.localeCompare(finalBtn2Text) <= 0) {
    await finalTaskButtons.nth(0).click();
  } else {
    await finalTaskButtons.nth(1).click();
  }
  
  // Verify tournament is complete
  await expect(page.locator('text=Your Task Rankings')).toBeVisible();
  
  // Check that final rankings are displayed (should have 7 rows for 7 tasks)
  await expect(page.locator('tbody tr')).toHaveCount(7);
  
  // Verify the winner is in first place (alphabetically earliest should win with our selection strategy)
  const firstPlaceText = await page.locator('tbody tr').first().textContent();
  expect(firstPlaceText).toContain('Add auth'); // Winner should be Add auth
  expect(firstPlaceText).toContain('1'); // Should show rank 1
  
  // Verify export button is available and works
  const exportButton = page.locator('button').filter({ hasText: /export|download/i });
  await expect(exportButton).toBeVisible();
  
  // Test export functionality (should trigger download)
  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  
  // Verify download filename contains expected pattern
  expect(download.suggestedFilename()).toMatch(/rankings\.csv$/);
  
  // Verify general ranking structure
  
  // Verify all 7 tasks are ranked
  await expect(page.locator('tbody tr')).toHaveCount(7);
  
  // Verify all rank numbers 1-7 are present
  for (let i = 1; i <= 7; i++) {
    await expect(page.locator(`tbody tr:has-text("${i}")`)).toHaveCount(1);
  }
  
  // Test match history functionality
  // Click on the winner's history button
  const winnerRow = page.locator('tbody tr').first();
  const historyButton = winnerRow.locator('button.history-button');
  await expect(historyButton).toBeVisible();
  await historyButton.click();
  
  // Verify match history section appears (for whatever task won)
  await expect(page.locator('text=Match History:')).toBeVisible();
  
  // Verify history shows matches (winner should have won all their matches)
  await expect(page.locator('text=🏆 WON')).toHaveCount(3); // Should have 3 wins (rounds 1, 2, 3)
  
  // Close history
  await page.locator('button:has-text("✕ Close")').click();
  await expect(page.locator('text=Match History:')).toHaveCount(0);
  
  // Test a task that lost - check last place
  const lastRow = page.locator('tbody tr').last();
  const lastHistoryButton = lastRow.locator('button.history-button');
  await lastHistoryButton.click();
  
  // Verify it shows match history for last place task
  await expect(page.locator('text=Match History:')).toBeVisible();
  await expect(page.locator('text=❌ LOST')).toHaveCount(1); // Should have 1 loss
});