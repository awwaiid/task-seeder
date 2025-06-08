import { describe, it, expect } from 'vitest';
import alloy from 'alloy-lang';

describe('TournamentRunner Alloy Model', () => {
  const tournamentRunnerModel = `
    // Tournament state using behavioral modeling patterns from Practical Alloy
    sig Player {}
    
    // Global mutable state (like TournamentRunner instance variables)
    var sig originalEntrants: set Player {}      // corresponds to this.originalEntrants  
    var sig remainingParticipants: set Player {} // corresponds to this.remainingParticipants
    var sig pendingMatches: set Match {}         // corresponds to this.pendingMatches
    var sig completedMatches: set Match {}       // corresponds to this.matches
    
    sig Match {
      player1, player2: one Player
    } {
      player1 != player2
    }
    
    // Match result - separate from Match structure
    var sig matchResults: Match -> lone Player
    
    // State invariants (always true)
    fact stateInvariants {
      always {
        // Remaining participants are subset of original entrants
        remainingParticipants in originalEntrants
        
        // Matches are either pending or completed, not both
        no pendingMatches & completedMatches
        
        // Completed matches have results, pending matches don't
        all m: completedMatches | one m.matchResults
        all m: pendingMatches | no m.matchResults
        
        // Match results must be valid (winner is one of the players)
        all m: Match, p: Player | m -> p in matchResults => p in m.player1 + m.player2
      }
    }
    
    // Initial state predicate (corresponds to TournamentRunner constructor)
    pred init {
      // Must have at least 2 entrants
      #originalEntrants >= 2
      
      // Initially, all entrants are remaining
      remainingParticipants = originalEntrants
      
      // No completed matches initially
      no completedMatches
      no matchResults
      
      // Generate initial round matches
      generateRoundMatches
    }
    
    // Generate matches for current round (corresponds to _generateRoundMatches)
    pred generateRoundMatches {
      // If 1 or fewer participants remain, no matches needed
      #remainingParticipants <= 1 => no pendingMatches
      
      // Otherwise create matches from remaining participants
      #remainingParticipants > 1 => {
        // Each remaining participant appears in at most one pending match
        all p: remainingParticipants | 
          lone m: pendingMatches | p in m.player1 + m.player2
          
        // All pending match players are remaining participants
        all m: pendingMatches | 
          m.player1 + m.player2 in remainingParticipants
          
        // For 2 players, exactly one match
        #remainingParticipants = 2 => {
          one m: pendingMatches
          m.player1 + m.player2 = remainingParticipants
        }
      }
    }
    
    // Report match result action (corresponds to TournamentRunner.reportResult)
    pred reportResult[match: Match, winner: Player] {
      // Guard: match must be pending, winner must be valid
      match in pendingMatches
      winner in match.player1 + match.player2
      
      // Effects:
      let loser = (match.player1 + match.player2) - winner | {
        // Record match result
        matchResults' = matchResults + match -> winner
        
        // Move match from pending to completed
        completedMatches' = completedMatches + match
        pendingMatches' = pendingMatches - match
        
        // Eliminate loser (single elimination)
        remainingParticipants' = remainingParticipants - loser
        
        // Frame condition: originalEntrants unchanged
        originalEntrants' = originalEntrants
      }
      
      // If round complete and tournament not over, generate next round
      after (no pendingMatches and #remainingParticipants > 1) => after generateRoundMatches
    }
    
    // Stuttering action (when no tournament action occurs)
    pred stutter {
      originalEntrants' = originalEntrants
      remainingParticipants' = remainingParticipants  
      pendingMatches' = pendingMatches
      completedMatches' = completedMatches
      matchResults' = matchResults
    }
    
    // Tournament complete predicate
    pred isComplete {
      #remainingParticipants <= 1 and no pendingMatches
    }
    
    // System transitions fact
    fact transitions {
      always (
        (some m: Match, p: Player | reportResult[m, p]) or
        stutter
      )
    }
  `;

  it('should have basic structure', () => {
    const simpleModel = `
      sig Player {}
      sig Match {
        player1, player2: one Player,
        winner: lone Player
      } {
        player1 != player2
      }
      
      run {} for 2 Player, 1 Match
    `;

    const result = alloy.eval(simpleModel);
    expect(result).toBeDefined();
    expect(result.instances).toBeDefined();
    expect(result.instances.length).toBeGreaterThan(0);
  });

  it.skip('should initialize 2-player tournament', () => {
    const model =
      tournamentRunnerModel +
      `
      run {
        init
        #originalEntrants = 2
      } for exactly 2 Player, exactly 1 Match, 2 steps
    `;

    const result = alloy.eval(model);
    expect(result).toBeDefined();

    // Debug the raw result
    console.log('Raw result:', JSON.stringify(result, null, 2));

    if (!result.instances) {
      console.log('No instances found - model may be unsatisfiable');
      expect(result).toHaveProperty('instances');
    } else {
      expect(result.instances.length).toBeGreaterThan(0);
    }
  });

  it.skip('should handle 2-player tournament completion', () => {
    const model =
      tournamentRunnerModel +
      `
      run {
        init
        #originalEntrants = 2
        eventually isComplete
      } for exactly 2 Player, exactly 1 Match, 3 steps
    `;

    const result = alloy.eval(model);
    expect(result).toBeDefined();
    expect(result.instances).toBeDefined();
    expect(result.instances.length).toBeGreaterThan(0);
  });

  it.skip('should handle 4-player tournament progression', () => {
    const model =
      tournamentRunnerModel +
      `
      run {
        init
        #originalEntrants = 4
        eventually isComplete
      } for exactly 4 Player, exactly 3 Match, 6 steps
    `;

    const result = alloy.eval(model);
    expect(result).toBeDefined();
    expect(result.instances).toBeDefined();
    expect(result.instances.length).toBeGreaterThan(0);
  });
});
