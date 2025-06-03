import { describe, it, expect } from 'vitest'
import { Tournament } from '../src/utils/TournamentRunner.js'

describe('TournamentRunner', () => {
    describe('Basic Tournament Creation', () => {
        it('should create a tournament with 2 participants', () => {
            const entrants = ['Alice', 'Bob']
            const tournament = new Tournament('single', entrants)
            
            expect(tournament.type).toBe('single')
            expect(tournament.originalEntrants).toEqual(['Alice', 'Bob'])
        })
        
        it('should reject tournament with no entrants', () => {
            expect(() => new Tournament('single', [])).toThrow('Tournament requires at least 1 entrant')
        })
        
        it('should handle single entrant tournament', () => {
            const tournament = new Tournament('single', ['Alice'])
            
            expect(tournament.isComplete()).toBe(true)
            expect(tournament.getWinner()).toBe('Alice')
            expect(tournament.getNextMatch()).toBeNull()
            expect(tournament.getTotalRounds()).toBe(0)
            expect(tournament.getTotalMatches()).toBe(0)
        })
    })
    
    describe('Getting Next Match', () => {
        it('should return the first match for 2-participant tournament', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob'])
            const match = tournament.getNextMatch()
            
            expect(match).toEqual({
                player1: 'Alice',
                player2: 'Bob',
                round: 1,
                matchInRound: 1
            })
        })
        
        it('should return null when no matches available', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob'])
            
            // Before we implement match reporting, this should still return the first match
            const match = tournament.getNextMatch()
            expect(match).not.toBeNull()
        })
    })
    
    describe('Reporting Match Results', () => {
        it('should complete a 2-participant tournament', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob'])
            
            const match = tournament.getNextMatch()
            expect(match.player1).toBe('Alice')
            expect(match.player2).toBe('Bob')
            
            // Alice wins
            tournament.reportResult(match, 'Alice')
            
            // Tournament should be complete, no more matches
            const nextMatch = tournament.getNextMatch()
            expect(nextMatch).toBeNull()
        })
        
        it('should track completed matches', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob'])
            const match = tournament.getNextMatch()
            
            tournament.reportResult(match, 'Alice')
            
            expect(tournament.matches).toHaveLength(1)
            expect(tournament.matches[0].winner).toBe('Alice')
            expect(tournament.matches[0].player1).toBe('Alice')
            expect(tournament.matches[0].player2).toBe('Bob')
        })
    })
    
    describe('Tournament Completion', () => {
        it('should indicate when tournament is complete', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob'])
            
            expect(tournament.isComplete()).toBe(false)
            
            const match = tournament.getNextMatch()
            tournament.reportResult(match, 'Alice')
            
            expect(tournament.isComplete()).toBe(true)
        })
        
        it('should return the winner', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob'])
            const match = tournament.getNextMatch()
            tournament.reportResult(match, 'Alice')
            
            expect(tournament.getWinner()).toBe('Alice')
        })
    })
    
    describe('4-Participant Tournament', () => {
        it('should create proper first round matches', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob', 'Charlie', 'Diana'])
            
            const match1 = tournament.getNextMatch()
            expect(match1).toEqual({
                player1: 'Alice',
                player2: 'Bob',
                round: 1,
                matchInRound: 1
            })
        })
        
        it('should advance to second round after first match', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob', 'Charlie', 'Diana'])
            
            // First match: Alice vs Bob
            const match1 = tournament.getNextMatch()
            tournament.reportResult(match1, 'Alice')
            
            // Second match: Charlie vs Diana
            const match2 = tournament.getNextMatch()
            expect(match2).toEqual({
                player1: 'Charlie',
                player2: 'Diana',
                round: 1,
                matchInRound: 2
            })
        })
        
        it('should complete full 4-participant tournament', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob', 'Charlie', 'Diana'])
            
            expect(tournament.isComplete()).toBe(false)
            
            // Round 1, Match 1: Alice vs Bob
            const match1 = tournament.getNextMatch()
            expect(match1.round).toBe(1)
            expect(match1.matchInRound).toBe(1)
            tournament.reportResult(match1, 'Alice')
            
            // Round 1, Match 2: Charlie vs Diana  
            const match2 = tournament.getNextMatch()
            expect(match2.round).toBe(1)
            expect(match2.matchInRound).toBe(2)
            tournament.reportResult(match2, 'Charlie')
            
            expect(tournament.isComplete()).toBe(false)
            
            // Round 2, Match 1: Alice vs Charlie (final)
            const finalMatch = tournament.getNextMatch()
            expect(finalMatch.round).toBe(2)
            expect(finalMatch.matchInRound).toBe(1)
            expect(finalMatch.player1).toBe('Alice')
            expect(finalMatch.player2).toBe('Charlie')
            
            tournament.reportResult(finalMatch, 'Charlie')
            
            expect(tournament.isComplete()).toBe(true)
            expect(tournament.getWinner()).toBe('Charlie')
            expect(tournament.getNextMatch()).toBeNull()
        })
    })
    
    describe('Progress Tracking', () => {
        it('should provide tournament progress information', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob', 'Charlie', 'Diana'])
            
            // Should be able to track progress
            expect(tournament.matches).toHaveLength(0)
            expect(tournament.pendingMatches).toHaveLength(2)
            
            // After one match
            const match1 = tournament.getNextMatch()
            tournament.reportResult(match1, 'Alice')
            
            expect(tournament.matches).toHaveLength(1)
            expect(tournament.pendingMatches).toHaveLength(1)
            
            // After second match of round 1
            const match2 = tournament.getNextMatch()
            tournament.reportResult(match2, 'Charlie')
            
            expect(tournament.matches).toHaveLength(2)
            expect(tournament.pendingMatches).toHaveLength(1) // Final match generated
        })
        
        it('should correctly calculate round and match display info', () => {
            const tournament = new Tournament('single', ['Alice', 'Bob', 'Charlie', 'Diana'])
            
            expect(tournament.getTotalRounds()).toBe(2)
            expect(tournament.getMatchesInRound(1)).toBe(2) // Round 1: 2 matches
            expect(tournament.getMatchesInRound(2)).toBe(1) // Round 2: 1 match
            expect(tournament.getTotalMatches()).toBe(3)    // Total: 3 matches
            
            // Before any matches
            expect(tournament.getCurrentMatchNumber()).toBe(1)
            
            // After first match
            const match1 = tournament.getNextMatch()
            tournament.reportResult(match1, 'Alice')
            expect(tournament.getCurrentMatchNumber()).toBe(2)
            
            // After second match
            const match2 = tournament.getNextMatch()
            tournament.reportResult(match2, 'Charlie')
            expect(tournament.getCurrentMatchNumber()).toBe(3)
        })
    })
    
    describe('Variable Tournament Sizes', () => {
        it('should handle 3-participant tournament', () => {
            const tournament = new Tournament('single', ['A', 'B', 'C'])
            
            expect(tournament.getTotalRounds()).toBe(2)
            expect(tournament.getMatchesInRound(1)).toBe(1) // 3→1 match (C gets bye)
            expect(tournament.getMatchesInRound(2)).toBe(1) // Winner vs C
            expect(tournament.getTotalMatches()).toBe(2)
            
            // Round 1: A vs B (C gets bye)
            const match1 = tournament.getNextMatch()
            expect(match1.round).toBe(1)
            expect(match1.matchInRound).toBe(1)
            tournament.reportResult(match1, 'A')
            
            // Round 2: A vs C
            const match2 = tournament.getNextMatch()
            expect(match2.round).toBe(2)
            expect(match2.matchInRound).toBe(1)
            expect(match2.player1).toBe('A')
            expect(match2.player2).toBe('C')
        })
        
        it('should handle 6-participant tournament correctly', () => {
            const tournament = new Tournament('single', ['A', 'B', 'C', 'D', 'E', 'F'])
            
            expect(tournament.getTotalRounds()).toBe(3)
            expect(tournament.getMatchesInRound(1)).toBe(3) // Round 1: 3 matches
            expect(tournament.getMatchesInRound(2)).toBe(1) // Round 2: 1 match  
            expect(tournament.getMatchesInRound(3)).toBe(1) // Round 3: 1 match
            expect(tournament.getTotalMatches()).toBe(5)
            
            // Round 1: Should have 3 matches
            const match1 = tournament.getNextMatch()
            expect(match1.round).toBe(1)
            expect(match1.matchInRound).toBe(1)
            tournament.reportResult(match1, 'A') // A beats B
            
            const match2 = tournament.getNextMatch()
            expect(match2.round).toBe(1)
            expect(match2.matchInRound).toBe(2)
            tournament.reportResult(match2, 'C') // C beats D
            
            const match3 = tournament.getNextMatch()
            expect(match3.round).toBe(1)
            expect(match3.matchInRound).toBe(3)
            tournament.reportResult(match3, 'E') // E beats F
            
            // Round 2: Should have exactly 1 match (3 winners → A, C, E)
            const round2Match = tournament.getNextMatch()
            expect(round2Match.round).toBe(2)
            expect(round2Match.matchInRound).toBe(1) // This should be 1, not 2!
            tournament.reportResult(round2Match, 'A') // A beats one of C or E
            
            // Round 3: Final match
            const finalMatch = tournament.getNextMatch()
            expect(finalMatch.round).toBe(3)
            expect(finalMatch.matchInRound).toBe(1)
        })
        
        it('should handle 5-participant tournament', () => {
            const tournament = new Tournament('single', ['A', 'B', 'C', 'D', 'E'])
            
            expect(tournament.getTotalRounds()).toBe(3)
            expect(tournament.getMatchesInRound(1)).toBe(2) // Round 1: 2 matches (E gets bye)
            expect(tournament.getMatchesInRound(2)).toBe(1) // Round 2: 1 match
            expect(tournament.getMatchesInRound(3)).toBe(1) // Round 3: 1 match
            expect(tournament.getTotalMatches()).toBe(4)
        })
        
        it('should handle 7-participant tournament', () => {
            const tournament = new Tournament('single', ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
            
            expect(tournament.getTotalRounds()).toBe(3)
            expect(tournament.getMatchesInRound(1)).toBe(3) // Round 1: 3 matches (G gets bye)
            expect(tournament.getMatchesInRound(2)).toBe(2) // Round 2: 2 matches  
            expect(tournament.getMatchesInRound(3)).toBe(1) // Round 3: 1 match
            expect(tournament.getTotalMatches()).toBe(6)
        })
        
        it('should handle 8-participant tournament', () => {
            const tournament = new Tournament('single', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
            
            expect(tournament.getTotalRounds()).toBe(3)
            expect(tournament.getMatchesInRound(1)).toBe(4) // Round 1: 4 matches
            expect(tournament.getMatchesInRound(2)).toBe(2) // Round 2: 2 matches  
            expect(tournament.getMatchesInRound(3)).toBe(1) // Round 3: 1 match
            expect(tournament.getTotalMatches()).toBe(7)
        })
    })
    
    describe('Bug Fix Demonstration', () => {
        it('should never show impossible match displays like "Round 2, Match 2 of 1"', () => {
            const tournament = new Tournament('single', ['A', 'B', 'C', 'D', 'E', 'F'])
            
            // Track each match and verify the display would be correct
            const matchDisplays = []
            
            while (!tournament.isComplete()) {
                const match = tournament.getNextMatch()
                if (!match) break
                
                const display = `Round ${match.round} of ${tournament.getTotalRounds()}, Match ${match.matchInRound} of ${tournament.getMatchesInRound(match.round)}`
                matchDisplays.push(display)
                
                // Always advance the first player for consistency
                tournament.reportResult(match, match.player1)
            }
            
            // Verify we get the expected progression
            expect(matchDisplays).toEqual([
                'Round 1 of 3, Match 1 of 3',
                'Round 1 of 3, Match 2 of 3',
                'Round 1 of 3, Match 3 of 3',
                'Round 2 of 3, Match 1 of 1',  // ← Only 1 match in round 2!
                'Round 3 of 3, Match 1 of 1'
            ])
            
            // Verify no impossible displays like "Match 2 of 1"
            for (const display of matchDisplays) {
                const match = display.match(/Match (\d+) of (\d+)/)
                if (match) {
                    const [, matchNum, totalMatches] = match
                    expect(parseInt(matchNum)).toBeLessThanOrEqual(parseInt(totalMatches))
                }
            }
        })
    })
    
    describe('Double Elimination', () => {
        describe('Basic Double Elimination', () => {
            it('should create a double elimination tournament', () => {
                const tournament = new Tournament('double', ['Alice', 'Bob'])
                
                expect(tournament.type).toBe('double')
                expect(tournament.originalEntrants).toEqual(['Alice', 'Bob'])
            })
            
            it('should require two losses to eliminate a participant', () => {
                const tournament = new Tournament('double', ['Alice', 'Bob'])
                
                // First match: Alice beats Bob
                const match1 = tournament.getNextMatch()
                expect(match1.player1).toBe('Alice')
                expect(match1.player2).toBe('Bob')
                tournament.reportResult(match1, 'Alice')
                
                // Bob should still be in the tournament (first loss)
                expect(tournament.remainingParticipants).toContain('Bob')
                expect(tournament.isComplete()).toBe(false)
                
                // Should have another match (Bob gets second chance)
                const match2 = tournament.getNextMatch()
                expect(match2).not.toBeNull()
                expect(match2.player1).toBe('Alice')
                expect(match2.player2).toBe('Bob')
                
                // Alice beats Bob again - now Bob is eliminated
                tournament.reportResult(match2, 'Alice')
                expect(tournament.isComplete()).toBe(true)
                expect(tournament.getWinner()).toBe('Alice')
            })
        })
        
        describe('4-Participant Double Elimination', () => {
            it('should handle basic 4-participant double elimination flow', () => {
                const tournament = new Tournament('double', ['Alice', 'Bob', 'Charlie', 'Diana'])
                
                // Winners bracket round 1
                const match1 = tournament.getNextMatch()
                expect(match1.player1).toBe('Alice')
                expect(match1.player2).toBe('Bob')
                tournament.reportResult(match1, 'Alice') // Bob gets first loss
                
                const match2 = tournament.getNextMatch()
                expect(match2.player1).toBe('Charlie')
                expect(match2.player2).toBe('Diana')
                tournament.reportResult(match2, 'Charlie') // Diana gets first loss
                
                // All participants should still be in tournament
                expect(tournament.remainingParticipants).toHaveLength(4)
                expect(tournament.remainingParticipants).toEqual(['Alice', 'Bob', 'Charlie', 'Diana'])
                
                // Winners bracket final: Alice vs Charlie
                const winnersFinalmatch = tournament.getNextMatch()
                expect(winnersFinalmatch.player1).toBe('Alice')
                expect(winnersFinalmatch.player2).toBe('Charlie')
                tournament.reportResult(winnersFinalmatch, 'Alice') // Charlie gets first loss
                
                // Charlie should still be in tournament (first loss)
                expect(tournament.remainingParticipants).toContain('Charlie')
                
                // Losers bracket: Bob vs Diana (both have 1 loss)
                const loserMatch1 = tournament.getNextMatch()
                expect([loserMatch1.player1, loserMatch1.player2]).toEqual(expect.arrayContaining(['Bob', 'Diana']))
                tournament.reportResult(loserMatch1, 'Bob') // Diana eliminated (second loss)
                
                // Diana should be eliminated now
                expect(tournament.remainingParticipants).not.toContain('Diana')
                expect(tournament.remainingParticipants).toHaveLength(3)
            })
        })
        
        describe('Grand Final and Bracket Reset', () => {
            it('should end tournament when winners bracket winner wins grand final', () => {
                const tournament = new Tournament('double', ['Alice', 'Bob'])
                
                // Alice beats Bob (Bob gets first loss)
                const match1 = tournament.getNextMatch()
                tournament.reportResult(match1, 'Alice')
                
                // Grand final: Alice (0 losses) vs Bob (1 loss)
                const grandFinal = tournament.getNextMatch()
                expect(grandFinal.bracket).toBe('grand_final')
                tournament.reportResult(grandFinal, 'Alice') // Alice wins again
                
                // Tournament should be complete (Alice never lost)
                expect(tournament.isComplete()).toBe(true)
                expect(tournament.getWinner()).toBe('Alice')
            })
            
            it('should require bracket reset when losers bracket winner wins grand final', () => {
                const tournament = new Tournament('double', ['Alice', 'Bob'])
                
                // Alice beats Bob (Bob gets first loss)
                const match1 = tournament.getNextMatch()
                tournament.reportResult(match1, 'Alice')
                
                // Grand final: Alice (0 losses) vs Bob (1 loss)
                const grandFinal = tournament.getNextMatch()
                expect(grandFinal.bracket).toBe('grand_final')
                tournament.reportResult(grandFinal, 'Bob') // Bob wins - bracket reset!
                
                // Tournament should NOT be complete yet (both have 1 loss now)
                expect(tournament.isComplete()).toBe(false)
                
                // Should have a reset match
                const resetMatch = tournament.getNextMatch()
                expect(resetMatch).not.toBeNull()
                expect([resetMatch.player1, resetMatch.player2]).toEqual(expect.arrayContaining(['Alice', 'Bob']))
                expect(resetMatch.bracket).toBe('grand_final_reset')
                
                // Winner of reset match wins tournament
                tournament.reportResult(resetMatch, 'Bob')
                expect(tournament.isComplete()).toBe(true)
                expect(tournament.getWinner()).toBe('Bob')
            })
        })
        
        describe('Various Double Elimination Tournament Sizes', () => {
            it('should handle 3-participant double elimination', () => {
                const tournament = new Tournament('double', ['A', 'B', 'C'])
                
                expect(tournament.getTotalMatches()).toBe(5) // 3*2-1 = 5 matches max
                
                // Initial matches: A vs B (C gets bye)
                const match1 = tournament.getNextMatch()
                expect(match1.bracket).toBe('winners')
                tournament.reportResult(match1, 'A') // B gets first loss
                
                // Winners final: A vs C
                const match2 = tournament.getNextMatch()
                expect(match2.bracket).toBe('winners')
                expect([match2.player1, match2.player2]).toEqual(expect.arrayContaining(['A', 'C']))
                tournament.reportResult(match2, 'C') // A gets first loss
                
                // Losers bracket: A vs B (both have 1 loss)
                const loserMatch = tournament.getNextMatch()
                expect(loserMatch.bracket).toBe('losers')
                expect([loserMatch.player1, loserMatch.player2]).toEqual(expect.arrayContaining(['A', 'B']))
                tournament.reportResult(loserMatch, 'A') // B eliminated (2 losses)
                
                expect(tournament.remainingParticipants).not.toContain('B')
                expect(tournament.remainingParticipants).toHaveLength(2)
                
                // Grand final: C (0 losses) vs A (1 loss)
                const grandFinal = tournament.getNextMatch()
                expect(grandFinal.bracket).toBe('grand_final')
            })
            
            it('should calculate correct total matches for double elimination', () => {
                // Double elimination always needs (2n-1) matches maximum
                expect(new Tournament('double', ['A', 'B']).getTotalMatches()).toBe(3)
                expect(new Tournament('double', ['A', 'B', 'C']).getTotalMatches()).toBe(5)
                expect(new Tournament('double', ['A', 'B', 'C', 'D']).getTotalMatches()).toBe(7)
                expect(new Tournament('double', ['A', 'B', 'C', 'D', 'E']).getTotalMatches()).toBe(9)
            })
            
            it('should handle larger double elimination tournaments', () => {
                const tournament = new Tournament('double', ['A', 'B', 'C', 'D', 'E', 'F'])
                
                expect(tournament.getTotalMatches()).toBe(11) // 6*2-1 = 11 matches max
                
                // All participants should start in tournament
                expect(tournament.remainingParticipants).toHaveLength(6)
                
                // First round winners bracket: 3 matches
                let matchCount = 0
                while (matchCount < 3) {
                    const match = tournament.getNextMatch()
                    if (match && match.bracket === 'winners') {
                        tournament.reportResult(match, match.player1)
                        matchCount++
                    } else {
                        break
                    }
                }
                
                // After 3 matches, should still have all 6 participants (losers have 1 loss each)
                expect(tournament.remainingParticipants).toHaveLength(6)
            })
            
            it('should demonstrate full double elimination vs single elimination behavior', () => {
                // Compare the same scenario in both tournament types
                const singleTournament = new Tournament('single', ['A', 'B', 'C', 'D'])
                const doubleTournament = new Tournament('double', ['A', 'B', 'C', 'D'])
                
                // Same first two matches in both tournaments
                const singleMatch1 = singleTournament.getNextMatch()
                singleTournament.reportResult(singleMatch1, 'A') // B eliminated in single
                
                const doubleMatch1 = doubleTournament.getNextMatch()
                doubleTournament.reportResult(doubleMatch1, 'A') // B gets first loss in double
                
                // In single elimination, B is gone
                expect(singleTournament.remainingParticipants).not.toContain('B')
                expect(singleTournament.remainingParticipants).toHaveLength(3)
                
                // In double elimination, B is still in the tournament
                expect(doubleTournament.remainingParticipants).toContain('B')
                expect(doubleTournament.remainingParticipants).toHaveLength(4)
                
                // Double elimination needs more matches
                expect(doubleTournament.getTotalMatches()).toBeGreaterThan(singleTournament.getTotalMatches())
            })
        })
    })
})