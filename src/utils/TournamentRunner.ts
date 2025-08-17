/**
 * Tournament Runner - Clean API for managing tournaments using tournament-organizer
 */
import TournamentOrganizer from 'tournament-organizer';
import type {
  TournamentType,
  TournamentOptions,
  ActiveMatch,
  ParticipantUUID,
  SeedingMethod,
} from '../types/tournament';

export type { TournamentType, TournamentOptions, ActiveMatch };

// Factory function for creating tournaments
export function createTournament(
  type: TournamentType,
  entrants: ParticipantUUID[],
  options: TournamentOptions = {}
):
  | Tournament
  | QuickSortTournament
  | SampleSortTournament
  | InsertionTournament {
  if (type === 'quicksort') {
    return new QuickSortTournament(entrants, options);
  } else if (type === 'samplesort') {
    return new SampleSortTournament(entrants, options);
  } else if (type === 'insertion') {
    return new InsertionTournament(entrants, options);
  } else {
    return new Tournament(type, entrants, options);
  }
}

export class Tournament {
  private manager: TournamentOrganizer;
  private tournament: any;
  private tournamentId: string;

  type: string;
  originalEntrants: ParticipantUUID[]; // Now stores UUIDs instead of participant objects
  taskNameColumn: string | undefined;

  // Properties for storing final results from completed tournaments
  _finalResults?: any;
  _isCompleteFromStorage?: boolean;

  // Properties expected by tests
  get matches(): any[] {
    if (!this.tournament?.matches) return [];
    // Only return matches that have both players and were actually played
    return this.tournament.matches
      .filter(
        (match: any) =>
          match.active === false &&
          match.player1?.id &&
          match.player2?.id &&
          !match.bye // Exclude bye matches
      )
      .map((match: any) => ({
        ...match,
        winner: this._getMatchWinner(match),
        loser: this._getMatchLoser(match),
        player1: match.player1?.id,
        player2: match.player2?.id,
      }));
  }

  get pendingMatches(): any[] {
    return (
      this.tournament?.matches?.filter((match: any) => match.active === true) ||
      []
    );
  }

  get remainingParticipants(): ParticipantUUID[] {
    if (!this.tournament?.players) return this.originalEntrants;
    return this.tournament.players
      .filter((player: any) => player.active === true)
      .map((player: any) => player.id as ParticipantUUID)
      .filter(Boolean);
  }

