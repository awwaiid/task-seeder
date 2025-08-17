import { describe, it, expect, beforeEach } from 'vitest';
import { InsertionTournament } from '../src/utils/TournamentRunner.js';

describe('InsertionTournament', () => {
  let tournament;
  const tasks = ['C', 'F', 'B', 'E', 'A', 'D'];

  beforeEach(() => {
    tournament = new InsertionTournament(tasks, {});
  });

  it('should follow the complete insertion ranking flow', () => {
    console.log('=== STARTING INSERTION TOURNAMENT TEST ===');
    console.log('Initial unsorted:', tasks);

    // Step 1: First call positions C automatically and returns F vs C match
    console.log(
      '\n--- Step 1: C positioned automatically, F vs [C] returned ---'
    );
    let match = tournament.getNextMatch();
    expect(match).toBeTruthy(); // Should return F vs C match
    expect(tournament.getRankings()).toEqual(['C']); // C should be positioned
    console.log('After C positioned: sorted =', tournament.getRankings());

    // Step 2: F vs [C] (this is the match returned from step 1)
    console.log('\n--- Step 2: F vs [C] (from previous call) ---');
    expect(match).toBeTruthy();
    expect(match.originalMatch.task).toBe('F');
    expect(match.originalMatch.anchor1).toBe('C');
    expect(match.originalMatch.anchor2).toBeNull();
    expect(match.originalMatch.comparisonType).toBe('two-way');
    console.log('F vs [C] -> choosing "below" (after)');
    tournament.reportResult(match, 'below');
    expect(tournament.getRankings()).toEqual(['C', 'F']);
    console.log('After F: sorted =', tournament.getRankings());

    // Step 3: B vs [C, F]
    console.log('\n--- Step 3: B vs [C, F] ---');
    match = tournament.getNextMatch();
    expect(match).toBeTruthy();
    expect(match.originalMatch.task).toBe('B');
    expect(match.originalMatch.anchor1).toBe('C');
    expect(match.originalMatch.anchor2).toBe('F');
    expect(match.originalMatch.comparisonType).toBe('three-way');
    console.log('B vs [C, F] -> choosing "above" (before)');
    tournament.reportResult(match, 'above');
    expect(tournament.getRankings()).toEqual(['B', 'C', 'F']);
    console.log('After B: sorted =', tournament.getRankings());

    // Step 4a: E vs [B, C, F] - initial narrowing
    console.log('\n--- Step 4a: E vs [B, C, F] - initial ---');
    match = tournament.getNextMatch();
    expect(match).toBeTruthy();
    expect(match.originalMatch.task).toBe('E');
    expect(match.originalMatch.anchor1).toBe('B');
    expect(match.originalMatch.anchor2).toBe('C');
    expect(match.originalMatch.comparisonType).toBe('three-way');
    console.log('E vs [B, C] -> choosing "below" (narrows range)');
    tournament.reportResult(match, 'below');

    // Step 4b: E continues narrowing
    console.log('\n--- Step 4b: E narrowed range ---');
    match = tournament.getNextMatch();
    expect(match).toBeTruthy();
    expect(match.originalMatch.task).toBe('E');
    expect(match.originalMatch.anchor1).toBe('F');
    expect(match.originalMatch.anchor2).toBeNull();
    expect(match.originalMatch.comparisonType).toBe('two-way');
    console.log('E vs [F] -> choosing "above" (before F)');
    tournament.reportResult(match, 'above'); // This should position E before F
    expect(tournament.getRankings()).toEqual(['B', 'C', 'E', 'F']);
    console.log('After E: sorted =', tournament.getRankings());

    // Step 5: A vs [B, C, E, F] - algorithm chooses anchors
    console.log('\n--- Step 5: A vs [B, C, E, F] ---');
    match = tournament.getNextMatch();
    expect(match).toBeTruthy();
    expect(match.originalMatch.task).toBe('A');
    expect(match.originalMatch.anchor1).toBe('B');
    expect(match.originalMatch.anchor2).toBe('E');
    expect(match.originalMatch.comparisonType).toBe('three-way');
    console.log('A vs [B, E] -> choosing "above" (before B)');
    tournament.reportResult(match, 'above');
    expect(tournament.getRankings()).toEqual(['A', 'B', 'C', 'E', 'F']);
    console.log('After A: sorted =', tournament.getRankings());

    // Step 6a: D vs [A, B, C, E, F] - initial comparison
    console.log('\n--- Step 6a: D vs [A, B, C, E, F] - initial ---');
    match = tournament.getNextMatch();
    expect(match).toBeTruthy();
    expect(match.originalMatch.task).toBe('D');
    expect(match.originalMatch.anchor1).toBe('B');
    expect(match.originalMatch.anchor2).toBe('E');
    expect(match.originalMatch.comparisonType).toBe('three-way');
    console.log('D vs [B, E] -> choosing "between" (narrows range)');
    tournament.reportResult(match, 'between');

    // Step 6b: D continues narrowing
    console.log('\n--- Step 6b: D narrowed range ---');
    match = tournament.getNextMatch();
    expect(match).toBeTruthy();
    expect(match.originalMatch.task).toBe('D');
    expect(match.originalMatch.anchor1).toBe('C');
    expect(match.originalMatch.anchor2).toBeNull();
    expect(match.originalMatch.comparisonType).toBe('two-way');
    console.log('D vs [C] -> choosing "below" (after C)');
    tournament.reportResult(match, 'below'); // This should position D after C

    // D should be positioned now
    const currentRankings = tournament.getRankings();
    expect(currentRankings).toContain('D');
    expect(currentRankings.length).toBe(6); // All tasks should be positioned
    console.log('After D: sorted =', currentRankings);

    // Final verification
    console.log('\n=== FINAL RESULTS ===');
    expect(tournament.isComplete()).toBe(true);
    expect(tournament.getNextMatch()).toBeNull();
    const finalRankings = tournament.getRankings();
    console.log('Final sorted:', finalRankings);
    expect(finalRankings).toEqual(['A', 'B', 'C', 'D', 'E', 'F']); // Expected alphabetical order
    console.log('✅ Tournament completed successfully!');
  });

  it('should maintain proper separation between ranked and unranked tasks', () => {
    // Test that anchors only come from sorted tasks
    const match1 = tournament.getNextMatch(); // Should auto-position first task
    expect(tournament.getRankings()).toHaveLength(1);

    const match2 = tournament.getNextMatch(); // Should show second task
    expect(match2).toBeTruthy();
    expect(match2.originalMatch.anchor1).toBeTruthy();
    expect(match2.originalMatch.anchor2).toBeNull(); // Only one anchor for 2-way

    // The anchor should be from the sorted list
    const sortedTasks = tournament.getRankings();
    expect(sortedTasks).toContain(match2.originalMatch.anchor1);
  });

  it('should properly calculate search ranges', () => {
    // Skip first task auto-positioning
    tournament.getNextMatch();

    // Get second task match
    const match = tournament.getNextMatch();
    expect(match.originalMatch.rangeStart).toBe(0);
    expect(match.originalMatch.rangeEnd).toBe(2); // Should be sortedTasks.length + 1
  });

  it('should always produce alphabetical order regardless of input shuffle', () => {
    const baseTasks = ['A', 'B', 'C', 'D', 'E', 'F'];
    const expectedResult = ['A', 'B', 'C', 'D', 'E', 'F'];

    // Test with specific problematic sequences that we know can cause issues
    const testSequences = [
      ['A', 'B', 'C', 'D', 'E', 'F'], // Already sorted
      ['F', 'E', 'D', 'C', 'B', 'A'], // Reverse sorted
      ['C', 'F', 'B', 'E', 'A', 'D'], // Our original test case
      ['D', 'A', 'E', 'F', 'B', 'C'], // The sequence that worked
      ['B', 'D', 'A', 'F', 'C', 'E'], // Another test sequence
      ['F', 'A', 'C', 'E', 'D', 'B'], // The failing sequence
      // Additional random sequences
      ['E', 'C', 'A', 'F', 'D', 'B'], // Random 1
      ['A', 'F', 'D', 'B', 'E', 'C'], // Random 2
      ['C', 'A', 'E', 'B', 'F', 'D'], // Random 3
      ['B', 'F', 'E', 'A', 'C', 'D'], // Random 4
      ['D', 'B', 'F', 'C', 'A', 'E'], // Random 5
      ['F', 'D', 'B', 'E', 'A', 'C'], // Random 6
      ['A', 'E', 'C', 'F', 'B', 'D'], // Random 7
      ['E', 'B', 'D', 'A', 'F', 'C'], // Random 8
      ['C', 'E', 'F', 'A', 'D', 'B'], // Random 9
      ['B', 'A', 'F', 'E', 'C', 'D'], // Random 10
    ];

    // Helper function to run tournament with alphabetical choices
    function runAlphabeticalTournament(tasks) {
      const tournament = new InsertionTournament(tasks, {});
      let step = 0;

      while (!tournament.isComplete()) {
        const match = tournament.getNextMatch();
        if (!match) break;

        const { task, anchor1, anchor2, comparisonType } = match.originalMatch;
        step++;

        let choice;
        if (comparisonType === 'two-way') {
          // Compare task with anchor1 alphabetically
          choice = task < anchor1 ? 'above' : 'below';
        } else if (comparisonType === 'three-way') {
          // Compare task with anchor1 and anchor2 alphabetically
          if (task < anchor1) {
            choice = 'above';
          } else if (anchor2 && task > anchor2) {
            choice = 'below';
          } else {
            // Task belongs between anchor1 and anchor2 (or after anchor1 if no anchor2)
            choice = 'between';
          }
        }

        console.log(
          `  Step ${step}: ${task} vs [${anchor1}${anchor2 ? ', ' + anchor2 : ''}] -> ${choice}`
        );
        tournament.reportResult(match, choice);
        console.log(`  After: [${tournament.getRankings().join(', ')}]`);
      }

      return tournament.getRankings();
    }

    // Test all sequences to ensure they all produce correct alphabetical order
    testSequences.forEach((sequence, index) => {
      console.log(
        `\n=== Testing sequence ${index + 1}: [${sequence.join(', ')}] ===`
      );

      const result = runAlphabeticalTournament(sequence);
      console.log(`Final order: [${result.join(', ')}]`);

      if (JSON.stringify(result) !== JSON.stringify(expectedResult)) {
        console.log(
          `❌ MISMATCH: Got [${result.join(', ')}] but expected [${expectedResult.join(', ')}]`
        );
        // Fail the test immediately on first mismatch
        expect(result).toEqual(expectedResult);
      } else {
        console.log(`✅ Correct alphabetical order achieved!`);
      }
    });

    console.log(
      `✅ All ${testSequences.length} test sequences produced correct alphabetical order!`
    );
  });
});
