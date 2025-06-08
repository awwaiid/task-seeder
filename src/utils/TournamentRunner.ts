/**
 * Tournament Runner - A clean API for managing tournament matches
 * Now powered by tournament-pairings library
 */
import { SingleElimination, DoubleElimination } from 'tournament-pairings';
import type { TournamentType, TournamentOptions, ActiveMatch, Participant } from '../types/tournament';

// Re-export types for backwards compatibility
export type { TournamentType, TournamentOptions, ActiveMatch };

export class Tournament {
    type: string;
    originalEntrants: Participant[];
    completedMatches: any[];
    completedMatchesSet: Set<string>;
    remainingParticipants: Participant[];
    eliminationOrder: Participant[];
    nextMatchCache: any;
    bracketProgressCache: any;
    nextMatchIndex: number;
    matchPriorityQueue: any;
    bracket: any[] = [];
    lossCount: Map<Participant, number>;
    matchIndex: Map<string, any>;
    _currentRound: number;
    currentMatch: number;
    progressCallback: ((progress: any) => void) | null;
    taskNameColumn: string | undefined;

    // Computed property for compatibility
    get matches(): any[] {
        return this.completedMatches;
    }

    get pendingMatches(): any[] {
        return this.bracket.filter(match => 
            !this._isMatchCompleted(match) && 
            match.player1 && 
            match.player2 &&
            !this._isBYEParticipant(match.player1) && 
            !this._isBYEParticipant(match.player2) &&
            !this._isUntitledParticipant(match.player1, this.taskNameColumn) && 
            !this._isUntitledParticipant(match.player2, this.taskNameColumn)
        );
    }

    constructor(type: TournamentType, entrants: Participant[], options: TournamentOptions = {}) {
        if (!entrants || entrants.length < 1) {
            throw new Error('Tournament requires at least 1 entrant')
        }
        
        this.progressCallback = options.progressCallback || null
        this.taskNameColumn = options.taskNameColumn
        
        this.type = type // 'single' or 'double'
        this.originalEntrants = [...entrants]
        this.completedMatches = [] // Track completed matches with results
        this.completedMatchesSet = new Set() // O(1) lookup for completed matches
        this.remainingParticipants = [...entrants] // Track who's still in the tournament
        this.eliminationOrder = [] // Track the order in which participants are eliminated
        this.nextMatchCache = null // Cache for next available match
        this.bracketProgressCache = null // Cache bracket progress counts for performance
        this.nextMatchIndex = 0 // Track position in bracket array for O(1) lookup
        this.matchPriorityQueue = null // Pre-computed smart match order for double elimination
        
        // Handle special case: single entrant tournaments need no matches
        if (entrants.length === 1) {
            this.bracket = []
            this.lossCount = new Map()
            this.matchIndex = new Map()
            this._currentRound = 1
            this.currentMatch = 1
            return
        }
        
        // Generate the full tournament bracket using tournament-pairings
        if (this.type === 'double') {
            // Handle edge cases: tournament-pairings has bugs with small tournaments
            if (entrants.length <= 3) {
                // Manually create simple brackets for small tournaments (tournament-pairings has bugs)
                if (entrants.length === 2) {
                    this.bracket = [
                        {
                            round: 1,
                            match: 1,
                            player1: entrants[1], // Bob
                            player2: entrants[0], // Alice
                            win: { round: 2, match: 1 },
                            loss: { round: 3, match: 1 }
                        },
                        {
                            round: 2,
                            match: 1,
                            player1: null, // Winner of round 1
                            player2: null, // No second finalist yet
                        },
                        {
                            round: 3,
                            match: 1,
                            player1: null, // Loser of round 1
                            player2: null, // This slot is filled when round 2 is determined
                        }
                    ]
                } else if (entrants.length === 3) {
                    this.bracket = [
                        {
                            round: 1,
                            match: 1,
                            player1: entrants[1], // Bob 
                            player2: entrants[2], // Charlie
                            win: { round: 2, match: 1 },
                            loss: { round: 3, match: 1 }
                        },
                        {
                            round: 2,
                            match: 1,
                            player1: entrants[0], // Alice (has bye)
                            player2: null, // Winner of round 1 Bob vs Charlie
                            win: { round: 4, match: 1 },
                            loss: { round: 3, match: 1 }
                        },
                        {
                            round: 3,
                            match: 1,
                            player1: null, // Loser of round 1 (Bob or Charlie)
                            player2: null, // Loser of round 2 (Alice or Winner of round 1)
                        },
                        {
                            round: 4,
                            match: 1,
                            player1: null, // Winner of round 2
                            player2: null, // Winner of round 3 (if different)
                        }
                    ]
                }
                this.lossCount = new Map()
                entrants.forEach((entrant: any) => this.lossCount.set(entrant, 0))
            } else {
                try {
                    const doubleElim = new (DoubleElimination as any)(entrants.length)
                    // The tournament-pairings library returns the bracket directly, not as a .bracket property
                    this.bracket = Array.isArray(doubleElim) ? doubleElim : (doubleElim.bracket || []);
                    
                    // Add participants to bracket
                    this._addParticipantsToBracket(entrants)
                    
                    this.lossCount = new Map()
                    entrants.forEach((entrant: any) => this.lossCount.set(entrant, 0))
                } catch (error) {
                    console.error('Failed to create double elimination with tournament-pairings, using single elimination fallback:', error)
                    this.type = 'single'
                    const singleElim = new (SingleElimination as any)(entrants.length)
                    
                    // The tournament-pairings library returns the bracket directly, not as a .bracket property
                    this.bracket = Array.isArray(singleElim) ? singleElim : (singleElim.bracket || []);
                    this._addParticipantsToBracket(entrants)
                    this.lossCount = new Map()
                }
            }
        } else {
            // Single elimination
            const singleElim = new (SingleElimination as any)(entrants.length)
            
            // The tournament-pairings library returns the bracket directly, not as a .bracket property
            this.bracket = Array.isArray(singleElim) ? singleElim : (singleElim.bracket || []);
            
            // Add participants to bracket
            this._addParticipantsToBracket(entrants)
            this.lossCount = new Map()
        }
        
        // Build fast match index for O(1) match lookup
        this.matchIndex = new Map()
        this.bracket.forEach((match: any) => {
            const key = `${match.round}-${match.match}`
            this.matchIndex.set(key, match)
        })
        
        // Pre-compute tournament structure for O(1) access
        this._precomputeTournamentStructure()
        
        // For double elimination, pre-compute smart match order  
        if (this.type === 'double') {
            this._buildMatchPriorityQueueEfficient()
        }
        
        this._currentRound = 1
        this.currentMatch = 1
    }

