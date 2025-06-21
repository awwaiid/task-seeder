/**
 * Shared type definitions for the tournament system
 */

// Basic types
export interface Task {
  [key: string]: any;
}

export type Participant = Task;

export type TournamentType = 'single' | 'double';

export type CurrentPhase = 'setup' | 'results' | 'matchups';

export type SeedingMethod = 'order' | 'random';

// Tournament interfaces
export interface TournamentOptions {
  progressCallback?: ((progress: any) => void) | null;
  taskNameColumn?: string;
}

export interface ActiveMatch {
  player1: Participant | null;
  player2: Participant | null;
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
