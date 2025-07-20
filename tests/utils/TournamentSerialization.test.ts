/**
 * Unit tests for tournament serialization and deserialization round trip
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BracketStorage } from '../../src/utils/BracketStorage';
import { TournamentAPI } from '../../src/utils/TournamentAPI';
import { createTournament } from '../../src/utils/TournamentRunner';
import type { ParticipantUUID } from '../../src/types/tournament';

describe('Tournament Serialization Round Trip', () => {
  let mockTasks: any[];
  let mockTaskUUIDs: ParticipantUUID[];
  let mockMatchHistory: Map<ParticipantUUID, any[]>;

  beforeEach(() => {
    // Setup mock data
    mockTasks = [
      { id: 'task1', name: 'Implement dark mode theme' },
      { id: 'task2', name: 'Debug navigation stack issues' },
      { id: 'task3', name: 'Kurate app store listing' },
      { id: 'task4', name: 'Fix double-submit bug' },
    ];

    mockTaskUUIDs = [
      'task_0',
      'task_1',
      'task_2',
      'task_3',
    ] as ParticipantUUID[];

    // Create mock match history with some completed matches
    mockMatchHistory = new Map();
    mockMatchHistory.set('task_0' as ParticipantUUID, [
      {
        round: 1,
        opponent: mockTasks[1],
        result: 'W' as const,
        matchNumber: 1,
        bracket: 'main',
      },
    ]);
    mockMatchHistory.set('task_1' as ParticipantUUID, [
      {
        round: 1,
        opponent: mockTasks[0],
        result: 'L' as const,
        matchNumber: 1,
        bracket: 'main',
      },
    ]);
  });

  it('should correctly serialize and deserialize match history Map', () => {
    // Test BracketStorage serialization
    const tournamentState = {
      tournamentName: 'Test Tournament',
      currentPhase: 'matchups' as const,
      csvData: mockTasks,
      csvDataUUID: mockTaskUUIDs,
      csvHeaders: ['id', 'name'],
      taskNameColumn: 'name',
      selectedSecondaryFields: [],
      tournamentType: 'single' as const,
      seedingMethod: 'order' as const,
      tasks: mockTasks,
      tournament: null,
      currentMatch: null,
      matchHistory: mockMatchHistory,
    };

    // Serialize using BracketStorage
    const serialized = BracketStorage.serializeBracket(tournamentState);

    // Verify match history was converted to array
    expect(Array.isArray(serialized.matchHistory)).toBe(true);
    expect(serialized.matchHistory).toHaveLength(2);

    // Verify array contains the correct entries
    const historyArray = serialized.matchHistory as any[];
    expect(historyArray).toEqual([
      [
        'task_0',
        [
          {
            round: 1,
            opponent: mockTasks[1],
            result: 'W',
            matchNumber: 1,
            bracket: 'main',
          },
        ],
      ],
      [
        'task_1',
        [
          {
            round: 1,
            opponent: mockTasks[0],
            result: 'L',
            matchNumber: 1,
            bracket: 'main',
          },
        ],
      ],
    ]);

    // Deserialize back to bracket format
    const deserialized = BracketStorage.deserializeBracket(serialized);

    // Verify match history was converted back to Map
    expect(deserialized.matchHistory instanceof Map).toBe(true);
    expect(deserialized.matchHistory.size).toBe(2);

    // Verify Map contains the correct data
    const deserializedHistory = deserialized.matchHistory as Map<
      ParticipantUUID,
      any[]
    >;
    expect(deserializedHistory.get('task_0' as ParticipantUUID)).toEqual([
      {
        round: 1,
        opponent: mockTasks[1],
        result: 'W',
        matchNumber: 1,
        bracket: 'main',
      },
    ]);
    expect(deserializedHistory.get('task_1' as ParticipantUUID)).toEqual([
      {
        round: 1,
        opponent: mockTasks[0],
        result: 'L',
        matchNumber: 1,
        bracket: 'main',
      },
    ]);
  });

  it('should correctly handle API serialization round trip', () => {
    const tournamentData = {
      tournamentName: 'API Test Tournament',
      currentPhase: 'matchups' as const,
      csvData: mockTasks,
      csvDataUUID: mockTaskUUIDs,
      csvHeaders: ['id', 'name'],
      taskNameColumn: 'name',
      selectedSecondaryFields: [],
      tournamentType: 'single' as const,
      seedingMethod: 'order' as const,
      tasks: mockTasks,
      tournament: null,
      currentMatch: null,
      matchHistory: mockMatchHistory,
    };

    // Simulate what happens in the API
    const serializedForAPI = {
      ...tournamentData,
      matchHistory:
        tournamentData.matchHistory instanceof Map
          ? Array.from(tournamentData.matchHistory.entries())
          : tournamentData.matchHistory,
    };

    // Verify serialization for API
    expect(Array.isArray(serializedForAPI.matchHistory)).toBe(true);

    // Simulate response from database (what TournamentAPI.convertTournamentToBracket receives)
    const mockTournamentResponse: any = {
      id: 'test-id',
      name: 'API Test Tournament',
      status: 'matchups' as const,
      tournamentType: 'single' as const,
      data: serializedForAPI,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      isShared: false,
    };

    // Convert back using API function
    const convertedBack = TournamentAPI.convertTournamentToBracket(
      mockTournamentResponse
    );

    // Verify match history was properly converted back to Map
    expect(convertedBack.matchHistory instanceof Map).toBe(true);
    const restoredHistory = convertedBack.matchHistory as Map<
      ParticipantUUID,
      any[]
    >;
    expect(restoredHistory.size).toBe(2);
    expect(restoredHistory.get('task_0' as ParticipantUUID)).toEqual([
      {
        round: 1,
        opponent: mockTasks[1],
        result: 'W',
        matchNumber: 1,
        bracket: 'main',
      },
    ]);
  });

  it('should handle tournament state with actual tournament object', () => {
    // Create a real tournament object
    const tournament = createTournament('single', mockTaskUUIDs, {
      taskNameColumn: 'name',
      seedingMethod: 'order',
    });

    // Simulate making a match choice
    const firstMatch = tournament.getNextMatch();
    expect(firstMatch).toBeTruthy();

    if (firstMatch) {
      // Report a result
      tournament.reportResult(firstMatch, mockTaskUUIDs[0]!);

      // Get exported state
      const exportedState = tournament.exportState();
      expect(exportedState).toBeTruthy();

      // Test serialization with real tournament state
      const tournamentState = {
        tournamentName: 'Real Tournament Test',
        currentPhase: 'matchups' as const,
        csvData: mockTasks,
        csvDataUUID: mockTaskUUIDs,
        csvHeaders: ['id', 'name'],
        taskNameColumn: 'name',
        selectedSecondaryFields: [],
        tournamentType: 'single' as const,
        seedingMethod: 'order' as const,
        tasks: mockTasks,
        tournament: exportedState,
        currentMatch: firstMatch,
        matchHistory: mockMatchHistory,
      };

      // Serialize and deserialize
      const serialized = BracketStorage.serializeBracket(tournamentState);
      const deserialized = BracketStorage.deserializeBracket(serialized, {
        taskNameColumn: 'name',
        seedingMethod: 'order',
      });

      // Verify tournament was properly restored
      expect(deserialized.tournament).toBeTruthy();
      expect(deserialized.matchHistory instanceof Map).toBe(true);

      // The tournament should maintain its state
      if (deserialized.tournament) {
        expect(deserialized.tournament.getCurrentMatchNumber()).toBeGreaterThan(
          1
        );
      }
    }
  });

  it('should preserve match history data integrity through full cycle', () => {
    // Create more complex match history
    const complexHistory = new Map();

    // Multiple matches for first participant
    complexHistory.set('task_0' as ParticipantUUID, [
      {
        round: 1,
        opponent: mockTasks[1],
        result: 'W',
        matchNumber: 1,
        bracket: 'main',
      },
      {
        round: 2,
        opponent: mockTasks[2],
        result: 'W',
        matchNumber: 3,
        bracket: 'main',
      },
    ]);

    // Single match for second participant
    complexHistory.set('task_1' as ParticipantUUID, [
      {
        round: 1,
        opponent: mockTasks[0],
        result: 'L',
        matchNumber: 1,
        bracket: 'main',
      },
    ]);

    // Eliminated participant
    complexHistory.set('task_2' as ParticipantUUID, [
      {
        round: 2,
        opponent: mockTasks[0],
        result: 'L',
        matchNumber: 3,
        bracket: 'main',
      },
    ]);

    const tournamentState = {
      tournamentName: 'Complex History Test',
      currentPhase: 'matchups' as const,
      csvData: mockTasks,
      csvDataUUID: mockTaskUUIDs,
      csvHeaders: ['id', 'name'],
      taskNameColumn: 'name',
      selectedSecondaryFields: [],
      tournamentType: 'single' as const,
      seedingMethod: 'order' as const,
      tasks: mockTasks,
      tournament: null,
      currentMatch: null,
      matchHistory: complexHistory,
    };

    // Full serialization cycle
    const serialized = BracketStorage.serializeBracket(tournamentState);
    const deserialized = BracketStorage.deserializeBracket(serialized);

    // Verify all match history is preserved
    const restoredHistory = deserialized.matchHistory as Map<
      ParticipantUUID,
      any[]
    >;
    expect(restoredHistory.size).toBe(3);

    // Check each participant's history
    expect(restoredHistory.get('task_0' as ParticipantUUID)).toHaveLength(2);
    expect(restoredHistory.get('task_1' as ParticipantUUID)).toHaveLength(1);
    expect(restoredHistory.get('task_2' as ParticipantUUID)).toHaveLength(1);

    // Verify specific match data
    const task0History = restoredHistory.get('task_0' as ParticipantUUID)!;
    expect(task0History[0]).toEqual({
      round: 1,
      opponent: mockTasks[1],
      result: 'W',
      matchNumber: 1,
      bracket: 'main',
    });
    expect(task0History[1]).toEqual({
      round: 2,
      opponent: mockTasks[2],
      result: 'W',
      matchNumber: 3,
      bracket: 'main',
    });
  });

  describe('Tournament Object Round Trip Tests', () => {
    it('should serialize and deserialize single elimination tournament perfectly', () => {
      // Create tournament
      const tournament = createTournament('single', mockTaskUUIDs, {
        taskNameColumn: 'name',
        seedingMethod: 'order',
      });

      // Play some matches
      let match = tournament.getNextMatch();
      expect(match).toBeTruthy();

      if (match) {
        tournament.reportResult(match, mockTaskUUIDs[0]!);

        // Get the next match if available
        const secondMatch = tournament.getNextMatch();
        if (secondMatch) {
          tournament.reportResult(secondMatch, mockTaskUUIDs[2]!);
        }
      }

      // Export state
      const exportedState = tournament.exportState();

      // Restore tournament from state using static method
      const actualRestored = (tournament.constructor as any).fromStoredState(
        exportedState,
        {
          taskNameColumn: 'name',
          seedingMethod: 'order',
        }
      );

      // Compare all properties that should be identical
      expect(actualRestored.type).toBe(tournament.type);
      expect(actualRestored.originalEntrants).toEqual(
        tournament.originalEntrants
      );
      expect(actualRestored.taskNameColumn).toBe(tournament.taskNameColumn);
      expect(actualRestored.isComplete()).toBe(tournament.isComplete());
      expect(actualRestored.getCurrentMatchNumber()).toBe(
        tournament.getCurrentMatchNumber()
      );
      expect(actualRestored.getTotalMatches()).toBe(
        tournament.getTotalMatches()
      );
      expect(actualRestored.getTotalRounds()).toBe(tournament.getTotalRounds());
      expect(actualRestored.remainingParticipants).toEqual(
        tournament.remainingParticipants
      );

      // If tournament is complete, rankings should match
      if (tournament.isComplete()) {
        expect(actualRestored.getRankings()).toEqual(tournament.getRankings());
        expect(actualRestored.getWinner()).toBe(tournament.getWinner());
      }

      // Match history should be preserved for each participant
      for (const participantId of mockTaskUUIDs) {
        const originalHistory =
          tournament.getMatchHistoryForParticipant(participantId);
        const restoredHistory =
          actualRestored.getMatchHistoryForParticipant(participantId);
        expect(restoredHistory).toEqual(originalHistory);
      }
    });

    it('should serialize and deserialize double elimination tournament perfectly', () => {
      // Create double elimination tournament
      const tournament = createTournament('double', mockTaskUUIDs, {
        taskNameColumn: 'name',
        seedingMethod: 'order',
      });

      // Play some matches
      let match = tournament.getNextMatch();
      let matchCount = 0;
      const maxMatches = 3; // Play a few matches but don't complete

      while (match && matchCount < maxMatches) {
        // Choose winner (first participant generally wins)
        const winner = mockTaskUUIDs[0]!;
        tournament.reportResult(match, winner);
        match = tournament.getNextMatch();
        matchCount++;
      }

      // Export state
      const exportedState = tournament.exportState();

      // Restore tournament from state using static method
      const actualRestored = (tournament.constructor as any).fromStoredState(
        exportedState,
        {
          taskNameColumn: 'name',
          seedingMethod: 'order',
        }
      );

      // Compare all properties
      expect(actualRestored.type).toBe(tournament.type);
      expect(actualRestored.originalEntrants).toEqual(
        tournament.originalEntrants
      );
      expect(actualRestored.taskNameColumn).toBe(tournament.taskNameColumn);
      expect(actualRestored.isComplete()).toBe(tournament.isComplete());
      expect(actualRestored.getCurrentMatchNumber()).toBe(
        tournament.getCurrentMatchNumber()
      );
      expect(actualRestored.getTotalMatches()).toBe(
        tournament.getTotalMatches()
      );
      expect(actualRestored.remainingParticipants).toEqual(
        tournament.remainingParticipants
      );

      // Verify next match is the same
      const originalNext = tournament.getNextMatch();
      const restoredNext = actualRestored.getNextMatch();

      if (originalNext && restoredNext) {
        expect(restoredNext.round).toBe(originalNext.round);
        expect(restoredNext.bracket).toBe(originalNext.bracket);
        expect([restoredNext.player1, restoredNext.player2].sort()).toEqual(
          [originalNext.player1, originalNext.player2].sort()
        );
      } else {
        expect(originalNext).toBe(restoredNext); // Both should be null
      }
    });

    it('should serialize and deserialize QuickSort tournament perfectly', () => {
      // Create QuickSort tournament
      const tournament = createTournament('quicksort', mockTaskUUIDs, {
        taskNameColumn: 'name',
        seedingMethod: 'order',
      });

      // Play some comparisons
      let match = tournament.getNextMatch();
      let matchCount = 0;
      const maxMatches = 2; // Play a couple comparisons

      while (match && matchCount < maxMatches) {
        // Choose winner based on alphabetical order for consistency
        const winner = [match.player1, match.player2].sort()[0]!;
        tournament.reportResult(match, winner);
        match = tournament.getNextMatch();
        matchCount++;
      }

      // Export state
      const exportedState = tournament.exportState();

      // Restore tournament from state using static method
      const actualRestored = (tournament.constructor as any).fromStoredState(
        exportedState,
        {
          taskNameColumn: 'name',
          seedingMethod: 'order',
        }
      );

      // Compare all properties
      expect(actualRestored.type).toBe(tournament.type);
      expect(actualRestored.originalEntrants).toEqual(
        tournament.originalEntrants
      );
      expect(actualRestored.taskNameColumn).toBe(tournament.taskNameColumn);
      expect(actualRestored.isComplete()).toBe(tournament.isComplete());
      expect(actualRestored.getCurrentMatchNumber()).toBe(
        tournament.getCurrentMatchNumber()
      );
      expect(actualRestored.getTotalMatches()).toBe(
        tournament.getTotalMatches()
      );
      expect(actualRestored.remainingParticipants).toEqual(
        tournament.remainingParticipants
      );

      // Verify internal state for QuickSort
      expect((actualRestored as any).participants).toEqual(
        (tournament as any).participants
      );
      expect((actualRestored as any).completedComparisons).toBe(
        (tournament as any).completedComparisons
      );
      expect((actualRestored as any).comparisonResults.size).toBe(
        (tournament as any).comparisonResults.size
      );

      // Verify next match is the same
      const originalNext = tournament.getNextMatch();
      const restoredNext = actualRestored.getNextMatch();

      if (originalNext && restoredNext) {
        expect([restoredNext.player1, restoredNext.player2].sort()).toEqual(
          [originalNext.player1, originalNext.player2].sort()
        );
      } else {
        expect(originalNext).toBe(restoredNext);
      }
    });

    it('should handle completed tournaments with final results', () => {
      // Create and complete a small tournament
      const tournament = createTournament('single', mockTaskUUIDs.slice(0, 2), {
        taskNameColumn: 'name',
        seedingMethod: 'order',
      });

      // Complete the tournament
      const match = tournament.getNextMatch();
      expect(match).toBeTruthy();

      if (match) {
        tournament.reportResult(match, mockTaskUUIDs[0]!);
      }

      expect(tournament.isComplete()).toBe(true);

      // Export state
      const exportedState = tournament.exportState();
      expect(exportedState.isComplete).toBe(true);
      expect((exportedState as any).finalResults).toBeDefined();

      // Restore tournament from state using static method
      const actualRestored = (tournament.constructor as any).fromStoredState(
        exportedState,
        {
          taskNameColumn: 'name',
          seedingMethod: 'order',
        }
      );

      // Verify completion state
      expect(actualRestored.isComplete()).toBe(true);
      expect(actualRestored.getRankings()).toEqual(tournament.getRankings());
      expect(actualRestored.getWinner()).toBe(tournament.getWinner());
      expect(actualRestored.getNextMatch()).toBeNull();

      // Final results should be identical
      expect(actualRestored.getRankings()).toEqual([
        mockTaskUUIDs[0],
        mockTaskUUIDs[1],
      ]);
      expect(actualRestored.getWinner()).toBe(mockTaskUUIDs[0]);
    });

    it('should preserve all match data through serialization', () => {
      // Create tournament and play all matches
      const tournament = createTournament('single', mockTaskUUIDs, {
        taskNameColumn: 'name',
        seedingMethod: 'order',
      });

      const allMatches = [];
      let match = tournament.getNextMatch();

      while (match) {
        allMatches.push({
          round: match.round,
          player1: match.player1,
          player2: match.player2,
        });

        // Always choose first player as winner for consistency
        tournament.reportResult(match, match.player1!);
        match = tournament.getNextMatch();
      }

      expect(tournament.isComplete()).toBe(true);

      // Export and restore
      const exportedState = tournament.exportState();
      const actualRestored = (tournament.constructor as any).fromStoredState(
        exportedState,
        {
          taskNameColumn: 'name',
          seedingMethod: 'order',
        }
      );

      // Verify all completed matches are preserved
      const originalMatches = tournament.matches;
      const restoredMatches = actualRestored.matches;

      expect(restoredMatches).toHaveLength(originalMatches.length);

      // Check each match in detail
      for (let i = 0; i < originalMatches.length; i++) {
        const orig = originalMatches[i];
        const restored = restoredMatches[i];

        expect(restored.winner).toBe(orig.winner);
        expect(restored.loser).toBe(orig.loser);
        expect(restored.player1).toBe(orig.player1);
        expect(restored.player2).toBe(orig.player2);
      }
    });
  });
});
