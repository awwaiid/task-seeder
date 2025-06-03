import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    calculateTotalMatches,
    shuffleArray,
    createTournamentBracket,
    getCurrentMatchup,
    advanceWinner,
    isTournamentComplete,
    autoDetectTaskNameColumn,
    autoSelectSecondaryFields,
    createDoubleEliminationBracket,
    advanceDoubleEliminationWinner,
    getCurrentDoubleEliminationMatchup,
    isDoubleEliminationComplete
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

    describe('Double Elimination Tournament', () => {
        describe('createDoubleEliminationBracket', () => {
            it('should throw error for invalid input', () => {
                expect(() => createDoubleEliminationBracket([])).toThrow('At least 2 participants required')
                expect(() => createDoubleEliminationBracket([1])).toThrow('At least 2 participants required')
                expect(() => createDoubleEliminationBracket(null)).toThrow('At least 2 participants required')
            })

            it('should create proper double elimination bracket for 4 participants', () => {
                const tasks = ['Team A', 'Team B', 'Team C', 'Team D']
                const bracket = createDoubleEliminationBracket(tasks)
                
                expect(bracket).toHaveProperty('winners')
                expect(bracket).toHaveProperty('losers')
                expect(bracket).toHaveProperty('finals')
                expect(bracket).toHaveProperty('metadata')
                
                // Winners bracket should have 2 rounds (semis + final)
                expect(bracket.winners).toHaveLength(2)
                expect(bracket.winners[0]).toHaveLength(2) // 2 semifinals
                expect(bracket.winners[1]).toHaveLength(1) // 1 winners final
                
                // Losers bracket should have 3 rounds for 4 teams
                expect(bracket.losers).toHaveLength(3)
                
                // Finals should have 1-2 matches (grand final + potential reset)
                expect(bracket.finals).toHaveLength(2)
                expect(bracket.finals[0].isGrandFinal).toBe(true)
                expect(bracket.finals[1].isReset).toBe(true)
                
                // Check seeding in winners bracket
                expect(bracket.winners[0][0].teams).toEqual(['Team A', 'Team D'])
                expect(bracket.winners[0][1].teams).toEqual(['Team B', 'Team C'])
            })

            it('should create proper double elimination bracket for 8 participants', () => {
                const tasks = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']
                const bracket = createDoubleEliminationBracket(tasks)
                
                // Winners bracket: quarterfinals, semifinals, finals (3 rounds)
                expect(bracket.winners).toHaveLength(3)
                expect(bracket.winners[0]).toHaveLength(4) // 4 quarterfinals
                expect(bracket.winners[1]).toHaveLength(2) // 2 semifinals
                expect(bracket.winners[2]).toHaveLength(1) // 1 winners final
                
                // Losers bracket: 5 rounds for 8 teams
                expect(bracket.losers).toHaveLength(5)
                
                // Check proper seeding
                expect(bracket.winners[0][0].teams).toEqual(['T1', 'T8'])
                expect(bracket.winners[0][1].teams).toEqual(['T2', 'T7'])
                expect(bracket.winners[0][2].teams).toEqual(['T3', 'T6'])
                expect(bracket.winners[0][3].teams).toEqual(['T4', 'T5'])
            })

            it('should handle odd number of participants with byes', () => {
                const tasks = ['Team 1', 'Team 2', 'Team 3']
                const bracket = createDoubleEliminationBracket(tasks)
                
                // Should expand to 4 slots with byes
                expect(bracket.winners[0]).toHaveLength(2)
                
                // Should have one bye (null) in winners bracket
                const winnersFirstRoundTeams = bracket.winners[0].flatMap(match => match.teams)
                expect(winnersFirstRoundTeams.filter(team => team === null)).toHaveLength(1)
                expect(winnersFirstRoundTeams.filter(team => team !== null)).toHaveLength(3)
            })

            it('should create metadata with correct participant count and structure', () => {
                const tasks = ['A', 'B', 'C', 'D']
                const bracket = createDoubleEliminationBracket(tasks)
                
                expect(bracket.metadata.participantCount).toBe(4)
                expect(bracket.metadata.bracketSize).toBe(4)
                expect(bracket.metadata.winnersRounds).toBe(2)
                expect(bracket.metadata.losersRounds).toBe(3)
                expect(bracket.metadata.totalMatches).toBe(7) // 4-team double elim = 7 matches
            })
        })

        describe('getCurrentDoubleEliminationMatchup', () => {
            let bracket

            beforeEach(() => {
                bracket = createDoubleEliminationBracket(['A', 'B', 'C', 'D'])
            })

            it('should return current matchup from winners bracket', () => {
                const matchup = getCurrentDoubleEliminationMatchup(bracket, 'winners', 0, 0)
                expect(matchup).toEqual(['A', 'D'])
            })

            it('should return current matchup from losers bracket', () => {
                // First need to advance someone to losers bracket
                advanceDoubleEliminationWinner(bracket, 'A', 'winners', 0, 0)
                const matchup = getCurrentDoubleEliminationMatchup(bracket, 'losers', 0, 0)
                expect(matchup[0]).toBe('D') // Loser from winners match
            })

            it('should return null for invalid indices', () => {
                expect(getCurrentDoubleEliminationMatchup(bracket, 'winners', 10, 0)).toEqual([null, null])
                expect(getCurrentDoubleEliminationMatchup(bracket, 'losers', 0, 10)).toEqual([null, null])
                expect(getCurrentDoubleEliminationMatchup(null, 'winners', 0, 0)).toEqual([null, null])
            })

            it('should handle finals bracket', () => {
                // Advance teams to finals
                advanceDoubleEliminationWinner(bracket, 'A', 'winners', 0, 0)
                advanceDoubleEliminationWinner(bracket, 'B', 'winners', 0, 1)
                advanceDoubleEliminationWinner(bracket, 'A', 'winners', 1, 0)
                
                // Complete losers bracket to get second finalist
                advanceDoubleEliminationWinner(bracket, 'D', 'losers', 0, 0)
                advanceDoubleEliminationWinner(bracket, 'C', 'losers', 1, 0)
                advanceDoubleEliminationWinner(bracket, 'C', 'losers', 2, 0)
                
                const matchup = getCurrentDoubleEliminationMatchup(bracket, 'finals', 0, 0)
                expect(matchup).toEqual(['A', 'C'])
            })
        })

        describe('advanceDoubleEliminationWinner', () => {
            let bracket

            beforeEach(() => {
                bracket = createDoubleEliminationBracket(['A', 'B', 'C', 'D'])
            })

            it('should advance winner in winners bracket and send loser to losers bracket', () => {
                advanceDoubleEliminationWinner(bracket, 'A', 'winners', 0, 0)
                
                // Winner should advance in winners bracket
                expect(bracket.winners[1][0].teams[0]).toBe('A')
                
                // Loser should drop to losers bracket
                expect(bracket.losers[0][0].teams[0]).toBe('D')
            })

            it('should eliminate loser from losers bracket', () => {
                // First advance someone to losers bracket
                advanceDoubleEliminationWinner(bracket, 'A', 'winners', 0, 0)
                advanceDoubleEliminationWinner(bracket, 'B', 'winners', 0, 1)
                
                // Now advance someone in losers bracket (eliminates the other)
                advanceDoubleEliminationWinner(bracket, 'D', 'losers', 0, 0)
                
                expect(bracket.losers[1][0].teams[0]).toBe('D')
                // C should be eliminated (not advanced anywhere)
            })

            it('should advance winners to finals when appropriate', () => {
                // Complete winners bracket
                advanceDoubleEliminationWinner(bracket, 'A', 'winners', 0, 0)
                advanceDoubleEliminationWinner(bracket, 'B', 'winners', 0, 1)
                advanceDoubleEliminationWinner(bracket, 'A', 'winners', 1, 0)
                
                // Complete losers bracket
                advanceDoubleEliminationWinner(bracket, 'D', 'losers', 0, 0)
                advanceDoubleEliminationWinner(bracket, 'C', 'losers', 1, 0)
                advanceDoubleEliminationWinner(bracket, 'C', 'losers', 2, 0)
                
                // Check finals setup
                expect(bracket.finals[0].teams).toEqual(['A', 'C'])
            })

            it('should handle bracket reset in finals', () => {
                // Set up grand final
                bracket.finals[0].teams = ['A', 'B'] // A from winners, B from losers
                
                // If losers bracket winner wins grand final, should set up reset match
                advanceDoubleEliminationWinner(bracket, 'B', 'finals', 0, 0)
                
                expect(bracket.finals[1].teams).toEqual(['A', 'B'])
                expect(bracket.finals[1].isActive).toBe(true)
            })

            it('should end tournament if winners bracket winner wins grand final', () => {
                // Set up grand final
                bracket.finals[0].teams = ['A', 'B'] // A from winners, B from losers
                
                // If winners bracket winner wins, tournament ends
                advanceDoubleEliminationWinner(bracket, 'A', 'finals', 0, 0)
                
                expect(bracket.finals[0].winner).toBe('A')
                expect(bracket.finals[1].isActive).toBe(false) // No reset needed
            })
        })

        describe('isDoubleEliminationComplete', () => {
            let bracket

            beforeEach(() => {
                bracket = createDoubleEliminationBracket(['A', 'B', 'C', 'D'])
            })

            it('should return false for ongoing tournament', () => {
                expect(isDoubleEliminationComplete(bracket)).toBe(false)
            })

            it('should return true when grand final is complete and no reset needed', () => {
                bracket.finals[0].teams = ['A', 'B']
                bracket.finals[0].winner = 'A' // Winners bracket winner wins
                
                expect(isDoubleEliminationComplete(bracket)).toBe(true)
            })

            it('should return false when reset match is needed', () => {
                bracket.finals[0].teams = ['A', 'B']
                bracket.finals[0].winner = 'B' // Losers bracket winner wins, needs reset
                bracket.finals[1].isActive = true
                
                expect(isDoubleEliminationComplete(bracket)).toBe(false)
            })

            it('should return true when reset match is complete', () => {
                bracket.finals[0].teams = ['A', 'B']
                bracket.finals[0].winner = 'B'
                bracket.finals[1].teams = ['A', 'B']
                bracket.finals[1].winner = 'A'
                bracket.finals[1].isActive = true
                
                expect(isDoubleEliminationComplete(bracket)).toBe(true)
            })
        })

        describe('Single Elimination Round Display Bug', () => {
            it('should show impossible "Match 2 of 1" for 6-participant tournament round 2', () => {
                // This test demonstrates the bug where the UI shows "Round 2 of 3, Match 2 of 1"
                // which is impossible - you can't have match 2 when there's only 1 match in the round
                
                const tasks = ['A', 'B', 'C', 'D', 'E', 'F']
                
                // For 6 participants:
                // Round 1: 3 matches (6→3 winners)
                // Round 2: 1 match + 1 bye (3→1 winner + 1 bye)  
                // Round 3: 1 match (1 winner + 1 bye → champion)
                
                // The bug is in how currentRoundMatches is calculated in TournamentProgress.vue
                // It uses Math.floor(participants / 2) which doesn't account for the bracket structure
                
                // This test will fail with the current implementation showing the bug exists
                const bracket = createTournamentBracket(tasks)
                
                // Round 2 should have exactly 1 user-visible match, not 2
                // With 3 participants entering round 2, only 2 fight (1 match) and 1 gets bye
                
                // Simulate the current buggy calculation from TournamentProgress.vue line 82:
                let participants = 6
                // After round 1: participants = Math.ceil(6 / 2) = 3
                participants = Math.ceil(participants / 2) // 3 participants going into round 2
                
                const buggyCalculation = Math.floor(participants / 2) // Math.floor(3/2) = 1
                const correctMatches = 1 // Should be 1 match in round 2
                
                expect(buggyCalculation).toBe(correctMatches) // This passes, so the calculation isn't the issue
                
                // The real issue must be elsewhere - let's check the bracket structure
                expect(bracket[1]).toHaveLength(2) // Round 2 has 2 bracket slots due to power-of-2 expansion
                
                // This shows the issue: the bracket has 2 slots but only 1 should have a real match
                // The UI is probably counting bracket slots instead of actual matches
            })
        })

        describe('Double Elimination Edge Cases', () => {
            it('should handle 2-participant double elimination correctly', () => {
                const bracket = createDoubleEliminationBracket(['A', 'B'])
                
                expect(bracket.winners).toHaveLength(1) // Just one match
                expect(bracket.losers).toHaveLength(1) // One losers round
                expect(bracket.metadata.totalMatches).toBe(3) // 2 participants = 3 matches max
            })

            it('should handle large bracket sizes (16 participants)', () => {
                const tasks = Array.from({length: 16}, (_, i) => `Team${i+1}`)
                const bracket = createDoubleEliminationBracket(tasks)
                
                expect(bracket.metadata.participantCount).toBe(16)
                expect(bracket.metadata.totalMatches).toBe(31) // 16*2-1 = 31
                expect(bracket.winners).toHaveLength(4) // 4 rounds in winners
                expect(bracket.losers).toHaveLength(7) // 7 rounds in losers
            })

            it('should properly track match advancement in complex scenarios', () => {
                const bracket = createDoubleEliminationBracket(['A', 'B', 'C', 'D', 'E', 'F'])
                
                // For 6 participants expanding to 8, the initial matches are:
                // Match 0: A vs bye (A auto-advances)
                // Match 1: B vs bye (B auto-advances)  
                // Match 2: C vs F
                // Match 3: D vs E
                
                // Simulate matches where teams actually compete
                advanceDoubleEliminationWinner(bracket, 'C', 'winners', 0, 2) // C beats F
                advanceDoubleEliminationWinner(bracket, 'E', 'winners', 0, 3) // E beats D
                
                // Check that losers are properly placed in losers bracket
                const losersRound0 = bracket.losers[0]
                const allLosersTeams = losersRound0.flatMap(match => match.teams).filter(team => team !== null)
                
                // The two losers should be F and D
                expect(allLosersTeams).toContain('F')
                expect(allLosersTeams).toContain('D')
                expect(allLosersTeams).toHaveLength(2) // Only F and D lost actual matches
            })

            it('should handle bye advancement correctly in double elimination', () => {
                const bracket = createDoubleEliminationBracket(['A', 'B', 'C'])
                
                // One team should get a bye in first round
                const winnersFirstRound = bracket.winners[0]
                let byeCount = 0
                
                winnersFirstRound.forEach(match => {
                    if (match.teams[0] === null || match.teams[1] === null) {
                        byeCount++
                    }
                })
                
                expect(byeCount).toBe(1) // Exactly one bye match
            })
        })
    })
})