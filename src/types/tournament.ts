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

export interface Match {
  player1: Participant | number | null;
  player2: Participant | number | null;
  winner?: Participant | number | null;
  loser?: Participant | number | null;
  round?: number;
  matchInRound?: number;
  bracket?: string;
  [key: string]: any;
}

export interface Tournament {
  type: string;
  originalEntrants: Participant[];
  completedMatches: Match[];
  remainingParticipants: Participant[];
  eliminationOrder: Participant[];
  bracket: Match[];
  lossCount: Map<Participant, number>;
  matchIndex: Map<any, any>;
  _currentRound: number;
  currentMatch: number;
}
