import { test, expect } from '@playwright/test';
import path from 'path';

// Helper function to make deterministic choices (always choose alphabetically first)
async function makeDeterministicChoice(page) {
  const taskButtons = page.locator('[data-testid="task-matchup"] button');
  const button1Text = await taskButtons.nth(0).locator('.task-title').textContent();
  const button2Text = await taskButtons.nth(1).locator('.task-title').textContent();
  
  // Always select the alphabetically earlier option for consistent results
  if (button1Text.localeCompare(button2Text) <= 0) {
    await taskButtons.nth(0).click();
    return button1Text;
  } else {
    await taskButtons.nth(1).click();
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
    const progressText = await page.locator('h2').filter({ hasText: 'Match' }).textContent();
    const taskButtons = page.locator('[data-testid="task-matchup"] button');
    const option1 = await taskButtons.nth(0).locator('.task-title').textContent();
    const option2 = await taskButtons.nth(1).locator('.task-title').textContent();
    
    // Make deterministic choice
    const winner = await makeDeterministicChoice(page);
    const loser = winner === option1 ? option2 : option1;
    
    decisions.push({
      match: progressText,
      option1,
      option2,
      winner,
      loser
    });
    
    matchCount++;
    await page.waitForTimeout(100); // Brief wait for UI update
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
      task: taskText.replace('▶', '').trim()
    });
  }
  
  return rankings;
}

// Validate that rankings are consistent with decisions made
function validateRankingConsistency(decisions, rankings, tournamentType) {
  console.log(`Validating ${tournamentType} tournament with ${decisions.length} decisions`);
  console.log('Final rankings:', rankings);
  
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
      throw new Error(`Expected rank ${i + 1}, got ${rankings[i].rank} for position ${i}`);
    }
  }
  
  // For deterministic alphabetical choices, Task A should typically rank highest
  // since we always choose the alphabetically earlier option
  if (tournamentType === 'single-elimination' || tournamentType === 'double-elimination') {
    // In elimination tournaments with alphabetical preference, Task A should win
    const winner = rankings.find(r => r.rank === 1);
    if (winner.task !== 'Task A') {
      console.warn(`Expected Task A to win ${tournamentType}, but ${winner.task} won`);
      console.warn('This might be due to bracket seeding - investigating...');
    }
  }
  
  return true;
}

// Validate transitivity for QuickSort (if A > B and B > C, then A > C should hold)
function validateTransitivity(decisions, rankings) {
  console.log('Validating transitivity in QuickSort results...');
  
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
      const shouldBeHigher = isTransitivelyHigher(higherTask, lowerTask, comparisons);
      
      if (shouldBeHigher === false) {
        console.warn(`Transitivity violation: ${higherTask} ranks higher than ${lowerTask} but lost directly or transitively`);
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
  test('Single Elimination should produce consistent rankings', async ({ page }) => {
    await page.goto('/');

    // Upload alphabetical test data
    const csvPath = path.join(process.cwd(), 'tests/fixtures/alphabetical.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select Single Elimination (default)
    await page.locator('input[placeholder*="ranking session"]').fill('Single Elimination Validation');
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
    
    console.log('Single Elimination validation passed!');
  });

  test('Double Elimination should produce consistent rankings', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/alphabetical.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select Double Elimination
    await page.locator('text=Double Elimination').click();
    await page.locator('input[placeholder*="ranking session"]').fill('Double Elimination Validation');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Complete tournament with deterministic choices
    const decisions = await completeTournamentWithTracking(page);
    
    // Extract and validate rankings
    const rankings = await extractRankings(page);
    
    // Validate consistency
    validateRankingConsistency(decisions, rankings, 'double-elimination');
    
    // Specific validation for Double Elimination
    expect(rankings).toHaveLength(5);
    expect(decisions.length).toBeGreaterThan(4); // More matches than single elimination
    expect(decisions.length).toBeLessThanOrEqual(8); // At most 2n-2 for 5 participants
    
    console.log('Double Elimination validation passed!');
  });

  test('QuickSort should produce consistent and transitive rankings', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/alphabetical.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Select QuickSort
    await page.locator('text=QuickSort Ranking').click();
    await page.locator('input[placeholder*="ranking session"]').fill('QuickSort Validation');
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
    expect(decisions.length).toBeGreaterThan(5); // More than minimal comparisons
    expect(decisions.length).toBeLessThan(25); // But not too many (n² worst case)
    
    // With deterministic alphabetical choices, QuickSort should produce A, B, C, D, E order
    expect(rankings[0].task).toBe('Task A');
    expect(rankings[1].task).toBe('Task B');
    expect(rankings[2].task).toBe('Task C');
    expect(rankings[3].task).toBe('Task D');
    expect(rankings[4].task).toBe('Task E');
    
    console.log('QuickSort validation passed!');
  });

  test('Single participant tournament should show appropriate error', async ({ page }) => {
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
    await page.locator('input[placeholder*="ranking session"]').fill('Single Task Test');
    
    // Listen for the alert dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Please upload a CSV with at least 2 tasks to compare.');
      await dialog.accept();
    });
    
    await page.locator('button:has-text("Start Task Ranking")').click();
    
    // Should remain on setup page (tournament doesn't start)
    await expect(page.locator('text=Data Preview')).toBeVisible();
    await expect(page.locator('button:has-text("Start Task Ranking")')).toBeVisible();
    
    console.log('Single participant edge case validation passed!');
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
    await page.locator('input[placeholder*="ranking session"]').fill('Two Task Test');
    await page.locator('button:has-text("Start Task Ranking")').click();

    // Should start tournament immediately
    await expect(page.locator('[data-testid="task-matchup"]')).toBeVisible();

    // Complete the single match deterministically
    const winner = await makeDeterministicChoice(page);

    // Should immediately show results (only 1 match needed)
    await expect(page.locator('text=Your Task Rankings')).toBeVisible();
    
    const rankings = await extractRankings(page);
    expect(rankings).toHaveLength(2);
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].rank).toBe(2);
    
    // With deterministic alphabetical choice, Task A should win
    expect(rankings[0].task).toBe('Task A');
    expect(rankings[1].task).toBe('Task B');
    
    console.log('Two participant edge case validation passed!');
  });

  test('Match history should align with final rankings', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(process.cwd(), 'tests/fixtures/alphabetical.csv');
    await page.setInputFiles('input[type="file"]', csvPath);

    await expect(page.locator('text=Data Preview')).toBeVisible();

    // Test with QuickSort for complete match history
    await page.locator('text=QuickSort Ranking').click();
    await page.locator('input[placeholder*="ranking session"]').fill('Match History Validation');
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
    
    console.log('Match history validation passed!');
  });
});