/**
 * Tournament Runner - Clean API for managing tournaments using tournament-organizer
 */
import TournamentOrganizer from 'tournament-organizer';
import type {
  TournamentType,
  TournamentOptions,
  ActiveMatch,
  Participant,
} from '../types/tournament';

export type { TournamentType, TournamentOptions, ActiveMatch };

export class Tournament {
  private manager: TournamentOrganizer;
  private tournament: any;
  private tournamentId: string;

  type: string;
  originalEntrants: Participant[];
  taskNameColumn: string | undefined;

  // Properties expected by tests
  get matches(): any[] {
    if (!this.tournament?.matches) return [];
    // Only return matches that have both players and were actually played
    return this.tournament.matches
      .filter((match: any) => 
        match.active === false && 
        match.player1?.id && 
        match.player2?.id &&
        !match.bye // Exclude bye matches
      )
      .map((match: any) => ({
        ...match,
        winner: this._getMatchWinner(match),
        loser: this._getMatchLoser(match),
        player1: this._findParticipantByPlayerId(match.player1?.id),
        player2: this._findParticipantByPlayerId(match.player2?.id),
      }));
  }

  get pendingMatches(): any[] {
    return (
      this.tournament?.matches?.filter((match: any) => match.active === true) ||
      []
    );
  }

  get remainingParticipants(): Participant[] {
    if (!this.tournament?.players) return this.originalEntrants;
    return this.tournament.players
      .filter((player: any) => player.active === true)
      .map((player: any) => this._findParticipantByPlayerId(player.id))
      .filter(Boolean);
  }

  constructor(
    type: TournamentType,
    entrants: Participant[],
    options: TournamentOptions = {}
  ) {
    if (!entrants || entrants.length < 1) {
      throw new Error('Tournament requires at least 1 entrant');
    }

    this.type = type;
    this.originalEntrants = [...entrants];
    this.taskNameColumn = options.taskNameColumn;

    // Handle single participant tournaments
    if (entrants.length === 1) {
      // Create a dummy tournament that's already complete
      this.manager = new TournamentOrganizer();
      this.tournament = {
        id: 'single-player',
        status: 'complete',
        matches: [],
        players: [],
        standings: () => [{ player: { id: 'player_0' } }],
      };
      this.tournamentId = 'single-player';
      return;
    }

    // Initialize tournament-organizer
    this.manager = new TournamentOrganizer();

    // Create tournament with appropriate format
    let tournamentFormat =
      type === 'double' ? 'double-elimination' : 'single-elimination';

    // Double elimination requires at least 4 players according to tournament-organizer
    // But we'll fall back to single elimination for smaller tournaments
    if (type === 'double' && entrants.length < 4) {
      console.warn(
        'Double elimination requires at least 4 participants. Falling back to single elimination.'
      );
      tournamentFormat = 'single-elimination';
    }

    this.tournament = this.manager.createTournament('TaskSeeder Tournament', {
      stageOne: {
        format: tournamentFormat as 'single-elimination' | 'double-elimination',
        consolation: false,
      },
    });
    this.tournamentId = this.tournament.id;

    // Add all participants to tournament
    entrants.forEach((entrant, index) => {
      const playerId = `player_${index}`;
      const displayName = this._getParticipantDisplayName(entrant);
      this.tournament.createPlayer(displayName, playerId);
    });

    // Start the tournament if we have enough players
    if (entrants.length >= 2) {
      this.tournament.start();
    }
  }

  getNextMatch(): ActiveMatch | null {
    if (this.isComplete()) {
      return null;
    }

    // Get active matches from tournament-organizer
    const activeMatches = this.tournament.matches.filter(
      (match: any) => match.active === true
    );

    if (activeMatches.length === 0) {
      return null;
    }

    // Return the first active match
    const match = activeMatches[0];
    const player1 = this._findParticipantByPlayerId(match.player1.id);
    const player2 = this._findParticipantByPlayerId(match.player2.id);

    if (!player1 || !player2) {
      return null;
    }

    return {
      player1,
      player2,
      round: match.round,
      matchInRound: match.match,
      bracket: this.type,
      originalMatch: match,
    };
  }

  getTotalMatches(): number {
    return this.tournament.matches.length;
  }

  getCurrentMatchNumber(): number {
    if (!this.tournament?.matches) return 1;
    // Count only actual played matches (not byes or auto-completed)
    const completedMatches = this.tournament.matches.filter(
      (match: any) => 
        match.active === false && 
        match.player1?.id && 
        match.player2?.id &&
        !match.bye
    ).length;
    return completedMatches + 1;
  }

  getTotalRounds(): number {
    if (this.tournament.matches.length === 0) return 0;
    return Math.max(
      ...this.tournament.matches.map((match: any) => match.round)
    );
  }

  getMatchesInRound(round: number): number {
    return this.tournament.matches.filter((match: any) => match.round === round)
      .length;
  }

  isComplete(): boolean {
    return this.tournament.status === 'complete';
  }

  getRankings(): Participant[] {
    try {
      if (!this.tournament || !this.tournament.standings) {
        return this.originalEntrants;
      }
      const standings = this.tournament.standings(false); // Include all players
      return standings
        .map((standing: any) =>
          this._findParticipantByPlayerId(standing.player.id)
        )
        .filter(Boolean);
    } catch (error) {
      console.warn('Error getting rankings:', error);
      return this.originalEntrants;
    }
  }

