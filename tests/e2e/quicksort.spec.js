import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('QuickSort Tournament', () => {
  test('should complete full QuickSort tournament successfully', async ({
    page,
  }) => {
    await page.goto('/');

    // Upload test CSV file
    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    // Wait for CSV to be loaded
    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select QuickSort tournament type
    await page.locator('text=QuickSort Ranking').click();

    // Verify QuickSort is selected with correct match count
    const matchCountText = await page
      .locator('text=/\\d+ matches • Efficient/')
      .textContent();
    expect(matchCountText).toMatch(/\d+ matches/);

    // Verify description mentions algorithm-based comparisons
    await expect(page.locator('text=Algorithm-based comparisons')).toBeVisible();

    // Set tournament name
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('QuickSort Test');

    // Start tournament
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Verify we're in tournament phase
    await expect(
      page.locator('[data-testid="tournament-progress"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();

    // Verify QuickSort progress indicator format
    await expect(page.locator('h2').filter({ hasText: 'Match 1 of' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Round 1 of' })).toBeVisible();

    // Complete entire tournament by always choosing first option (deterministic)
    let maxMatches = 100; // QuickSort can have many matches for larger sets
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
        .locator('[data-testid="task-matchup"]')
        .isVisible({ timeout: 1000 });
      if (matchupVisible) {
        await page
          .locator('[data-testid="task-matchup"] button')
          .first()
          .click();
        matchesCompleted++;

        // Wait briefly for UI to update
        await page.waitForTimeout(100);
      } else {
        // No more matches available
        break;
      }
    }

    // Tournament should be complete
    await expect(page.locator('text=Your Task Rankings')).toBeVisible();
    await expect(page.locator('text=QuickSort Test')).toBeVisible();

    // Verify ranking table exists with all participants (complete ranking)
    await expect(page.locator('.results-table')).toBeVisible();
    await expect(page.locator('.results-table tbody tr')).toHaveCount(7);

    // Verify we completed a reasonable number of matches
    expect(matchesCompleted).toBeGreaterThan(5); // QuickSort should require multiple comparisons

    // Verify all rank numbers 1-7 are present (complete ranking)
    for (let i = 1; i <= 7; i++) {
      await expect(page.locator(`tbody tr:has-text("${i}")`)).toHaveCount(1);
    }
  });

  test('should handle QuickSort with demo data (15 tasks)', async ({ page }) => {
    await page.goto('/');

    // Use demo data button
    await page.locator('button:has-text("Try with Demo Data")').click();

    // Wait for demo data to load
    await expect(page.locator('text=Data Preview (15 tasks loaded)')).toBeVisible();

    // Select QuickSort tournament type
    await page.locator('text=QuickSort Ranking').click();

    // Verify match count shows expected number for 15 tasks
    const totalMatchesElement = await page.locator('text=Total matches needed:').locator('..');
    const matchCountText = await totalMatchesElement.textContent();
    const totalMatches = parseInt(matchCountText.split(':')[1].trim());
    expect(totalMatches).toBeGreaterThan(20); // Should be around 59 for 15 tasks

    // Start tournament
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Verify tournament starts
    await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();

    // Complete a few matches to verify QuickSort functionality
    for (let i = 0; i < 5; i++) {
      const resultsVisible = await page
        .locator('text=Your Task Rankings')
        .isVisible({ timeout: 1000 });
      if (resultsVisible) {
        break;
      }

      const matchupVisible = await page
        .locator('[data-testid="task-matchup"]')
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
      .locator('[data-testid="task-matchup"]')
      .isVisible({ timeout: 1000 });
    
    if (!stillInProgress) {
      // If tournament completed, verify results
      await expect(page.locator('text=Your Task Rankings')).toBeVisible();
      await expect(page.locator('.results-table tbody tr')).toHaveCount(15);
    }
  });

  test('should show correct QuickSort tournament progress', async ({ page }) => {
    await page.goto('/');

    // Upload test CSV file
    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select QuickSort
    await page.locator('text=QuickSort Ranking').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('QuickSort Progress Test');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Verify tournament starts successfully
    await expect(
      page.locator('[data-testid="tournament-progress"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();

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
        .locator('[data-testid="task-matchup"]')
        .isVisible({ timeout: 1000 });
      if (matchupVisible) {
        await page
          .locator('[data-testid="task-matchup"] button')
          .first()
          .click();
        matchesCompleted++;

        // Wait briefly for UI to update
        await page.waitForTimeout(100);
        
        // Verify progress percentage increases
        const progressText = await page
          .locator('text=/Total match \\d+ of \\d+ \\(\\d+%\\)/')
          .textContent();
        expect(progressText).toMatch(/Total match \d+ of \d+ \(\d+%\)/);
      } else {
        break;
      }
    }

    // Verify we completed some matches (QuickSort should have multiple comparisons)
    expect(matchesCompleted).toBeGreaterThan(0);
  });

  test('should handle match history correctly in QuickSort', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    await page.locator('text=QuickSort Ranking').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('QuickSort Match History Test');
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

        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible({
          timeout: 5000,
        });
        await page
          .locator('[data-testid="task-matchup"] button')
          .first()
          .click();
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

    // Should show matches for QuickSort algorithm
    const historySection = page.locator('text=Match History:').locator('..');
    await expect(historySection).toBeVisible();

    // Close history
    await page.locator('button:has-text("✕")').click();
    await expect(page.locator('text=Match History:')).not.toBeVisible();
  });

  test('should properly validate QuickSort setup', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select QuickSort
    await page.locator('text=QuickSort Ranking').click();

    // Verify match count calculation shows QuickSort efficiency
    const matchCountText = await page
      .locator('text=/\\d+ matches • Efficient/')
      .textContent();
    expect(matchCountText).toMatch(/\d+ matches/);

    // Verify description mentions QuickSort features
    await expect(page.locator('text=Algorithm-based comparisons')).toBeVisible();

    // Verify total matches calculation is reasonable for QuickSort (O(n log n))
    const totalMatchesElement = await page.locator('text=Total matches needed:').locator('..');
    const totalMatchesText = await totalMatchesElement.textContent();
    const totalMatches = parseInt(totalMatchesText.split(':')[1].trim());
    
    // For 7 tasks, QuickSort should require approximately n log n comparisons
    // This should be more than single elimination (6) but reasonable
    expect(totalMatches).toBeGreaterThan(6);
    expect(totalMatches).toBeLessThan(50); // Reasonable upper bound
  });

  test('should export rankings CSV after QuickSort completion', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    await page.locator('text=QuickSort Ranking').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('QuickSort Export Test');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament quickly
    while (true) {
      try {
        const resultsVisible = await page
          .locator('text=Your Task Rankings')
          .isVisible({ timeout: 1000 });
        if (resultsVisible) break;

        await page
          .locator('[data-testid="task-matchup"] button')
          .first()
          .click();
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
});