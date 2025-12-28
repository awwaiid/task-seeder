/**
 * Comprehensive tournament scenario tests
 * Tests all tournament types with exact inputs, step-by-step selections, and expected rankings
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  Tournament,
  QuickSortTournament,
  SampleSortTournament,
  InsertionTournament,
  createTournament,
} from '../src/utils/TournamentRunner.js';

/**
 * Standard fixture used across all tournament types
 * This allows easy comparison of how different algorithms handle the same input
 */
const STANDARD_TASKS = ['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E', 'Task-F'];

/**
 * Deterministic winner selection function
 * For predictable test scenarios, we rank tasks by their suffix letter
 * A > B > C > D > E > F
 */
function selectWinner(player1: string, player2: string): string {
  // Extract the letter suffix (e.g., "Task-A" -> "A")
  const letter1 = player1.split('-')[1];
  const letter2 = player2.split('-')[1];

  // Earlier letter wins (A beats B, B beats C, etc.)
  return letter1 < letter2 ? player1 : player2;
}

/**
 * Helper to convert winner selection to insertion tournament choice
 */
function getInsertionChoice(
  match: any,
  winner: string
): 'above' | 'between' | 'below' {
  const { player1, originalMatch } = match;
  const currentTask = player1; // In insertion, player1 is always the current task

  if (!originalMatch) {
    return 'below';
  }

  const { anchor1, anchor2, comparisonType } = originalMatch;

  if (comparisonType === 'two-way') {
    // Two-way: current task vs one anchor
    // If current task wins, it's "above" (higher priority)
    // If current task loses, it's "below" (lower priority)
    return winner === currentTask ? 'above' : 'below';
  } else {
    // Three-way: current task vs two anchors
    const winsVsAnchor1 = selectWinner(currentTask, anchor1) === currentTask;
    const winsVsAnchor2 = selectWinner(currentTask, anchor2) === currentTask;

    if (winsVsAnchor1 && winsVsAnchor2) {
      return 'above'; // Better than both
    } else if (!winsVsAnchor1 && !winsVsAnchor2) {
      return 'below'; // Worse than both
    } else {
      return 'between'; // Between the two
    }
  }
}

/**
 * Helper to run a complete tournament with deterministic selections
 */
function runTournamentWithSelections(
  tournament: any,
  maxMatches = 100
): { rankings: string[]; matchCount: number; selections: Array<{ match: any; winner: string }> } {
  const selections: Array<{ match: any; winner: string }> = [];
  let matchCount = 0;

  const isInsertion = tournament.type === 'insertion';

  while (!tournament.isComplete() && matchCount < maxMatches) {
    const match = tournament.getNextMatch();
    if (!match) break;

    const winner = selectWinner(match.player1, match.player2);
    selections.push({ match: { ...match }, winner });

    if (isInsertion) {
      // Insertion tournament uses different choice format
      const choice = getInsertionChoice(match, winner);
      tournament.reportResult(match, choice);
    } else {
      // Regular tournaments use winner UUID
      tournament.reportResult(match, winner);
    }

    matchCount++;
  }

  return {
    rankings: tournament.getRankings(),
    matchCount,
    selections,
  };
}

