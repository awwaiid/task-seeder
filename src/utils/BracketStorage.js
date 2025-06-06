/**
 * Bracket Storage Utility - Manages saving and loading brackets from localStorage
 */

const STORAGE_KEY = 'bracketology_saved_brackets'

export class BracketStorage {
    static saveBracket(bracketData) {
        try {
            const brackets = this.getAllBrackets()
            const bracketId = this.generateBracketId()
            
            const bracketToSave = {
                id: bracketId,
                ...bracketData,
                lastModified: new Date().toISOString()
            }
            
            brackets[bracketId] = bracketToSave
            localStorage.setItem(STORAGE_KEY, JSON.stringify(brackets))
            
            return bracketId
        } catch (error) {
            console.error('Error saving bracket:', error)
            throw new Error('Failed to save bracket')
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
        return {
            name: tournamentState.tournamentName,
            status: tournamentState.currentPhase,
            csvData: tournamentState.csvData,
            csvHeaders: tournamentState.csvHeaders,
            taskNameColumn: tournamentState.taskNameColumn,
            selectedSecondaryFields: tournamentState.selectedSecondaryFields,
            tournamentType: tournamentState.tournamentType,
            seedingMethod: tournamentState.seedingMethod,
            tasks: tournamentState.tasks,
            tournament: tournamentState.tournament ? this.serializeTournament(tournamentState.tournament) : null,
            currentMatch: tournamentState.currentMatch,
            matchHistory: this.serializeMatchHistory(tournamentState.matchHistory),
            createdAt: new Date().toISOString()
        }
    }
    
    static serializeTournament(tournament) {
        return {
            type: tournament.type,
            originalEntrants: tournament.originalEntrants,
            completedMatches: tournament.completedMatches,
            remainingParticipants: tournament.remainingParticipants,
            eliminationOrder: tournament.eliminationOrder,
            bracket: tournament.bracket,
            lossCount: tournament.lossCount ? Array.from(tournament.lossCount.entries()) : [],
            matchIndex: tournament.matchIndex ? Array.from(tournament.matchIndex.entries()) : [],
            _currentRound: tournament._currentRound,
            currentMatch: tournament.currentMatch
        }
    }
    
    static serializeMatchHistory(matchHistory) {
        if (!matchHistory || !(matchHistory instanceof Map)) return []
        return Array.from(matchHistory.entries()).map(([task, history]) => [task, history])
    }
    
    static deserializeBracket(bracketData) {
        const state = { ...bracketData }
        
        if (state.tournament) {
            state.tournament = this.deserializeTournament(state.tournament)
        }
        
        if (state.matchHistory) {
            state.matchHistory = new Map(state.matchHistory)
        } else {
            state.matchHistory = new Map()
        }
        
        return state
    }
    
    static deserializeTournament(tournamentData) {
        // We'll import Tournament in the component and pass it as a parameter
        // For now, create a simple object structure that can be restored
        const tournament = {
            type: tournamentData.type,
            originalEntrants: tournamentData.originalEntrants,
            completedMatches: tournamentData.completedMatches || [],
            remainingParticipants: tournamentData.remainingParticipants || [],
            eliminationOrder: tournamentData.eliminationOrder || [],
            bracket: tournamentData.bracket || [],
            _currentRound: tournamentData._currentRound || 1,
            currentMatch: tournamentData.currentMatch || 1
        }
        
        // Restore tournament state
        tournament.completedMatches = tournamentData.completedMatches || []
        tournament.remainingParticipants = tournamentData.remainingParticipants || []
        tournament.eliminationOrder = tournamentData.eliminationOrder || []
        tournament.bracket = tournamentData.bracket || []
        tournament._currentRound = tournamentData._currentRound || 1
        tournament.currentMatch = tournamentData.currentMatch || 1
        
        if (tournamentData.lossCount) {
            tournament.lossCount = new Map(tournamentData.lossCount)
        }
        
        if (tournamentData.matchIndex) {
            tournament.matchIndex = new Map(tournamentData.matchIndex)
        }
        
        return tournament
    }
}