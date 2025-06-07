/**
 * Tournament Runner - A clean API for managing tournament matches
 * Now powered by tournament-pairings library
 */
import { SingleElimination, DoubleElimination } from 'tournament-pairings';

export class Tournament {
    constructor(type, entrants, options = {}) {
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
        
        // Pre-compute tournament structure for O(1) access
        this._precomputeTournamentStructure()
        
        // For double elimination, pre-compute smart match order  
        if (this.type === 'double') {
            this._buildMatchPriorityQueueEfficient()
        }
        
        this._currentRound = 1
        this.currentMatch = 1
    }
    
    getNextMatch() {
        // Return cached match if still valid
        if (this.nextMatchCache && this._isValidCachedMatch(this.nextMatchCache)) {
            return this.nextMatchCache
        }
        
        // For double elimination, use pre-computed priority queue for fast smart ordering
        if (this.type === 'double' && this.matchPriorityQueue) {
            return this._getNextMatchFromQueue()
        }
        
        // For single elimination, use simple fast lookup
        return this._getNextMatchSimple()
    }
    
    _getNextMatchSimple() {
        // Fast O(1) average case lookup using index tracking
        // Start from where we left off instead of always starting from 0
        for (let i = this.nextMatchIndex; i < this.bracket.length; i++) {
            const match = this.bracket[i]
            
            if (this._isMatchCompleted(match)) continue
            if (!match.player1 || !match.player2) continue
            
            // Update index for next search (most matches will be sequential)
            this.nextMatchIndex = i
            
            this.nextMatchCache = {
                player1: match.player1,
                player2: match.player2,
                round: match.round,
                matchInRound: match.match,
                bracket: this._getBracketType(match),
                _internalMatch: match
            }
            return this.nextMatchCache
        }
        
        this.nextMatchCache = null
        return null
    }
    
    _getNextMatchDoubleElimination() {
        // Single pass through bracket to find available matches and categorize them
        let winnersMatch = null
        let losersMatch = null
        let grandFinalMatch = null
        let winnersMinRound = Infinity
        let losersMinRound = Infinity
        
        // Single O(n) pass instead of multiple filter operations
        for (const match of this.bracket) {
            // Skip unavailable matches
            if (this._isMatchCompleted(match) || !match.player1 || !match.player2) continue
            
            // Categorize matches efficiently
            if (this._isGrandFinal(match) || this._isGrandFinalReset(match)) {
                if (!grandFinalMatch) grandFinalMatch = match
            } else if (this._isWinnersBracket(match)) {
                if (match.round < winnersMinRound || !winnersMatch) {
                    winnersMatch = match
                    winnersMinRound = match.round
                }
            } else {
                if (match.round < losersMinRound || !losersMatch) {
                    losersMatch = match
                    losersMinRound = match.round
                }
            }
        }
        
        // Priority: Grand final > Smart bracket selection
        let selectedMatch = null
        
        if (grandFinalMatch) {
            selectedMatch = grandFinalMatch
        } else if (winnersMatch && losersMatch) {
            // Both brackets have matches - use cached progress counts
            if (!this.bracketProgressCache) {
                this._updateBracketProgressCache()
            }
            
            const winnersProgress = this.bracketProgressCache.winners
            const losersProgress = this.bracketProgressCache.losers
            
            // Balance progression: if winners ahead by 2+, prefer losers
            if (winnersProgress - losersProgress >= 2) {
                selectedMatch = losersMatch
            } else {
                selectedMatch = winnersMatch // Default to winners bracket
            }
        } else {
            selectedMatch = winnersMatch || losersMatch
        }
        
        if (selectedMatch) {
            this.nextMatchCache = {
                player1: selectedMatch.player1,
                player2: selectedMatch.player2,
                round: selectedMatch.round,
                matchInRound: selectedMatch.match,
                bracket: this._getBracketType(selectedMatch),
                _internalMatch: selectedMatch
            }
            return this.nextMatchCache
        }
        
        this.nextMatchCache = null
        return null
    }
    
