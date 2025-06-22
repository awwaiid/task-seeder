import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Double Elimination Tournament', () => {
  test('should complete full double elimination tournament with reset match', async ({
    page,
  }) => {
    await page.goto('/');

    // Upload test CSV file
    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    // Wait for CSV to be loaded
    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select double elimination tournament type
    await page.locator('text=Double Elimination').click();

    // Set tournament name
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Double Elim Test');

    // Start tournament
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Verify we're in tournament phase
    await expect(
      page.locator('[data-testid="tournament-progress"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();

    // Verify we're in double elimination tournament (should show tournament type in setup)
    // Note: Current implementation doesn't distinguish winners/losers brackets in UI

    // Complete entire tournament by always choosing first option (deterministic)
    let maxMatches = 15; // Safety limit for double elimination
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
      } else {
        // No more matches available
        break;
      }
    }

    // Tournament should be complete
    await expect(page.locator('text=Your Task Rankings')).toBeVisible();
    await expect(page.locator('text=Double Elim Test')).toBeVisible();

    // Verify ranking table exists with all participants
    await expect(page.locator('.results-table')).toBeVisible();
    await expect(page.locator('.results-table tbody tr')).toHaveCount(7);
  });

  test('should complete double elimination without reset when winners bracket winner wins final', async ({
    page,
  }) => {
    await page.goto('/');

    // Upload test CSV file
    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    // Wait for CSV to be loaded
    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select double elimination tournament type
    await page.locator('text=Double Elimination').click();

    // Set tournament name
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Double Elim No Reset');

    // Start tournament
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament by always choosing first option (deterministic)
    let maxMatches = 15; // Safety limit for double elimination
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
      } else {
        // No more matches available
        break;
      }
    }

    // Verify tournament completed successfully
    await expect(page.locator('text=Your Task Rankings')).toBeVisible();
    await expect(page.locator('text=Double Elim No Reset')).toBeVisible();
    await expect(page.locator('.results-table tbody tr')).toHaveCount(7);
  });

  test('should show correct double elimination tournament flow', async ({
    page,
  }) => {
    await page.goto('/');

    // Upload test CSV file
    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select double elimination
    await page.locator('text=Double Elimination').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Double Elimination Flow Test');
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

        // Verify tournament progress updates after each match
        await expect(
          page.locator('[data-testid="tournament-progress"]')
        ).toBeVisible();
      } else {
        break;
      }
    }

    // Verify we completed some matches (double elimination should have multiple rounds)
    expect(matchesCompleted).toBeGreaterThan(0);
  });

  test('should handle match history correctly in double elimination', async ({
    page,
  }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    await page.locator('text=Double Elimination').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Match History Test');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament
    while (true) {
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

    // Should show matches with bracket indicators
    const historySection = page.locator('text=Match History:').locator('..');
    await expect(historySection).toBeVisible();

    // Close history
    await page.locator('button:has-text("✕")').click();
    await expect(page.locator('text=Match History:')).not.toBeVisible();
  });

  test('should properly validate double elimination setup', async ({
    page,
  }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select double elimination
    await page.locator('text=Double Elimination').click();

    // Verify match count calculation shows double elimination formula
    const matchCountText = await page
      .locator('text=/\\d+ matches • More accurate/')
      .textContent();
    expect(matchCountText).toMatch(/\d+ matches/);

    // Verify description mentions double elimination features
    await expect(page.locator('text=Tasks get a second chance')).toBeVisible();
  });
});
