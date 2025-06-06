import { describe, it, expect } from 'vitest'
import { Tournament } from '../src/utils/TournamentRunner.js'

describe('Tournament Ranking Logic', () => {
    it.skip('should rank participants correctly based on elimination round', () => {
        // 6-participant single elimination tournament
        const tournament = new Tournament('single', ['A', 'B', 'C', 'D', 'E', 'F'])
        
        // Simulate the tournament matches
        // Round 1: 3 matches
        let match = tournament.getNextMatch()
        expect(match.round).toBe(1)
        tournament.reportResult(match, 'A') // A beats B (B eliminated in round 1)
        
        match = tournament.getNextMatch()
        expect(match.round).toBe(1)
        tournament.reportResult(match, 'C') // C beats D (D eliminated in round 1)
        
        match = tournament.getNextMatch()
        expect(match.round).toBe(1)
        tournament.reportResult(match, 'E') // E beats F (F eliminated in round 1)
        
        // Round 2: 1 match (E gets bye since 3 → 2 with bye)
        match = tournament.getNextMatch()
        expect(match.round).toBe(2)
        tournament.reportResult(match, 'A') // A beats C (C eliminated in round 2)
        
        // Round 3: Final
        match = tournament.getNextMatch()
        expect(match.round).toBe(3)
        tournament.reportResult(match, 'A') // A beats E (E eliminated in round 3, A wins)
        
        expect(tournament.isComplete()).toBe(true)
        expect(tournament.getWinner()).toBe('A')
        
        // Check elimination rounds:
        // A: Winner (no losses)
        // E: Lost in round 3 (final) - 2nd place
        // C: Lost in round 2 (semifinal) - 3rd place  
        // B, D, F: All lost in round 1 - should be tied for last places
        
        // The key insight: C (lost in round 2) should rank higher than B, D, F (lost in round 1)
        // Even though all lost exactly once, C advanced further
        
        // Verify the match records show this
        const matches = tournament.matches
        expect(matches).toHaveLength(5)
        
        // Find elimination rounds
        const eliminations = []
        for (const match of matches) {
            eliminations.push({
                loser: match.loser,
                round: match.round
            })
        }
        
        expect(eliminations).toEqual(expect.arrayContaining([
            { loser: 'B', round: 1 },
            { loser: 'D', round: 1 },
            { loser: 'F', round: 1 },
            { loser: 'C', round: 2 },
            { loser: 'E', round: 3 }
        ]))
        
        // The proper ranking should be:
        // 1st: A (winner)
        // 2nd: E (lost in final - round 3)
        // 3rd: C (lost in semifinal - round 2)
        // 4th-6th: B, D, F (all lost in round 1)
    })
    
    it.skip('should handle ranking for exactly the scenario described by user', () => {
        // User said: 6th place lost once, 5th place lost once, 4th place won then lost
        // The 4th place should be ranked higher than 5th place because they advanced further
        
        const tournament = new Tournament('single', ['Task1', 'Task2', 'Task3', 'Task4', 'Task5', 'Task6'])
        
        // Round 1
        tournament.reportResult(tournament.getNextMatch(), 'Task1') // Task2 eliminated round 1
        tournament.reportResult(tournament.getNextMatch(), 'Task3') // Task4 eliminated round 1  
        tournament.reportResult(tournament.getNextMatch(), 'Task5') // Task6 eliminated round 1
        
        // Round 2: Task1 vs Task3, Task5 gets bye
        tournament.reportResult(tournament.getNextMatch(), 'Task1') // Task3 eliminated round 2
        
        // Round 3: Final
        tournament.reportResult(tournament.getNextMatch(), 'Task1') // Task5 eliminated round 3
        
        expect(tournament.getWinner()).toBe('Task1')
        
        // Task3 (eliminated round 2) should rank higher than Task2, Task4, Task6 (eliminated round 1)
        // Even though they all "lost once", Task3 advanced further
        
        const eliminationRounds = new Map()
        for (const match of tournament.matches) {
            eliminationRounds.set(match.loser, match.round)
        }
        
        expect(eliminationRounds.get('Task5')).toBe(3) // Lost in final
        expect(eliminationRounds.get('Task3')).toBe(2) // Lost in semifinal - should rank higher  
        expect(eliminationRounds.get('Task2')).toBe(1) // Lost in round 1
        expect(eliminationRounds.get('Task4')).toBe(1) // Lost in round 1
        expect(eliminationRounds.get('Task6')).toBe(1) // Lost in round 1
        
        // Task3 should rank higher than Task2, Task4, Task6 despite all losing "once"
        // because Task3 advanced to round 2 before being eliminated
    })
})