    _buildMatchPriorityQueueEfficient() {
        // Ultra-fast priority queue building for large tournaments
        const queue = []
        
        // Pre-allocate arrays with known max sizes
        const winnersRounds = new Map()
        const losersRounds = new Map()
        const grandFinals = []
        
        // Single pass categorization without expensive bracket type checks
        for (let i = 0; i < this.bracket.length; i++) {
            const match = this.bracket[i]
            
            // Quick grand final detection (avoid expensive _isGrandFinal calls)
            const hasWinRoute = !!match.win
            const hasLossRoute = !!match.loss
            
            if (!hasWinRoute && !hasLossRoute) {
                // No routes = grand final
                grandFinals.push({ match, index: i })
            } else if (hasLossRoute) {
                // Has loss route = winners bracket
                if (!winnersRounds.has(match.round)) {
                    winnersRounds.set(match.round, [])
                }
                winnersRounds.get(match.round).push({ match, index: i })
            } else {
                // No loss route = losers bracket
                if (!losersRounds.has(match.round)) {
                    losersRounds.set(match.round, [])
                }
                losersRounds.get(match.round).push({ match, index: i })
            }
        }
        
        // Get sorted round numbers
        const winnersRoundNums = Array.from(winnersRounds.keys()).sort((a, b) => a - b)
        const losersRoundNums = Array.from(losersRounds.keys()).sort((a, b) => a - b)
        
        // Interleave rounds for dramatic flow
        let wRound = 0, lRound = 0
        
        while (wRound < winnersRoundNums.length || lRound < losersRoundNums.length) {
            // Add winners round matches
            if (wRound < winnersRoundNums.length) {
                const roundMatches = winnersRounds.get(winnersRoundNums[wRound])
                queue.push(...roundMatches)
                wRound++
            }
            
            // Add 1-2 losers round matches  
            if (lRound < losersRoundNums.length) {
                const roundMatches = losersRounds.get(losersRoundNums[lRound])
                queue.push(...roundMatches)
                lRound++
                
                // Sometimes add second losers round for balance
                if (lRound < losersRoundNums.length && wRound % 2 === 0) {
                    const nextRoundMatches = losersRounds.get(losersRoundNums[lRound])
                    queue.push(...nextRoundMatches)
                    lRound++
                }
            }
        }
        
        // Add grand finals
        queue.push(...grandFinals)
        
        this.matchPriorityQueue = queue
    }
    
    _precomputeTournamentStructure() {
        // Pre-compute all expensive calculations once for O(1) access
        const maxRound = Math.max(...this.bracket.map(m => m.round))
        
        // Pre-compute bracket type for each match
        this.matchTypes = new Map()
        this.winnersBracketMatches = []
        this.losersBracketMatches = []
        this.grandFinalMatches = []
        
        // Pre-compute matches per round
        this.matchesPerRound = {}
        
        // Single pass through bracket to compute everything
        this.bracket.forEach((match, index) => {
            const key = `${match.round}-${match.match}`
            const hasWin = !!match.win
            const hasLoss = !!match.loss
            
            let type
            if (!hasWin && !hasLoss) {
                type = 'grand_final'
                this.grandFinalMatches.push(match)
            } else if (hasLoss) {
                type = 'winners'
                this.winnersBracketMatches.push(match)
            } else {
                type = 'losers'
                this.losersBracketMatches.push(match)
            }
            
            this.matchTypes.set(key, type)
            
            // Count matches per round
            if (!this.matchesPerRound[match.round]) {
                this.matchesPerRound[match.round] = 0
            }
            this.matchesPerRound[match.round]++
        })
        
        // Pre-compute tournament metadata
        this.tournamentMetadata = {
            totalMatches: this.bracket.length,
            maxRound: maxRound,
            winnersRounds: this.winnersBracketMatches.length > 0 ? Math.max(...this.winnersBracketMatches.map(m => m.round)) : 0,
            synchronizedTotalRounds: this.type === 'double' ? 
                (this.winnersBracketMatches.length > 0 ? Math.max(...this.winnersBracketMatches.map(m => m.round)) + 1 : maxRound) : 
                maxRound
        }
    }
    
