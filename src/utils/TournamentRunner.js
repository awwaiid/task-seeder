/**
 * Tournament Runner - A clean API for managing tournament matches
 * Now powered by tournament-pairings library
 */
import { SingleElimination, DoubleElimination } from 'tournament-pairings';

export class Tournament {
    constructor(type, entrants) {
        if (!entrants || entrants.length < 1) {
            throw new Error('Tournament requires at least 1 entrant')
        }
        
        this.type = type // 'single' or 'double'
        this.originalEntrants = [...entrants]
        this.completedMatches = [] // Track completed matches with results
        this.completedMatchesSet = new Set() // O(1) lookup for completed matches
        this.remainingParticipants = [...entrants] // Track who's still in the tournament
        this.eliminationOrder = [] // Track the order in which participants are eliminated
        this.nextMatchCache = null // Cache for next available match
        
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
                            player2: null, // No opponent yet
                            win: { round: 2, match: 1 }
                        }
                    ]
                } else { // 3 players
                    this.bracket = [
                        {
                            round: 1,
                            match: 1,
                            player1: entrants[1], // Second player gets bye, third vs first
                            player2: entrants[2],
                            win: { round: 2, match: 1 },
                            loss: { round: 3, match: 1 }
                        },
                        {
                            round: 2,
                            match: 1,
                            player1: entrants[0], // First player (had bye)
                            player2: null, // Winner of round 1
                            win: { round: 4, match: 1 },
                            loss: { round: 3, match: 1 }
                        },
                        {
                            round: 3,
                            match: 1,
                            player1: null, // Loser of round 1
                            player2: null, // Loser of round 2
                            win: { round: 4, match: 1 }
                        },
                        {
                            round: 4,
                            match: 1,
                            player1: null, // Winner of round 2
                            player2: null // Winner of round 3
                        }
                    ]
                }
            } else {
                this.bracket = DoubleElimination(entrants)
            }
            this.lossCount = new Map() // Track losses per participant
            entrants.forEach(participant => {
                this.lossCount.set(participant, 0)
            })
        } else {
            this.bracket = SingleElimination(entrants)
        }
        
        // Index matches by round/match for quick lookup
        this.matchIndex = new Map()
        this.bracket.forEach(match => {
            const key = `${match.round}-${match.match}`
            this.matchIndex.set(key, match)
        })
        
        this._currentRound = 1
        this.currentMatch = 1
    }
    
    getNextMatch() {
        // Return cached match if still valid
        if (this.nextMatchCache && this._isValidCachedMatch(this.nextMatchCache)) {
            return this.nextMatchCache
        }
        
        // Find the next match that needs to be played
        for (const match of this.bracket) {
            // Skip if already completed
            if (this._isMatchCompleted(match)) continue
            
            // Skip if players aren't determined yet (both null)
            if (!match.player1 || !match.player2) continue
            
            // Cache and return this match
            this.nextMatchCache = {
                player1: match.player1,
                player2: match.player2,
                round: match.round,
                matchInRound: match.match,
                bracket: this._getBracketType(match),
                _internalMatch: match // Keep reference to original match
            }
            return this.nextMatchCache
        }
        
        this.nextMatchCache = null
        return null
    }
    
    _isValidCachedMatch(cachedMatch) {
        if (!cachedMatch || !cachedMatch._internalMatch) return false
        
        // Check if the cached match is still the right one
        const internalMatch = cachedMatch._internalMatch
        
        // If already completed, cache is invalid
        if (this._isMatchCompleted(internalMatch)) return false
        
        // If players changed, cache is invalid
        if (internalMatch.player1 !== cachedMatch.player1 || 
            internalMatch.player2 !== cachedMatch.player2) return false
            
        return true
    }
    
    reportResult(match, winner) {
        // Validate the winner is one of the players
        if (winner !== match.player1 && winner !== match.player2) {
            throw new Error('Winner must be one of the match participants')
        }
        
        const loser = winner === match.player1 ? match.player2 : match.player1
        const internalMatch = match._internalMatch
        
        // Create completed match record
        const completedMatch = {
            ...match,
            winner,
            loser,
            round: match.round,
            matchInRound: match.matchInRound
        }
        delete completedMatch._internalMatch
        
        // Add to completed matches
        this.completedMatches.push(completedMatch)
        
        // Add to Set for O(1) lookup performance
        const matchKey = `${match.round}-${match.matchInRound}`
        this.completedMatchesSet.add(matchKey)
        
        // Invalidate next match cache since tournament state is changing
        this.nextMatchCache = null
        
        // Update tournament state
        this._updateTournamentState(internalMatch, winner, loser)
        
        // Advance winner to next match
        this._advanceWinner(internalMatch, winner)
        
        // Handle loser (advance to losers bracket or eliminate)
        this._handleLoser(internalMatch, loser)
    }
    
    _isMatchCompleted(match) {
        // Use Set for O(1) lookup instead of O(n) array search
        const matchKey = `${match.round}-${match.match}`
        return this.completedMatchesSet.has(matchKey)
    }
    
    _getBracketType(match) {
        if (this.type === 'single') return 'single'
        
        // For double elimination, determine if this is winners, losers, or grand final
        if (this._isGrandFinal(match)) {
            return 'grand_final'
        } else if (this._isGrandFinalReset(match)) {
            return 'grand_final_reset'
        } else if (this._isWinnersBracket(match)) {
            return 'winners'
        } else {
            return 'losers'
        }
    }
    
    _isGrandFinal(match) {
        if (this.type !== 'double') return false
        
        // In tournament-pairings, the grand final is typically the highest round
        // with a match that has a win route (can advance) and loss route (losers bracket)
        const maxRound = Math.max(...this.bracket.map(m => m.round))
        return match.round === maxRound && match.win && match.loss
    }
    
    _isGrandFinalReset(match) {
        if (this.type !== 'double') return false
        
        // Reset match comes after grand final and feeds back to grand final
        return match.win && this._isGrandFinal(this.matchIndex.get(`${match.win.round}-${match.win.match}`))
    }
    
    _isWinnersBracket(match) {
        if (this.type !== 'double') return true
        
        // In double elimination, winners bracket matches generally have loss routes to losers bracket
        // and earlier rounds than losers bracket matches
        return match.loss && !this._isGrandFinal(match) && !this._isGrandFinalReset(match)
    }
    
    _updateTournamentState(match, winner, loser) {
        if (this.type === 'double') {
            // Track losses
            const currentLosses = this.lossCount.get(loser) || 0
            this.lossCount.set(loser, currentLosses + 1)
            
            // Remove from remaining participants only after second loss
            if (currentLosses + 1 >= 2) {
                this.remainingParticipants = this.remainingParticipants.filter(p => p !== loser)
                this.eliminationOrder.push(loser) // Track elimination order
            }
        } else {
            // Single elimination: remove loser immediately
            this.remainingParticipants = this.remainingParticipants.filter(p => p !== loser)
            this.eliminationOrder.push(loser) // Track elimination order
        }
    }
    
    _advanceWinner(match, winner) {
        if (match.win) {
            const nextMatch = this.matchIndex.get(`${match.win.round}-${match.win.match}`)
            if (nextMatch) {
                // Fill the next match with the winner
                if (!nextMatch.player1) {
                    nextMatch.player1 = winner
                } else if (!nextMatch.player2) {
                    nextMatch.player2 = winner
                }
            }
        }
    }
    
    _handleLoser(match, loser) {
        if (match.loss) {
            const nextMatch = this.matchIndex.get(`${match.loss.round}-${match.loss.match}`)
            if (nextMatch) {
                // Fill the losers bracket match with the loser
                if (!nextMatch.player1) {
                    nextMatch.player1 = loser
                } else if (!nextMatch.player2) {
                    nextMatch.player2 = loser
                }
            }
        }
    }
    
    isComplete() {
        // Tournament is complete when no more matches can be played
        return this.getNextMatch() === null
    }
    
    getWinner() {
        if (!this.isComplete()) {
            return null
        }
        
        // If only one entrant, they're the winner
        if (this.originalEntrants.length === 1) {
            return this.originalEntrants[0]
        }
        
        // Find the winner of the final match
        if (this.type === 'double') {
            // In double elimination, winner is either:
            // 1. Winner of grand final (if no reset needed)
            // 2. Winner of reset match (if reset occurred)
            const grandFinals = this.completedMatches.filter(m => 
                m.bracket === 'grand_final' || m.bracket === 'grand_final_reset'
            )
            
            if (grandFinals.length > 0) {
                const lastFinal = grandFinals[grandFinals.length - 1]
                return lastFinal.winner
            }
        }
        
        // For single elimination or if no grand final yet, find the last remaining participant
        return this.remainingParticipants[0] || null
    }
    
    getRankings() {
        // Return participants ranked by performance (best to worst)
        const rankings = []
        
        // 1. Winner (if tournament is complete)
        const winner = this.getWinner()
        if (winner) {
            rankings.push(winner)
        }
        
        // 2. Everyone else in reverse elimination order (last eliminated = best rank)
        const reversedElimination = [...this.eliminationOrder].reverse()
        rankings.push(...reversedElimination)
        
        // 3. Any remaining participants (shouldn't happen if tournament is complete)
        const remaining = this.remainingParticipants.filter(p => p !== winner)
        rankings.push(...remaining)
        
        return rankings
    }
    
    getCurrentMatchNumber() {
        // Count how many matches the user has actually seen so far
        return this.completedMatches.length + 1
    }
    
    getTotalMatches() {
        if (this.type === 'double') {
            // Double elimination maximum is (2n-1) matches
            return Math.max(0, (this.originalEntrants.length * 2) - 1)
        } else {
            // Single elimination always needs (n-1) matches
            return Math.max(0, this.originalEntrants.length - 1)
        }
    }
    
    getTotalRounds() {
        // Handle edge case of single participant
        if (this.originalEntrants.length <= 1) {
            return 0
        }
        // Calculate total rounds needed for this tournament size
        return Math.max(...this.bracket.map(m => m.round))
    }
    
    getMatchesInRound(round) {
        // Count matches in the specified round
        return this.bracket.filter(m => m.round === round).length
    }
    
    // Getters for backward compatibility
    get matches() {
        return this.completedMatches
    }
    
    get pendingMatches() {
        // Return matches that are ready to be played (both players determined)
        return this.bracket.filter(match => 
            match.player1 && match.player2 && !this._isMatchCompleted(match)
        ).map(match => ({
            player1: match.player1,
            player2: match.player2,
            round: match.round,
            matchInRound: match.match,
            bracket: this._getBracketType(match)
        }))
    }
    
    get currentRound() {
        // Find the lowest round that still has incomplete matches
        for (let round = 1; round <= this.getTotalRounds(); round++) {
            const roundMatches = this.bracket.filter(m => m.round === round)
            const hasIncomplete = roundMatches.some(m => 
                (m.player1 && m.player2) && !this._isMatchCompleted(m)
            )
            if (hasIncomplete) {
                return round
            }
        }
        return this.getTotalRounds()
    }
    
    // Method to rebuild internal state after loading from saved data
    rebuildInternalState() {
        // Rebuild completedMatchesSet from completedMatches array
        this.completedMatchesSet = new Set()
        this.completedMatches.forEach(match => {
            const matchKey = `${match.round}-${match.matchInRound}`
            this.completedMatchesSet.add(matchKey)
        })
        
        // Clear cache to force recalculation with correct state
        this.nextMatchCache = null
    }
}