    // Essential methods that are called by components
    getNextMatch(): ActiveMatch | null {
        // Check if tournament is already complete
        if (this.isComplete()) {
            return null;
        }
        
        // Simple implementation for now
        for (let i = this.nextMatchIndex; i < this.bracket.length; i++) {
            const match = this.bracket[i]
            
            if (this._isMatchCompleted(match)) continue
            
            // Skip matches with null, undefined, BYE, or untitled participants
            if (!match.player1 || !match.player2) continue
            if (this._isBYEParticipant(match.player1) || this._isBYEParticipant(match.player2)) continue
            if (this._isUntitledParticipant(match.player1, this.taskNameColumn) || this._isUntitledParticipant(match.player2, this.taskNameColumn)) continue
            
            // Move to next index for future calls
            this.nextMatchIndex = i + 1
            
            return {
                player1: match.player1,
                player2: match.player2,
                round: match.round,
                matchInRound: match.match,
                bracket: this._determineBracketType(match),
                originalMatch: match
            }
        }
        
        return null
    }

    getTotalMatches(): number {
        return this.bracket.length
    }

    getCurrentMatchNumber(): number {
        return this.completedMatches.length + 1
    }

    getTotalRounds(): number {
        if (this.bracket.length === 0) return 0
        return Math.max(...this.bracket.map((match: any) => match.round))
    }

    getMatchesInRound(round: number): number {
        return this.bracket.filter((match: any) => match.round === round).length
    }

