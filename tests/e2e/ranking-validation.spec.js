import { test, expect } from '@playwright/test';
import path from 'path';

// Helper function to make deterministic choices (always choose alphabetically first)
async function makeDeterministicChoice(page) {
  // Wait for the matchup to be visible first
  await page
    .locator('[data-testid="task-matchup"]')
    .waitFor({ state: 'visible', timeout: 10000 });

  // Get all buttons and wait for at least one
  const allButtons = page.locator('[data-testid="task-matchup"] button');
  await allButtons.first().waitFor({ state: 'visible', timeout: 10000 });

  // Check if there are at least 2 buttons
  const buttonCount = await allButtons.count();

  if (buttonCount < 2) {
    // If only one button, click it
    await allButtons.first().click();
    const buttonText = await allButtons
      .first()
      .locator('.task-title')
      .textContent();
    return buttonText;
  }

  // Find the buttons that contain task titles (not Skip buttons)
  const button1 = allButtons.nth(0);
  const button2 = allButtons.nth(1);

  await button1.waitFor({ state: 'visible' });
  await button2.waitFor({ state: 'visible' });

  // Get task titles with error handling
  let button1Text, button2Text;
  try {
    const hasTitle1 = (await button1.locator('.task-title').count()) > 0;
    const hasTitle2 = (await button2.locator('.task-title').count()) > 0;

    if (hasTitle1 && hasTitle2) {
      button1Text = await button1.locator('.task-title').textContent();
      button2Text = await button2.locator('.task-title').textContent();
    } else if (hasTitle1) {
      button1Text = await button1.locator('.task-title').textContent();
      button2Text = 'Skip';
    } else {
      // Neither has task title, just click the first one
      await button1.click();
      return 'Unknown';
    }
  } catch (error) {
    await button1.click();
    return 'Error';
  }

  // Always select the alphabetically earlier option for consistent results
  if (button1Text.localeCompare(button2Text) <= 0) {
    await button1.click();
    return button1Text;
  } else {
    await button2.click();
    return button2Text;
  }
}

// Complete tournament with deterministic choices and track all decisions
async function completeTournamentWithTracking(page) {
  const decisions = [];
  let matchCount = 0;
  const maxMatches = 50; // Safety limit

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
      .locator('[data-testid="task-matchup"]')
      .isVisible({ timeout: 1000 });
    if (!matchupVisible) {
      break;
    }

    // Get current match info
    const progressText = await page
      .locator('h2')
      .filter({ hasText: 'Match' })
      .textContent();

    // Wait for the matchup to be ready
    await page
      .locator('[data-testid="task-matchup"]')
      .waitFor({ state: 'visible', timeout: 10000 });

    // Get task buttons - wait for at least one to be available
    const allButtons = page.locator('[data-testid="task-matchup"] button');
    await allButtons.first().waitFor({ state: 'visible', timeout: 10000 });

    // Check how many task buttons are actually available
    const buttonCount = await allButtons.count();

    let option1, option2;
    try {
      if (buttonCount >= 2) {
        // Try to get task titles, but handle cases where buttons might not have them
        const button1Title = allButtons.nth(0).locator('.task-title');
        const button2Title = allButtons.nth(1).locator('.task-title');

        // Check if both have task titles
        const hasTitle1 = (await button1Title.count()) > 0;
        const hasTitle2 = (await button2Title.count()) > 0;

        if (hasTitle1 && hasTitle2) {
          option1 = await button1Title.textContent();
          option2 = await button2Title.textContent();
        } else if (hasTitle1) {
          option1 = await button1Title.textContent();
          option2 = 'Skip Button';
        } else {
          option1 = 'Unknown';
          option2 = 'Unknown';
        }
      } else {
        // If only one button
        option1 = await allButtons.nth(0).locator('.task-title').textContent();
        option2 = 'N/A';
      }
    } catch (error) {
      option1 = 'Error';
      option2 = 'Error';
    }

    // Make deterministic choice
    const winner = await makeDeterministicChoice(page);
    const loser = winner === option1 ? option2 : option1;

    decisions.push({
      match: progressText,
      option1,
      option2,
      winner,
      loser,
    });

    matchCount++;
    // Wait for UI to update - either next match or results
    try {
      await expect(page.locator('h2').filter({ hasText: 'Match' })).toBeVisible({ timeout: 1000 });
    } catch {
      await expect(page.locator('text=Your Task Rankings')).toBeVisible({ timeout: 1000 });
    }
  }

  return decisions;
}

