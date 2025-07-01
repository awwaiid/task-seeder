/**
 * Bracket Storage Utility - Manages saving and loading brackets from localStorage
 * Updated to use tournament-organizer format
 */

import { StorageOptimizer } from './StorageOptimizer';
import { Tournament } from './TournamentRunner';
import type { TournamentOptions, ParticipantUUID } from '../types/tournament';

const STORAGE_KEY = 'bracketology_saved_brackets';

interface Participant {
  [key: string]: any;
}

interface TournamentState {
  tournamentName: string;
  currentPhase: string;
  csvData: Participant[];
  csvDataUUID: ParticipantUUID[]; // ParticipantUUIDs corresponding 1:1 with csvData (required)
  csvHeaders: string[];
  taskNameColumn: string;
  selectedSecondaryFields: string[];
  tournamentType: string;
  seedingMethod: string;
  tasks: Participant[];
  tournament: InstanceType<typeof Tournament> | null;
  currentMatch: any;
  matchHistory: Map<ParticipantUUID, any[]>; // Map<ParticipantUUID, MatchHistoryEntry[]>
}

export interface BracketData {
  id?: string;
  version?: string;
  name: string;
  status: string;
  csvData?: Participant[];
  csvDataUUID?: ParticipantUUID[]; // ParticipantUUIDs corresponding 1:1 with csvData
  csvHeaders?: string[];
  taskNameColumn?: string;
  selectedSecondaryFields?: string[];
  tournamentType: string;
  seedingMethod?: string;
  tasks?: Participant[];
  tournament?: any;
  currentMatch?: any;
  matchHistory?: any[];
  createdAt: string;
  lastModified?: string;
  taskCount?: number;
}

export type SavedBracket = BracketData;

export class BracketStorage {
  static saveBracket(bracketData: BracketData): string {
    try {
      // Check storage usage before saving
      if (StorageOptimizer.shouldWarnAboutStorage()) {
        console.warn('Storage getting full, cleaning up old brackets...');
        StorageOptimizer.cleanupOldBrackets(5); // Keep only 5 most recent
      }

      const brackets = this.getAllBrackets();
      const bracketId = this.generateBracketId();

      const bracketToSave = {
        id: bracketId,
        ...bracketData,
        lastModified: new Date().toISOString(),
      };

      brackets[bracketId] = bracketToSave;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(brackets));
      } catch (storageError: any) {
        // Storage full, try cleanup and retry once
        if (storageError.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded, cleaning up and retrying...');
          StorageOptimizer.cleanupOldBrackets(3); // More aggressive cleanup
          localStorage.setItem(STORAGE_KEY, JSON.stringify(brackets));
        } else {
          throw storageError;
        }
      }

      return bracketId;
    } catch (error: any) {
      console.error('Error saving bracket:', error);
      throw new Error('Failed to save bracket: ' + error.message);
    }
  }

  static loadBracket(bracketId: string): BracketData | null {
    try {
      const brackets = this.getAllBrackets();
      return brackets[bracketId] || null;
    } catch (error) {
      console.error('Error loading bracket:', error);
      return null;
    }
  }

  static getAllBrackets(): Record<string, BracketData> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading brackets from storage:', error);
      return {};
    }
  }

  static deleteBracket(bracketId: string): boolean {
    try {
      const brackets = this.getAllBrackets();
      delete brackets[bracketId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(brackets));
      return true;
    } catch (error) {
      console.error('Error deleting bracket:', error);
      return false;
    }
  }

  static updateBracket(
    bracketId: string,
    updates: Partial<BracketData>
  ): BracketData {
    try {
      const brackets = this.getAllBrackets();
      if (!brackets[bracketId]) {
        throw new Error('Bracket not found');
      }

      brackets[bracketId] = {
        ...brackets[bracketId],
        ...updates,
        lastModified: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(brackets));
      return brackets[bracketId];
    } catch (error) {
      console.error('Error updating bracket:', error);
      throw error;
    }
  }

  static getBracketsList(): BracketData[] {
    const brackets = this.getAllBrackets();
    return Object.values(brackets).sort(
      (a, b) =>
        new Date(b.lastModified || b.createdAt).getTime() - new Date(a.lastModified || a.createdAt).getTime()
    );
  }

  static generateBracketId(): string {
    return (
      'bracket_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    );
  }

  static serializeBracket(tournamentState: TournamentState): BracketData {
    return {
      version: '3.0', // Increment version for UUID support
      name: tournamentState.tournamentName,
      status: tournamentState.currentPhase,
      csvData: tournamentState.csvData,
      csvDataUUID: tournamentState.csvDataUUID,
      csvHeaders: tournamentState.csvHeaders,
      taskNameColumn: tournamentState.taskNameColumn,
      selectedSecondaryFields: tournamentState.selectedSecondaryFields,
      tournamentType: tournamentState.tournamentType,
      seedingMethod: tournamentState.seedingMethod,
      tasks: tournamentState.tasks,
      tournament: tournamentState.tournament
        ? tournamentState.tournament.exportState
          ? tournamentState.tournament.exportState()
          : tournamentState.tournament
        : null,
      currentMatch: tournamentState.currentMatch,
      matchHistory: Array.from(tournamentState.matchHistory.entries()), // Convert Map to array for serialization
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
  }

  static deserializeBracket(
    bracketData: BracketData,
    options: TournamentOptions = {}
  ): any {
    const state: any = { ...bracketData };

    // Ensure csvDataUUID exists (required in new format)
    if (!state.csvDataUUID) {
      throw new Error('Invalid bracket data: csvDataUUID is required');
    }

    // Restore matchHistory as Map
    if (Array.isArray(state.matchHistory)) {
      // Convert array format back to Map
      state.matchHistory = new Map(state.matchHistory);
    } else {
      state.matchHistory = new Map();
    }

    // Restore tournament using the new API
    if (state.tournament) {
      try {
        state.tournament = Tournament.fromStoredState(state.tournament, {
          ...options,
          taskNameColumn: bracketData.taskNameColumn || 'task',
        });
        state.tasks = bracketData.csvData; // Tasks are just the participants
        state.currentMatch = null; // Current match is managed by tournament-organizer
      } catch (error) {
        console.error('Error restoring tournament from stored state:', error);
        console.warn(
          'Tournament restoration failed. Tournament will need to be recreated.'
        );
        // Don't create a fallback tournament here - let TournamentManager handle it
        state.tournament = null;
        state.tasks = bracketData.csvData;
        state.currentMatch = null;
        state.matchHistory = new Map();
      }
    }

    return state;
  }
}