  getWinner(): Participant | null {
    if (!this.isComplete()) {
      return null;
    }

    // For single player tournaments
    if (this.originalEntrants.length === 1) {
      return this.originalEntrants[0] || null;
    }

    try {
      if (!this.tournament || !this.tournament.standings) {
        return null;
      }
      const standings = this.tournament.standings(false); // Include all players
      if (standings.length > 0) {
        return this._findParticipantByPlayerId(standings[0].player.id);
      }
    } catch (error) {
      console.warn('Error getting winner:', error);
    }

    return null;
  }

  reportResult(match: ActiveMatch, winner: Participant): void {
    const originalMatch = match.originalMatch;
    if (!originalMatch) {
      throw new Error('Invalid match - missing original match data');
    }

    // Determine winner and loser based on player positions
    const isPlayer1Winner =
      this._findParticipantByPlayerId(originalMatch.player1.id) === winner;

    // Report result to tournament-organizer (winner gets 1 win, loser gets 0)
    this.tournament.enterResult(
      originalMatch.id,
      isPlayer1Winner ? 1 : 0, // player1 wins
      isPlayer1Winner ? 0 : 1 // player2 wins
    );

    // Check if tournament should be ended
    const activeMatches = this.tournament.matches.filter(
      (m: any) => m.active === true
    );
    if (activeMatches.length === 0 && this.tournament.status !== 'complete') {
      this.tournament.end();
    }
  }

  // Export tournament state for storage
  exportState(): any {
    return {
      version: '3.0',
      type: this.type,
      originalEntrants: this.originalEntrants,
      taskNameColumn: this.taskNameColumn,
      tournamentState: {
        id: this.tournament.id,
        name: this.tournament.name,
        status: this.tournament.status,
        round: this.tournament.round,
        players: this.tournament.players,
        matches: this.tournament.matches,
        seating: this.tournament.seating,
        sorting: this.tournament.sorting,
        scoring: this.tournament.scoring,
        stageOne: this.tournament.stageOne,
        stageTwo: this.tournament.stageTwo,
        meta: this.tournament.meta
      },
      tournamentId: this.tournamentId,
    };
  }

  // Import tournament state from storage
  static fromStoredState(
    state: any,
    options: TournamentOptions = {}
  ): Tournament {
    if (state.version === '3.0') {
      // New format using tournament-organizer
      const tournament = new Tournament(state.type, state.originalEntrants, {
        ...options,
        taskNameColumn: state.taskNameColumn,
      });

      // Reload tournament state
      tournament.manager.removeTournament(tournament.tournamentId);
      tournament.tournament = tournament.manager.reloadTournament(
        state.tournamentState
      );
      tournament.tournamentId = tournament.tournament.id;

      return tournament;
    } else {
      // Legacy format - migrate by recreating tournament
      return Tournament._migrateLegacyFormat(state, options);
    }
  }

  // Helper methods
  private _getParticipantDisplayName(participant: Participant): string {
    if (typeof participant === 'string') {
      return participant;
    }

    if (typeof participant === 'object' && participant) {
      if (this.taskNameColumn && participant[this.taskNameColumn]) {
        return participant[this.taskNameColumn].toString();
      }

      const nameFields = ['name', 'title', 'task', 'summary'];
      for (const field of nameFields) {
        if (participant[field]) {
          return participant[field].toString();
        }
      }
    }

    return 'Untitled Task';
  }

  private _findParticipantByPlayerId(playerId: string): Participant | null {
    if (!playerId) return null;

    // Extract the index from the player ID
    const match = playerId.match(/^player_(\d+)$/);
    if (match && match[1]) {
      const index = parseInt(match[1], 10);
      if (index >= 0 && index < this.originalEntrants.length) {
        return this.originalEntrants[index] || null;
      }
    }
    return null;
  }

  private _getMatchWinner(match: any): Participant | null {
    if (!match.player1 || !match.player2) return null;

    const player1Wins = match.player1.win || 0;
    const player2Wins = match.player2.win || 0;

    if (player1Wins > player2Wins) {
      return this._findParticipantByPlayerId(match.player1.id);
    } else if (player2Wins > player1Wins) {
      return this._findParticipantByPlayerId(match.player2.id);
    }

    return null;
  }

  private _getMatchLoser(match: any): Participant | null {
    if (!match.player1 || !match.player2) return null;

    const player1Wins = match.player1.win || 0;
    const player2Wins = match.player2.win || 0;

    if (player1Wins > player2Wins) {
      return this._findParticipantByPlayerId(match.player2.id);
    } else if (player2Wins > player1Wins) {
      return this._findParticipantByPlayerId(match.player1.id);
    }

    return null;
  }

  private static _migrateLegacyFormat(
    state: any,
    options: TournamentOptions
  ): Tournament {
    // Create a new tournament from legacy state
    const tournament = new Tournament(
      state.type || 'single',
      state.originalEntrants || [],
      options
    );

    console.info(
      'Migrated legacy tournament to new format. Tournament will restart.'
    );
    return tournament;
  }
}