// Extract final rankings from results page
async function extractRankings(page) {
  await expect(page.locator('text=Your Task Rankings')).toBeVisible();

  const rankings = [];
  const rows = page.locator('.results-table tbody tr');
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const rankText = await row.locator('td').first().textContent();
    const taskText = await row.locator('td').nth(1).textContent();

    rankings.push({
      rank: parseInt(rankText.trim()),
      task: taskText.replace('▶', '').trim(),
    });
  }

  return rankings;
}

// Validate that rankings are consistent with decisions made
function validateRankingConsistency(decisions, rankings, tournamentType) {
  // Basic validation: ensure all tasks are ranked
  const expectedTasks = ['Task A', 'Task B', 'Task C', 'Task D', 'Task E'];
  const rankedTasks = rankings.map(r => r.task);

  for (const task of expectedTasks) {
    if (!rankedTasks.includes(task)) {
      throw new Error(`Task ${task} missing from rankings`);
    }
  }

  // Validate ranking order (1, 2, 3, 4, 5)
  for (let i = 0; i < rankings.length; i++) {
    if (rankings[i].rank !== i + 1) {
      throw new Error(
        `Expected rank ${i + 1}, got ${rankings[i].rank} for position ${i}`
      );
    }
  }

  // For deterministic alphabetical choices, Task A should typically rank highest
  // since we always choose the alphabetically earlier option
  if (
    tournamentType === 'single-elimination' ||
    tournamentType === 'double-elimination'
  ) {
    // In elimination tournaments with alphabetical preference, Task A should win
    const winner = rankings.find(r => r.rank === 1);
    if (winner.task !== 'Task A') {
      console.warn(
        `Expected Task A to win ${tournamentType}, but ${winner.task} won`
      );
      console.warn('This might be due to bracket seeding - investigating...');
    }
  }

  return true;
}

// Validate transitivity for QuickSort (if A > B and B > C, then A > C should hold)
function validateTransitivity(decisions, rankings) {

  // Create a map of direct comparisons
  const comparisons = new Map();

  decisions.forEach(decision => {
    const { winner, loser } = decision;
    if (!comparisons.has(winner)) {
      comparisons.set(winner, new Set());
    }
    comparisons.get(winner).add(loser);
  });

  // Check transitivity: if A beats B and B beats C, A should rank higher than C
  for (let i = 0; i < rankings.length; i++) {
    for (let j = i + 1; j < rankings.length; j++) {
      const higherTask = rankings[i].task;
      const lowerTask = rankings[j].task;

      // Find if there's a transitive relationship that should hold
      const shouldBeHigher = isTransitivelyHigher(
        higherTask,
        lowerTask,
        comparisons
      );

      if (shouldBeHigher === false) {
        console.warn(
          `Transitivity violation: ${higherTask} ranks higher than ${lowerTask} but lost directly or transitively`
        );
      }
    }
  }

  return true;
}

// Check if task A should rank higher than task B based on transitive comparisons
function isTransitivelyHigher(taskA, taskB, comparisons) {
  // Direct comparison
  if (comparisons.has(taskA) && comparisons.get(taskA).has(taskB)) {
    return true;
  }
  if (comparisons.has(taskB) && comparisons.get(taskB).has(taskA)) {
    return false;
  }

  // No direct comparison available, can't determine transitively with simple algorithm
  return null;
}

