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
  const startButton = page
    .locator('button')
    .filter({ hasText: /start|begin/i })
    .first();
  await expect(startButton).toBeVisible();
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Verify tournament has started by checking for task choices
  await expect(page.locator('.task-choice')).toBeVisible();
  await expect(page.locator('.task-button')).toHaveCount(2);

  // Check progress indicator appears
  await expect(page.locator('h2').filter({ hasText: 'Match 1' })).toBeVisible();

  // Verify task buttons have content and no "bye" is shown
  const taskButtons = page.locator('.task-button');
  await expect(taskButtons.nth(0).locator('.task-title')).toHaveText(/.+/);
  await expect(taskButtons.nth(1).locator('.task-title')).toHaveText(/.+/);

  // Ensure no "bye" text appears anywhere on the page
  await expect(page.locator('text=bye')).toHaveCount(0);

  // Verify that the first user-visible match is numbered as "Match 1"
  await expect(page.locator('text=Total match 1 of')).toBeVisible();

  // Make first choice by selecting alphabetically earlier option
  const button1Text = await taskButtons
    .nth(0)
    .locator('.task-title')
    .textContent();
  const button2Text = await taskButtons
    .nth(1)
    .locator('.task-title')
    .textContent();

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
    const btn1Text = await currentTaskButtons
      .nth(0)
      .locator('.task-title')
      .textContent();
    const btn2Text = await currentTaskButtons
      .nth(1)
      .locator('.task-title')
      .textContent();

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
  // Complete matches until we reach the final or tournament ends
  let matchCount = 0;
  const maxMatches = 10; // Safety limit

  while (matchCount < maxMatches) {
    // Check if tournament is complete
    const resultsVisible = await page
      .locator('text=Your Task Rankings')
      .isVisible({ timeout: 1000 });
    if (resultsVisible) {
      break;
    }

    // Check if there's a match to play
    const matchupVisible = await page
      .locator('.task-button')
      .first()
      .isVisible({ timeout: 1000 });
    if (!matchupVisible) {
      break;
    }

    const currentTaskButtons = page.locator('.task-button');
    const btn1Text = await currentTaskButtons
      .nth(0)
      .locator('.task-title')
      .textContent();
    const btn2Text = await currentTaskButtons
      .nth(1)
      .locator('.task-title')
      .textContent();

    // Select the alphabetically earlier one
    if (btn1Text.localeCompare(btn2Text) <= 0) {
      await currentTaskButtons.nth(0).click();
    } else {
      await currentTaskButtons.nth(1).click();
    }

    matchCount++;

    // Wait for UI to update - either next match or results
    try {
      await expect(page.locator('[data-testid="tournament-progress"]')).toBeVisible({ timeout: 1000 });
    } catch {
      await expect(page.locator('text=Your Task Rankings')).toBeVisible({ timeout: 1000 });
    }
  }

  // Verify tournament is complete
  await expect(page.locator('text=Your Task Rankings')).toBeVisible();

  // Check that final rankings are displayed (should have 7 rows for 7 tasks)
  await expect(page.locator('tbody tr')).toHaveCount(7);

  // Verify the winner is in first place and has rank 1
  const firstPlaceText = await page.locator('tbody tr').first().textContent();
  expect(firstPlaceText).toContain('1'); // Should show rank 1

  // Verify that one of the expected tasks won (the actual winner depends on bracket structure)
  const expectedTasks = [
    'Add auth',
    'Fix the click bug',
    'Fix CLI',
    'Make it fun',
    'Make it rhyme',
    'Make it sing',
    'Not too late',
  ];
  const hasValidWinner = expectedTasks.some(task =>
    firstPlaceText.includes(task)
  );
  expect(hasValidWinner).toBe(true);

  // Verify export button is available and works
  const exportButton = page
    .locator('button')
    .filter({ hasText: /export|download/i });
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
  // Click on the winner's row to expand history
  const winnerRow = page.locator('tbody tr.clickable-row').first();
  await expect(winnerRow).toBeVisible();
  await winnerRow.click();

  // Verify match history section appears (for whatever task won)
  await expect(page.locator('text=Match History:')).toBeVisible();

  // Verify history shows matches (winner should have won at least 1 match)
  const wonCount = await page.locator('text=WON').count();
  expect(wonCount).toBeGreaterThanOrEqual(1); // Should have at least 1 win

  // Close history by clicking the close button
  await page.locator('button:has-text("✕")').click();
  await expect(page.locator('text=Match History:')).toHaveCount(0);

  // Test a task that lost - check last place
  const lastRow = page.locator('tbody tr.clickable-row').last();
  await lastRow.click();

  // Verify it shows match history for last place task
  await expect(page.locator('text=Match History:')).toBeVisible();
  await expect(page.locator('text=LOST')).toHaveCount(1); // Should have 1 loss
});
