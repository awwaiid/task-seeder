import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    calculateTotalMatches,
    shuffleArray,
    createTournamentBracket,
    getCurrentMatchup,
    advanceWinner,
    isTournamentComplete,
    autoDetectTaskNameColumn,
    autoSelectSecondaryFields
} from '../src/utils/tournament.js'

describe('Tournament Setup Utils', () => {
    describe('calculateTotalMatches', () => {
        it('should return 0 for 0 or 1 participants', () => {
            expect(calculateTotalMatches(0)).toBe(0)
            expect(calculateTotalMatches(1)).toBe(0)
        })

        it('should return correct number of matches for various participant counts', () => {
            expect(calculateTotalMatches(2)).toBe(1)
            expect(calculateTotalMatches(3)).toBe(2)
            expect(calculateTotalMatches(4)).toBe(3)
            expect(calculateTotalMatches(8)).toBe(7)
            expect(calculateTotalMatches(16)).toBe(15)
        })

        it('should handle negative numbers', () => {
            expect(calculateTotalMatches(-5)).toBe(0)
        })
    })

    describe('shuffleArray', () => {
        beforeEach(() => {
            // Mock Math.random to make tests deterministic
            vi.spyOn(Math, 'random')
        })

        it('should return a new array with same length', () => {
            const original = [1, 2, 3, 4, 5]
            const shuffled = shuffleArray(original)
            
            expect(shuffled).not.toBe(original) // Different reference
            expect(shuffled).toHaveLength(original.length)
            expect(shuffled).toEqual(expect.arrayContaining(original))
        })

        it('should not modify the original array', () => {
            const original = [1, 2, 3, 4, 5]
            const originalCopy = [...original]
            shuffleArray(original)
            
            expect(original).toEqual(originalCopy)
        })

        it('should handle empty arrays', () => {
            expect(shuffleArray([])).toEqual([])
        })

        it('should handle single element arrays', () => {
            expect(shuffleArray([42])).toEqual([42])
        })
    })

    describe('createTournamentBracket', () => {
        it('should throw error for invalid input', () => {
            expect(() => createTournamentBracket([])).toThrow('At least 2 participants required')
            expect(() => createTournamentBracket([1])).toThrow('At least 2 participants required')
            expect(() => createTournamentBracket(null)).toThrow('At least 2 participants required')
        })

        it('should create proper bracket for 2 participants', () => {
            const tasks = ['Task A', 'Task B']
            const bracket = createTournamentBracket(tasks)
            
            expect(bracket).toHaveLength(1) // Only one round
            expect(bracket[0]).toHaveLength(1) // Only one match
            expect(bracket[0][0].teams).toEqual(['Task A', 'Task B'])
            expect(bracket[0][0].winner).toBe(null)
        })

        it('should create proper bracket for 4 participants with correct seeding', () => {
            const tasks = ['Task 1', 'Task 2', 'Task 3', 'Task 4']
            const bracket = createTournamentBracket(tasks)
            
            expect(bracket).toHaveLength(2) // 2 rounds
            expect(bracket[0]).toHaveLength(2) // 2 first round matches
            expect(bracket[1]).toHaveLength(1) // 1 final match
            
            // Check seeding: 1 vs 4, 2 vs 3
            expect(bracket[0][0].teams).toEqual(['Task 1', 'Task 4'])
            expect(bracket[0][1].teams).toEqual(['Task 2', 'Task 3'])
        })

        it('should create proper bracket for 8 participants with correct seeding', () => {
            const tasks = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']
            const bracket = createTournamentBracket(tasks)
            
            expect(bracket).toHaveLength(3) // 3 rounds
            expect(bracket[0]).toHaveLength(4) // 4 first round matches
            expect(bracket[1]).toHaveLength(2) // 2 semi-final matches
            expect(bracket[2]).toHaveLength(1) // 1 final match
            
            // Check proper tournament seeding
            expect(bracket[0][0].teams).toEqual(['T1', 'T8']) // 1 vs 8
            expect(bracket[0][1].teams).toEqual(['T2', 'T7']) // 2 vs 7
            expect(bracket[0][2].teams).toEqual(['T3', 'T6']) // 3 vs 6
            expect(bracket[0][3].teams).toEqual(['T4', 'T5']) // 4 vs 5
        })

        it('should handle odd number of participants with byes', () => {
            const tasks = ['Task 1', 'Task 2', 'Task 3']
            const bracket = createTournamentBracket(tasks)
            
            expect(bracket).toHaveLength(2) // 2 rounds (needs to expand to 4 slots)
            expect(bracket[0]).toHaveLength(2) // 2 first round matches
            
            // Should have one bye (null)
            const firstRoundTeams = bracket[0].flatMap(match => match.teams)
            expect(firstRoundTeams.filter(team => team === null)).toHaveLength(1)
            expect(firstRoundTeams.filter(team => team !== null)).toHaveLength(3)
        })

        it('should handle 5 participants correctly', () => {
            const tasks = ['T1', 'T2', 'T3', 'T4', 'T5']
            const bracket = createTournamentBracket(tasks)
            
            expect(bracket).toHaveLength(3) // Expands to 8 slots, so 3 rounds
            expect(bracket[0]).toHaveLength(4) // 4 first round matches
            
            // Should have 3 byes
            const firstRoundTeams = bracket[0].flatMap(match => match.teams)
            expect(firstRoundTeams.filter(team => team === null)).toHaveLength(3)
            expect(firstRoundTeams.filter(team => team !== null)).toHaveLength(5)
        })
    })

    describe('getCurrentMatchup', () => {
        let bracket

        beforeEach(() => {
            bracket = createTournamentBracket(['A', 'B', 'C', 'D'])
        })

        it('should return current matchup teams', () => {
            const matchup = getCurrentMatchup(bracket, 0, 0)
            expect(matchup).toEqual(['A', 'D'])
        })

        it('should return null for invalid indices', () => {
            expect(getCurrentMatchup(bracket, 10, 0)).toEqual([null, null])
            expect(getCurrentMatchup(bracket, 0, 10)).toEqual([null, null])
            expect(getCurrentMatchup([], 0, 0)).toEqual([null, null])
            expect(getCurrentMatchup(null, 0, 0)).toEqual([null, null])
        })
    })

    describe('advanceWinner', () => {
        let bracket

        beforeEach(() => {
            bracket = createTournamentBracket(['A', 'B', 'C', 'D'])
        })

        it('should advance winner to next round', () => {
            advanceWinner(bracket, 'A', 0, 0)
            
            expect(bracket[1][0].teams[0]).toBe('A')
        })

        it('should advance winner to correct position', () => {
            advanceWinner(bracket, 'B', 0, 1)
            
            expect(bracket[1][0].teams[1]).toBe('B')
        })

        it('should not advance from final round', () => {
            const finalRoundLength = bracket[bracket.length - 1].length
            advanceWinner(bracket, 'A', bracket.length - 1, 0)
            
            // Should not cause errors or changes
            expect(bracket[bracket.length - 1]).toHaveLength(finalRoundLength)
        })
    })

    describe('isTournamentComplete', () => {
        it('should return false for ongoing tournament', () => {
            const bracket = createTournamentBracket(['A', 'B', 'C', 'D'])
            expect(isTournamentComplete(bracket, 0)).toBe(false)
            expect(isTournamentComplete(bracket, 1)).toBe(false)
        })

        it('should return true when past final round', () => {
            const bracket = createTournamentBracket(['A', 'B', 'C', 'D'])
            expect(isTournamentComplete(bracket, bracket.length)).toBe(true)
            expect(isTournamentComplete(bracket, bracket.length + 1)).toBe(true)
        })
    })

    describe('autoDetectTaskNameColumn', () => {
        it('should return null for invalid input', () => {
            expect(autoDetectTaskNameColumn([])).toBe(null)
            expect(autoDetectTaskNameColumn(null)).toBe(null)
            expect(autoDetectTaskNameColumn(undefined)).toBe(null)
        })

        it('should detect common task name columns', () => {
            expect(autoDetectTaskNameColumn(['ID', 'Name', 'Status'])).toBe('Name')
            expect(autoDetectTaskNameColumn(['id', 'title', 'assignee'])).toBe('title')
            expect(autoDetectTaskNameColumn(['Task ID', 'Task Name', 'Priority'])).toBe('Task Name')
            expect(autoDetectTaskNameColumn(['Summary', 'Description'])).toBe('Summary')
        })

        it('should fall back to first column if no match', () => {
            expect(autoDetectTaskNameColumn(['ID', 'Priority', 'Status'])).toBe('ID')
        })

        it('should be case insensitive', () => {
            expect(autoDetectTaskNameColumn(['ID', 'TITLE', 'status'])).toBe('TITLE')
            expect(autoDetectTaskNameColumn(['id', 'Name', 'STATUS'])).toBe('Name')
        })
    })

    describe('autoSelectSecondaryFields', () => {
        it('should return empty array for invalid input', () => {
            expect(autoSelectSecondaryFields([], 'Name')).toEqual([])
            expect(autoSelectSecondaryFields(null, 'Name')).toEqual([])
        })

        it('should select common secondary fields', () => {
            const headers = ['Name', 'Assignee', 'Status', 'Priority', 'Description']
            const result = autoSelectSecondaryFields(headers, 'Name')
            
            expect(result).toContain('Assignee')
            expect(result).toContain('Status')
            expect(result).toContain('Priority')
            expect(result).not.toContain('Name') // Should exclude task name column
        })

        it('should respect max fields limit', () => {
            const headers = ['Name', 'Assignee', 'Status', 'Priority', 'Sprint', 'Due Date', 'Product area']
            const result = autoSelectSecondaryFields(headers, 'Name', 2)
            
            expect(result).toHaveLength(2)
        })

        it('should be case insensitive', () => {
            const headers = ['name', 'assignee', 'STATUS', 'priority']
            const result = autoSelectSecondaryFields(headers, 'name')
            
            expect(result).toContain('assignee')
            expect(result).toContain('STATUS')
            expect(result).toContain('priority')
        })

        it('should handle partial matches', () => {
            const headers = ['Task Name', 'Task Assignee', 'Task Status', 'Other Field']
            const result = autoSelectSecondaryFields(headers, 'Task Name')
            
            expect(result).toContain('Task Assignee')
            expect(result).toContain('Task Status')
            expect(result).not.toContain('Other Field')
        })
    })
})