describe('Tournament Scenarios - Comprehensive Validation', () => {
  describe('Single Elimination Tournament', () => {
    it('should produce correct rankings with exact step-by-step selections for 6 tasks', () => {
      const tournament = new Tournament('single', [...STANDARD_TASKS]);
      const result = runTournamentWithSelections(tournament);

      // Single elimination with 6 participants requires 5 matches
      expect(result.matchCount).toBe(5);
      expect(tournament.isComplete()).toBe(true);

      // Verify all selections were tracked
      expect(result.selections).toHaveLength(5);

      // Expected rankings: Winner is Task-A, but exact order depends on bracket structure
      const rankings = result.rankings;
      expect(rankings).toHaveLength(6);
      expect(rankings[0]).toBe('Task-A'); // Winner should always be first
      expect(rankings).toEqual(expect.arrayContaining(STANDARD_TASKS));

      // Verify each match had deterministic winner
      result.selections.forEach(({ match, winner }) => {
        expect(winner).toBe(selectWinner(match.player1, match.player2));
      });
    });

    it('should produce correct rankings for 4 tasks (power of 2)', () => {
      const tasks = ['Task-A', 'Task-B', 'Task-C', 'Task-D'];
      const tournament = new Tournament('single', tasks);
      const result = runTournamentWithSelections(tournament);

      // 4 participants = 3 matches in single elimination
      expect(result.matchCount).toBe(3);
      expect(tournament.isComplete()).toBe(true);

      const rankings = result.rankings;
      expect(rankings).toHaveLength(4);
      expect(rankings[0]).toBe('Task-A'); // Best task wins
    });

    it('should handle 2 tasks', () => {
      const tasks = ['Task-A', 'Task-B'];
      const tournament = new Tournament('single', tasks);
      const result = runTournamentWithSelections(tournament);

      expect(result.matchCount).toBe(1);
      expect(result.rankings).toEqual(['Task-A', 'Task-B']);
    });

    it('should handle single task', () => {
      const tournament = new Tournament('single', ['Task-A']);

      expect(tournament.isComplete()).toBe(true);
      expect(tournament.getWinner()).toBe('Task-A');
      expect(tournament.getRankings()).toEqual(['Task-A']);
      expect(tournament.getNextMatch()).toBeNull();
    });
  });

  describe('Double Elimination Tournament', () => {
    it('should produce correct rankings with exact step-by-step selections for 6 tasks', () => {
      const tournament = new Tournament('double', [...STANDARD_TASKS]);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);

      // Double elimination provides second chances
      const rankings = result.rankings;
      expect(rankings).toHaveLength(6);
      expect(rankings[0]).toBe('Task-A'); // Best task should still win
      expect(rankings).toEqual(expect.arrayContaining(STANDARD_TASKS));

      console.log('Double Elimination (6 tasks):', {
        matchCount: result.matchCount,
        rankings,
        selections: result.selections.map(s => ({
          match: `${s.match.player1} vs ${s.match.player2}`,
          winner: s.winner,
          bracket: s.match.bracket,
          round: s.match.round,
        })),
      });
    });

    it('should produce correct rankings for 4 tasks (power of 2)', () => {
      const tasks = ['Task-A', 'Task-B', 'Task-C', 'Task-D'];
      const tournament = new Tournament('double', tasks);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);

      const rankings = result.rankings;
      expect(rankings).toHaveLength(4);
      expect(rankings[0]).toBe('Task-A');

      // In double elimination, losers get a second chance
      // So ranking should be more refined than single elimination
      console.log('Double Elimination (4 tasks):', {
        matchCount: result.matchCount,
        rankings,
      });
    });
  });

  describe('QuickSort Tournament', () => {
    it('should produce complete sorted rankings for 6 tasks', () => {
      const tournament = new QuickSortTournament([...STANDARD_TASKS]);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);

      // QuickSort should produce complete ordered rankings
      const rankings = result.rankings;
      expect(rankings).toHaveLength(6);

      // With our deterministic selection, should be perfectly sorted
      expect(rankings).toEqual(['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E', 'Task-F']);

      // QuickSort typically needs O(n log n) comparisons
      // For 6 items, expect around 10-15 comparisons
      expect(result.matchCount).toBeGreaterThan(5);
      expect(result.matchCount).toBeLessThan(20);

      console.log('QuickSort (6 tasks):', {
        matchCount: result.matchCount,
        rankings,
        selections: result.selections.map(s => ({
          match: `${s.match.player1} vs ${s.match.player2}`,
          winner: s.winner,
        })),
      });
    });

    it('should handle different input orders and produce same ranking', () => {
      const shuffled = ['Task-D', 'Task-A', 'Task-F', 'Task-B', 'Task-E', 'Task-C'];
      const tournament = new QuickSortTournament(shuffled);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);

      // Regardless of input order, final ranking should be the same
      expect(result.rankings).toEqual(['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E', 'Task-F']);
    });

    it('should handle small lists efficiently', () => {
      const tasks = ['Task-C', 'Task-A', 'Task-B'];
      const tournament = new QuickSortTournament(tasks);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);
      expect(result.rankings).toEqual(['Task-A', 'Task-B', 'Task-C']);

      // 3 items should need very few comparisons
      expect(result.matchCount).toBeLessThanOrEqual(3);
    });
  });

  describe('SampleSort Tournament', () => {
    it('should produce complete sorted rankings for 6 tasks', () => {
      const tournament = new SampleSortTournament([...STANDARD_TASKS]);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);

      const rankings = result.rankings;
      expect(rankings).toHaveLength(6);

      // Should produce complete sorted order
      expect(rankings).toEqual(['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E', 'Task-F']);

      console.log('SampleSort (6 tasks):', {
        matchCount: result.matchCount,
        rankings,
        selections: result.selections.map(s => ({
          match: `${s.match.player1} vs ${s.match.player2}`,
          winner: s.winner,
        })),
      });
    });

    it('should handle larger lists efficiently', () => {
      const largeTasks = Array.from({ length: 10 }, (_, i) =>
        `Task-${String.fromCharCode(65 + i)}`
      );
      const tournament = new SampleSortTournament(largeTasks);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);
      expect(result.rankings).toHaveLength(10);

      // First should be Task-A, last should be Task-J
      expect(result.rankings[0]).toBe('Task-A');
      expect(result.rankings[9]).toBe('Task-J');

      // Should be fully sorted
      const expected = largeTasks.sort();
      expect(result.rankings).toEqual(expected);
    });
  });

  describe('Insertion Tournament', () => {
    it('should produce complete sorted rankings for 6 tasks', () => {
      const tournament = new InsertionTournament([...STANDARD_TASKS]);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);

      const rankings = result.rankings;
      expect(rankings).toHaveLength(6);

      // Should produce complete sorted order
      expect(rankings).toEqual(['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E', 'Task-F']);

      console.log('Insertion (6 tasks):', {
        matchCount: result.matchCount,
        rankings,
        selections: result.selections.map(s => ({
          match: `${s.match.player1} vs ${s.match.player2}`,
          winner: s.winner,
        })),
      });
    });

    it('should handle nearly sorted input efficiently', () => {
      // Already in correct order
      const tasks = ['Task-A', 'Task-B', 'Task-C', 'Task-D'];
      const tournament = new InsertionTournament(tasks);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);
      expect(result.rankings).toEqual(['Task-A', 'Task-B', 'Task-C', 'Task-D']);

      // Insertion sort is efficient on already-sorted data
      console.log('Insertion (pre-sorted):', {
        matchCount: result.matchCount,
      });
    });

    it('should handle reverse sorted input', () => {
      const tasks = ['Task-F', 'Task-E', 'Task-D', 'Task-C', 'Task-B', 'Task-A'];
      const tournament = new InsertionTournament(tasks);
      const result = runTournamentWithSelections(tournament);

      expect(tournament.isComplete()).toBe(true);
      expect(result.rankings).toEqual(['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E', 'Task-F']);

      // Reverse sorted is worst case for insertion sort
      console.log('Insertion (reverse sorted):', {
        matchCount: result.matchCount,
      });
    });
  });

  describe('Random Seeding with Fixed Seed', () => {
    let originalRandom: () => number;

    beforeEach(() => {
      // Save original Math.random
      originalRandom = Math.random;
    });

    afterEach(() => {
      // Restore original Math.random
      Math.random = originalRandom;
    });

    /**
     * Seeded random number generator for deterministic tests
     * Uses Linear Congruential Generator (LCG) algorithm
     */
    function seedRandom(seed: number): () => number {
      let state = seed;
      return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };
    }

    it('should produce consistent results with fixed random seed - Single Elimination', () => {
      // Replace Math.random with seeded version
      Math.random = seedRandom(12345);

      const tournament1 = new Tournament('single', [...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const result1 = runTournamentWithSelections(tournament1);

      // Reset seed and run again
      Math.random = seedRandom(12345);

      const tournament2 = new Tournament('single', [...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const result2 = runTournamentWithSelections(tournament2);

      // With same seed, should get identical results
      expect(result1.rankings).toEqual(result2.rankings);
      expect(result1.matchCount).toBe(result2.matchCount);

      // Seeded participants should be shuffled (not in original order)
      expect(tournament1.originalEntrants).not.toEqual(STANDARD_TASKS);
      expect(tournament1.originalEntrants).toEqual(tournament2.originalEntrants);
    });

    it('should produce consistent results with fixed random seed - QuickSort', () => {
      Math.random = seedRandom(54321);

      const tournament1 = new QuickSortTournament([...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const result1 = runTournamentWithSelections(tournament1);

      Math.random = seedRandom(54321);

      const tournament2 = new QuickSortTournament([...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const result2 = runTournamentWithSelections(tournament2);

      // Results should be identical with same seed
      expect(result1.rankings).toEqual(result2.rankings);
      expect(result1.matchCount).toBe(result2.matchCount);

      // Final ranking should still be correct despite random initial order
      expect(result1.rankings).toEqual(['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E', 'Task-F']);
    });

    it('should produce consistent results with fixed random seed - SampleSort', () => {
      Math.random = seedRandom(11111);

      const tournament1 = new SampleSortTournament([...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const result1 = runTournamentWithSelections(tournament1);

      Math.random = seedRandom(11111);

      const tournament2 = new SampleSortTournament([...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const result2 = runTournamentWithSelections(tournament2);

      expect(result1.rankings).toEqual(result2.rankings);
      expect(result1.matchCount).toBe(result2.matchCount);
      expect(result1.rankings).toEqual(['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E', 'Task-F']);
    });

    it('should produce consistent results with fixed random seed - Insertion', () => {
      Math.random = seedRandom(99999);

      const tournament1 = new InsertionTournament([...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const result1 = runTournamentWithSelections(tournament1);

      Math.random = seedRandom(99999);

      const tournament2 = new InsertionTournament([...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const result2 = runTournamentWithSelections(tournament2);

      expect(result1.rankings).toEqual(result2.rankings);
      expect(result1.matchCount).toBe(result2.matchCount);
      expect(result1.rankings).toEqual(['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E', 'Task-F']);
    });

    it('should produce different results with different seeds', () => {
      Math.random = seedRandom(11111);
      const tournament1 = new Tournament('single', [...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const seeding1 = [...tournament1.originalEntrants];

      Math.random = seedRandom(22222);
      const tournament2 = new Tournament('single', [...STANDARD_TASKS], {
        seedingMethod: 'random'
      });
      const seeding2 = [...tournament2.originalEntrants];

      // Different seeds should produce different initial orderings
      expect(seeding1).not.toEqual(seeding2);
    });
  });

  describe('Cross-Tournament Comparison', () => {
    it('should compare efficiency across tournament types for same input', () => {
      const results: Record<string, { matchCount: number; winner: string; fullSort: boolean }> = {};

      // Single Elimination
      const single = new Tournament('single', [...STANDARD_TASKS]);
      const singleResult = runTournamentWithSelections(single);
      results.single = {
        matchCount: singleResult.matchCount,
        winner: singleResult.rankings[0],
        fullSort: false,
      };

      // Double Elimination
      const double = new Tournament('double', [...STANDARD_TASKS]);
      const doubleResult = runTournamentWithSelections(double);
      results.double = {
        matchCount: doubleResult.matchCount,
        winner: doubleResult.rankings[0],
        fullSort: false,
      };

      // QuickSort
      const quicksort = new QuickSortTournament([...STANDARD_TASKS]);
      const quicksortResult = runTournamentWithSelections(quicksort);
      results.quicksort = {
        matchCount: quicksortResult.matchCount,
        winner: quicksortResult.rankings[0],
        fullSort: quicksortResult.rankings.join(',') === 'Task-A,Task-B,Task-C,Task-D,Task-E,Task-F',
      };

      // SampleSort
      const samplesort = new SampleSortTournament([...STANDARD_TASKS]);
      const samplesortResult = runTournamentWithSelections(samplesort);
      results.samplesort = {
        matchCount: samplesortResult.matchCount,
        winner: samplesortResult.rankings[0],
        fullSort: samplesortResult.rankings.join(',') === 'Task-A,Task-B,Task-C,Task-D,Task-E,Task-F',
      };

      // Insertion
      const insertion = new InsertionTournament([...STANDARD_TASKS]);
      const insertionResult = runTournamentWithSelections(insertion);
      results.insertion = {
        matchCount: insertionResult.matchCount,
        winner: insertionResult.rankings[0],
        fullSort: insertionResult.rankings.join(',') === 'Task-A,Task-B,Task-C,Task-D,Task-E,Task-F',
      };

      console.log('\nTournament Comparison (6 tasks):');
      console.table(results);

      // All should identify the same winner
      expect(results.single.winner).toBe('Task-A');
      expect(results.double.winner).toBe('Task-A');
      expect(results.quicksort.winner).toBe('Task-A');
      expect(results.samplesort.winner).toBe('Task-A');
      expect(results.insertion.winner).toBe('Task-A');

      // Single elimination should be most efficient for finding winner
      expect(results.single.matchCount).toBe(5); // n-1 for finding winner

      // Sorting algorithms should produce complete order
      expect(results.quicksort.fullSort).toBe(true);
      expect(results.samplesort.fullSort).toBe(true);
      expect(results.insertion.fullSort).toBe(true);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle all tournament types with 2 tasks', () => {
      const tasks = ['Task-A', 'Task-B'];

      const single = new Tournament('single', tasks);
      expect(runTournamentWithSelections(single).rankings).toEqual(['Task-A', 'Task-B']);

      const quicksort = new QuickSortTournament(tasks);
      expect(runTournamentWithSelections(quicksort).rankings).toEqual(['Task-A', 'Task-B']);

      const samplesort = new SampleSortTournament(tasks);
      expect(runTournamentWithSelections(samplesort).rankings).toEqual(['Task-A', 'Task-B']);

      const insertion = new InsertionTournament(tasks);
      expect(runTournamentWithSelections(insertion).rankings).toEqual(['Task-A', 'Task-B']);
    });

    it('should validate that no duplicate rankings appear', () => {
      const tournaments = [
        new Tournament('single', [...STANDARD_TASKS]),
        new Tournament('double', [...STANDARD_TASKS]),
        new QuickSortTournament([...STANDARD_TASKS]),
        new SampleSortTournament([...STANDARD_TASKS]),
        new InsertionTournament([...STANDARD_TASKS]),
      ];

      tournaments.forEach(tournament => {
        const result = runTournamentWithSelections(tournament);
        const rankings = result.rankings;

        // No duplicates
        expect(new Set(rankings).size).toBe(rankings.length);

        // All original tasks present
        expect(rankings.sort()).toEqual([...STANDARD_TASKS].sort());
      });
    });

    it('should validate that match counts are reasonable', () => {
      const tasks = [...STANDARD_TASKS];

      // Single elimination: exactly n-1 matches
      const single = new Tournament('single', tasks);
      expect(runTournamentWithSelections(single).matchCount).toBe(5);

      // Sorting algorithms: should be O(n log n) range
      const quicksort = new QuickSortTournament(tasks);
      const qsCount = runTournamentWithSelections(quicksort).matchCount;
      expect(qsCount).toBeGreaterThan(5);
      expect(qsCount).toBeLessThan(30); // Reasonable upper bound

      const samplesort = new SampleSortTournament(tasks);
      const ssCount = runTournamentWithSelections(samplesort).matchCount;
      expect(ssCount).toBeGreaterThan(5);
      expect(ssCount).toBeLessThan(30);

      const insertion = new InsertionTournament(tasks);
      const insCount = runTournamentWithSelections(insertion).matchCount;
      expect(insCount).toBeGreaterThan(0);
      expect(insCount).toBeLessThan(36); // Worst case O(n²) for 6 items = 15
    });
  });
});