    isComplete(): boolean {
        // Tournament is complete if we have only one remaining participant
        if (this.remainingParticipants.length <= 1) {
            return true;
        }
        
        // Also check if we have no more valid matches to play
        // (all remaining matches involve BYE/untitled participants or are completed)
        let hasValidMatches = false;
        for (let i = this.nextMatchIndex; i < this.bracket.length; i++) {
            const match = this.bracket[i];
            
            if (this._isMatchCompleted(match)) continue;
            if (!match.player1 || !match.player2) continue;
            if (this._isBYEParticipant(match.player1) || this._isBYEParticipant(match.player2)) continue;
            if (this._isUntitledParticipant(match.player1, this.taskNameColumn) || this._isUntitledParticipant(match.player2, this.taskNameColumn)) continue;
            
            hasValidMatches = true;
            break;
        }
        
        return !hasValidMatches;
    }

    getRankings(): Participant[] {
        // For proper double elimination ranking, we need to consider actual match participation
        const rankings: Participant[] = []
        
        // Get participants who actually played matches (winners and losers)
        const participantsWhoPlayed = new Set<Participant>()
        this.completedMatches.forEach(match => {
            participantsWhoPlayed.add(match.player1)
            participantsWhoPlayed.add(match.player2)
        })
        
        // Separate remaining participants into those who played and those who didn't
        const remainingWhoPlayed = this.remainingParticipants.filter(p => participantsWhoPlayed.has(p))
        const remainingWhoDidntPlay = this.remainingParticipants.filter(p => !participantsWhoPlayed.has(p))
        
        // For double elimination, rank based on actual tournament participation:
        // 1. Remaining participants who played matches (true winners)
        rankings.push(...remainingWhoPlayed)
        
        // 2. Eliminated participants in reverse elimination order (last eliminated = higher rank)
        rankings.push(...[...this.eliminationOrder].reverse())
        
        // 3. Participants who got automatic advancement without playing (lowest priority)
        rankings.push(...remainingWhoDidntPlay)
        
        return rankings
    }

    getWinner(): Participant | null {
        if (this.isComplete() && this.remainingParticipants.length === 1) {
            return this.remainingParticipants[0] || null;
        }
        return null;
    }

    reportResult(match: ActiveMatch, winner: Participant): void {
        const loser = match.player1 === winner ? match.player2 : match.player1
        
        // Record the completed match
        const completedMatch = {
            player1: match.player1,
            player2: match.player2,
            winner: winner,
            loser: loser,
            round: match.round,
            matchInRound: match.matchInRound,
            bracket: match.bracket
        }
        
        this.completedMatches.push(completedMatch)
        this.completedMatchesSet.add(`${match.round}-${match.matchInRound}`)
        
        // Remove loser from remaining participants (for single elimination)
        if (loser && this.type === 'single') {
            const loserIndex = this.remainingParticipants.indexOf(loser)
            if (loserIndex > -1) {
                this.remainingParticipants.splice(loserIndex, 1)
                this.eliminationOrder.push(loser)
            }
        } else if (loser) {
            // Double elimination logic - simplified
            let currentLossCount = this.lossCount.get(loser) || 0
            currentLossCount++
            this.lossCount.set(loser, currentLossCount)
            
            if (currentLossCount >= 2) {
                const loserIndex = this.remainingParticipants.indexOf(loser)
                if (loserIndex > -1) {
                    this.remainingParticipants.splice(loserIndex, 1)
                    this.eliminationOrder.push(loser)
                }
            }
        }

        // Advance winner in bracket
        this._advanceWinnerInBracket(match, winner, loser)
        
        // Clear cache
        this.nextMatchCache = null
    }

    rebuildInternalState(): void {
        // Rebuild internal state after loading from storage
        this.completedMatchesSet = new Set()
        this.completedMatches.forEach((match: any) => {
            this.completedMatchesSet.add(`${match.round}-${match.matchInRound || match.match}`)
        })
        
        // Rebuild remaining participants based on completed matches
        this.remainingParticipants = [...this.originalEntrants]
        this.eliminationOrder = []
        
        // Process all completed matches to rebuild state
        this.completedMatches.forEach((match: any) => {
            const loser = match.loser
            if (this.type === 'single') {
                const loserIndex = this.remainingParticipants.indexOf(loser)
                if (loserIndex > -1) {
                    this.remainingParticipants.splice(loserIndex, 1)
                    this.eliminationOrder.push(loser)
                }
            } else {
                // Double elimination - check loss count
                let currentLossCount = this.lossCount.get(loser) || 0
                if (currentLossCount >= 2) {
                    const loserIndex = this.remainingParticipants.indexOf(loser)
                    if (loserIndex > -1) {
                        this.remainingParticipants.splice(loserIndex, 1)
                        this.eliminationOrder.push(loser)
                    }
                }
            }
        })
        
        this.nextMatchCache = null
    }

