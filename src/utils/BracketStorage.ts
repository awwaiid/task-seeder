/**
 * Bracket Storage Utility - Manages saving and loading brackets from localStorage
 */

import { StorageOptimizer } from './StorageOptimizer.js'

const STORAGE_KEY = 'bracketology_saved_brackets'

interface Participant {
    [key: string]: any;
}

interface Match {
    player1: Participant | number | null;
    player2: Participant | number | null;
    winner?: Participant | number | null;
    loser?: Participant | number | null;
    round?: number;
    matchInRound?: number;
    bracket?: string;
    [key: string]: any;
}

interface MatchHistoryEntry {
    round: number;
    opponent: Participant | number;
    result: string;
    matchNumber?: number;
    bracket?: string;
}

interface Tournament {
    type: string;
    originalEntrants: (Participant | number)[];
    completedMatches: Match[];
    remainingParticipants: (Participant | number)[];
    eliminationOrder: (Participant | number)[];
    bracket: Match[];
    lossCount: Map<Participant | number, number> | [Participant | number, number][];
    matchIndex: Map<any, any> | [any, any][];
    _currentRound: number;
    currentMatch: number;
}

interface TournamentState {
    tournamentName: string;
    currentPhase: string;
    csvData: Participant[];
    csvHeaders: string[];
    taskNameColumn: string;
    selectedSecondaryFields: string[];
    tournamentType: string;
    seedingMethod: string;
    tasks: Participant[];
    tournament: Tournament | null;
    currentMatch: Match | null;
    matchHistory: Map<Participant, MatchHistoryEntry[]>;
}

interface BracketData {
    id?: string;
    name: string;
    status: string;
    csvData: Participant[];
    csvHeaders: string[];
    taskNameColumn: string;
    selectedSecondaryFields: string[];
    tournamentType: string;
    seedingMethod: string;
    tasks: (Participant | number)[];
    tournament: any;
    currentMatch: any;
    matchHistory: [Participant | number, MatchHistoryEntry[]][];
    createdAt: string;
    lastModified: string;
}