  constructor(
    type: TournamentType,
    entrants: ParticipantUUID[], // Now accepts UUIDs instead of participant objects
    options: TournamentOptions = {}
  ) {
    if (!entrants || entrants.length < 1) {
      throw new Error('Tournament requires at least 1 entrant');
    }

    this.type = type;
    this.taskNameColumn = options.taskNameColumn;

    // Apply seeding to UUIDs (seeding method still affects order)
    // Skip seeding if this is a restoration (preserveOrder flag)
    const seedingMethod = options.seedingMethod || 'order';
    const seededEntrants = options.preserveOrder
      ? entrants // Use the exact order provided (for tournament restoration)
      : this._applySeedingMethodToUuids(entrants, seedingMethod);

    // Store the seeded UUIDs
    this.originalEntrants = [...seededEntrants];

    // Handle single participant tournaments
    if (seededEntrants.length === 1) {
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
    if (type === 'double' && seededEntrants.length < 4) {
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

    // Add all participants to tournament (using seeded order)
    seededEntrants.forEach(uuid => {
      // Use UUID directly as player ID, display name doesn't matter since UI handles display
      this.tournament.createPlayer(uuid, uuid);
    });

    // Start the tournament if we have enough players
    if (seededEntrants.length >= 2) {
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
      console.log('No active matches found. Status:', this.tournament.status);
      return null;
    }

    // Return the first active match
    const match = activeMatches[0];
    const player1Uuid = match.player1.id; // Now UUIDs directly
    const player2Uuid = match.player2.id; // Now UUIDs directly

    if (!player1Uuid || !player2Uuid) {
      return null;
    }

    return {
      player1: player1Uuid as ParticipantUUID, // Return UUID instead of participant object
      player2: player2Uuid as ParticipantUUID, // Return UUID instead of participant object
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
    // If we have stored final results, the tournament is definitely complete
    if (this._isCompleteFromStorage && this._finalResults) {
      return true;
    }

    const allMatchesComplete =
      this.tournament.matches?.every((match: any) => !match.active) || false;
    const complete =
      this.tournament.status === 'complete' ||
      (this.tournament.status === 'stage-one' && allMatchesComplete);

    return complete;
  }

  findParticipantByPlayerId(playerId: ParticipantUUID): ParticipantUUID {
    return this._findParticipantByPlayerId(playerId);
  }

  getRankings(): ParticipantUUID[] {
    // Now returns UUIDs instead of participant objects
    console.log('getRankings() called');

    // If we have stored final results, use them directly
    if (this._isCompleteFromStorage && this._finalResults) {
      console.log('Using stored final results for rankings');
      return this._finalResults.rankings.map((r: any) => r.participantId);
    }

    try {
      console.log('Tournament status check:', {
        hasTournament: !!this.tournament,
        status: this.tournament?.status,
        originalEntrantsCount: this.originalEntrants?.length || 0,
      });

      if (!this.tournament) {
        console.log('no tournament');
        return this.originalEntrants;
      }

      // Check if tournament is complete before getting standings
      // Tournament-organizer might use different statuses, so also check if all matches are done
      const allMatchesComplete =
        this.tournament.matches?.every((match: any) => !match.active) || false;
      const isComplete =
        this.tournament.status === 'complete' ||
        (this.tournament.status === 'stage-one' && allMatchesComplete);

      console.log('Tournament completion check:', {
        status: this.tournament.status,
        allMatchesComplete,
        totalMatches: this.tournament.matches?.length || 0,
        activeMatches:
          this.tournament.matches?.filter((m: any) => m.active).length || 0,
        isComplete,
      });

      if (!isComplete) {
        console.log('tournament incomplete, status:', this.tournament.status);
        return this.originalEntrants;
      }

      console.log(
        'Tournament is complete, calling _getTournamentOrganizerRankings'
      );
      // Use our implementation of the tournament-organizer ranking algorithm
      // We bypass the official standings() method due to private field access issues
      // and use our equivalent implementation that replicates the exact same logic
      const rankings = this._getTournamentOrganizerRankings();
      console.log('Rankings returned:', rankings);
      return rankings;
    } catch (error) {
      console.error('Error getting rankings:', error);
      return this.originalEntrants;
    }
  }

  getWinner(): ParticipantUUID | null {
    if (!this.isComplete()) {
      return null;
    }

    // For single player tournaments
    if (this.originalEntrants.length === 1) {
      return this.originalEntrants[0] || null;
    }

    try {
      // Use our tournament-organizer equivalent algorithm for consistent results
      const rankings = this._getTournamentOrganizerRankings();
      if (rankings.length > 0 && rankings[0]) {
        return rankings[0]; // First in rankings is the winner
      }
    } catch (error) {
      console.warn('Error getting winner:', error);
    }

    return null;
  }

  reportResult(match: ActiveMatch, winnerUuid: ParticipantUUID): void {
    // Now expects UUID
    const originalMatch = match.originalMatch;
    if (!originalMatch) {
      throw new Error('Invalid match - missing original match data');
    }

    // Determine winner and loser based on player positions (simple UUID comparison now)
    const isPlayer1Winner = originalMatch.player1.id === winnerUuid;

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
    const isComplete = this.isComplete();
    const baseState = {
      version: '3.0',
      type: this.type,
      originalEntrants: this.originalEntrants,
      taskNameColumn: this.taskNameColumn,
      isComplete,
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
        meta: this.tournament.meta,
      },
      tournamentId: this.tournamentId,
    };

    // If tournament is complete, also store final computed results
    if (isComplete) {
      try {
        const finalRankings = this.getRankings();
        const finalRankingsWithHistory = finalRankings.map(
          (participantId, index) => ({
            rank: index + 1,
            participantId,
            matchHistory: this.getMatchHistoryForParticipant(participantId),
          })
        );

        (baseState as any).finalResults = {
          rankings: finalRankingsWithHistory,
          computedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.warn('Could not compute final results for storage:', error);
      }
    }

    return baseState;
  }

  // Get match history for a specific participant
  getMatchHistoryForParticipant(participantId: ParticipantUUID): any[] {
    // If we have stored final results, use the stored match history
    if (this._isCompleteFromStorage && this._finalResults) {
      const participantResult = this._finalResults.rankings.find(
        (r: any) => r.participantId === participantId
      );
      return participantResult?.matchHistory || [];
    }

    if (!this.tournament || !this.tournament.matches) {
      return [];
    }

    const matchHistory: any[] = [];
    const completedMatches = this.tournament.matches.filter(
      (match: any) =>
        !match.active &&
        (match.player1?.win !== undefined || match.player2?.win !== undefined)
    );

    completedMatches.forEach((match: any, index: number) => {
      let winnerUuid: ParticipantUUID;
      let loserUuid: ParticipantUUID;

      // Determine winner and loser from the match
      if (match.player1?.win > match.player2?.win) {
        winnerUuid = match.player1.id;
        loserUuid = match.player2.id;
      } else if (match.player2?.win > match.player1?.win) {
        winnerUuid = match.player2.id;
        loserUuid = match.player1.id;
      } else {
        return; // Skip draws or incomplete matches
      }

      // If this participant was in this match, record it
      if (participantId === winnerUuid) {
        matchHistory.push({
          round: match.round || 1,
          opponent: loserUuid, // Store opponent ID
          result: 'WON',
          matchNumber: index + 1,
        });
      } else if (participantId === loserUuid) {
        matchHistory.push({
          round: match.round || 1,
          opponent: winnerUuid, // Store opponent ID
          result: 'LOST',
          matchNumber: index + 1,
        });
      }
    });

    return matchHistory.sort(
      (a, b) => a.round - b.round || a.matchNumber - b.matchNumber
    );
  }

  // Import tournament state from storage
  static fromStoredState(
    state: any,
    options: TournamentOptions = {}
  ): Tournament | QuickSortTournament {
    console.log('fromStoredState called with state:', {
      version: state.version,
      type: state.type,
      originalEntrantsCount: state.originalEntrants?.length || 0,
      tournamentStatus: state.tournamentState?.status,
    });

    if (state.version === '3.0') {
      // Handle quicksort tournaments
      if (state.type === 'quicksort') {
        return QuickSortTournament.fromStoredState(state, options);
      }

      // New format using tournament-organizer
      // Instead of creating a fresh tournament and replaying matches,
      // restore the exact tournament state that was saved

      const tournament = new Tournament(state.type, state.originalEntrants, {
        ...options,
        taskNameColumn: state.taskNameColumn,
        preserveOrder: true, // Use exact order from saved state, no re-seeding
      });

      console.log('Restoring tournament from saved state');

      // Check if this is a completed tournament with final results
      if (state.isComplete && (state as any).finalResults) {
        console.log(
          'Tournament is complete, using stored final results instead of replaying matches'
        );

        // For completed tournaments, we create a special wrapper that provides
        // the final results directly without needing the tournament-organizer state
        tournament._finalResults = (state as any).finalResults;
        tournament._isCompleteFromStorage = true;

        // Still restore the tournament state for debugging/inspection if needed
        Object.assign(tournament.tournament, state.tournamentState);

        return tournament;
      }

      // For incomplete tournaments, restore by completely replacing the tournament object
      const savedTournamentState = state.tournamentState;
      if (savedTournamentState) {
        // COMPLETE REPLACEMENT: Instead of patching a fresh tournament,
        // directly restore the saved tournament object state

        // Create a minimal wrapper object that preserves the saved tournament data
        // but provides the minimal interface needed by our Tournament class
        const restoredTournamentObject = {
          ...savedTournamentState,
          // Add minimal methods that might be needed
          createPlayer: function () {
            /* no-op for restored tournaments */
          },
          enterResult: function (matchId: any, p1wins: number, p2wins: number) {
            // Find and update the match
            const match = this.matches.find((m: any) => m.id === matchId);
            if (match) {
              match.active = false;
              if (match.player1) {
                match.player1.win = p1wins;
                match.player1.loss = p2wins;
              }
              if (match.player2) {
                match.player2.win = p2wins;
                match.player2.loss = p1wins;
              }
            }
          },
          end: function () {
            this.status = 'complete';
          },
        };

        tournament.tournament = restoredTournamentObject;
        tournament.tournamentId =
          savedTournamentState.id || tournament.tournamentId;
      } else {
        throw new Error(
          'No tournament state found in saved data - cannot restore tournament'
        );
      }

      return tournament;
    } else {
      // Legacy format - migrate by recreating tournament
      return Tournament._migrateLegacyFormat(state, options);
    }
  }

  // Helper methods

  private _findParticipantByPlayerId(
    playerId: ParticipantUUID
  ): ParticipantUUID {
    if (!playerId) {
      throw new Error('Player ID cannot be empty');
    }
    // Simply return the UUID - the UI layer will handle mapping to original tasks
    return playerId;
  }

  private _applySeedingMethodToUuids(
    uuids: ParticipantUUID[],
    seedingMethod: SeedingMethod
  ): ParticipantUUID[] {
    console.log('Applying seeding method: ', seedingMethod);
    switch (seedingMethod) {
      case 'random': {
        // Create a copy and shuffle it
        const shuffled = [...uuids];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = shuffled[i];
          if (temp && shuffled[j]) {
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
          }
        }
        return shuffled;
      }

      case 'order':
      default:
        // Return UUIDs in their original order
        return [...uuids];
    }
  }

  private _getMatchWinner(match: any): ParticipantUUID | null {
    if (!match.player1 || !match.player2) return null;

    const player1Wins = match.player1.win || 0;
    const player2Wins = match.player2.win || 0;

    if (player1Wins > player2Wins) {
      return match.player1.id; // Return UUID directly
    } else if (player2Wins > player1Wins) {
      return match.player2.id; // Return UUID directly
    }

    return null;
  }

  private _getMatchLoser(match: any): ParticipantUUID | null {
    if (!match.player1 || !match.player2) return null;

    const player1Wins = match.player1.win || 0;
    const player2Wins = match.player2.win || 0;

    if (player1Wins > player2Wins) {
      return match.player2.id; // Return UUID directly
    } else if (player2Wins > player1Wins) {
      return match.player1.id; // Return UUID directly
    }

    return null;
  }

  // Legacy single elimination ranking method - replaced by tournament-organizer equivalent
  // private _extractSingleEliminationRankings(): ParticipantUUID[] { ... }

  // Legacy custom double elimination ranking method - replaced by tournament-organizer equivalent
  // private _extractDoubleEliminationRankings(): ParticipantUUID[] { ... }

  private _getTournamentOrganizerRankings(): ParticipantUUID[] {
    // Implementation of the exact tournament-organizer standings algorithm
    // This replicates the computeScores() and standings() methods from tournament-organizer

    console.log('_getTournamentOrganizerRankings called, tournament data:', {
      hasPlayers: !!this.tournament?.players,
      playersCount: this.tournament?.players?.length || 0,
      hasMatches: !!this.tournament?.matches,
      matchesCount: this.tournament?.matches?.length || 0,
      originalEntrantsCount: this.originalEntrants?.length || 0,
    });

    if (
      !this.tournament?.players ||
      !this.tournament?.matches ||
      this.tournament.players.length === 0
    ) {
      console.warn(
        'No tournament data available for tournament-organizer rankings'
      );
      return this.originalEntrants;
    }

    // Step 1: Compute scores for each player (equivalent to computeScores())
    const playerScores = this.tournament.players.map((player: any) => ({
      player: player,
      gamePoints: 0,
      games: 0,
      matchPoints: 0,
      matches: 0,
      tiebreaks: {
        medianBuchholz: 0,
        solkoff: 0,
        sonnebornBerger: 0,
        cumulative: 0,
        oppCumulative: 0,
        matchWinPct: 0,
        oppMatchWinPct: 0,
        oppOppMatchWinPct: 0,
        gameWinPct: 0,
        oppGameWinPct: 0,
      },
    }));

    // Scoring configuration (equivalent to tournament-organizer defaults)
    const scoring = {
      win: 1,
      loss: 0,
      draw: 0.5,
      bye: 1,
    };

    // Step 2: Calculate basic stats for each player
    for (let i = 0; i < playerScores.length; i++) {
      const player = playerScores[i];
      if (player.player.matches.length === 0) {
        continue;
      }

      // Sort matches by round
      player.player.matches.sort((a: any, b: any) => {
        const matchA = this.tournament.matches.find((m: any) => m.id === a.id);
        const matchB = this.tournament.matches.find((m: any) => m.id === b.id);
        return matchA.round - matchB.round;
      });

      // Calculate points from completed matches
      player.player.matches
        .filter((match: any) =>
          this.tournament.matches.find(
            (m: any) => m.id === match.id && m.active === false
          )
        )
        .forEach((match: any) => {
          player.gamePoints +=
            (match.bye ? scoring.bye : scoring.win) * match.win +
            scoring.loss * match.loss +
            scoring.draw * match.draw;
          player.games += match.win + match.loss + match.draw;
          player.matchPoints += match.bye
            ? scoring.bye
            : match.win > match.loss
              ? scoring.win
              : match.loss > match.win
                ? scoring.loss
                : scoring.draw;
          player.tiebreaks.cumulative += player.matchPoints;
          player.matches++;
        });

      player.tiebreaks.gameWinPct =
        player.games === 0
          ? 0
          : player.gamePoints / (player.games * scoring.win);
      player.tiebreaks.matchWinPct =
        player.matches === 0
          ? 0
          : player.matchPoints / (player.matches * scoring.win);
    }

    // Step 3: Calculate opponent-based tiebreakers
    for (let i = 0; i < playerScores.length; i++) {
      const player = playerScores[i];
      const opponents = playerScores.filter((p: any) =>
        player.player.matches.some(
          (match: any) => match.opponent === p.player.id
        )
      );

      if (opponents.length === 0) {
        continue;
      }

      player.tiebreaks.oppMatchWinPct =
        opponents.reduce(
          (sum: number, opp: any) => sum + opp.tiebreaks.matchWinPct,
          0
        ) / opponents.length;
      player.tiebreaks.oppGameWinPct =
        opponents.reduce(
          (sum: number, opp: any) => sum + opp.tiebreaks.gameWinPct,
          0
        ) / opponents.length;

      const oppMatchPoints = opponents.map((opp: any) => opp.matchPoints);
      player.tiebreaks.solkoff = oppMatchPoints.reduce(
        (sum: number, curr: number) => sum + curr,
        0
      );

      if (oppMatchPoints.length > 2) {
        const max = oppMatchPoints.reduce(
          (max: number, curr: number) => Math.max(max, curr),
          0
        );
        const min = oppMatchPoints.reduce(
          (min: number, curr: number) => Math.min(min, curr),
          max
        );
        const filteredPoints = [...oppMatchPoints];
        filteredPoints.splice(filteredPoints.indexOf(max), 1);
        filteredPoints.splice(filteredPoints.indexOf(min), 1);
        player.tiebreaks.medianBuchholz = filteredPoints.reduce(
          (sum: number, curr: number) => sum + curr,
          0
        );
      }

      player.tiebreaks.sonnebornBerger = opponents.reduce(
        (sum: number, opp: any) => {
          const match = player.player.matches.find(
            (m: any) => m.opponent === opp.player.id
          );
          if (
            this.tournament.matches.find((m: any) => m.id === match.id)
              .active === true
          ) {
            return sum;
          }
          return match.win > match.loss
            ? sum + opp.matchPoints
            : sum + 0.5 * opp.matchPoints;
        },
        0
      );

      player.tiebreaks.oppCumulative = opponents.reduce(
        (sum: number, opp: any) => sum + opp.tiebreaks.cumulative,
        0
      );
    }

    // Step 4: Calculate opponent's opponent match win percentage
    for (let i = 0; i < playerScores.length; i++) {
      const player = playerScores[i];
      const opponents = playerScores.filter((p: any) =>
        player.player.matches.some(
          (match: any) => match.opponent === p.player.id
        )
      );

      if (opponents.length === 0) {
        continue;
      }

      player.tiebreaks.oppOppMatchWinPct =
        opponents.reduce(
          (sum: number, opp: any) => sum + opp.tiebreaks.oppMatchWinPct,
          0
        ) / opponents.length;
    }

    // Step 5: Sort players using tournament-organizer algorithm (equivalent to standings())
    let players = [...playerScores];
    // Include ALL players for final rankings (both active and eliminated)

    players.sort((a, b) => {
      // Primary sort: match points
      if (a.matchPoints !== b.matchPoints) {
        return b.matchPoints - a.matchPoints;
      }

      // No tiebreakers configured for elimination tournaments typically
      // But we'll include the most common ones used
      const tiebreaks = [
        'versus',
        'game win percentage',
        'opponent match win percentage',
      ];

      for (let i = 0; i < tiebreaks.length; i++) {
        switch (tiebreaks[i]) {
          case 'versus': {
            const matchIDs = a.player.matches
              .filter((m: any) => m.opponent === b.player.id)
              .map((m: any) => m.id);
            if (matchIDs.length > 0) {
              const pointsA = a.player.matches
                .filter((m: any) => matchIDs.some((id: any) => id === m.id))
                .reduce(
                  (sum: number, curr: any) =>
                    curr.win > curr.loss
                      ? sum + scoring.win
                      : curr.loss > curr.win
                        ? sum + scoring.loss
                        : sum + scoring.draw,
                  0
                );
              const pointsB = b.player.matches
                .filter((m: any) => matchIDs.some((id: any) => id === m.id))
                .reduce(
                  (sum: number, curr: any) =>
                    curr.win > curr.loss
                      ? sum + scoring.win
                      : curr.loss > curr.win
                        ? sum + scoring.loss
                        : sum + scoring.draw,
                  0
                );
              if (pointsA !== pointsB) {
                return pointsB - pointsA;
              }
            }
            break;
          }
          case 'game win percentage':
            if (a.tiebreaks.gameWinPct !== b.tiebreaks.gameWinPct) {
              return b.tiebreaks.gameWinPct - a.tiebreaks.gameWinPct;
            }
            break;
          case 'opponent match win percentage':
            if (a.tiebreaks.oppMatchWinPct !== b.tiebreaks.oppMatchWinPct) {
              return b.tiebreaks.oppMatchWinPct - a.tiebreaks.oppMatchWinPct;
            }
            break;
        }
      }

      // Final tiebreaker: player ID comparison (equivalent to tournament-organizer)
      return parseInt(b.player.id, 36) - parseInt(a.player.id, 36);
    });

    const rankings = players.map(player => player.player.id as ParticipantUUID);

    console.log('Tournament-organizer equivalent rankings:', {
      playerCount: rankings.length,
      algorithm: 'tournament-organizer-equivalent',
      topPlayers: players.slice(0, 5).map(p => ({
        id: p.player.id,
        rank: players.indexOf(p) + 1,
        matchPoints: p.matchPoints,
        gameWinPct: p.tiebreaks.gameWinPct,
        oppMatchWinPct: p.tiebreaks.oppMatchWinPct,
      })),
    });

    return rankings;
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

export class QuickSortTournament {
  type: string = 'quicksort';
  originalEntrants: ParticipantUUID[];
  taskNameColumn: string | undefined;
  _finalResults?: any;
  _isCompleteFromStorage?: boolean;

  private participants: ParticipantUUID[];
  private comparisons: Array<{
    pivot: ParticipantUUID;
    candidates: ParticipantUUID[];
    lessThan: ParticipantUUID[];
    greaterThan: ParticipantUUID[];
    currentComparison?: {
      pivot: ParticipantUUID;
      candidate: ParticipantUUID;
    };
  }>;
  private completedComparisons: number = 0;
  private totalComparisons: number = 0;
  private comparisonResults: Map<string, ParticipantUUID> = new Map();

  constructor(entrants: ParticipantUUID[], options: TournamentOptions = {}) {
    if (!entrants || entrants.length < 1) {
      throw new Error('Tournament requires at least 1 entrant');
    }

    this.taskNameColumn = options.taskNameColumn;
    this.originalEntrants = [...entrants];

    // Apply seeding if specified
    const seedingMethod = options.seedingMethod || 'order';
    this.participants = this._applySeedingMethod(entrants, seedingMethod);

    // Handle single participant
    if (this.participants.length === 1) {
      this.comparisons = [];
      return;
    }

    // Initialize quicksort state
    if (this.participants.length > 0) {
      const { pivot, candidates } = this._selectMiddlePivot(this.participants);
      this.comparisons = [
        {
          pivot,
          candidates,
          lessThan: [],
          greaterThan: [],
        },
      ];
    } else {
      this.comparisons = [];
    }

    // Estimate total comparisons (roughly n log n)
    this.totalComparisons = Math.ceil(
      this.participants.length * Math.log2(this.participants.length)
    );
  }

  getNextMatch(): ActiveMatch | null {
    if (this.isComplete()) {
      return null;
    }

    // Find the next comparison to make
    for (let i = 0; i < this.comparisons.length; i++) {
      const partition = this.comparisons[i];

      if (partition && partition.candidates.length > 0) {
        const candidate = partition.candidates[0];
        if (candidate) {
          partition.currentComparison = {
            pivot: partition.pivot,
            candidate: candidate,
          };

          return {
            player1: partition.pivot,
            player2: candidate,
            round: i + 1,
            matchInRound:
              partition.lessThan.length + partition.greaterThan.length + 1,
            bracket: 'quicksort',
            originalMatch: { partitionIndex: i },
          };
        }
      }
    }

    return null;
  }

  reportResult(match: ActiveMatch, winnerUuid: ParticipantUUID): void {
    const partitionIndex = match.originalMatch.partitionIndex;
    const partition = this.comparisons[partitionIndex];

    if (!partition || !partition.currentComparison) {
      throw new Error('No active comparison found');
    }

    const { pivot, candidate } = partition.currentComparison;

    // Remove candidate from candidates list
    const candidateIndex = partition.candidates.indexOf(candidate);
    if (candidateIndex !== -1) {
      partition.candidates.splice(candidateIndex, 1);
    }

    // Sort based on winner: if pivot wins, candidate goes to lessThan (pivot is "greater")
    // This ensures consistent ranking where winner > loser
    if (winnerUuid === pivot) {
      partition.lessThan.push(candidate);
    } else {
      partition.greaterThan.push(candidate);
    }

    // Store the comparison result
    const comparisonKey = this._getComparisonKey(pivot, candidate);
    this.comparisonResults.set(comparisonKey, winnerUuid);

    delete partition.currentComparison;
    this.completedComparisons++;

    // Check if this partition is complete
    if (partition.candidates.length === 0) {
      this._processCompletedPartition(partitionIndex);
    }
  }

  private _processCompletedPartition(partitionIndex: number): void {
    const partition = this.comparisons[partitionIndex];

    if (!partition) {
      throw new Error('Partition not found');
    }

    // Remove the completed partition
    this.comparisons.splice(partitionIndex, 1);

    // Create new partitions for groups that need further sorting
    if (partition.greaterThan.length > 1) {
      const { pivot, candidates } = this._selectMiddlePivot(
        partition.greaterThan
      );
      this.comparisons.push({
        pivot,
        candidates,
        lessThan: [],
        greaterThan: [],
      });
    }

    if (partition.lessThan.length > 1) {
      const { pivot, candidates } = this._selectMiddlePivot(partition.lessThan);
      this.comparisons.push({
        pivot,
        candidates,
        lessThan: [],
        greaterThan: [],
      });
    }
  }

  isComplete(): boolean {
    // If we have stored results from database, tournament is complete
    if (this._isCompleteFromStorage && this._finalResults) {
      return true;
    }

    return this.comparisons.length === 0;
  }

  getRankings(): ParticipantUUID[] {
    // If we have stored final results, use them instead of recomputing
    if (this._isCompleteFromStorage && this._finalResults) {
      return this._finalResults.rankings.map((r: any) => r.participantId);
    }

    if (!this.isComplete()) {
      return this.originalEntrants;
    }

    // Reconstruct the final ranking by applying quicksort logic to our participants
    // based on the comparisons we've collected
    return this._buildFinalRanking(this.participants);
  }

  private _buildFinalRanking(items: ParticipantUUID[]): ParticipantUUID[] {
    if (items.length <= 1) {
      return [...items];
    }

    // Use stored comparison results to partition the items
    const { pivot, candidates } = this._selectMiddlePivot(items);
    const greaterThan: ParticipantUUID[] = [];
    const lessThan: ParticipantUUID[] = [];

    // Partition candidates based on how they compared to the pivot
    for (const candidate of candidates) {
      if (this._didWinAgainst(candidate, pivot)) {
        greaterThan.push(candidate);
      } else {
        lessThan.push(candidate);
      }
    }

    // Recursively sort and combine: winners + pivot + losers
    return [
      ...this._buildFinalRanking(greaterThan),
      pivot,
      ...this._buildFinalRanking(lessThan),
    ];
  }

  private _getComparisonKey(
    player1: ParticipantUUID,
    player2: ParticipantUUID
  ): string {
    // Create a consistent key regardless of order
    return [player1, player2].sort().join(':');
  }

  private _didWinAgainst(
    player1: ParticipantUUID,
    player2: ParticipantUUID
  ): boolean {
    const key = this._getComparisonKey(player1, player2);
    const winner = this.comparisonResults.get(key);
    return winner === player1;
  }

  getWinner(): ParticipantUUID | null {
    if (!this.isComplete()) {
      return null;
    }

    const rankings = this.getRankings();
    return rankings.length > 0 ? rankings[0] || null : null;
  }

  getCurrentMatchNumber(): number {
    return this.completedComparisons + 1;
  }

  getTotalMatches(): number {
    return this.totalComparisons;
  }

  getTotalRounds(): number {
    // In quicksort, rounds are more like partition depth
    return Math.ceil(Math.log2(this.participants.length));
  }

  getMatchesInRound(round: number): number {
    // Estimate matches per "round" (partition level)
    return Math.ceil(this.participants.length / Math.pow(2, round - 1));
  }

  get remainingParticipants(): ParticipantUUID[] {
    // Return participants that haven't been fully sorted yet
    const inProgress = this.comparisons.flatMap(p => [
      p.pivot,
      ...p.candidates,
      ...p.lessThan,
      ...p.greaterThan,
    ]);
    return [...new Set(inProgress)];
  }

  get matches(): any[] {
    // Return completed comparisons as matches
    const completedMatches: any[] = [];
    let matchId = 1;

    // This is simplified - in a real implementation you'd track all historical matches
    for (let i = 0; i < this.completedComparisons; i++) {
      completedMatches.push({
        id: matchId++,
        active: false,
        round: Math.floor(i / 4) + 1, // Rough round assignment
        player1: null, // Would need to track historical data
        player2: null,
      });
    }

    return completedMatches;
  }

  get pendingMatches(): any[] {
    const nextMatch = this.getNextMatch();
    return nextMatch ? [nextMatch] : [];
  }

  findParticipantByPlayerId(playerId: ParticipantUUID): ParticipantUUID {
    return playerId;
  }

  getMatchHistoryForParticipant(participantId: ParticipantUUID): any[] {
    // If we have stored final results with match history, use them
    if (this._isCompleteFromStorage && this._finalResults) {
      const participantResult = this._finalResults.rankings.find(
        (r: any) => r.participantId === participantId
      );
      return participantResult?.matchHistory || [];
    }

    // For in-progress tournaments, reconstruct match history from comparison results
    const matchHistory: any[] = [];
    let matchNumber = 1;

    // Go through all comparison results and find matches involving this participant
    for (const [key, winner] of this.comparisonResults.entries()) {
      const [player1, player2] = key.split(':');

      if (player1 === participantId || player2 === participantId) {
        const opponent = player1 === participantId ? player2 : player1;
        const didWin = winner === participantId;

        matchHistory.push({
          matchNumber: matchNumber++,
          opponent,
          result: didWin ? 'WON' : 'LOST',
          type: 'QuickSort Comparison',
        });
      }
    }

    return matchHistory;
  }

  exportState(): any {
    const isComplete = this.isComplete();
    const baseState = {
      version: '3.0',
      type: this.type,
      originalEntrants: this.originalEntrants,
      taskNameColumn: this.taskNameColumn,
      isComplete,
      quicksortState: {
        participants: this.participants,
        comparisons: this.comparisons,
        completedComparisons: this.completedComparisons,
        totalComparisons: this.totalComparisons,
        comparisonResults: Array.from(this.comparisonResults.entries()),
      },
    };

    // If tournament is complete, also store final computed results
    if (isComplete) {
      try {
        const finalRankings = this.getRankings();
        const finalRankingsWithHistory = finalRankings.map(
          (participantId, index) => ({
            rank: index + 1,
            participantId,
            matchHistory: this.getMatchHistoryForParticipant(participantId),
          })
        );

        (baseState as any).finalResults = {
          rankings: finalRankingsWithHistory,
          computedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.warn(
          'Could not compute final results for QuickSort storage:',
          error
        );
      }
    }

    return baseState;
  }

  static fromStoredState(
    state: any,
    options: TournamentOptions = {}
  ): QuickSortTournament {
    const tournament = new QuickSortTournament(state.originalEntrants, {
      ...options,
      taskNameColumn: state.taskNameColumn,
      seedingMethod: 'order', // Preserve original order when restoring
    });

    // Check if this is a completed tournament with final results
    if (state.isComplete && (state as any).finalResults) {
      console.log(
        'QuickSort tournament is complete, using stored final results'
      );
      tournament._finalResults = (state as any).finalResults;
      tournament._isCompleteFromStorage = true;

      // Still restore the quicksort state for debugging if needed
      if (state.quicksortState) {
        tournament.participants = state.quicksortState.participants || [];
        tournament.comparisons = state.quicksortState.comparisons || [];
        tournament.completedComparisons =
          state.quicksortState.completedComparisons || 0;
        tournament.totalComparisons =
          state.quicksortState.totalComparisons || 0;
        if (state.quicksortState.comparisonResults) {
          tournament.comparisonResults = new Map(
            state.quicksortState.comparisonResults
          );
        }
      }

      return tournament;
    }

    // For incomplete tournaments, restore the state normally
    if (state.quicksortState) {
      tournament.participants = state.quicksortState.participants || [];
      tournament.comparisons = state.quicksortState.comparisons || [];
      tournament.completedComparisons =
        state.quicksortState.completedComparisons || 0;
      tournament.totalComparisons = state.quicksortState.totalComparisons || 0;

      // Restore comparison results
      if (state.quicksortState.comparisonResults) {
        tournament.comparisonResults = new Map(
          state.quicksortState.comparisonResults
        );
      }
    }

    return tournament;
  }

  private _selectMiddlePivot(items: ParticipantUUID[]): {
    pivot: ParticipantUUID;
    candidates: ParticipantUUID[];
  } {
    if (items.length === 0) {
      throw new Error('Cannot select pivot from empty array');
    }
    const middleIndex = Math.floor(items.length / 2);
    const pivot = items[middleIndex]!;
    const candidates = [
      ...items.slice(0, middleIndex),
      ...items.slice(middleIndex + 1),
    ];
    return { pivot, candidates };
  }

  private _applySeedingMethod(
    participants: ParticipantUUID[],
    seedingMethod: SeedingMethod
  ): ParticipantUUID[] {
    switch (seedingMethod) {
      case 'random': {
        const shuffled = [...participants];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = shuffled[i];
          const tempJ = shuffled[j];
          if (temp && tempJ) {
            shuffled[i] = tempJ;
            shuffled[j] = temp;
          }
        }
        return shuffled;
      }
      case 'order':
      default:
        return [...participants];
    }
  }
}

export class SampleSortTournament {
  type: string = 'samplesort';
  originalEntrants: ParticipantUUID[];
  taskNameColumn: string | undefined;
  _finalResults?: any;
  _isCompleteFromStorage?: boolean;

  private allParticipants: ParticipantUUID[];
  private sampleParticipants: ParticipantUUID[];
  private remainingParticipants: ParticipantUUID[];
  private sortedAnchors: ParticipantUUID[] = [];

  // Phase 1: QuickSort sample
  private sampleQuickSort?: QuickSortTournament;

  // Phase 2: Binary insertion
  private currentInsertionTask?: ParticipantUUID;
  private insertionState?:
    | {
        task: ParticipantUUID;
        low: number;
        high: number;
        currentAnchorIndex: number;
      }
    | undefined;

  private completedComparisons: number = 0;
  private totalComparisons: number = 0;
  private phase: 'sample' | 'insertion' | 'complete' = 'sample';

  constructor(entrants: ParticipantUUID[], options: TournamentOptions = {}) {
    if (!entrants || entrants.length < 1) {
      throw new Error('Tournament requires at least 1 entrant');
    }

    this.taskNameColumn = options.taskNameColumn;
    this.originalEntrants = [...entrants];

    // Apply seeding
    const seedingMethod = options.seedingMethod || 'random';
    this.allParticipants = this._applySeedingMethod(entrants, seedingMethod);

    // Handle edge cases
    if (this.allParticipants.length === 1) {
      this.phase = 'complete';
      this.sortedAnchors = [...this.allParticipants];
      this.sampleParticipants = [];
      this.remainingParticipants = [];
      return;
    }

    // Calculate sample size (proportional: sqrt(n))
    const sampleSize = Math.max(
      3,
      Math.min(50, Math.ceil(Math.sqrt(this.allParticipants.length)))
    );

    // Create sample and remaining sets
    this.sampleParticipants = this.allParticipants.slice(0, sampleSize);
    this.remainingParticipants = this.allParticipants.slice(sampleSize);

    // Estimate total comparisons
    const sampleComparisons = Math.ceil(sampleSize * Math.log2(sampleSize));
    const insertionComparisons =
      this.remainingParticipants.length * Math.ceil(Math.log2(sampleSize));
    this.totalComparisons = sampleComparisons + insertionComparisons;

    // Initialize Phase 1: QuickSort the sample
    if (this.sampleParticipants.length > 1) {
      this.sampleQuickSort = new QuickSortTournament(
        this.sampleParticipants,
        options
      );
    } else {
      // Single sample item, skip to insertion phase
      this.sortedAnchors = [...this.sampleParticipants];
      this._initializeInsertionPhase();
    }
  }

  getNextMatch(): ActiveMatch | null {
    if (this.isComplete()) {
      return null;
    }

    // Phase 1: Sample QuickSort
    if (this.phase === 'sample' && this.sampleQuickSort) {
      const match = this.sampleQuickSort.getNextMatch();
      if (match) {
        // Adjust match metadata for sample phase
        return {
          ...match,
          bracket: 'samplesort-sample',
        };
      } else {
        // Sample sorting complete, get results and move to insertion phase
        this.sortedAnchors = this.sampleQuickSort.getRankings();
        this._initializeInsertionPhase();
        return this.getNextMatch(); // Recursive call for insertion phase
      }
    }

    // Phase 2: Binary insertion
    if (this.phase === 'insertion') {
      return this._getNextInsertionMatch();
    }

    return null;
  }

  private _initializeInsertionPhase(): void {
    this.phase = 'insertion';
    const nextTask = this.remainingParticipants.shift();
    if (nextTask) {
      this.currentInsertionTask = nextTask;
      this.insertionState = {
        task: nextTask,
        low: 0,
        high: this.sortedAnchors.length - 1,
        currentAnchorIndex: Math.floor(this.sortedAnchors.length / 2),
      };
    } else {
      this.phase = 'complete';
    }
  }

  private _getNextInsertionMatch(): ActiveMatch | null {
    if (!this.currentInsertionTask || !this.insertionState) {
      return null;
    }

    const { task, currentAnchorIndex } = this.insertionState;
    const anchor = this.sortedAnchors[currentAnchorIndex];

    if (!anchor) {
      // No valid anchor, insert at position
      this._insertTaskAtPosition(task, currentAnchorIndex);
      return this.getNextMatch(); // Get next task
    }

    return {
      player1: task,
      player2: anchor,
      round: this.remainingParticipants.length + 1, // Remaining tasks + current
      matchInRound: 1,
      bracket: 'samplesort-insertion',
      originalMatch: {
        type: 'insertion',
        anchorIndex: currentAnchorIndex,
      },
    };
  }

  reportResult(match: ActiveMatch, winnerUuid: ParticipantUUID): void {
    this.completedComparisons++;

    // Phase 1: Delegate to sample QuickSort
    if (this.phase === 'sample' && this.sampleQuickSort) {
      this.sampleQuickSort.reportResult(match, winnerUuid);
      return;
    }

    // Phase 2: Handle binary insertion
    if (this.phase === 'insertion' && this.insertionState) {
      const { task, low, high, currentAnchorIndex } = this.insertionState;

      if (winnerUuid === task) {
        // Task beats anchor, try higher position
        if (currentAnchorIndex === 0) {
          // Task is better than best anchor, insert at position 0
          this._insertTaskAtPosition(task, 0);
        } else {
          // Continue binary search in upper half
          this.insertionState = {
            task,
            low,
            high: currentAnchorIndex - 1,
            currentAnchorIndex: Math.floor((low + currentAnchorIndex - 1) / 2),
          };
        }
      } else {
        // Anchor beats task, try lower position
        if (currentAnchorIndex === this.sortedAnchors.length - 1) {
          // Task is worse than worst anchor, insert at end
          this._insertTaskAtPosition(task, this.sortedAnchors.length);
        } else {
          // Continue binary search in lower half
          this.insertionState = {
            task,
            low: currentAnchorIndex + 1,
            high,
            currentAnchorIndex: Math.floor((currentAnchorIndex + 1 + high) / 2),
          };
        }
      }

      // Check if binary search is complete
      if (this.insertionState.low > this.insertionState.high) {
        // Insert at the determined position
        const insertPosition =
          winnerUuid === task
            ? this.insertionState.high + 1
            : this.insertionState.low;
        this._insertTaskAtPosition(task, insertPosition);
      }
    }
  }

  private _insertTaskAtPosition(task: ParticipantUUID, position: number): void {
    // Insert task into sorted anchors at the specified position
    this.sortedAnchors.splice(position, 0, task);

    // Move to next task
    const nextTask = this.remainingParticipants.shift();
    if (nextTask) {
      this.currentInsertionTask = nextTask;
      this.insertionState = {
        task: nextTask,
        low: 0,
        high: this.sortedAnchors.length - 1,
        currentAnchorIndex: Math.floor(this.sortedAnchors.length / 2),
      };
    } else {
      // All tasks inserted, tournament complete
      this.phase = 'complete';
      this.currentInsertionTask = undefined as any;
      this.insertionState = undefined as any;
    }
  }

  isComplete(): boolean {
    if (this._isCompleteFromStorage && this._finalResults) {
      return true;
    }
    return this.phase === 'complete';
  }

  getTotalMatches(): number {
    return this.totalComparisons;
  }

  getCurrentMatchNumber(): number {
    return this.completedComparisons + 1;
  }

  getFinalRanking(): ParticipantUUID[] {
    if (!this.isComplete()) {
      throw new Error('Tournament is not complete');
    }
    return [...this.sortedAnchors];
  }

  getRankings(): ParticipantUUID[] {
    if (!this.isComplete()) {
      throw new Error('Tournament is not complete');
    }
    return [...this.sortedAnchors];
  }

  // Additional methods for compatibility with Tournament interface
  getTotalRounds(): number {
    return this.phase === 'complete' ? 2 : this.phase === 'insertion' ? 2 : 1;
  }

  getMatchesInRound(round: number): number {
    if (round === 1) {
      // Sample phase
      return this.sampleParticipants.length > 1
        ? Math.ceil(
            this.sampleParticipants.length *
              Math.log2(this.sampleParticipants.length)
          )
        : 0;
    } else if (round === 2) {
      // Insertion phase
      return this.remainingParticipants.length;
    }
    return 0;
  }

  get matches(): any[] {
    // Return empty array since we don't track completed matches like Tournament class
    return [];
  }

  exportState(): any {
    return this.getState();
  }

  // Serialization support
  getState(): any {
    return {
      type: this.type,
      originalEntrants: this.originalEntrants,
      taskNameColumn: this.taskNameColumn,
      allParticipants: this.allParticipants,
      sampleParticipants: this.sampleParticipants,
      remainingParticipants: this.remainingParticipants,
      sortedAnchors: this.sortedAnchors,
      completedComparisons: this.completedComparisons,
      totalComparisons: this.totalComparisons,
      phase: this.phase,
      currentInsertionTask: this.currentInsertionTask,
      insertionState: this.insertionState,
      // Note: sampleQuickSort state not serialized - will restart sample phase if needed
      _finalResults: this._finalResults,
      _isCompleteFromStorage: this._isCompleteFromStorage,
    };
  }

  static fromState(
    state: any,
    options: TournamentOptions = {}
  ): SampleSortTournament {
    const tournament = new SampleSortTournament(
      state.originalEntrants,
      options
    );

    // Restore state
    tournament.allParticipants = state.allParticipants || [];
    tournament.sampleParticipants = state.sampleParticipants || [];
    tournament.remainingParticipants = state.remainingParticipants || [];
    tournament.sortedAnchors = state.sortedAnchors || [];
    tournament.completedComparisons = state.completedComparisons || 0;
    tournament.totalComparisons = state.totalComparisons || 0;
    tournament.phase = state.phase || 'sample';
    tournament.currentInsertionTask = state.currentInsertionTask;
    tournament.insertionState = state.insertionState;
    tournament._finalResults = state._finalResults;
    tournament._isCompleteFromStorage = state._isCompleteFromStorage;

    // If we're in sample phase, recreate the QuickSort tournament
    if (
      tournament.phase === 'sample' &&
      tournament.sampleParticipants.length > 1
    ) {
      tournament.sampleQuickSort = new QuickSortTournament(
        tournament.sampleParticipants,
        options
      );
    }

    return tournament;
  }

  private _applySeedingMethod(
    participants: ParticipantUUID[],
    seedingMethod: SeedingMethod
  ): ParticipantUUID[] {
    switch (seedingMethod) {
      case 'random': {
        const shuffled = [...participants];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = shuffled[i];
          const tempJ = shuffled[j];
          if (temp && tempJ) {
            shuffled[i] = tempJ;
            shuffled[j] = temp;
          }
        }
        return shuffled;
      }
      case 'order':
      default:
        return [...participants];
    }
  }
}

/**
 * InsertionTournament - Interactive insertion sort ranking algorithm
 *
 * Users rank tasks by choosing where each task should be positioned relative to
 * already-sorted tasks using a trisection approach (Above, Between, Below).
 */
export class InsertionTournament {
  type: string = 'insertion';
  originalEntrants: ParticipantUUID[];
  taskNameColumn: string | undefined;
  _finalResults?: any;
  _isCompleteFromStorage?: boolean;

  // Algorithm state
  private unrankedTasks: ParticipantUUID[];
  private sortedTasks: ParticipantUUID[] = [];
  private currentTask: ParticipantUUID | undefined;
  private searchRangeStart: number = 0; // Start of current search range in sortedTasks
  private searchRangeEnd: number = 0; // End of current search range in sortedTasks
  private completedComparisons: number = 0;
  private totalComparisons: number = 0;
  private comparisonHistory: Array<{
    task: ParticipantUUID;
    anchor1?: ParticipantUUID;
    anchor2?: ParticipantUUID;
    choice: 'above' | 'between' | 'below' | 'first' | 'positioned';
    insertPosition: number;
    rangeStart: number;
    rangeEnd: number;
  }> = [];

  // Compatibility properties for tournament interface
  get remainingParticipants(): ParticipantUUID[] {
    return [...this.unrankedTasks];
  }

  get matches(): any[] {
    // Return completed comparisons as matches for compatibility
    return this.comparisonHistory.map((comparison, index) => ({
      player1: comparison.task,
      player2: comparison.anchor1 || comparison.anchor2,
      winner: comparison.task,
      active: false,
      round: index + 1,
      matchInRound: 1,
    }));
  }

  get pendingMatches(): any[] {
    // No pending matches concept in insertion sort
    return [];
  }

  findParticipantByPlayerId(playerId: ParticipantUUID): ParticipantUUID | null {
    return playerId; // In our case, playerId is the UUID itself
  }

  constructor(entrants: ParticipantUUID[], options: TournamentOptions = {}) {
    if (!entrants || entrants.length < 1) {
      throw new Error('Tournament requires at least 1 entrant');
    }

    this.taskNameColumn = options.taskNameColumn;
    this.originalEntrants = [...entrants];

    // Apply seeding
    const seedingMethod = options.seedingMethod || 'order';
    this.unrankedTasks = this._applySeedingMethod(entrants, seedingMethod);

    // Estimate total comparisons (roughly n log n)
    this.totalComparisons = Math.ceil(
      this.unrankedTasks.length *
        Math.log2(Math.max(2, this.unrankedTasks.length))
    );

    // Handle single task
    if (this.unrankedTasks.length === 1) {
      this.sortedTasks = [...this.unrankedTasks];
      this.unrankedTasks = [];
      this.totalComparisons = 0;
    }
  }

  getNextMatch(): ActiveMatch | null {
    if (this.isComplete()) {
      return null;
    }

    // If we don't have a current task, start with the next unranked task
    if (!this.currentTask && this.unrankedTasks.length > 0) {
      // Don't remove from unrankedTasks yet - just peek at the first one
      const nextTask = this.unrankedTasks[0];
      if (nextTask) {
        this.currentTask = nextTask;

        if (this.sortedTasks.length === 0) {
          // First task goes directly into sorted list
          this.sortedTasks.push(this.currentTask);
          this.comparisonHistory.push({
            task: this.currentTask,
            choice: 'first',
            insertPosition: 0,
            rangeStart: 0,
            rangeEnd: 0,
          });
          // Now remove from unranked since it's positioned
          const removedTask = this.unrankedTasks.shift();
          console.log('FIRST TASK POSITIONED:', {
            firstTask: this.currentTask,
            removedFromUnranked: removedTask,
            sortedTasksLength: this.sortedTasks.length,
            unrankedTasksLength: this.unrankedTasks.length,
            sortedTasks: this.sortedTasks,
            unrankedTasks: this.unrankedTasks,
          });

          // Validation: removed task should match current task
          if (removedTask !== this.currentTask) {
            throw new Error(
              `Removed wrong task: expected ${this.currentTask}, got ${removedTask}`
            );
          }

          this.currentTask = undefined;
          return this.getNextMatch(); // Get next task
        } else {
          // Initialize search range to cover all possible insertion positions
          // With N sorted tasks, there are N+1 possible insertion positions
          this.searchRangeStart = 0;
          this.searchRangeEnd = this.sortedTasks.length + 1;
        }
      }
    }

    if (!this.currentTask) {
      return null;
    }

    // Check if we've narrowed down to exact position
    if (this.searchRangeEnd - this.searchRangeStart < 1) {
      // Insert at the determined position
      const insertPosition = this.searchRangeEnd;
      this.sortedTasks.splice(insertPosition, 0, this.currentTask);

      // Record the final placement
      this.comparisonHistory.push({
        task: this.currentTask,
        choice: 'positioned',
        insertPosition,
        rangeStart: this.searchRangeStart,
        rangeEnd: this.searchRangeEnd,
      });

      // Now remove from unranked since it's positioned
      const removedTask = this.unrankedTasks.shift();
      console.log('POSITIONING COMPLETE:', {
        positionedTask: this.currentTask,
        removedFromUnranked: removedTask,
        sortedTasksLength: this.sortedTasks.length,
        unrankedTasksLength: this.unrankedTasks.length,
        sortedTasks: this.sortedTasks,
        unrankedTasks: this.unrankedTasks,
      });

      // Validation: removed task should match current task
      if (removedTask !== this.currentTask) {
        throw new Error(
          `Removed wrong task: expected ${this.currentTask}, got ${removedTask}`
        );
      }

      this.currentTask = undefined;
      return this.getNextMatch(); // Get next task
    }

    // Determine anchor tasks based on sorted list size and current range
    const rangeSize = this.searchRangeEnd - this.searchRangeStart;

    console.log('ANCHOR SELECTION DECISION:', {
      currentTask: this.currentTask,
      sortedTasksLength: this.sortedTasks.length,
      sortedTasks: this.sortedTasks,
      unrankedTasksLength: this.unrankedTasks.length,
      rangeSize,
      searchRangeStart: this.searchRangeStart,
      searchRangeEnd: this.searchRangeEnd,
    });

    if (this.sortedTasks.length === 1) {
      // Second task: simple Above/Below choice
      const anchor1 = this.sortedTasks[0];

      // Validation: ensure anchor is from sorted tasks only
      if (anchor1 && this.unrankedTasks.includes(anchor1)) {
        throw new Error(
          `Anchor1 ${anchor1} found in unranked tasks - this should not happen`
        );
      }
      if (anchor1 === this.currentTask) {
        throw new Error(`Anchor cannot be the current task being positioned`);
      }

      return {
        player1: this.currentTask || null,
        player2: anchor1 || null,
        round: this.sortedTasks.length + 1,
        matchInRound: this.completedComparisons + 1,
        bracket: 'insertion',
        originalMatch: {
          task: this.currentTask || null,
          anchor1: anchor1 || null,
          anchor2: null,
          anchor1Index: 0,
          anchor2Index: null,
          rangeStart: this.searchRangeStart,
          rangeEnd: this.searchRangeEnd,
          comparisonType: 'two-way', // Above/Below only
        },
      };
    } else if (rangeSize <= 2) {
      // Range narrowed to 1-2 positions: Above/Below single anchor
      const anchorIndex = this.searchRangeStart;
      const anchor1 =
        this.sortedTasks[anchorIndex] || this.sortedTasks[anchorIndex - 1];

      // Validation: ensure anchor is from sorted tasks only
      if (anchor1 && this.unrankedTasks.includes(anchor1)) {
        throw new Error(
          `Anchor1 ${anchor1} found in unranked tasks - this should not happen`
        );
      }
      if (anchor1 === this.currentTask) {
        throw new Error(`Anchor cannot be the current task being positioned`);
      }

      return {
        player1: this.currentTask || null,
        player2: anchor1 || null,
        round: this.sortedTasks.length + 1,
        matchInRound: this.completedComparisons + 1,
        bracket: 'insertion',
        originalMatch: {
          task: this.currentTask || null,
          anchor1: anchor1 || null,
          anchor2: null,
          anchor1Index: anchorIndex,
          anchor2Index: null,
          rangeStart: this.searchRangeStart,
          rangeEnd: this.searchRangeEnd,
          comparisonType: 'two-way', // Above/Below only
        },
      };
    } else {
      // Range has 3+ positions: trisection with Above/Between/Below
      // Calculate trisection points within the current search range
      const oneThird = Math.floor(this.searchRangeStart + rangeSize / 3);
      const twoThirds = Math.floor(this.searchRangeStart + (2 * rangeSize) / 3);

      // Convert insertion positions to task indices
      // For insertion position P, we want the task at index P-1 (the task before that position)
      // But clamp to valid task indices
      const anchor1Index = Math.max(
        0,
        Math.min(oneThird - 1, this.sortedTasks.length - 1)
      );
      const anchor2Index = Math.max(
        0,
        Math.min(twoThirds - 1, this.sortedTasks.length - 1)
      );

      // If both anchors would be the same, spread them out
      const finalAnchor1Index = anchor1Index;
      const finalAnchor2Index =
        anchor1Index === anchor2Index
          ? Math.min(anchor1Index + 1, this.sortedTasks.length - 1)
          : anchor2Index;

      const anchor1 = this.sortedTasks[finalAnchor1Index];
      const anchor2 = this.sortedTasks[finalAnchor2Index];

      console.log('TRISECTION ANCHORS:', {
        rangeSize,
        searchRangeStart: this.searchRangeStart,
        searchRangeEnd: this.searchRangeEnd,
        oneThird,
        twoThirds,
        anchor1Index,
        anchor2Index,
        finalAnchor1Index,
        finalAnchor2Index,
        anchor1,
        anchor2,
        sortedTasks: this.sortedTasks,
      });

      // Validation: ensure anchors are from sorted tasks only
      if (anchor1 && this.unrankedTasks.includes(anchor1)) {
        throw new Error(
          `Anchor1 ${anchor1} found in unranked tasks - this should not happen`
        );
      }
      if (anchor2 && this.unrankedTasks.includes(anchor2)) {
        throw new Error(
          `Anchor2 ${anchor2} found in unranked tasks - this should not happen`
        );
      }
      if (anchor1 === this.currentTask || anchor2 === this.currentTask) {
        throw new Error(`Anchor cannot be the current task being positioned`);
      }

      return {
        player1: this.currentTask || null,
        player2: anchor1 || null, // Still using player2 for compatibility
        round: this.sortedTasks.length + 1,
        matchInRound: this.completedComparisons + 1,
        bracket: 'insertion',
        originalMatch: {
          task: this.currentTask || null,
          anchor1: anchor1 || null,
          anchor2: anchor2 || null,
          anchor1Index: finalAnchor1Index,
          anchor2Index: finalAnchor2Index,
          rangeStart: this.searchRangeStart,
          rangeEnd: this.searchRangeEnd,
          comparisonType: 'three-way', // Above/Between/Below
        },
      };
    }
  }

  reportResult(
    match: ActiveMatch,
    choice: 'above' | 'between' | 'below'
  ): void {
    if (!this.currentTask || !match.originalMatch) {
      throw new Error('No active insertion in progress');
    }

    const {
      anchor1,
      anchor2,
      anchor1Index,
      anchor2Index,
      rangeStart,
      rangeEnd,
      comparisonType,
    } = match.originalMatch;

    this.completedComparisons++;

    console.log('REPORTRESULT DEBUG:', {
      task: this.currentTask,
      choice,
      comparisonType,
      anchor1Index,
      anchor2Index,
      beforeRangeStart: this.searchRangeStart,
      beforeRangeEnd: this.searchRangeEnd,
    });

    // Update search range based on choice and comparison type
    if (comparisonType === 'two-way') {
      // Simple Above/Below choice with single anchor
      // anchor1Index is task index, insertion positions are [anchor1Index, anchor1Index+1]
      switch (choice) {
        case 'above': {
          // Task goes above the anchor (before that task's insertion position)
          const abovePos = anchor1Index || 0;
          this.searchRangeStart = abovePos;
          this.searchRangeEnd = abovePos;
          break;
        }
        case 'below': {
          // Task goes below the anchor (after that task's insertion position)
          const belowPos = (anchor1Index || 0) + 1;
          this.searchRangeStart = belowPos;
          this.searchRangeEnd = belowPos;
          break;
        }
        case 'between': {
          // Between not valid for two-way, treat as below
          const betweenPos = (anchor1Index || 0) + 1;
          this.searchRangeStart = betweenPos;
          this.searchRangeEnd = betweenPos;
          break;
        }
      }
    } else {
      // Three-way choice with two anchors (trisection)
      // Convert task indices to insertion position ranges
      const anchor1InsertPos = anchor1Index || 0;
      const anchor2InsertPos = (anchor2Index || 0) + 1;

      switch (choice) {
        case 'above':
          // Task goes above both anchors (before anchor1)
          this.searchRangeEnd = anchor1InsertPos;
          break;
        case 'between':
          // Task goes between the anchors (after anchor1, before anchor2)
          this.searchRangeStart = anchor1InsertPos + 1;
          this.searchRangeEnd = anchor2InsertPos;
          break;
        case 'below':
          // Task goes below both anchors (after anchor2)
          this.searchRangeStart = anchor2InsertPos;
          break;
      }
    }

    console.log('REPORTRESULT AFTER RANGE UPDATE:', {
      task: this.currentTask,
      choice,
      afterRangeStart: this.searchRangeStart,
      afterRangeEnd: this.searchRangeEnd,
      rangeSize: this.searchRangeEnd - this.searchRangeStart,
    });

    // Record this comparison
    this.comparisonHistory.push({
      task: this.currentTask,
      anchor1,
      anchor2,
      choice,
      insertPosition: -1, // Will be set when task is actually inserted
      rangeStart: rangeStart || 0,
      rangeEnd: rangeEnd || 0,
    });

    // Check if we've narrowed down to exact position
    const rangeSize = this.searchRangeEnd - this.searchRangeStart;
    const shouldPosition = rangeSize < 1;

    console.log('POSITIONING CHECK:', {
      rangeSize,
      comparisonType,
      shouldPosition,
    });

    if (shouldPosition) {
      // Insert at the determined position
      const insertPosition = this.searchRangeStart;
      this.sortedTasks.splice(insertPosition, 0, this.currentTask);

      // Record the final placement
      this.comparisonHistory.push({
        task: this.currentTask,
        choice: 'positioned',
        insertPosition,
        rangeStart: this.searchRangeStart,
        rangeEnd: this.searchRangeEnd,
      });

      // Now remove from unranked since it's positioned
      const removedTask = this.unrankedTasks.shift();
      console.log('POSITIONING COMPLETE:', {
        positionedTask: this.currentTask,
        removedFromUnranked: removedTask,
        sortedTasksLength: this.sortedTasks.length,
        unrankedTasksLength: this.unrankedTasks.length,
        sortedTasks: this.sortedTasks,
        unrankedTasks: this.unrankedTasks,
      });

      // Validation: removed task should match current task
      if (removedTask !== this.currentTask) {
        throw new Error(
          `Removed wrong task: expected ${this.currentTask}, got ${removedTask}`
        );
      }

      this.currentTask = undefined;
    }
  }

  // Legacy reportResult method for compatibility (maps winner selection to insertion choice)
  reportResultLegacy(match: ActiveMatch, _winnerUuid: ParticipantUUID): void {
    // This shouldn't be called for insertion tournaments, but provide fallback
    console.warn('InsertionTournament received legacy reportResult call');
    if (match.originalMatch?.anchor1 && match.originalMatch?.anchor2) {
      // Default to 'between' choice
      this.reportResult(match, 'between');
    }
  }

  isComplete(): boolean {
    if (this._isCompleteFromStorage && this._finalResults) {
      return true;
    }

    const isComplete = this.unrankedTasks.length === 0 && !this.currentTask;
    console.log('INSERTION TOURNAMENT COMPLETION CHECK:', {
      unrankedTasksLength: this.unrankedTasks.length,
      currentTask: this.currentTask,
      sortedTasksLength: this.sortedTasks.length,
      isComplete,
    });

    return isComplete;
  }

  getRankings(): ParticipantUUID[] {
    if (this._isCompleteFromStorage && this._finalResults) {
      return this._finalResults.rankings.map((r: any) => r.participantId);
    }
    return [...this.sortedTasks];
  }

  getSortedTasksCount(): number {
    return this.sortedTasks.length;
  }

  getWinner(): ParticipantUUID | null {
    if (!this.isComplete()) {
      return null;
    }
    const rankings = this.getRankings();
    return rankings.length > 0 ? rankings[0] || null : null;
  }

  getCurrentMatchNumber(): number {
    return this.completedComparisons + 1;
  }

  getTotalMatches(): number {
    return this.totalComparisons;
  }

  getTotalRounds(): number {
    return this.originalEntrants.length;
  }

  getMatchesInRound(round: number): number {
    // Each "round" represents ranking one task
    return round <= this.originalEntrants.length ? 1 : 0;
  }

  getMatchHistoryForParticipant(participantId: ParticipantUUID): any[] {
    if (this._isCompleteFromStorage && this._finalResults) {
      const participantResult = this._finalResults.rankings.find(
        (r: any) => r.participantId === participantId
      );
      return participantResult?.matchHistory || [];
    }

    const matchHistory: any[] = [];

    // Find comparisons involving this participant
    this.comparisonHistory.forEach((comparison, index) => {
      if (comparison.task === participantId) {
        matchHistory.push({
          round: index + 1,
          opponent: null, // Insertion doesn't have traditional opponents
          result: 'RANKED',
          matchNumber: index + 1,
          bracket: 'insertion',
          details: {
            choice: comparison.choice,
            anchor1: comparison.anchor1,
            anchor2: comparison.anchor2,
            insertPosition: comparison.insertPosition,
          },
        });
      }
    });

    return matchHistory;
  }

  exportState(): any {
    const isComplete = this.isComplete();
    const baseState = {
      version: '3.0',
      type: this.type,
      originalEntrants: this.originalEntrants,
      taskNameColumn: this.taskNameColumn,
      isComplete,
      insertionState: {
        unrankedTasks: this.unrankedTasks,
        sortedTasks: this.sortedTasks,
        currentTask: this.currentTask,
        searchRangeStart: this.searchRangeStart,
        searchRangeEnd: this.searchRangeEnd,
        completedComparisons: this.completedComparisons,
        totalComparisons: this.totalComparisons,
        comparisonHistory: this.comparisonHistory,
      },
    };

    // If tournament is complete, store final results
    if (isComplete) {
      try {
        const finalRankings = this.getRankings();
        const finalRankingsWithHistory = finalRankings.map(
          (participantId, index) => ({
            rank: index + 1,
            participantId,
            matchHistory: this.getMatchHistoryForParticipant(participantId),
          })
        );

        return {
          ...baseState,
          finalResults: {
            rankings: finalRankingsWithHistory,
            winner: this.getWinner(),
          },
        };
      } catch (error) {
        console.error(
          'Error creating final results for insertion tournament:',
          error
        );
        return baseState;
      }
    }

    return baseState;
  }

  static fromState(
    state: any,
    options: TournamentOptions = {}
  ): InsertionTournament {
    const tournament = new InsertionTournament(state.originalEntrants, {
      ...options,
      taskNameColumn: state.taskNameColumn,
      seedingMethod: 'order', // Preserve order when restoring
    });

    // Check if this is a completed tournament with final results
    if (state.isComplete && (state as any).finalResults) {
      console.log(
        'Insertion tournament is complete, using stored final results'
      );
      tournament._finalResults = (state as any).finalResults;
      tournament._isCompleteFromStorage = true;
      // Still restore the state for debugging if needed
      if (state.insertionState) {
        tournament.unrankedTasks = state.insertionState.unrankedTasks || [];
        tournament.sortedTasks = state.insertionState.sortedTasks || [];
        tournament.currentTask = state.insertionState.currentTask;
        tournament.searchRangeStart =
          state.insertionState.searchRangeStart || 0;
        tournament.searchRangeEnd = state.insertionState.searchRangeEnd || 0;
        tournament.completedComparisons =
          state.insertionState.completedComparisons || 0;
        tournament.totalComparisons =
          state.insertionState.totalComparisons || 0;
        tournament.comparisonHistory =
          state.insertionState.comparisonHistory || [];
      }
      return tournament;
    }

    // For incomplete tournaments, restore the state completely
    if (state.insertionState) {
      tournament.unrankedTasks = state.insertionState.unrankedTasks || [];
      tournament.sortedTasks = state.insertionState.sortedTasks || [];
      tournament.currentTask = state.insertionState.currentTask;
      tournament.searchRangeStart = state.insertionState.searchRangeStart || 0;
      tournament.searchRangeEnd = state.insertionState.searchRangeEnd || 0;
      tournament.completedComparisons =
        state.insertionState.completedComparisons || 0;
      tournament.totalComparisons = state.insertionState.totalComparisons || 0;
      tournament.comparisonHistory =
        state.insertionState.comparisonHistory || [];
    }

    return tournament;
  }

  private _applySeedingMethod(
    participants: ParticipantUUID[],
    seedingMethod: SeedingMethod
  ): ParticipantUUID[] {
    switch (seedingMethod) {
      case 'random': {
        const shuffled = [...participants];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = shuffled[i];
          const tempJ = shuffled[j];
          if (temp && tempJ) {
            shuffled[i] = tempJ;
            shuffled[j] = temp;
          }
        }
        return shuffled;
      }
      case 'order':
      default:
        return [...participants];
    }
  }
}