    // Helper methods (simplified implementations)
    private _addParticipantsToBracket(entrants: Participant[]): void {
        // Replace numeric indices with actual entrant objects
        // The tournament-pairings library uses 1-based indexing, so we need to convert to 0-based
        for (const match of this.bracket) {
            // If player1 is a number (1-based index), replace with actual entrant or null if out of bounds
            if (typeof match.player1 === 'number') {
                const zeroBasedIndex = match.player1 - 1; // Convert 1-based to 0-based
                if (zeroBasedIndex >= 0 && zeroBasedIndex < entrants.length) {
                    match.player1 = entrants[zeroBasedIndex]
                } else {
                    // Out of bounds index - set to null to indicate a BYE/empty slot
                    match.player1 = null
                }
            }
            // If player2 is a number (1-based index), replace with actual entrant or null if out of bounds
            if (typeof match.player2 === 'number') {
                const zeroBasedIndex = match.player2 - 1; // Convert 1-based to 0-based
                if (zeroBasedIndex >= 0 && zeroBasedIndex < entrants.length) {
                    match.player2 = entrants[zeroBasedIndex]
                } else {
                    // Out of bounds index - set to null to indicate a BYE/empty slot
                    match.player2 = null
                }
            }
        }
    }

    private _isMatchCompleted(match: any): boolean {
        return this.completedMatchesSet.has(`${match.round}-${match.match}`)
    }

    private _determineBracketType(match: any): string {
        // Simple bracket type determination
        return match.bracket || this.type
    }

    private _advanceWinnerInBracket(match: ActiveMatch, winner: Participant, loser: Participant | null): void {
        const originalMatch = match.originalMatch;
        
        // Find and update the next match for the winner
        if (originalMatch?.win) {
            const nextMatch = this.bracket.find((m: any) => 
                m.round === originalMatch.win.round && m.match === originalMatch.win.match
            )
            if (nextMatch) {
                if (!nextMatch.player1) {
                    nextMatch.player1 = winner
                } else if (!nextMatch.player2) {
                    nextMatch.player2 = winner
                }
            }
        }

        // For double elimination, handle loser bracket
        if (this.type === 'double' && originalMatch?.loss && loser) {
            const loserMatch = this.bracket.find((m: any) => 
                m.round === originalMatch.loss.round && m.match === originalMatch.loss.match
            )
            if (loserMatch && (this.lossCount.get(loser) || 0) < 2) {
                if (!loserMatch.player1) {
                    loserMatch.player1 = loser
                } else if (!loserMatch.player2) {
                    loserMatch.player2 = loser
                }
            }
        }
    }

    private _precomputeTournamentStructure(): void {
        // Placeholder for precomputation
    }

    private _buildMatchPriorityQueueEfficient(): void {
        // Placeholder for double elimination priority queue
    }

    private _isBYEParticipant(participant: any): boolean {
        if (!participant) return false;
        
        // Check if it's a string "BYE"
        if (typeof participant === 'string' && participant === 'BYE') return true;
        
        // Check if it's an object with a BYE-like name in common fields
        if (typeof participant === 'object') {
            const nameFields = ['name', 'title', 'task', 'summary'];
            for (const field of nameFields) {
                if (participant[field] === 'BYE') return true;
            }
        }
        
        return false;
    }

    private _isUntitledParticipant(participant: any, taskNameColumn?: string): boolean {
        if (!participant) return false;
        
        // Check if it's an object that would display as "Untitled Task"
        if (typeof participant === 'object') {
            // Check the task name column specifically if provided
            if (taskNameColumn && (!participant[taskNameColumn] || participant[taskNameColumn].trim() === '')) {
                return true;
            }
            
            // Also check common name fields
            const nameFields = ['name', 'title', 'task', 'summary'];
            const hasValidName = nameFields.some(field => 
                participant[field] && participant[field].toString().trim() !== ''
            );
            
            return !hasValidName;
        }
        
        return false;
    }
}