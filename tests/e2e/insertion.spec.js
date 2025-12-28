import { test, expect } from '@playwright/test';
import path from 'path';

// Helper function to click an insertion position button
async function clickInsertionButton(page) {
  // Click one of the position buttons (Above, Between, or Below)
  const aboveButton = page.locator('button:has-text("Above")');
  const betweenButton = page.locator('button:has-text("Between")');
  const belowButton = page.locator('button:has-text("Below")');

  // Try to click whichever button is available
  if (await aboveButton.isVisible({ timeout: 500 })) {
    await aboveButton.click();
  } else if (await betweenButton.isVisible({ timeout: 500 })) {
    await betweenButton.click();
  } else if (await belowButton.isVisible({ timeout: 500 })) {
    await belowButton.click();
  }
}

test.describe('Insertion Tournament', () => {
  test('should complete full Insertion tournament successfully', async ({
    page,
  }) => {
    await page.goto('/');

    // Upload test CSV file
    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    // Wait for CSV to be loaded
    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select Insertion tournament type
    await page.locator('.option:has-text("Interactive Insertion")').click();

    // Verify Insertion is selected with correct match count
    const matchCountText = await page
      .locator('text=/\\d+ choices • Most intuitive/')
      .textContent();
    expect(matchCountText).toMatch(/\d+ choices/);

    // Verify description mentions choosing above/between/below
    await expect(
      page.locator('text=Choose Above, Between, or Below')
    ).toBeVisible();

    // Set tournament name
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Insertion Test');

    // Start tournament
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Verify we're in tournament phase
    await expect(
      page.locator('[data-testid="tournament-progress"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="insertion-matchup"]')).toBeVisible();

    // Verify Insertion progress indicator format
    // Insertion tournament shows "Step X of ~Y, Task Z of N - Tournament Name"
    await expect(
      page.locator('h2').filter({ hasText: /Task \d+ of \d+/ })
    ).toBeVisible();

    // Complete entire tournament by always choosing first option (deterministic)
    let maxMatches = 50; // Insertion can have multiple comparisons per task
    let matchesCompleted = 0;

    for (let i = 0; i < maxMatches; i++) {
      // Check if tournament is complete
      const resultsVisible = await page
        .locator('text=Your Task Rankings')
        .isVisible({ timeout: 1000 });
      if (resultsVisible) {
        break;
      }

      // Complete next match if available
      const matchupVisible = await page
        .locator('[data-testid="insertion-matchup"]')
        .isVisible({ timeout: 1000 });
      if (matchupVisible) {
        await clickInsertionButton(page);
        matchesCompleted++;

        // Wait for UI to update - either next match or results
        try {
          await expect(page.locator('[data-testid="tournament-progress"]')).toBeVisible({ timeout: 1000 });
        } catch {
          await expect(page.locator('text=Your Task Rankings')).toBeVisible({ timeout: 1000 });
        }
      } else {
        // No more matches available
        break;
      }
    }

    // Tournament should be complete
    await expect(page.locator('text=Your Task Rankings')).toBeVisible();
    await expect(page.locator('text=Insertion Test')).toBeVisible();

    // Verify ranking table exists with all participants (complete ranking)
    await expect(page.locator('.results-table')).toBeVisible();
    await expect(page.locator('.results-table tbody tr')).toHaveCount(7);

    // Verify we completed a reasonable number of matches
    // Insertion sort should require roughly n log n comparisons
    expect(matchesCompleted).toBeGreaterThan(3);
    expect(matchesCompleted).toBeLessThan(30);

    // Verify all rank numbers 1-7 are present (complete ranking)
    for (let i = 1; i <= 7; i++) {
      await expect(page.locator(`tbody tr:has-text("${i}")`)).toHaveCount(1);
    }
  });

  test('should handle Insertion with demo data (15 tasks)', async ({
    page,
  }) => {
    await page.goto('/');

    // Use demo data button
    await page.locator('button:has-text("Try with Demo Data")').click();

    // Wait for demo data to load
    await expect(
      page.locator('text=Data Preview (15 tasks loaded)')
    ).toBeVisible();

    // Select Insertion tournament type
    await page.locator('.option:has-text("Interactive Insertion")').click();

    // Verify match count shows expected number for 15 tasks
    const totalMatchesElement = await page
      .locator('text=Total matches needed:')
      .locator('..');
    const matchCountText = await totalMatchesElement.textContent();
    const totalMatches = parseInt(matchCountText.split(':')[1].trim());
    expect(totalMatches).toBeGreaterThan(10); // Should be reasonable for 15 tasks
    expect(totalMatches).toBeLessThan(100); // Upper bound for binary insertion

    // Start tournament
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Verify tournament starts
    await expect(page.locator('[data-testid="insertion-matchup"]')).toBeVisible();

    // Complete a few matches to verify Insertion functionality
    for (let i = 0; i < 5; i++) {
      const resultsVisible = await page
        .locator('text=Your Task Rankings')
        .isVisible({ timeout: 1000 });
      if (resultsVisible) {
        break;
      }

      const matchupVisible = await page
        .locator('[data-testid="insertion-matchup"]')
        .isVisible({ timeout: 1000 });
      if (matchupVisible) {
        // Use keyboard navigation (arrow keys) to test that functionality
        if (i % 2 === 0) {
          await page.keyboard.press('ArrowLeft');
        } else {
          await page.keyboard.press('ArrowRight');
        }
      } else {
        break;
      }
    }

    // Tournament should still be progressing (15 tasks requires many matches)
    const stillInProgress = await page
      .locator('[data-testid="insertion-matchup"]')
      .isVisible({ timeout: 1000 });

    if (!stillInProgress) {
      // If tournament completed, verify results
      await expect(page.locator('text=Your Task Rankings')).toBeVisible();
      await expect(page.locator('.results-table tbody tr')).toHaveCount(15);
    }
  });

  test('should show correct Insertion tournament progress', async ({
    page,
  }) => {
    await page.goto('/');

    // Upload test CSV file
    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select Insertion
    await page.locator('.option:has-text("Interactive Insertion")').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Insertion Progress Test');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Verify tournament starts successfully
    await expect(
      page.locator('[data-testid="tournament-progress"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="insertion-matchup"]')).toBeVisible();

    // Verify we see "Task X of Y" progress format
    await expect(
      page.locator('h2').filter({ hasText: /Task \d+ of \d+/ })
    ).toBeVisible();

    // Complete several matches to test tournament flow
    let matchesCompleted = 0;
    const maxMatches = 10; // Complete at least a few matches to test flow

    for (let i = 0; i < maxMatches; i++) {
      // Check if tournament is complete
      const resultsVisible = await page
        .locator('text=Your Task Rankings')
        .isVisible({ timeout: 1000 });
      if (resultsVisible) {
        break;
      }

      // Complete next match if available
      const matchupVisible = await page
        .locator('[data-testid="insertion-matchup"]')
        .isVisible({ timeout: 1000 });
      if (matchupVisible) {
        await clickInsertionButton(page);
        matchesCompleted++;

        // Wait for UI to update - either next match or results
        try {
          await expect(page.locator('[data-testid="tournament-progress"]')).toBeVisible({ timeout: 1000 });

          // Verify progress shows current task count (only if still in tournament)
          const progressVisible = await page
            .locator('text=/\\d+ of \\d+ tasks/')
            .isVisible({ timeout: 1000 });
          if (progressVisible) {
            const progressText = await page
              .locator('text=/\\d+ of \\d+ tasks/')
              .textContent();
            expect(progressText).toMatch(/\d+ of \d+ tasks/);
          }
        } catch {
          await expect(page.locator('text=Your Task Rankings')).toBeVisible({ timeout: 1000 });
        }
      } else {
        break;
      }
    }

    // Verify we completed some matches
    expect(matchesCompleted).toBeGreaterThan(0);
  });

  test('should handle match history correctly in Insertion', async ({
    page,
  }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    await page.locator('.option:has-text("Interactive Insertion")').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Insertion Match History Test');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament
    let matchCount = 0;
    const maxMatches = 50; // Safety limit

    while (matchCount < maxMatches) {
      try {
        const resultsVisible = await page
          .locator('text=Your Task Rankings')
          .isVisible({ timeout: 1000 });
        if (resultsVisible) break;

        await expect(page.locator('[data-testid="insertion-matchup"]')).toBeVisible({
          timeout: 5000,
        });
        await clickInsertionButton(page);
        await expect(
          page.locator('[data-testid="tournament-progress"]')
        ).toBeVisible();
        matchCount++;
      } catch (error) {
        break;
      }
    }

    // Check match history functionality
    await expect(page.locator('.results-table')).toBeVisible();

    // Click on the first task row to view history
    await page.locator('tbody tr.clickable-row').first().click();

    // Verify match history modal/section appears
    await expect(page.locator('text=Match History:')).toBeVisible();

    // Should show matches for Insertion algorithm
    const historySection = page.locator('text=Match History:').locator('..');
    await expect(historySection).toBeVisible();

    // Close history
    await page.locator('button:has-text("✕")').click();
    await expect(page.locator('text=Match History:')).not.toBeVisible();
  });

  test('should properly validate Insertion setup', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select Insertion
    await page.locator('.option:has-text("Interactive Insertion")').click();

    // Verify match count calculation shows Insertion characteristics
    const matchCountText = await page
      .locator('text=/\\d+ choices • Most intuitive/')
      .textContent();
    expect(matchCountText).toMatch(/\d+ choices/);

    // Verify description mentions choosing above/between/below
    await expect(
      page.locator('text=Choose Above, Between, or Below')
    ).toBeVisible();

    // Verify total matches calculation is reasonable for Insertion
    const totalMatchesElement = await page
      .locator('text=Total matches needed:')
      .locator('..');
    const totalMatchesText = await totalMatchesElement.textContent();
    const totalMatches = parseInt(totalMatchesText.split(':')[1].trim());

    // For 7 tasks, binary insertion should be efficient
    // Worst case is roughly n log n, best case is n-1
    expect(totalMatches).toBeGreaterThan(5); // At least n-1
    expect(totalMatches).toBeLessThan(30); // Reasonable upper bound
  });

  test('should export rankings CSV after Insertion completion', async ({
    page,
  }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    await page.locator('.option:has-text("Interactive Insertion")').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Insertion Export Test');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament quickly
    while (true) {
      try {
        const resultsVisible = await page
          .locator('text=Your Task Rankings')
          .isVisible({ timeout: 1000 });
        if (resultsVisible) break;

        await clickInsertionButton(page);
      } catch (error) {
        break;
      }
    }

    // Test export functionality
    await expect(page.locator('text=Your Task Rankings')).toBeVisible();

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
  });

  test('should show sorted tasks count during Insertion', async ({
    page,
  }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    await page.locator('.option:has-text("Interactive Insertion")').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Insertion Sorted Count Test');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Verify tournament starts
    await expect(page.locator('[data-testid="insertion-matchup"]')).toBeVisible();

    // Track that sorted count increases as we progress
    let previousSortedCount = 0;

    for (let i = 0; i < 5; i++) {
      const resultsVisible = await page
        .locator('text=Your Task Rankings')
        .isVisible({ timeout: 1000 });
      if (resultsVisible) break;

      const matchupVisible = await page
        .locator('[data-testid="insertion-matchup"]')
        .isVisible({ timeout: 1000 });
      if (matchupVisible) {
        await clickInsertionButton(page);

        // Check if task count is visible and increasing
        const taskCountVisible = await page
          .locator('text=/\\d+ of \\d+ tasks/')
          .isVisible({ timeout: 1000 });

        if (taskCountVisible) {
          const taskText = await page
            .locator('text=/\\d+ of \\d+ tasks/')
            .textContent();
          const match = taskText.match(/(\d+) of \d+ tasks/);
          if (match) {
            const currentSortedCount = parseInt(match[1]);
            // Sorted count should be monotonically increasing or stay the same
            expect(currentSortedCount).toBeGreaterThanOrEqual(
              previousSortedCount
            );
            previousSortedCount = currentSortedCount;
          }
        }

        // Progress should be visible
        await expect(
          page.locator('[data-testid="tournament-progress"]')
        ).toBeVisible();
      } else {
        break;
      }
    }
  });

  test('should handle two-task Insertion tournament', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/two-tasks.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    await page.locator('.option:has-text("Interactive Insertion")').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Two Task Insertion Test');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Verify tournament starts
    await expect(page.locator('[data-testid="insertion-matchup"]')).toBeVisible();

    // Make choice
    await page.locator('[data-testid="insertion-matchup"] button').first().click();

    // Tournament should complete quickly with only 2 tasks
    await expect(page.locator('text=Your Task Rankings')).toBeVisible({
      timeout: 5000,
    });

    // Verify both tasks are ranked
    await expect(page.locator('.results-table tbody tr')).toHaveCount(2);

    // Verify ranks 1 and 2 are present
    await expect(page.locator('tbody tr:has-text("1")')).toHaveCount(1);
    await expect(page.locator('tbody tr:has-text("2")')).toHaveCount(1);
  });
});
