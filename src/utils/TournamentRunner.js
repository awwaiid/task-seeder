/**
 * Tournament Runner - A clean API for managing tournament matches
 */
export class Tournament {
    constructor(type, entrants) {
        if (!entrants || entrants.length < 1) {
            throw new Error('Tournament requires at least 1 entrant')
        }
        
        this.type = type // 'single' or 'double'
        this.originalEntrants = [...entrants]
        this.matches = [] // Track completed matches
        this.currentRound = 1
        this.remainingParticipants = [...entrants] // Track who's still in the tournament
        
        // Double elimination specific tracking
        if (this.type === 'double') {
            this.lossCount = new Map() // Track losses per participant
            entrants.forEach(participant => {
                this.lossCount.set(participant, 0)
            })
        }
        
        // Initialize first round matches
        this._generateRoundMatches()
    }
    
    _generateRoundMatches() {
        // Clear any existing pending matches
        this.pendingMatches = []
        
        // If only one participant remains, tournament is complete
        if (this.remainingParticipants.length <= 1) {
            return
        }
        
        if (this.type === 'double') {
            this._generateDoubleEliminationMatches()
        } else {
            this._generateSingleEliminationMatches()
        }
    }
    
    _generateSingleEliminationMatches() {
        // Generate matches for current round
        let matchInRound = 1
        for (let i = 0; i < this.remainingParticipants.length; i += 2) {
            if (i + 1 < this.remainingParticipants.length) {
                // Two participants available - create a match
                this.pendingMatches.push({
                    player1: this.remainingParticipants[i],
                    player2: this.remainingParticipants[i + 1],
                    round: this.currentRound,
                    matchInRound: matchInRound++
                })
            } else {
                // Odd participant gets a bye (automatically advances)
                // Don't create a match, just note they advance
            }
        }
    }
    
    _generateDoubleEliminationMatches() {
        // Separate participants by loss count
        const noLosses = []
        const oneLoss = []
        
        for (const participant of this.remainingParticipants) {
            const losses = this.lossCount.get(participant) || 0
            if (losses === 0) {
                noLosses.push(participant)
            } else if (losses === 1) {
                oneLoss.push(participant)
            }
            // participants with 2+ losses are already eliminated
        }
        
        let matchInRound = 1
        
        // First, generate matches within winners bracket (no losses)
        for (let i = 0; i < noLosses.length; i += 2) {
            if (i + 1 < noLosses.length) {
                this.pendingMatches.push({
                    player1: noLosses[i],
                    player2: noLosses[i + 1],
                    round: this.currentRound,
                    matchInRound: matchInRound++,
                    bracket: 'winners'
                })
            }
        }
        
        // Then, generate matches within losers bracket (one loss)
        for (let i = 0; i < oneLoss.length; i += 2) {
            if (i + 1 < oneLoss.length) {
                this.pendingMatches.push({
                    player1: oneLoss[i],
                    player2: oneLoss[i + 1],
                    round: this.currentRound,
                    matchInRound: matchInRound++,
                    bracket: 'losers'
                })
            }
        }
        
        // If we have exactly one winner and one loser remaining, grand final
        if (noLosses.length === 1 && oneLoss.length === 1) {
            this.pendingMatches.push({
                player1: noLosses[0],
                player2: oneLoss[0],
                round: this.currentRound,
                matchInRound: matchInRound++,
                bracket: 'grand_final'
            })
        }
    }
    
    getNextMatch() {
        if (this.pendingMatches.length === 0) {
            return null
        }
        
        return this.pendingMatches[0]
    }
    
    reportResult(match, winner) {
        // Validate the winner is one of the players
        if (winner !== match.player1 && winner !== match.player2) {
            throw new Error('Winner must be one of the match participants')
        }
        
        const loser = winner === match.player1 ? match.player2 : match.player1
        
        // Create completed match record
        const completedMatch = {
            ...match,
            winner,
            loser
        }
        
        // Add to completed matches
        this.matches.push(completedMatch)
        
        // Remove from pending matches
        this.pendingMatches = this.pendingMatches.filter(m => m !== match)
        
        // Handle special double elimination grand final logic
        if (this.type === 'double' && match.bracket === 'grand_final') {
            this._handleGrandFinalResult(match, winner, loser)
        } else {
            // Handle elimination based on tournament type
            if (this.type === 'double') {
                this._handleDoubleEliminationLoss(loser)
            } else {
                // Single elimination: remove loser immediately
                this.remainingParticipants = this.remainingParticipants.filter(p => p !== loser)
            }
        }
        
        // Check if round is complete and generate next round if needed
        this._checkRoundComplete()
    }
    
    _handleGrandFinalResult(match, winner, loser) {
        const winnerLosses = this.lossCount.get(winner) || 0
        const loserLosses = this.lossCount.get(loser) || 0
        
        if (winnerLosses === 0) {
            // Winners bracket champion won - tournament over, eliminate loser
            this._handleDoubleEliminationLoss(loser)
        } else {
            // Losers bracket champion won - bracket reset needed
            // Give the former winners bracket champion their first loss
            this.lossCount.set(loser, (this.lossCount.get(loser) || 0) + 1)
            
            // Both players now have 1 loss - create reset match
            this.currentRound++
            this.pendingMatches.push({
                player1: winner,
                player2: loser,
                round: this.currentRound,
                matchInRound: 1,
                bracket: 'grand_final_reset'
            })
        }
    }
    
    _handleDoubleEliminationLoss(loser) {
        // Increment loss count
        const currentLosses = this.lossCount.get(loser) || 0
        this.lossCount.set(loser, currentLosses + 1)
        
        // Remove from remaining participants only after second loss
        if (currentLosses + 1 >= 2) {
            this.remainingParticipants = this.remainingParticipants.filter(p => p !== loser)
        }
    }
    
    _checkRoundComplete() {
        // If we still have pending matches in this round, wait
        if (this.pendingMatches.length > 0) {
            return
        }
        
        // Round is complete - advance to next round if more than 1 participant remains
        if (this.remainingParticipants.length > 1) {
            this.currentRound++
            this._generateRoundMatches()
        }
    }
    
    isComplete() {
        // Tournament is complete when only one participant remains
        return this.remainingParticipants.length <= 1 && this.pendingMatches.length === 0
    }
    
    getWinner() {
        if (!this.isComplete()) {
            return null
        }
        
        // If only one entrant, they're the winner
        if (this.originalEntrants.length === 1) {
            return this.originalEntrants[0]
        }
        
        // Otherwise, the last remaining participant is the winner
        return this.remainingParticipants[0]
    }
    
    getTotalRounds() {
        // Calculate total rounds needed for this tournament size
        let participants = this.originalEntrants.length
        if (participants <= 1) return 0
        
        let rounds = 0
        while (participants > 1) {
            participants = Math.ceil(participants / 2)
            rounds++
        }
        return rounds
    }
    
    getMatchesInRound(round) {
        // Calculate how many user-visible matches are in a specific round
        let participants = this.originalEntrants.length
        
        // Calculate participants at the start of the specified round
        for (let i = 1; i < round; i++) {
            participants = Math.ceil(participants / 2)
        }
        
        // Number of matches in this round = floor(participants / 2)
        // This gives us the actual matches shown to users (excluding byes)
        return Math.floor(participants / 2)
    }
    
    getCurrentMatchNumber() {
        // Count how many matches the user has actually seen so far
        return this.matches.length + 1
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
}