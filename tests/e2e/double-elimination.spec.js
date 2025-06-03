import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Double Elimination Tournament', () => {
    test('should complete full double elimination tournament with reset match', async ({ page }) => {
        await page.goto('/');

        // Upload test CSV file
        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        // Wait for CSV to be loaded
        await expect(page.locator('text=Data Preview')).toBeVisible();

        // Select double elimination tournament type
        await page.locator('input[value="double"]').click();

        // Set tournament name
        await page.locator('input[placeholder*="ranking session"]').fill('Double Elim Test');

        // Start tournament
        await page.locator('button:has-text("Start Task Ranking")').click();

        // Verify we're in tournament phase
        await expect(page.locator('[data-testid="tournament-progress"]')).toBeVisible();
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();

        // Verify double elimination UI shows bracket type
        await expect(page.locator('text=winners')).toBeVisible();

        // Complete winners bracket first round
        let matchesCompleted = 0;
        
        // First match in winners bracket
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').first().click();
        matchesCompleted++;

        // Second match in winners bracket  
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').first().click();
        matchesCompleted++;

        // Winners bracket final
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').first().click();
        matchesCompleted++;

        // Should move to losers bracket
        await expect(page.locator('text=losers')).toBeVisible();

        // Complete losers bracket matches
        // First losers round
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').first().click();
        matchesCompleted++;

        // Second losers round 
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').first().click();
        matchesCompleted++;

        // Losers bracket final
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').first().click();
        matchesCompleted++;

        // Should move to finals
        await expect(page.locator('text=finals')).toBeVisible();

        // Grand final - choose losers bracket winner to force reset
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').nth(1).click(); // Choose second option (losers winner)
        matchesCompleted++;

        // Reset match should now be active
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').first().click();
        matchesCompleted++;

        // Tournament should be complete
        await expect(page.locator('text=Your Task Rankings')).toBeVisible();
        await expect(page.locator('text=Double Elim Test')).toBeVisible();

        // Verify ranking table exists
        await expect(page.locator('.results-table')).toBeVisible();
        await expect(page.locator('.results-table tbody tr')).toHaveCount(4);

        // Verify match count is correct for double elimination (2n-1 = 7 matches)
        const totalMatches = await page.locator('text=/Total matches needed: \\d+/').textContent();
        expect(totalMatches).toContain('7');
    });

    test('should complete double elimination without reset when winners bracket winner wins final', async ({ page }) => {
        await page.goto('/');

        // Upload test CSV file
        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        // Wait for CSV to be loaded
        await expect(page.locator('text=Data Preview')).toBeVisible();

        // Select double elimination tournament type
        await page.locator('input[value="double"]').click();

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
                const isWinners = await page.locator('text=winners').isVisible({ timeout: 1000 });
                const isLosers = await page.locator('text=losers').isVisible({ timeout: 1000 });
                const isFinals = await page.locator('text=finals').isVisible({ timeout: 1000 });

                if (isFinals) {
                    // In grand final - choose winners bracket winner (first option)
                    await page.locator('[data-testid="task-matchup"] button').first().click();
                    // Should end tournament immediately (no reset)
                    break;
                } else {
                    // Regular match - choose first option
                    await page.locator('[data-testid="task-matchup"] button').first().click();
                }

                // Small delay to allow UI updates
                await page.waitForTimeout(100);
            } catch (error) {
                // If we can't find more matches, we should be at results
                break;
            }
        }

        // Verify tournament completed successfully
        await expect(page.locator('text=Your Task Rankings')).toBeVisible();
        await expect(page.locator('text=Double Elim No Reset')).toBeVisible();
        await expect(page.locator('.results-table tbody tr')).toHaveCount(4);
    });

    test('should show correct bracket progression indicators', async ({ page }) => {
        await page.goto('/');

        // Upload test CSV file
        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        await expect(page.locator('text=Data Preview')).toBeVisible();

        // Select double elimination
        await page.locator('input[value="double"]').click();
        await page.locator('input[placeholder*="ranking session"]').fill('Bracket Progression Test');
        await page.locator('button:has-text("Start Task Ranking")').click();

        // Initially should be in winners bracket
        await expect(page.locator('text=winners')).toBeVisible();

        // Complete first winners match
        await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
        await page.locator('[data-testid="task-matchup"] button').first().click();

        // Should still be in winners bracket
        await expect(page.locator('text=winners')).toBeVisible();

        // Complete enough matches to reach losers bracket
        for (let i = 0; i < 2; i++) {
            await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();
            await page.locator('[data-testid="task-matchup"] button').first().click();
        }

        // Should now be in losers bracket
        await expect(page.locator('text=losers')).toBeVisible();

        // Verify tournament progress shows double elimination type
        const progressElement = page.locator('[data-testid="tournament-progress"]');
        await expect(progressElement).toContainText('Double Elimination');
    });

    test('should handle match history correctly in double elimination', async ({ page }) => {
        await page.goto('/');

        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        await expect(page.locator('text=Data Preview')).toBeVisible();

        await page.locator('input[value="double"]').click();
        await page.locator('input[placeholder*="ranking session"]').fill('Match History Test');
        await page.locator('button:has-text("Start Task Ranking")').click();

        // Complete tournament
        while (true) {
            try {
                const resultsVisible = await page.locator('text=Your Task Rankings').isVisible({ timeout: 1000 });
                if (resultsVisible) break;

                await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible({ timeout: 5000 });
                await page.locator('[data-testid="task-matchup"] button').first().click();
                await page.waitForTimeout(100);
            } catch (error) {
                break;
            }
        }

        // Check match history functionality
        await expect(page.locator('.results-table')).toBeVisible();
        
        // Click on a history button (📊 emoji button)
        await page.locator('.history-button').first().click();

        // Verify match history modal/section appears
        await expect(page.locator('text=Match History:')).toBeVisible();
        
        // Should show matches with bracket indicators
        const historySection = page.locator('text=Match History:').locator('..');
        await expect(historySection).toBeVisible();

        // Close history
        await page.locator('button:has-text("✕ Close")').click();
        await expect(page.locator('text=Match History:')).not.toBeVisible();
    });

    test('should properly validate double elimination setup', async ({ page }) => {
        await page.goto('/');

        const csvPath = path.join(process.cwd(), 'tests/fixtures/small.csv');
        await page.setInputFiles('input[type="file"]', csvPath);

        await expect(page.locator('text=Data Preview')).toBeVisible();

        // Select double elimination
        await page.locator('input[value="double"]').click();

        // Verify match count calculation shows double elimination formula
        const matchCountText = await page.locator('text=/more accurate, \\d+ matches/').textContent();
        expect(matchCountText).toMatch(/\d+ matches/);

        // Verify description mentions double elimination features
        await expect(page.locator('text=Tasks get a second chance in the losers bracket')).toBeVisible();
        await expect(page.locator('text=More matches but fairer rankings')).toBeVisible();
    });
});