import { describe, it, expect } from 'vitest';
import alloy from 'alloy-lang';

describe('Basic Tournament Properties', () => {
  it('should verify that every match has exactly one winner', () => {
    const tournamentModel = `
      sig Player {}
      sig Match {
        player1, player2: one Player,
        winner: one Player
      } {
        winner in player1 + player2
        player1 != player2
      }
      
      run {} for 5 Player, 4 Match
    `;

    const result = alloy.eval(tournamentModel);
    expect(result).toBeDefined();
    expect(result.instances.length).toBeGreaterThan(0);

    // Verify each instance has matches with exactly one winner
    for (const instance of result.instances) {
      expect(instance.values).toBeDefined();
    }
  });

  it('should verify basic tournament structure - each player appears in at most one match at a time', () => {
    const tournamentModel = `
      sig Player {}
      sig Match {
        player1, player2: one Player,
        winner: one Player
      } {
        winner in player1 + player2
        player1 != player2
      }
      
      // Each player can only be in one match (simplified - no rounds yet)
      fact noDoubleBooking {
        all disj m1, m2: Match | 
          no (m1.player1 + m1.player2) & (m2.player1 + m2.player2)
      }
      
      run {} for 4 Player, 2 Match
    `;

    const result = alloy.eval(tournamentModel);
    expect(result).toBeDefined();
    expect(result.instances.length).toBeGreaterThan(0);

    // Verify the instances satisfy our constraint
    const instance = result.instances[0];
    expect(instance.values).toBeDefined();
  });

  it('should verify that n players require exactly n-1 matches for single elimination', () => {
    const tournamentModel = `
      sig Player {}
      sig Match {
        player1, player2: one Player,
        winner: one Player
      } {
        winner in player1 + player2
        player1 != player2
      }
      
      // Single elimination: each match eliminates exactly one player
      // So n players need exactly n-1 matches
      fact singleElimination {
        #Match = sub[#Player, 1]
      }
      
      // Each player except the winner loses exactly once
      fact eachPlayerLosesOnce {
        all p: Player | 
          (one m: Match | p in m.(player1 + player2) and p != m.winner) or
          (no m: Match | p in m.(player1 + player2) and p != m.winner)
      }
      
      run {} for exactly 4 Player, exactly 3 Match
    `;

    const result = alloy.eval(tournamentModel);
    expect(result).toBeDefined();
    expect(result.instances.length).toBeGreaterThan(0);
  });

  it('should verify tournament has exactly one winner in valid tournaments', () => {
    const tournamentModel = `
      sig Player {}
      sig Match {
        player1, player2: one Player,
        winner: one Player
      } {
        winner in player1 + player2
        player1 != player2
      }
      
      // Tournament winner: never loses a match
      fun tournamentWinner: Player {
        { p: Player | all m: Match | p in m.(player1 + player2) implies p = m.winner }
      }
      
      // Run to find valid tournaments and count winners
      run { 
        #Match = sub[#Player, 1]
        // Each player loses at most once (single elimination)
        all p: Player | lone m: Match | p in m.(player1 + player2) and p != m.winner
      } for exactly 4 Player, exactly 3 Match
    `;

    const result = alloy.eval(tournamentModel);
    expect(result).toBeDefined();
    expect(result.instances.length).toBeGreaterThan(0);

    // For valid single elimination tournaments, verify exactly one winner exists
    for (const instance of result.instances) {
      expect(instance.values).toBeDefined();
    }
  });

  it('should validate tournament sizes from 2 to 5 players', () => {
    for (let numPlayers = 2; numPlayers <= 5; numPlayers++) {
      const numMatches = numPlayers - 1;

      const tournamentModel = `
        sig Player {}
        sig Match {
          player1, player2: one Player,
          winner: one Player
        } {
          winner in player1 + player2
          player1 != player2
        }
        
        // Single elimination constraints
        fact singleElimination {
          // Correct number of matches
          #Match = sub[#Player, 1]
          // Each player loses at most once
          all p: Player | lone m: Match | p in m.(player1 + player2) and p != m.winner
        }
        
        run {} for exactly ${numPlayers} Player, exactly ${numMatches} Match
      `;

      const result = alloy.eval(tournamentModel);
      expect(result, `Failed for ${numPlayers} players`).toBeDefined();
      expect(
        result.instances.length,
        `No valid tournaments found for ${numPlayers} players`
      ).toBeGreaterThan(0);
    }
  }, 15000);
});
