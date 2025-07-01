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
): Tournament | QuickSortTournament {
  if (type === 'quicksort') {
    return new QuickSortTournament(entrants, options);
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
    const allMatchesComplete =
      this.tournament.matches?.every((match: any) => !match.active) || false;
    const complete =
      this.tournament.status === 'complete' ||
      (this.tournament.status === 'stage-one' && allMatchesComplete);
    console.log(
      'isComplete() called, status:',
      this.tournament?.status,
      'allMatchesComplete:',
      allMatchesComplete,
      'complete:',
      complete
    );
    return complete;
  }

  findParticipantByPlayerId(playerId: ParticipantUUID): ParticipantUUID {
    return this._findParticipantByPlayerId(playerId);
  }

  getRankings(): ParticipantUUID[] {
    // Now returns UUIDs instead of participant objects
    console.log('getRankings() called');
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
        meta: this.tournament.meta,
      },
      tournamentId: this.tournamentId,
    };
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

      // Restore the complete tournament state directly
      const savedTournamentState = state.tournamentState;
      if (savedTournamentState) {
        console.log('Restoring saved tournament state:', {
          hasMatches: !!savedTournamentState.matches,
          matchesCount: savedTournamentState.matches?.length || 0,
          hasPlayers: !!savedTournamentState.players,
          playersCount: savedTournamentState.players?.length || 0,
          status: savedTournamentState.status,
        });

        // Restore specific state properties while preserving tournament methods
        tournament.tournament.id = savedTournamentState.id;
        tournament.tournament.name = savedTournamentState.name;
        tournament.tournament.status = savedTournamentState.status;
        tournament.tournament.round = savedTournamentState.round;
        tournament.tournament.players = savedTournamentState.players;
        tournament.tournament.matches = savedTournamentState.matches;
        tournament.tournament.seating = savedTournamentState.seating;
        tournament.tournament.sorting = savedTournamentState.sorting;
        tournament.tournament.scoring = savedTournamentState.scoring;
        tournament.tournament.stageOne = savedTournamentState.stageOne;
        tournament.tournament.stageTwo = savedTournamentState.stageTwo;
        tournament.tournament.meta = savedTournamentState.meta;
        
        // Ensure the manager is aware of the restored tournament
        (tournament.manager as any).tournaments = (tournament.manager as any).tournaments || {};
        (tournament.manager as any).tournaments[tournament.tournamentId] = tournament.tournament;

        console.log('Tournament state restored successfully');
      } else {
        console.warn('No saved tournament state found, using fresh tournament');
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
    return this.comparisons.length === 0;
  }

  getRankings(): ParticipantUUID[] {
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

  exportState(): any {
    return {
      version: '3.0',
      type: this.type,
      originalEntrants: this.originalEntrants,
      taskNameColumn: this.taskNameColumn,
      quicksortState: {
        participants: this.participants,
        comparisons: this.comparisons,
        completedComparisons: this.completedComparisons,
        totalComparisons: this.totalComparisons,
        comparisonResults: Array.from(this.comparisonResults.entries()),
      },
    };
  }

  static fromStoredState(
    state: any,
    options: TournamentOptions = {}
  ): QuickSortTournament {
    const tournament = new QuickSortTournament(state.originalEntrants, {
      ...options,
      taskNameColumn: state.taskNameColumn,
    });

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
