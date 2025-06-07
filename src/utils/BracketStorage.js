/**
 * Bracket Storage Utility - Manages saving and loading brackets from localStorage
 */

import { StorageOptimizer } from './StorageOptimizer.js'

const STORAGE_KEY = 'bracketology_saved_brackets'

export class BracketStorage {
    static saveBracket(bracketData) {
        try {
            // Check storage usage before saving
            if (StorageOptimizer.shouldWarnAboutStorage()) {
                console.warn('Storage getting full, cleaning up old brackets...')
                StorageOptimizer.cleanupOldBrackets(5) // Keep only 5 most recent
            }
            
            const brackets = this.getAllBrackets()
            const bracketId = this.generateBracketId()
            
            const bracketToSave = {
                id: bracketId,
                ...bracketData,
                lastModified: new Date().toISOString()
            }
            
            brackets[bracketId] = bracketToSave
            
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(brackets))
            } catch (storageError) {
                // Storage full, try cleanup and retry once
                if (storageError.name === 'QuotaExceededError') {
                    console.warn('Storage quota exceeded, cleaning up and retrying...')
                    StorageOptimizer.cleanupOldBrackets(3) // More aggressive cleanup
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(brackets))
                } else {
                    throw storageError
                }
            }
            
            return bracketId
        } catch (error) {
            console.error('Error saving bracket:', error)
            throw new Error('Failed to save bracket: ' + error.message)
        }
    }
    
    static loadBracket(bracketId) {
        try {
            const brackets = this.getAllBrackets()
            return brackets[bracketId] || null
        } catch (error) {
            console.error('Error loading bracket:', error)
            return null
        }
    }
    
    static getAllBrackets() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored ? JSON.parse(stored) : {}
        } catch (error) {
            console.error('Error reading brackets from storage:', error)
            return {}
        }
    }
    
    static deleteBracket(bracketId) {
        try {
            const brackets = this.getAllBrackets()
            delete brackets[bracketId]
            localStorage.setItem(STORAGE_KEY, JSON.stringify(brackets))
            return true
        } catch (error) {
            console.error('Error deleting bracket:', error)
            return false
        }
    }
    
    static updateBracket(bracketId, updates) {
        try {
            const brackets = this.getAllBrackets()
            if (!brackets[bracketId]) {
                throw new Error('Bracket not found')
            }
            
            brackets[bracketId] = {
                ...brackets[bracketId],
                ...updates,
                lastModified: new Date().toISOString()
            }
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(brackets))
            return brackets[bracketId]
        } catch (error) {
            console.error('Error updating bracket:', error)
            throw error
        }
    }
    
    static getBracketsList() {
        const brackets = this.getAllBrackets()
        return Object.values(brackets).sort((a, b) => 
            new Date(b.lastModified) - new Date(a.lastModified)
        )
    }
    
    static generateBracketId() {
        return 'bracket_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }
    
    static serializeBracket(tournamentState) {
        // Create an optimized version that uses participant indices instead of full objects
        const participantMap = new Map()
        const csvData = tournamentState.csvData || []
        
        // Build participant lookup
        csvData.forEach((participant, index) => {
            participantMap.set(participant, index)
        })
        
        return {
            name: tournamentState.tournamentName,
            status: tournamentState.currentPhase,
            csvData: tournamentState.csvData,
            csvHeaders: tournamentState.csvHeaders,
            taskNameColumn: tournamentState.taskNameColumn,
            selectedSecondaryFields: tournamentState.selectedSecondaryFields,
            tournamentType: tournamentState.tournamentType,
            seedingMethod: tournamentState.seedingMethod,
            tasks: this.serializeParticipantArray(tournamentState.tasks, participantMap),
            tournament: tournamentState.tournament ? this.serializeTournament(tournamentState.tournament, participantMap) : null,
            currentMatch: tournamentState.currentMatch ? this.serializeMatch(tournamentState.currentMatch, participantMap) : null,
            matchHistory: this.serializeMatchHistory(tournamentState.matchHistory, participantMap),
            createdAt: new Date().toISOString()
        }
    }
    
    static serializeParticipantArray(participants, participantMap) {
        if (!participants || !Array.isArray(participants)) return []
        return participants.map(participant => this.getParticipantIndex(participant, participantMap))
    }
    
    static serializeMatch(match, participantMap) {
        if (!match) return null
        return {
            ...match,
            player1: this.getParticipantIndex(match.player1, participantMap),
            player2: this.getParticipantIndex(match.player2, participantMap)
        }
    }
    
    static getParticipantIndex(participant, participantMap) {
        if (typeof participant === 'number') return participant // Already an index
        if (!participant) return null
        const index = participantMap.get(participant)
        return index !== undefined ? index : participant // Fallback to original if not found
    }
    
    static serializeTournament(tournament, participantMap) {
        return {
            type: tournament.type,
            originalEntrants: this.serializeParticipantArray(tournament.originalEntrants, participantMap),
            completedMatches: this.serializeMatchArray(tournament.completedMatches, participantMap),
            remainingParticipants: this.serializeParticipantArray(tournament.remainingParticipants, participantMap),
            eliminationOrder: this.serializeParticipantArray(tournament.eliminationOrder, participantMap),
            bracket: this.serializeBracketArray(tournament.bracket, participantMap),
            lossCount: tournament.lossCount ? this.serializeLossCount(tournament.lossCount, participantMap) : [],
            matchIndex: tournament.matchIndex ? Array.from(tournament.matchIndex.entries()) : [],
            _currentRound: tournament._currentRound,
            currentMatch: tournament.currentMatch
        }
    }
    
    static serializeMatchArray(matches, participantMap) {
        if (!matches || !Array.isArray(matches)) return []
        return matches.map(match => ({
            ...match,
            player1: this.getParticipantIndex(match.player1, participantMap),
            player2: this.getParticipantIndex(match.player2, participantMap),
            winner: this.getParticipantIndex(match.winner, participantMap),
            loser: this.getParticipantIndex(match.loser, participantMap)
        }))
    }
    
    static serializeBracketArray(bracket, participantMap) {
        if (!bracket || !Array.isArray(bracket)) return []
        return bracket.map(match => ({
            ...match,
            player1: this.getParticipantIndex(match.player1, participantMap),
            player2: this.getParticipantIndex(match.player2, participantMap)
        }))
    }
    
    static serializeLossCount(lossCount, participantMap) {
        const entries = Array.from(lossCount.entries())
        return entries.map(([participant, count]) => [
            this.getParticipantIndex(participant, participantMap),
            count
        ])
    }
    
    static serializeMatchHistory(matchHistory, participantMap) {
        if (!matchHistory || !(matchHistory instanceof Map)) return []
        return Array.from(matchHistory.entries()).map(([participant, history]) => [
            this.getParticipantIndex(participant, participantMap),
            history.map(match => ({
                ...match,
                opponent: this.getParticipantIndex(match.opponent, participantMap)
            }))
        ])
    }
    
    static deserializeBracket(bracketData) {
        const state = { ...bracketData }
        const participants = bracketData.csvData
        
        // Restore tasks
        if (state.tasks) {
            state.tasks = this.deserializeParticipantArray(state.tasks, participants)
        }
        
        // Restore tournament
        if (state.tournament) {
            state.tournament = this.deserializeTournament(state.tournament, participants)
        }
        
        // Restore current match
        if (state.currentMatch) {
            state.currentMatch = this.deserializeMatch(state.currentMatch, participants)
        }
        
        // Restore match history
        if (state.matchHistory) {
            state.matchHistory = this.deserializeMatchHistory(state.matchHistory, participants)
        } else {
            state.matchHistory = new Map()
        }
        
        return state
    }
    
    static deserializeParticipantArray(indices, participants) {
        if (!indices || !Array.isArray(indices)) return []
        return indices.map(index => 
            typeof index === 'number' && participants[index] ? participants[index] : index
        )
    }
    
    static deserializeMatch(match, participants) {
        if (!match) return null
        return {
            ...match,
            player1: this.restoreParticipant(match.player1, participants),
            player2: this.restoreParticipant(match.player2, participants)
        }
    }
    
    static restoreParticipant(index, participants) {
        if (typeof index === 'number' && participants && participants[index]) {
            return participants[index]
        }
        return index // Return as-is if not an index or participant not found
    }
    
    static deserializeMatchHistory(matchHistoryData, participants) {
        if (!matchHistoryData || !Array.isArray(matchHistoryData)) return new Map()
        
        const matchHistory = new Map()
        matchHistoryData.forEach(([participantIndex, history]) => {
            const participant = this.restoreParticipant(participantIndex, participants)
            const restoredHistory = history.map(match => ({
                ...match,
                opponent: this.restoreParticipant(match.opponent, participants)
            }))
            matchHistory.set(participant, restoredHistory)
        })
        
        return matchHistory
    }
    
    static deserializeTournament(tournamentData, participants) {
        return {
            type: tournamentData.type,
            originalEntrants: this.deserializeParticipantArray(tournamentData.originalEntrants, participants),
            completedMatches: this.deserializeMatchArray(tournamentData.completedMatches, participants),
            remainingParticipants: this.deserializeParticipantArray(tournamentData.remainingParticipants, participants),
            eliminationOrder: this.deserializeParticipantArray(tournamentData.eliminationOrder, participants),
            bracket: this.deserializeBracketArray(tournamentData.bracket, participants),
            lossCount: tournamentData.lossCount ? this.deserializeLossCount(tournamentData.lossCount, participants) : new Map(),
            matchIndex: tournamentData.matchIndex ? new Map(tournamentData.matchIndex) : new Map(),
            _currentRound: tournamentData._currentRound || 1,
            currentMatch: tournamentData.currentMatch || 1
        }
    }
    
    static deserializeMatchArray(matches, participants) {
        if (!matches || !Array.isArray(matches)) return []
        return matches.map(match => ({
            ...match,
            player1: this.restoreParticipant(match.player1, participants),
            player2: this.restoreParticipant(match.player2, participants),
            winner: this.restoreParticipant(match.winner, participants),
            loser: this.restoreParticipant(match.loser, participants)
        }))
    }
    
    static deserializeBracketArray(bracket, participants) {
        if (!bracket || !Array.isArray(bracket)) return []
        return bracket.map(match => ({
            ...match,
            player1: this.restoreParticipant(match.player1, participants),
            player2: this.restoreParticipant(match.player2, participants)
        }))
    }
    
    static deserializeLossCount(lossCountData, participants) {
        if (!lossCountData || !Array.isArray(lossCountData)) return new Map()
        const lossCount = new Map()
        lossCountData.forEach(([participantIndex, count]) => {
            const participant = this.restoreParticipant(participantIndex, participants)
            lossCount.set(participant, count)
        })
        return lossCount
    }
}