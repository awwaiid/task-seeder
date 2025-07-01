/**
 * Shared type definitions for the tournament system
 */

// Basic types
export interface Task {
  [key: string]: any;
}

export type Participant = Task;

export type ParticipantUUID = string;

export type TournamentType = 'single' | 'double' | 'quicksort';

export type CurrentPhase = 'setup' | 'results' | 'matchups';

export type SeedingMethod = 'order' | 'random';

// Tournament interfaces
export interface TournamentOptions {
  progressCallback?: ((progress: any) => void) | null;
  taskNameColumn?: string;
  seedingMethod?: SeedingMethod;
  preserveOrder?: boolean; // Skip seeding and use exact order provided (for restoration)
}

export interface ActiveMatch {
  player1: ParticipantUUID | null;
  player2: ParticipantUUID | null;
  round: number;
  matchInRound: number;
  bracket: string;
  originalMatch: any;
}

export interface MatchHistoryEntry {
  opponent: Participant;
  round: number;
  result: 'W' | 'L' | 'BYE';
  matchNumber?: number;
  bracket?: string;
}

// Removed legacy Match and Tournament interfaces - tournament-organizer handles these internally