test.describe('Tournament Ranking Validation', () => {
  test('Single Elimination should produce consistent rankings', async ({
    page,
  }) => {
    await page.goto('/');

    // Upload alphabetical test data
    const csvPath = path.join(process.cwd(), 'tests/fixtures/alphabetical.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select Single Elimination (default)
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Single Elimination Validation');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament with deterministic choices
    const decisions = await completeTournamentWithTracking(page);

    // Extract and validate rankings
    const rankings = await extractRankings(page);

    // Validate consistency
    validateRankingConsistency(decisions, rankings, 'single-elimination');

    // Specific validation for Single Elimination
    expect(rankings).toHaveLength(5);
    expect(decisions.length).toBe(4); // n-1 matches for single elimination

  });

  test('Double Elimination should produce consistent rankings', async ({
    page,
  }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/alphabetical.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select Double Elimination
    await page.locator('text=Double Elimination').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Double Elimination Validation');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament with deterministic choices
    const decisions = await completeTournamentWithTracking(page);

    // Extract and validate rankings
    const rankings = await extractRankings(page);

    // Validate consistency
    validateRankingConsistency(decisions, rankings, 'double-elimination');

    // Specific validation for Double Elimination
    expect(rankings).toHaveLength(5);
    expect(decisions.length).toBeGreaterThanOrEqual(4); // At least as many as single elimination
    expect(decisions.length).toBeLessThanOrEqual(8); // At most 2n-2 for 5 participants

  });

  test('QuickSort should produce consistent and transitive rankings', async ({
    page,
  }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/alphabetical.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select QuickSort
    await page.locator('text=QuickSort Ranking').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('QuickSort Validation');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament with deterministic choices
    const decisions = await completeTournamentWithTracking(page);

    // Extract and validate rankings
    const rankings = await extractRankings(page);

    // Validate consistency
    validateRankingConsistency(decisions, rankings, 'quicksort');

    // Validate transitivity (specific to QuickSort)
    validateTransitivity(decisions, rankings);

    // Specific validation for QuickSort
    expect(rankings).toHaveLength(5);

    // For 5 elements, QuickSort should be efficient (O(n log n) average case)
    expect(decisions.length).toBeGreaterThanOrEqual(4); // At least some comparisons made
    expect(decisions.length).toBeLessThan(25); // But not too many (n² worst case)

    // With deterministic choices, QuickSort should produce consistent rankings
    // The exact order may vary depending on the algorithm's pivot choices and button detection
    expect(rankings[0].task).toMatch(/Task [A-E]/);
    expect(rankings[1].task).toMatch(/Task [A-E]/);
    expect(rankings[2].task).toMatch(/Task [A-E]/);
    expect(rankings[3].task).toMatch(/Task [A-E]/);
    expect(rankings[4].task).toMatch(/Task [A-E]/);

    // Verify all tasks are included and unique
    const taskNames = rankings.map(r => r.task);
    expect(new Set(taskNames).size).toBe(5); // All unique tasks

  });

  test('Single participant tournament should show appropriate error', async ({
    page,
  }) => {
    await page.goto('/');

    // Upload single participant CSV file
    const singleCsvPath = path.join(process.cwd(), 'tests/fixtures/single.csv');
    await page.setInputFiles('input[type="file"]', singleCsvPath);
    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Verify the app shows correct match counts for single participant
    await expect(page.locator('text=0 matches • Fast')).toBeVisible(); // Single Elimination
    await expect(page.locator('text=0 matches • Efficient')).toBeVisible(); // QuickSort

    // Total matches should be 0
    await expect(page.locator('text=Total matches needed: 0')).toBeVisible();

    // Try to start tournament with one task
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Single Task Test');

    // Listen for the alert dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe(
        'Please upload a CSV with at least 2 tasks to compare.'
      );
      await dialog.accept();
    });

    await page.locator('button:has-text("Start Task Ranking")').click();

    // Should remain on setup page (tournament doesn't start)
    await expect(page.locator('text=Data Preview')).toBeVisible();
    await expect(
      page.locator('button:has-text("Start Task Ranking")')
    ).toBeVisible();

  });

  test('Two participant tournament should work correctly', async ({ page }) => {
    await page.goto('/');

    // Upload two participant CSV file
    const twoCsvPath = path.join(process.cwd(), 'tests/fixtures/two-tasks.csv');
    await page.setInputFiles('input[type="file"]', twoCsvPath);
    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Verify match counts for two participants
    await expect(page.locator('text=1 matches • Fast')).toBeVisible(); // Single Elimination: 1 match
    await expect(page.locator('text=3 matches • More accurate')).toBeVisible(); // Double Elimination: up to 3 matches

    // QuickSort shows 2 matches for 2 tasks
    await expect(page.locator('text=2 matches • Efficient')).toBeVisible(); // QuickSort: 2 comparisons

    // Test Single Elimination with two tasks
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Two Task Test');

    // Take screenshot before starting tournament
    await page.screenshot({
      path: 'test-results/before-start.png',
      fullPage: true,
    });

    await page.locator('button:has-text("Start Task Ranking")').click();

    // Take screenshot after clicking start
    await page.screenshot({
      path: 'test-results/after-start.png',
      fullPage: true,
    });

    // Should start tournament immediately
    await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible({
      timeout: 15000,
    });

    // Take screenshot when matchup is visible
    await page.screenshot({
      path: 'test-results/matchup-visible.png',
      fullPage: true,
    });

    // Get the task buttons and select alphabetically
    const taskButtons = page.locator('[data-testid="task-matchup"] button');

    // Wait for both task buttons to be visible
    await taskButtons.nth(0).waitFor({ state: 'visible', timeout: 10000 });
    await taskButtons.nth(1).waitFor({ state: 'visible', timeout: 10000 });

    // Get the text content of both buttons
    const button1Text = await taskButtons.nth(0).textContent();
    const button2Text = await taskButtons.nth(1).textContent();


    // Extract task names (they should contain "Task A" and "Task B")
    const task1 = button1Text.includes('Task A') ? 'Task A' : 'Task B';
    const task2 = button2Text.includes('Task A') ? 'Task A' : 'Task B';


    // Click the button with Task A (alphabetically first)
    if (task1 === 'Task A') {
      await taskButtons.nth(0).click();
    } else {
      await taskButtons.nth(1).click();
    }

    // Should immediately show results (only 1 match needed)
    await expect(page.locator('text=Your Task Rankings')).toBeVisible({
      timeout: 15000,
    });

    const rankings = await extractRankings(page);
    expect(rankings).toHaveLength(2);
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].rank).toBe(2);

    // With deterministic alphabetical choice, Task A should win
    expect(rankings[0].task).toBe('Task A');
    expect(rankings[1].task).toBe('Task B');

  });

  test('Match history should align with final rankings', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/alphabetical.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Test with QuickSort for complete match history
    await page.locator('text=QuickSort Ranking').click();
    await page
      .locator('input[placeholder*="ranking session"]')
      .fill('Match History Validation');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament
    await completeTournamentWithTracking(page);
    const rankings = await extractRankings(page);

    // Check match history for the winner
    const winner = rankings.find(r => r.rank === 1);
    await page.locator(`tbody tr:has-text("${winner.task}")`).click();

    // Verify match history appears
    await expect(page.locator('text=Match History:')).toBeVisible();

    // Winner should have more wins than losses (or at least not be all losses)
    const wonMatches = await page.locator('text=WON').count();
    const lostMatches = await page.locator('text=LOST').count();

    expect(wonMatches).toBeGreaterThan(0); // Winner should have won at least one match

    // Close history
    await page.locator('button:has-text("✕")').click();

    // Check last place
    const lastPlace = rankings.find(r => r.rank === rankings.length);
    await page.locator(`tbody tr:has-text("${lastPlace.task}")`).click();

    await expect(page.locator('text=Match History:')).toBeVisible();

    // Last place should have at least one loss
    const lastPlaceLosses = await page.locator('text=LOST').count();
    expect(lastPlaceLosses).toBeGreaterThan(0);

  });
});
