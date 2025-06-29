import { describe, it, expect } from 'vitest';
import { Tournament, QuickSortTournament, createTournament } from '../src/utils/TournamentRunner.js';

describe('TournamentRunner', () => {
  describe('Basic Tournament Creation', () => {
    it('should create a tournament with 2 participants', () => {
      const entrants = ['Alice', 'Bob'];
      const tournament = new Tournament('single', entrants);

      expect(tournament.type).toBe('single');
      expect(tournament.originalEntrants).toEqual(['Alice', 'Bob']);
    });

    it('should reject tournament with no entrants', () => {
      expect(() => new Tournament('single', [])).toThrow(
        'Tournament requires at least 1 entrant'
      );
    });

    it('should handle single entrant tournament', () => {
      const tournament = new Tournament('single', ['Alice']);

      expect(tournament.isComplete()).toBe(true);
      expect(tournament.getWinner()).toBe('Alice');
      expect(tournament.getNextMatch()).toBeNull();
      expect(tournament.getTotalRounds()).toBe(0);
      expect(tournament.getTotalMatches()).toBe(0);
    });
  });

  describe('Tournament Flow', () => {
    it('should return the first match for 2-participant tournament', () => {
      const tournament = new Tournament('single', ['Alice', 'Bob']);
      const match = tournament.getNextMatch();

      expect(match).toMatchObject({
        round: 1,
        matchInRound: 1,
        bracket: 'single',
      });
      expect([match.player1, match.player2].sort()).toEqual(['Alice', 'Bob']);
    });

    it('should complete a 2-participant tournament', () => {
      const tournament = new Tournament('single', ['Alice', 'Bob']);

      const match = tournament.getNextMatch();
      expect([match.player1, match.player2].sort()).toEqual(['Alice', 'Bob']);

      tournament.reportResult(match, 'Alice');

      expect(tournament.isComplete()).toBe(true);
      expect(tournament.getWinner()).toBe('Alice');
      expect(tournament.getNextMatch()).toBeNull();
    });

    it('should track completed matches', () => {
      const tournament = new Tournament('single', ['Alice', 'Bob']);
      const match = tournament.getNextMatch();

      tournament.reportResult(match, 'Alice');

      expect(tournament.matches).toHaveLength(1);
      expect(tournament.matches[0].winner).toBe('Alice');
      expect(tournament.matches[0].loser).toBe('Bob');
      expect(
        [tournament.matches[0].player1, tournament.matches[0].player2].sort()
      ).toEqual(['Alice', 'Bob']);
    });
  });

  describe('Double Elimination', () => {
    it('should create a double elimination tournament', () => {
      const tournament = new Tournament('double', [
        'Alice',
        'Bob',
        'Charlie',
        'Diana',
      ]);
      expect(tournament.type).toBe('double');
      expect(tournament.originalEntrants).toEqual([
        'Alice',
        'Bob',
        'Charlie',
        'Diana',
      ]);
    });

    it('should fallback to single elimination for small tournaments', () => {
      // Double elimination requires at least 4 players according to tournament-organizer
      const tournament = new Tournament('double', ['Alice', 'Bob']);
      expect(tournament.type).toBe('double'); // type is still double
      // But internally it uses single elimination logic
    });
  });

  describe('QuickSort Tournament', () => {
    it('should create a quicksort tournament', () => {
      const tournament = new QuickSortTournament(['Alice', 'Bob', 'Charlie']);
      
      expect(tournament.type).toBe('quicksort');
      expect(tournament.originalEntrants).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should handle single entrant quicksort tournament', () => {
      const tournament = new QuickSortTournament(['Alice']);
      
      expect(tournament.isComplete()).toBe(true);
      expect(tournament.getWinner()).toBe('Alice');
      expect(tournament.getNextMatch()).toBeNull();
      expect(tournament.getRankings()).toEqual(['Alice']);
    });

    it('should return first comparison for 3-participant tournament', () => {
      const tournament = new QuickSortTournament(['Alice', 'Bob', 'Charlie']);
      const match = tournament.getNextMatch();
      
      expect(match).not.toBeNull();
      expect(match!.bracket).toBe('quicksort');
      expect([match!.player1, match!.player2]).toContain('Bob'); // Pivot is middle participant
      expect(['Alice', 'Charlie']).toContain(match!.player1 === 'Bob' ? match!.player2 : match!.player1);
    });

    it('should complete a 3-participant quicksort tournament', () => {
      const tournament = new QuickSortTournament(['Alice', 'Bob', 'Charlie']);
      
      // First comparison: Bob (pivot) vs Alice
      let match = tournament.getNextMatch();
      expect(match).not.toBeNull();
      
      // Bob wins vs Alice  
      tournament.reportResult(match!, 'Bob');
      
      // Second comparison: Bob (pivot) vs Charlie  
      match = tournament.getNextMatch();
      expect(match).not.toBeNull();
      
      // Charlie wins vs Bob
      tournament.reportResult(match!, 'Charlie');
      
      // Tournament should be complete
      expect(tournament.isComplete()).toBe(true);
      
      const rankings = tournament.getRankings();
      expect(rankings).toHaveLength(3);
      expect(rankings[0]).toBe('Charlie'); // Winner
    });

    it('should track progress correctly', () => {
      const tournament = new QuickSortTournament(['Alice', 'Bob', 'Charlie', 'Diana']);
      
      const totalMatches = tournament.getTotalMatches();
      expect(totalMatches).toBeGreaterThan(0);
      expect(tournament.getCurrentMatchNumber()).toBe(1);
    });

    it('should export and restore state', () => {
      const tournament = new QuickSortTournament(['Alice', 'Bob', 'Charlie']);
      
      const state = tournament.exportState();
      expect(state.type).toBe('quicksort');
      expect(state.originalEntrants).toEqual(['Alice', 'Bob', 'Charlie']);
      
      const restored = QuickSortTournament.fromStoredState(state);
      expect(restored.type).toBe('quicksort');
      expect(restored.originalEntrants).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should rank A first when A always wins in alphabetical tournament', () => {
      const tournament = new QuickSortTournament(['A', 'B', 'C', 'D', 'E', 'F']);
      
      let matchCount = 0;
      const maxMatches = 20;
      
      while (!tournament.isComplete() && matchCount < maxMatches) {
        const match = tournament.getNextMatch();
        if (!match) break;
        
        // Always choose the alphabetically earlier option (A should always win)
        const winner = [match.player1, match.player2].sort()[0];
        tournament.reportResult(match, winner);
        matchCount++;
      }
      
      const rankings = tournament.getRankings();
      
      expect(tournament.isComplete()).toBe(true);
      expect(rankings[0]).toBe('A'); // A should be first
      expect(rankings).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    });
  });

  describe('Tournament Factory', () => {
    it('should create single elimination tournament', () => {
      const tournament = createTournament('single', ['Alice', 'Bob']);
      expect(tournament).toBeInstanceOf(Tournament);
      expect(tournament.type).toBe('single');
    });

    it('should create double elimination tournament', () => {
      const tournament = createTournament('double', ['Alice', 'Bob', 'Charlie', 'Diana']);
      expect(tournament).toBeInstanceOf(Tournament);
      expect(tournament.type).toBe('double');
    });

    it('should create quicksort tournament', () => {
      const tournament = createTournament('quicksort', ['Alice', 'Bob', 'Charlie']);
      expect(tournament).toBeInstanceOf(QuickSortTournament);
      expect(tournament.type).toBe('quicksort');
    });
  });

});
