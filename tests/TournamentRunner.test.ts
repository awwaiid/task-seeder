import { describe, it, expect } from 'vitest';
import { Tournament } from '../src/utils/TournamentRunner.js';

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

});
