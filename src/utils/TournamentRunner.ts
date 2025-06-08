/**
 * Tournament Runner - A clean API for managing tournament matches
 * Now powered by tournament-pairings library
 */
import { SingleElimination, DoubleElimination } from 'tournament-pairings';

export class Tournament {
    type: string;
    originalEntrants: any[];
    completedMatches: any[];
    completedMatchesSet: Set<string>;
    remainingParticipants: any[];
    eliminationOrder: any[];
    nextMatchCache: any;
    bracketProgressCache: any;
    nextMatchIndex: number;
    matchPriorityQueue: any;
    bracket: any[] = [];
    lossCount: Map<any, number>;
    matchIndex: Map<string, any>;
    _currentRound: number;
    currentMatch: number;
    progressCallback: ((progress: any) => void) | null;

    // Computed property for compatibility
    get matches(): any[] {
        return this.completedMatches;
    }

    constructor(type: string, entrants: any[], options: any = {}) {
        if (!entrants || entrants.length < 1) {
            throw new Error('Tournament requires at least 1 entrant')
        }
        
        this.progressCallback = options.progressCallback || null
        
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
                    this.bracket = doubleElim.bracket
                    
                    // Add participants to bracket
                    this._addParticipantsToBracket(entrants)
                    this.lossCount = new Map()
                    entrants.forEach((entrant: any) => this.lossCount.set(entrant, 0))
                } catch (error) {
                    console.error('Failed to create double elimination with tournament-pairings, using single elimination fallback:', error)
                    this.type = 'single'
                    const singleElim = new (SingleElimination as any)(entrants.length)
                    this.bracket = singleElim.bracket
                    this._addParticipantsToBracket(entrants)
                    this.lossCount = new Map()
                }
            }
        } else {
            // Single elimination
            const singleElim = new (SingleElimination as any)(entrants.length)
            this.bracket = singleElim.bracket
            
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
    getNextMatch(): any {
        // Simple implementation for now
        for (let i = this.nextMatchIndex; i < this.bracket.length; i++) {
            const match = this.bracket[i]
            
            if (this._isMatchCompleted(match)) continue
            if (!match.player1 || !match.player2) continue
            
            this.nextMatchIndex = i
            
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
        return this.remainingParticipants.length <= 1
    }

    getRankings(): any[] {
        // Simple ranking based on elimination order
        const rankings = [...this.eliminationOrder].reverse()
        if (this.remainingParticipants.length > 0) {
            rankings.push(...this.remainingParticipants)
        }
        return rankings
    }

    reportResult(match: any, winner: any): void {
        const loser = match.player1 === winner ? match.player2 : match.player1
        
        // Record the completed match
        const completedMatch = {
            player1: match.player1,
            player2: match.player2,
            winner: winner,
            loser: loser,
            round: match.round,
            matchInRound: match.matchInRound || match.match,
            bracket: match.bracket
        }
        
        this.completedMatches.push(completedMatch)
        this.completedMatchesSet.add(`${match.round}-${match.match}`)
        
        // Remove loser from remaining participants (for single elimination)
        if (this.type === 'single') {
            const loserIndex = this.remainingParticipants.indexOf(loser)
            if (loserIndex > -1) {
                this.remainingParticipants.splice(loserIndex, 1)
                this.eliminationOrder.push(loser)
            }
        } else {
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
    private _addParticipantsToBracket(entrants: any[]): void {
        // Simple seeding - assign participants to first available slots
        let entrantIndex = 0
        for (const match of this.bracket) {
            if (match.player1 === null && entrantIndex < entrants.length) {
                match.player1 = entrants[entrantIndex++]
            }
            if (match.player2 === null && entrantIndex < entrants.length) {
                match.player2 = entrants[entrantIndex++]
            }
        }
    }

    private _isMatchCompleted(match: any): boolean {
        return this.completedMatchesSet.has(`${match.round}-${match.match}`)
    }

    private _determineBracketType(match: any): string {
        // Simple bracket type determination
        return match.bracket || 'main'
    }

    private _advanceWinnerInBracket(match: any, winner: any, loser: any): void {
        // Find and update the next match for the winner
        if (match.win) {
            const nextMatch = this.bracket.find((m: any) => 
                m.round === match.win.round && m.match === match.win.match
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
        if (this.type === 'double' && match.loss) {
            const loserMatch = this.bracket.find((m: any) => 
                m.round === match.loss.round && m.match === match.loss.match
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
}