    async _buildMatchPriorityQueueAsync() {
        // Non-blocking priority queue building for very large tournaments
        const CHUNK_SIZE = 100
        const queue = []
        const winnersRounds = new Map()
        const losersRounds = new Map()
        const grandFinals = []
        
        // Process matches in chunks to avoid blocking
        for (let start = 0; start < this.bracket.length; start += CHUNK_SIZE) {
            const end = Math.min(start + CHUNK_SIZE, this.bracket.length)
            
            // Process chunk
            for (let i = start; i < end; i++) {
                const match = this.bracket[i]
                
                const hasWinRoute = !!match.win
                const hasLossRoute = !!match.loss
                
                if (!hasWinRoute && !hasLossRoute) {
                    grandFinals.push({ match, index: i })
                } else if (hasLossRoute) {
                    if (!winnersRounds.has(match.round)) {
                        winnersRounds.set(match.round, [])
                    }
                    winnersRounds.get(match.round).push({ match, index: i })
                } else {
                    if (!losersRounds.has(match.round)) {
                        losersRounds.set(match.round, [])
                    }
                    losersRounds.get(match.round).push({ match, index: i })
                }
            }
            
            // Report progress
            if (this.progressCallback) {
                const progress = Math.round((end / this.bracket.length) * 100)
                this.progressCallback(`Building tournament structure... ${progress}%`)
            }
            
            // Yield control to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0))
        }
        
        // Build the final queue (this part is fast)
        const winnersRoundNums = Array.from(winnersRounds.keys()).sort((a, b) => a - b)
        const losersRoundNums = Array.from(losersRounds.keys()).sort((a, b) => a - b)
        
        let wRound = 0, lRound = 0
        
        while (wRound < winnersRoundNums.length || lRound < losersRoundNums.length) {
            if (wRound < winnersRoundNums.length) {
                const roundMatches = winnersRounds.get(winnersRoundNums[wRound])
                queue.push(...roundMatches)
                wRound++
            }
            
            if (lRound < losersRoundNums.length) {
                const roundMatches = losersRounds.get(losersRoundNums[lRound])
                queue.push(...roundMatches)
                lRound++
                
                if (lRound < losersRoundNums.length && wRound % 2 === 0) {
                    const nextRoundMatches = losersRounds.get(losersRoundNums[lRound])
                    queue.push(...nextRoundMatches)
                    lRound++
                }
            }
        }
        
        queue.push(...grandFinals)
        this.matchPriorityQueue = queue
        
        if (this.progressCallback) {
            this.progressCallback('Tournament ready!')
        }
    }
    
    _getNextMatchFromQueue() {
        // Fast O(1) lookup using pre-computed priority queue
        for (const item of this.matchPriorityQueue) {
            const match = item.match
            
            if (this._isMatchCompleted(match)) continue
            if (!match.player1 || !match.player2) continue
            
            this.nextMatchCache = {
                player1: match.player1,
                player2: match.player2,
                round: match.round,
                matchInRound: match.match,
                bracket: this._getBracketType(match),
                _internalMatch: match
            }
            return this.nextMatchCache
        }
        
        this.nextMatchCache = null
        return null
    }
    
    _updateBracketProgressCache() {
        // Cache bracket progress counts to avoid repeated filtering
        let winnersCount = 0
        let losersCount = 0
        
        // Single pass through completed matches
        for (const match of this.completedMatches) {
            if (match.bracket === 'winners') {
                winnersCount++
            } else if (match.bracket === 'losers') {
                losersCount++
            }
        }
        
        this.bracketProgressCache = {
            winners: winnersCount,
            losers: losersCount
        }
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
        
        // Invalidate caches since tournament state is changing
        this.nextMatchCache = null
        this.bracketProgressCache = null
        // Don't reset nextMatchIndex - it should still be close to the right position
        
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
        // Use pre-computed value - O(1) lookup
        const key = `${match.round}-${match.match}`
        return this.matchTypes.get(key) === 'grand_final'
    }
    
    _isGrandFinalReset(match) {
        if (this.type !== 'double') return false
        
        // Reset match comes after grand final and feeds back to grand final
        return match.win && this._isGrandFinal(this.matchIndex.get(`${match.win.round}-${match.win.match}`))
    }
    
