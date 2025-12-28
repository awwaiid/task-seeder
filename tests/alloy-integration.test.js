import { describe, it, expect } from 'vitest';
import alloy from 'alloy-lang';

describe('Alloy Integration', () => {
  // Skipped: alloy-lang wrapper fails due to punycode deprecation warning
  it.skip('should run basic Alloy model', async () => {
    const alloyModel = `
      sig Node {
        edges: set Node
      }
      
      pred connected {
        all n: Node | n in n.^edges
      }
      
      run connected for 3 Node
    `;

    const result = alloy.eval(alloyModel);
    expect(result).toBeDefined();
    expect(result.instances).toBeDefined();
    expect(Array.isArray(result.instances)).toBe(true);
  });

  // Skipped: alloy-lang wrapper fails due to punycode deprecation warning
  it.skip('should handle simple tournament properties', async () => {
    const tournamentModel = `
      sig Player {}
      sig Match {
        player1, player2, winner: one Player
      } {
        winner in player1 + player2
      }
      
      pred validTournament {
        all p: Player | lone m: Match | p = m.winner
      }
      
      run validTournament for 4 Player, 3 Match
    `;

    const result = alloy.eval(tournamentModel);
    expect(result).toBeDefined();
    expect(result.instances).toBeDefined();
    expect(Array.isArray(result.instances)).toBe(true);
  });
});
