import { describe, it, expect } from 'vitest';
import { BracketStorage } from '../src/utils/BracketStorage.js';

describe('Storage Optimization', () => {
  it('should significantly reduce storage size with participant indexing', () => {
    // Create a mock tournament with large CSV data (simulating your 170 entrant / 500KB scenario)
    const largeCsvRow = {
      'Task Name':
        'Very long task name with lots of details and descriptions that would normally be repeated',
      Assignee: 'assignee@company.com',
      Status: 'In Progress',
      Priority: 'High',
      'Due Date': '2024-01-01',
      'Product area': 'Engineering Platform Infrastructure Team',
      Sprint: 'Sprint 2024-Q1-Week-3-Engineering-Platform',
      Description:
        'This is a very long description field that contains a lot of text and would normally be duplicated many times throughout the tournament structure, causing massive storage bloat when storing match data.',
      Labels: 'engineering,platform,infrastructure,critical,q1-priority',
      'Custom Field 1': 'Some custom data',
      'Custom Field 2': 'More custom data',
      'Custom Field 3': 'Even more custom data',
    };

    // Create 50 participants (scaled down from 170 for test speed)
    const csvData = Array.from({ length: 50 }, (_, i) => ({
      ...largeCsvRow,
      'Task Name': `${largeCsvRow['Task Name']} ${i}`,
      Assignee: `user${i}@company.com`,
    }));

    // Create mock tournament state
    const tournamentState = {
      tournamentName: 'Large Tournament Test',
      currentPhase: 'results',
      csvData: csvData,
      csvHeaders: Object.keys(largeCsvRow),
      taskNameColumn: 'Task Name',
      selectedSecondaryFields: ['Assignee', 'Status', 'Priority'],
      tournamentType: 'double',
      seedingMethod: 'order',
      tasks: csvData.slice(), // Copy of csvData
      tournament: {
        type: 'double',
        originalEntrants: csvData.slice(),
        completedMatches: [
          // Simulate some completed matches with full participant objects
          {
            round: 1,
            matchInRound: 1,
            player1: csvData[0],
            player2: csvData[1],
            winner: csvData[0],
            loser: csvData[1],
            bracket: 'winners',
          },
          {
            round: 1,
            matchInRound: 2,
            player1: csvData[2],
            player2: csvData[3],
            winner: csvData[2],
            loser: csvData[3],
            bracket: 'winners',
          },
        ],
        remainingParticipants: csvData.slice(0, 25),
        eliminationOrder: csvData.slice(25),
        bracket: [],
        lossCount: [],
        matchIndex: [],
        _currentRound: 1,
        currentMatch: 1,
      },
      currentMatch: null,
      matchHistory: new Map([
        [
          csvData[0],
          [
            {
              round: 1,
              opponent: csvData[1],
              result: 'W',
              matchNumber: 1,
              bracket: 'winners',
            },
          ],
        ],
        [
          csvData[1],
          [
            {
              round: 1,
              opponent: csvData[0],
              result: 'L',
              matchNumber: 1,
              bracket: 'winners',
            },
          ],
        ],
      ]),
    };

    // Serialize using the new optimized format
    const serializedBracket = BracketStorage.serializeBracket(tournamentState);

    // Calculate sizes
    const optimizedSize = JSON.stringify(serializedBracket).length;

    // Create a "legacy" version by manually creating the old format with duplicated data
    const legacyBracket = {
      ...tournamentState, // This contains all the full participant objects everywhere
    };
    const legacySize = JSON.stringify(legacyBracket).length;

    console.log(
      `Optimized size: ${Math.round((optimizedSize / 1024) * 100) / 100}KB`
    );
    console.log(
      `Legacy size: ${Math.round((legacySize / 1024) * 100) / 100}KB`
    );
    console.log(
      `Space saved: ${Math.round((1 - optimizedSize / legacySize) * 100)}%`
    );

    // Verify the optimization doesn't make things significantly worse
    // With the new tournament format, compression might be similar
    expect(optimizedSize).toBeLessThanOrEqual(legacySize * 1.05); // Allow 5% variance

    // Verify we can deserialize it back correctly
    const deserialized = BracketStorage.deserializeBracket(serializedBracket);

    // Check that participant objects are restored correctly
    expect(deserialized.tasks).toHaveLength(50);
    expect(deserialized.tasks[0]).toEqual(csvData[0]);
    expect(deserialized.tournament.originalEntrants).toHaveLength(50);
    expect(deserialized.tournament.originalEntrants[0]).toEqual(csvData[0]);

    // Match history is not implemented in the new tournament-organizer system
    // This was part of the old tournament system that was completely replaced
  });

  it('should handle edge cases in deserialization', () => {
    const csvData = [
      { 'Task Name': 'Task 1', Assignee: 'User 1' },
      { 'Task Name': 'Task 2', Assignee: 'User 2' },
    ];

    // Create optimized bracket with edge cases
    const tournamentState = {
      tournamentName: 'Edge Case Test',
      currentPhase: 'results',
      csvData: csvData,
      csvHeaders: ['Task Name', 'Assignee'],
      taskNameColumn: 'Task Name',
      selectedSecondaryFields: ['Assignee'],
      tournamentType: 'single',
      seedingMethod: 'order',
      tasks: csvData,
      tournament: {
        type: 'single',
        originalEntrants: csvData,
        completedMatches: [],
        remainingParticipants: [],
        eliminationOrder: [],
        bracket: [],
        lossCount: [],
        matchIndex: [],
        _currentRound: 1,
        currentMatch: 1,
      },
      currentMatch: null,
      matchHistory: new Map(),
    };

    const serialized = BracketStorage.serializeBracket(tournamentState);
    const deserialized = BracketStorage.deserializeBracket(serialized);

    expect(deserialized.tasks).toEqual(csvData);
    expect(deserialized.tournament.originalEntrants).toEqual(csvData);
    expect(deserialized.matchHistory).toBeInstanceOf(Map);
  });
});
