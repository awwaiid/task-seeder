/**
 * Unit tests for tournament serialization and deserialization round trip
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BracketStorage } from '../BracketStorage';
import { TournamentAPI } from '../TournamentAPI';
import { createTournament } from '../TournamentRunner';
import type { ParticipantUUID } from '../../types/tournament';

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

    mockTaskUUIDs = ['task_0', 'task_1', 'task_2', 'task_3'] as ParticipantUUID[];

    // Create mock match history with some completed matches
    mockMatchHistory = new Map();
    mockMatchHistory.set('task_0' as ParticipantUUID, [
      {
        round: 1,
        opponent: mockTasks[1],
        result: 'W' as const,
        matchNumber: 1,
        bracket: 'main',
      }
    ]);
    mockMatchHistory.set('task_1' as ParticipantUUID, [
      {
        round: 1,
        opponent: mockTasks[0],
        result: 'L' as const,
        matchNumber: 1,
        bracket: 'main',
      }
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
      ['task_0', [{ round: 1, opponent: mockTasks[1], result: 'W', matchNumber: 1, bracket: 'main' }]],
      ['task_1', [{ round: 1, opponent: mockTasks[0], result: 'L', matchNumber: 1, bracket: 'main' }]]
    ]);

    // Deserialize back to bracket format
    const deserialized = BracketStorage.deserializeBracket(serialized);
    
    // Verify match history was converted back to Map
    expect(deserialized.matchHistory instanceof Map).toBe(true);
    expect(deserialized.matchHistory.size).toBe(2);
    
    // Verify Map contains the correct data
    const deserializedHistory = deserialized.matchHistory as Map<ParticipantUUID, any[]>;
    expect(deserializedHistory.get('task_0' as ParticipantUUID)).toEqual([
      { round: 1, opponent: mockTasks[1], result: 'W', matchNumber: 1, bracket: 'main' }
    ]);
    expect(deserializedHistory.get('task_1' as ParticipantUUID)).toEqual([
      { round: 1, opponent: mockTasks[0], result: 'L', matchNumber: 1, bracket: 'main' }
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
      matchHistory: tournamentData.matchHistory instanceof Map 
        ? Array.from(tournamentData.matchHistory.entries()) 
        : tournamentData.matchHistory
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
    const convertedBack = TournamentAPI.convertTournamentToBracket(mockTournamentResponse);

    // Verify match history was properly converted back to Map
    expect(convertedBack.matchHistory instanceof Map).toBe(true);
    const restoredHistory = convertedBack.matchHistory as Map<ParticipantUUID, any[]>;
    expect(restoredHistory.size).toBe(2);
    expect(restoredHistory.get('task_0' as ParticipantUUID)).toEqual([
      { round: 1, opponent: mockTasks[1], result: 'W', matchNumber: 1, bracket: 'main' }
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
        expect(deserialized.tournament.getCurrentMatchNumber()).toBeGreaterThan(1);
      }
    }
  });

  it('should preserve match history data integrity through full cycle', () => {
    // Create more complex match history
    const complexHistory = new Map();
    
    // Multiple matches for first participant
    complexHistory.set('task_0' as ParticipantUUID, [
      { round: 1, opponent: mockTasks[1], result: 'W', matchNumber: 1, bracket: 'main' },
      { round: 2, opponent: mockTasks[2], result: 'W', matchNumber: 3, bracket: 'main' },
    ]);
    
    // Single match for second participant
    complexHistory.set('task_1' as ParticipantUUID, [
      { round: 1, opponent: mockTasks[0], result: 'L', matchNumber: 1, bracket: 'main' },
    ]);

    // Eliminated participant
    complexHistory.set('task_2' as ParticipantUUID, [
      { round: 2, opponent: mockTasks[0], result: 'L', matchNumber: 3, bracket: 'main' },
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
    const restoredHistory = deserialized.matchHistory as Map<ParticipantUUID, any[]>;
    expect(restoredHistory.size).toBe(3);
    
    // Check each participant's history
    expect(restoredHistory.get('task_0' as ParticipantUUID)).toHaveLength(2);
    expect(restoredHistory.get('task_1' as ParticipantUUID)).toHaveLength(1);
    expect(restoredHistory.get('task_2' as ParticipantUUID)).toHaveLength(1);
    
    // Verify specific match data
    const task0History = restoredHistory.get('task_0' as ParticipantUUID)!;
    expect(task0History[0]).toEqual({
      round: 1, opponent: mockTasks[1], result: 'W', matchNumber: 1, bracket: 'main'
    });
    expect(task0History[1]).toEqual({
      round: 2, opponent: mockTasks[2], result: 'W', matchNumber: 3, bracket: 'main'
    });
  });
});