export class BracketStorage {
    static saveBracket(bracketData: BracketData): string {
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
            } catch (storageError: any) {
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
        } catch (error: any) {
            console.error('Error saving bracket:', error)
            throw new Error('Failed to save bracket: ' + error.message)
        }
    }
    
    static loadBracket(bracketId: string): BracketData | null {
        try {
            const brackets = this.getAllBrackets()
            return brackets[bracketId] || null
        } catch (error) {
            console.error('Error loading bracket:', error)
            return null
        }
    }
    
    static getAllBrackets(): Record<string, BracketData> {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored ? JSON.parse(stored) : {}
        } catch (error) {
            console.error('Error reading brackets from storage:', error)
            return {}
        }
    }
    
    static deleteBracket(bracketId: string): boolean {
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
    
    static updateBracket(bracketId: string, updates: Partial<BracketData>): BracketData {
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
    
    static getBracketsList(): BracketData[] {
        const brackets = this.getAllBrackets()
        return Object.values(brackets).sort((a, b) => 
            new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        )
    }
    
    static generateBracketId(): string {
        return 'bracket_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }
    
    static serializeBracket(tournamentState: TournamentState): BracketData {
        // Create an optimized version that uses participant indices instead of full objects
        const participantMap = new Map<Participant, number>()
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
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        }
    }
    
    static serializeParticipantArray(participants: Participant[], participantMap: Map<Participant, number>): (Participant | number)[] {
        if (!participants || !Array.isArray(participants)) return []
        return participants.map(participant => this.getParticipantIndex(participant, participantMap))
    }
    
    static serializeMatch(match: Match, participantMap: Map<Participant, number>): any {
        if (!match) return null
        return {
            ...match,
            player1: this.getParticipantIndex(match.player1, participantMap),
            player2: this.getParticipantIndex(match.player2, participantMap)
        }
    }
    
    static getParticipantIndex(participant: Participant | number | null, participantMap: Map<Participant, number>): Participant | number | null {
        if (typeof participant === 'number') return participant // Already an index
        if (!participant) return null
        const index = participantMap.get(participant)
        return index !== undefined ? index : participant // Fallback to original if not found
    }
    
    static serializeTournament(tournament: Tournament, participantMap: Map<Participant, number>): any {
        return {
            type: tournament.type,
            originalEntrants: this.serializeParticipantArray(tournament.originalEntrants as Participant[], participantMap),
            completedMatches: this.serializeMatchArray(tournament.completedMatches, participantMap),
            remainingParticipants: this.serializeParticipantArray(tournament.remainingParticipants as Participant[], participantMap),
            eliminationOrder: this.serializeParticipantArray(tournament.eliminationOrder as Participant[], participantMap),
            bracket: this.serializeBracketArray(tournament.bracket, participantMap),
            lossCount: tournament.lossCount ? this.serializeLossCount(tournament.lossCount, participantMap) : [],
            matchIndex: tournament.matchIndex ? Array.from((tournament.matchIndex as Map<any, any>).entries()) : [],
            _currentRound: tournament._currentRound,
            currentMatch: tournament.currentMatch
        }
    }
    
    static serializeMatchArray(matches: Match[], participantMap: Map<Participant, number>): any[] {
        if (!matches || !Array.isArray(matches)) return []
        return matches.map(match => ({
            ...match,
            player1: this.getParticipantIndex(match.player1, participantMap),
            player2: this.getParticipantIndex(match.player2, participantMap),
            winner: this.getParticipantIndex(match.winner || null, participantMap),
            loser: this.getParticipantIndex(match.loser || null, participantMap)
        }))
    }
    
    static serializeBracketArray(bracket: Match[], participantMap: Map<Participant, number>): any[] {
        if (!bracket || !Array.isArray(bracket)) return []
        return bracket.map(match => ({
            ...match,
            player1: this.getParticipantIndex(match.player1, participantMap),
            player2: this.getParticipantIndex(match.player2, participantMap)
        }))
    }
    
    static serializeLossCount(lossCount: Map<Participant | number, number> | [Participant | number, number][], participantMap: Map<Participant, number>): [Participant | number, number][] {
        const entries = Array.isArray(lossCount) ? lossCount : Array.from(lossCount.entries())
        return entries.map(([participant, count]) => [
            this.getParticipantIndex(participant, participantMap),
            count
        ])
    }
    
    static serializeMatchHistory(matchHistory: Map<Participant, MatchHistoryEntry[]>, participantMap: Map<Participant, number>): [Participant | number, MatchHistoryEntry[]][] {
        if (!matchHistory || !(matchHistory instanceof Map)) return []
        return Array.from(matchHistory.entries()).map(([participant, history]) => [
            this.getParticipantIndex(participant, participantMap),
            history.map(match => ({
                ...match,
                opponent: this.getParticipantIndex(match.opponent, participantMap)
            }))
        ])
    }
    
    static deserializeBracket(bracketData: BracketData): any {
        const state: any = { ...bracketData }
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
    
    static deserializeParticipantArray(indices: (Participant | number)[], participants: Participant[]): Participant[] {
        if (!indices || !Array.isArray(indices)) return []
        return indices.map(index => 
            typeof index === 'number' && participants[index] ? participants[index] : index as Participant
        )
    }
    
    static deserializeMatch(match: any, participants: Participant[]): Match | null {
        if (!match) return null
        return {
            ...match,
            player1: this.restoreParticipant(match.player1, participants),
            player2: this.restoreParticipant(match.player2, participants)
        }
    }
    
    static restoreParticipant(index: Participant | number | null, participants: Participant[]): Participant | number | null {
        if (typeof index === 'number' && participants && participants[index]) {
            return participants[index]
        }
        return index // Return as-is if not an index or participant not found
    }
    
    static deserializeMatchHistory(matchHistoryData: [Participant | number, MatchHistoryEntry[]][], participants: Participant[]): Map<Participant, MatchHistoryEntry[]> {
        if (!matchHistoryData || !Array.isArray(matchHistoryData)) return new Map()
        
        const matchHistory = new Map<Participant, MatchHistoryEntry[]>()
        matchHistoryData.forEach(([participantIndex, history]) => {
            const participant = this.restoreParticipant(participantIndex, participants) as Participant
            const restoredHistory = history.map(match => ({
                ...match,
                opponent: this.restoreParticipant(match.opponent, participants) as Participant
            }))
            matchHistory.set(participant, restoredHistory)
        })
        
        return matchHistory
    }
    
    static deserializeTournament(tournamentData: any, participants: Participant[]): Tournament {
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
    
    static deserializeMatchArray(matches: any[], participants: Participant[]): Match[] {
        if (!matches || !Array.isArray(matches)) return []
        return matches.map(match => ({
            ...match,
            player1: this.restoreParticipant(match.player1, participants),
            player2: this.restoreParticipant(match.player2, participants),
            winner: this.restoreParticipant(match.winner, participants),
            loser: this.restoreParticipant(match.loser, participants)
        }))
    }
    
    static deserializeBracketArray(bracket: any[], participants: Participant[]): Match[] {
        if (!bracket || !Array.isArray(bracket)) return []
        return bracket.map(match => ({
            ...match,
            player1: this.restoreParticipant(match.player1, participants),
            player2: this.restoreParticipant(match.player2, participants)
        }))
    }
    
    static deserializeLossCount(lossCountData: [Participant | number, number][], participants: Participant[]): Map<Participant | number, number> {
        if (!lossCountData || !Array.isArray(lossCountData)) return new Map()
        const lossCount = new Map<Participant | number, number>()
        lossCountData.forEach(([participantIndex, count]) => {
            const participant = this.restoreParticipant(participantIndex, participants)
            lossCount.set(participant!, count)
        })
        return lossCount
    }
}