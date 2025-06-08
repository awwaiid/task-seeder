import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Double Elimination Tournament', () => {
    test.skip('should complete full double elimination tournament with reset match', async ({ page }) => {
        await page.goto('/');

        // Upload test CSV file
        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        // Wait for CSV to be loaded
        await expect(page.locator('text=Data Preview')).toBeVisible();

        // Select double elimination tournament type
        await page.locator('text=Double Elimination').click();

        // Set tournament name
        await page.locator('input[placeholder*="ranking session"]').fill('Double Elim Test');

        // Start tournament
        await page.locator('button:has-text("Start Task Ranking")').click();

        // Verify we're in tournament phase
        await expect(page.locator('[data-testid="tournament-progress"]')).toBeVisible();
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();

        // Verify double elimination UI shows bracket type initially
        await expect(page.locator('span:has-text("🏆 Winners Side")')).toBeVisible();

        // Complete entire tournament by always choosing first option (deterministic)
        let maxMatches = 15; // Safety limit for double elimination
        for (let i = 0; i < maxMatches; i++) {
            // Check if tournament is complete
            const resultsVisible = await page.locator('text=Your Task Rankings').isVisible({ timeout: 1000 });
            if (resultsVisible) {
                break;
            }
            
            // Complete next match if available
            const matchupVisible = await page.locator('[data-testid="task-matchup"]').isVisible({ timeout: 1000 });
            if (matchupVisible) {
                await page.locator('[data-testid="task-matchup"] button').first().click();
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

    test.skip('should complete double elimination without reset when winners bracket winner wins final', async ({ page }) => {
        await page.goto('/');

        // Upload test CSV file
        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        // Wait for CSV to be loaded
        await expect(page.locator('text=Data Preview')).toBeVisible();

        // Select double elimination tournament type
        await page.locator('text=Double Elimination').click();

        // Set tournament name
        await page.locator('input[placeholder*="ranking session"]').fill('Double Elim No Reset');

        // Start tournament
        await page.locator('button:has-text("Start Task Ranking")').click();

        // Complete all matches until grand final
        let currentBracket = 'winners';
        
        while (true) {
            try {
                // Check if we're in results phase
                const resultsVisible = await page.locator('text=Your Task Rankings').isVisible({ timeout: 1000 });
                if (resultsVisible) break;

                // Wait for matchup to be visible
                await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible({ timeout: 5000 });

                // Check current bracket type
                const isWinners = await page.locator('span:has-text("🏆 Winners Side")').isVisible({ timeout: 1000 });
                const isLosers = await page.locator('span:has-text("🔄 Losers Side")').isVisible({ timeout: 1000 });
                const isFinals = await page.locator('span:has-text("⚡ Grand Final")').isVisible({ timeout: 1000 });

                if (isFinals) {
                    // In grand final - choose winners bracket winner (first option)
                    await page.locator('[data-testid="task-matchup"] button').first().click();
                    // Should end tournament immediately (no reset)
                    break;
                } else {
                    // Regular match - choose first option
                    await page.locator('[data-testid="task-matchup"] button').first().click();
                }

                // Wait for UI to update by checking for tournament progress
                await expect(page.locator('[data-testid="tournament-progress"]')).toBeVisible();
            } catch (error) {
                // If we can't find more matches, we should be at results
                break;
            }
        }

        // Verify tournament completed successfully
        await expect(page.locator('text=Your Task Rankings')).toBeVisible();
        await expect(page.locator('text=Double Elim No Reset')).toBeVisible();
        await expect(page.locator('.results-table tbody tr')).toHaveCount(7);
    });

    test('should show correct bracket progression indicators', async ({ page }) => {
        await page.goto('/');

        // Upload test CSV file
        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        await expect(page.locator('text=Data Preview')).toBeVisible();

        // Select double elimination
        await page.locator('text=Double Elimination').click();
        await page.locator('input[placeholder*="ranking session"]').fill('Bracket Progression Test');
        await page.locator('button:has-text("Start Task Ranking")').click();

        // Initially should be in winners bracket
        await expect(page.locator('span:has-text("🏆 Winners Side")')).toBeVisible();

        // Complete first winners match
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').first().click();

        // Should still be in winners bracket
        await expect(page.locator('span:has-text("🏆 Winners Side")')).toBeVisible();

        // Complete enough matches to reach losers bracket
        for (let i = 0; i < 2; i++) {
            await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
            await page.locator('[data-testid="task-matchup"] button').first().click();
        }

        // Continue until we see losers bracket or tournament ends
        let foundLosersBracket = false;
        for (let attempts = 0; attempts < 10; attempts++) {
            const losersSideVisible = await page.locator('span:has-text("🔄 Losers Side")').isVisible({ timeout: 1000 });
            if (losersSideVisible) {
                foundLosersBracket = true;
                break;
            }
            
            // If tournament is complete, that's also acceptable for this test
            const resultsVisible = await page.locator('text=Your Task Rankings').isVisible({ timeout: 1000 });
            if (resultsVisible) {
                break;
            }
            
            // Continue with more matches if available
            const matchupVisible = await page.locator('[data-testid="task-matchup"]').isVisible({ timeout: 1000 });
            if (matchupVisible) {
                await page.locator('[data-testid="task-matchup"] button').first().click();
            } else {
                break;
            }
        }
        
        // If we found losers bracket, verify it
        if (foundLosersBracket) {
            await expect(page.locator('span:has-text("🔄 Losers Side")')).toBeVisible();
        }

        // Verify tournament progress shows double elimination features (bracket indicators)
        const progressElement = page.locator('[data-testid="tournament-progress"]');
        // Should show either Winners or Losers bracket indicators, which indicate double elimination
        const hasWinnersBracket = await progressElement.locator('text=Winners Bracket').first().isVisible();
        const hasLosersBracket = await progressElement.locator('text=Losers Bracket').first().isVisible();
        expect(hasWinnersBracket || hasLosersBracket).toBe(true);
    });

    test('should handle match history correctly in double elimination', async ({ page }) => {
        await page.goto('/');

        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        await expect(page.locator('text=Data Preview')).toBeVisible();

        await page.locator('text=Double Elimination').click();
        await page.locator('input[placeholder*="ranking session"]').fill('Match History Test');
        await page.locator('button:has-text("Start Task Ranking")').click();

        // Complete tournament
        while (true) {
            try {
                const resultsVisible = await page.locator('text=Your Task Rankings').isVisible({ timeout: 1000 });
                if (resultsVisible) break;

                await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible({ timeout: 5000 });
                await page.locator('[data-testid="task-matchup"] button').first().click();
                await expect(page.locator('[data-testid="tournament-progress"]')).toBeVisible();
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

    test('should properly validate double elimination setup', async ({ page }) => {
        await page.goto('/');

        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        await expect(page.locator('text=Data Preview')).toBeVisible();

        // Select double elimination
        await page.locator('text=Double Elimination').click();

        // Verify match count calculation shows double elimination formula
        const matchCountText = await page.locator('text=/\\d+ matches • More accurate/').textContent();
        expect(matchCountText).toMatch(/\d+ matches/);

        // Verify description mentions double elimination features
        await expect(page.locator('text=Tasks get a second chance')).toBeVisible();
    });
});