    _isWinnersBracket(match) {
        if (this.type !== 'double') return true
        
        // Use pre-computed value - O(1) lookup
        const key = `${match.round}-${match.match}`
        return this.matchTypes.get(key) === 'winners'
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
        
        // Use pre-computed value - O(1) lookup
        return this.tournamentMetadata.synchronizedTotalRounds
    }
    
    _calculateSynchronizedTotalRounds() {
        // Calculate total synchronized tournament rounds for double elimination
        // This represents the "timeline" of the tournament, not bracket-specific rounds
        const winnersRounds = Math.max(...this.bracket.filter(m => this._isWinnersBracket(m)).map(m => m.round))
        
        // In double elimination, tournament rounds = winners bracket rounds (roughly)
        // Grand final is the final tournament round
        return winnersRounds + 1 // +1 for grand final round
    }
    
    getMatchesInRound(round) {
        // Use pre-computed value - O(1) lookup
        return this.matchesPerRound[round] || 0
    }
    
    _getMatchesInSynchronizedRound(tournamentRound) {
        // Count all matches happening in this synchronized tournament round
        let count = 0
        
        for (const match of this.bracket) {
            const matchTournamentRound = this._getSynchronizedRound(match)
            if (matchTournamentRound === tournamentRound) {
                count++
            }
        }
        
        return count
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
        // Simple current round calculation using pre-computed data
        return this._getCurrentRoundSimple()
    }
    
    _getCurrentRoundSimple() {
        // Simple current round calculation without expensive synchronization
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
    
    _getCurrentSynchronizedRound() {
        // Calculate current synchronized tournament round for double elimination
        const nextMatch = this.getNextMatch()
        if (!nextMatch) {
            return this.getTotalRounds() // Tournament complete
        }
        
        return this._getSynchronizedRound(nextMatch._internalMatch)
    }
    
    _getSynchronizedRound(match) {
        // Convert bracket-specific round to synchronized tournament round
        if (this.type !== 'double') {
            return match.round // Single elimination - no conversion needed
        }
        
        if (this._isGrandFinal(match) || this._isGrandFinalReset(match)) {
            return this.getTotalRounds() // Grand final is always the last tournament round
        }
        
        if (this._isWinnersBracket(match)) {
            // Winners bracket rounds map directly to tournament rounds
            return match.round
        } else {
            // Losers bracket - calculate equivalent tournament round
            // This is an approximation based on when losers would be playing
            return this._calculateLosersEquivalentRound(match.round)
        }
    }
    
    _calculateLosersEquivalentRound(losersRound) {
        // Map losers bracket round to equivalent tournament timeline round
        // This is a simplified mapping - in reality it depends on tournament structure
        // For now, approximate based on when losers would typically play
        
        // Early losers rounds happen alongside early winners rounds
        if (losersRound <= 3) {
            return losersRound
        }
        
        // Later losers rounds happen alongside later winners rounds
        // Rough approximation: later losers rounds map to middle-to-late tournament rounds
        const winnersRounds = Math.max(...this.bracket.filter(m => this._isWinnersBracket(m)).map(m => m.round))
        const scaleFactor = winnersRounds / Math.max(...this.bracket.filter(m => !this._isWinnersBracket(m) && !this._isGrandFinal(m)).map(m => m.round))
        
        return Math.min(winnersRounds, Math.round(losersRound * scaleFactor))
    }
    
    // Method to rebuild internal state after loading from saved data
    rebuildInternalState() {
        // Rebuild completedMatchesSet from completedMatches array
        this.completedMatchesSet = new Set()
        this.completedMatches.forEach(match => {
            const matchKey = `${match.round}-${match.matchInRound}`
            this.completedMatchesSet.add(matchKey)
        })
        
        // Clear caches to force recalculation with correct state
        this.nextMatchCache = null
        this.bracketProgressCache = null
        this.nextMatchIndex = 0 // Reset index when rebuilding state
        
        // Rebuild pre-computed structure
        this._precomputeTournamentStructure()
        
        // Rebuild priority queue for double elimination
        if (this.type === 'double') {
            this._buildMatchPriorityQueueEfficient()
        }
    }
}