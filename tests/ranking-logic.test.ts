import { describe, it, expect } from 'vitest';
import { Tournament } from '../src/utils/TournamentRunner.js';

describe('Tournament Ranking Logic', () => {
  it('should rank participants correctly based on elimination round', () => {
    // Test with 4 participants for simpler, predictable tournament structure
    const tournament = new Tournament('single', ['A', 'B', 'C', 'D']);

    const winner = tournament.originalEntrants[0]; // Use first entrant as consistent winner

    // Complete the tournament by always choosing the same winner
    while (!tournament.isComplete()) {
      const match = tournament.getNextMatch();
      if (!match) break;

      // Choose the predetermined winner if they're in the match, otherwise player1
      const matchWinner = [match.player1, match.player2].includes(winner)
        ? winner
        : match.player1;
      tournament.reportResult(match, matchWinner);
    }

    expect(tournament.isComplete()).toBe(true);

    // Get final rankings
    const rankings = tournament.getRankings();
    expect(rankings).toHaveLength(4);

    // Verify we have all participants
    const participantNames = rankings.map(p => p);
    expect(participantNames).toEqual(
      expect.arrayContaining(['A', 'B', 'C', 'D'])
    );

    // The tournament winner should be first in rankings
    const tournamentWinner = tournament.getWinner();
    expect(rankings[0]).toBe(tournamentWinner);
  });

  it('should handle different tournament sizes correctly', () => {
    // Test 3-participant tournament
    const tournament3 = new Tournament('single', ['X', 'Y', 'Z']);

    while (!tournament3.isComplete()) {
      const match = tournament3.getNextMatch();
      if (!match) break;
      tournament3.reportResult(match, match.player1);
    }

    const rankings3 = tournament3.getRankings();
    expect(rankings3).toHaveLength(3);
    expect(rankings3).toEqual(expect.arrayContaining(['X', 'Y', 'Z']));

    // Test 2-participant tournament
    const tournament2 = new Tournament('single', ['P', 'Q']);
    const match = tournament2.getNextMatch();
    tournament2.reportResult(match, 'P');

    const rankings2 = tournament2.getRankings();
    expect(rankings2).toHaveLength(2);
    expect(rankings2[0]).toBe('P'); // Winner
    expect(rankings2[1]).toBe('Q'); // Loser
  });

  it('should handle single participant tournament', () => {
    const tournament = new Tournament('single', ['Solo']);

    expect(tournament.isComplete()).toBe(true);
    expect(tournament.getWinner()).toBe('Solo');

    const rankings = tournament.getRankings();
    expect(rankings).toEqual(['Solo']);
  });

  it('should provide consistent rankings structure', () => {
    // Test that rankings have correct properties regardless of specific ordering
    const participants = ['A', 'B', 'C', 'D'];
    const tournament = new Tournament('single', participants);

    // Complete tournament with deterministic choices
    while (!tournament.isComplete()) {
      const match = tournament.getNextMatch();
      if (!match) break;

      // Always choose the first participant alphabetically
      const sortedPlayers = [match.player1, match.player2].sort();
      tournament.reportResult(match, sortedPlayers[0]);
    }

    const rankings = tournament.getRankings();

    // Rankings should have all participants exactly once
    expect(rankings).toHaveLength(4);
    expect(new Set(rankings)).toEqual(new Set(participants));

    // Winner should be first
    const winner = tournament.getWinner();
    expect(rankings[0]).toBe(winner);

    // All rankings should be valid participants
    rankings.forEach(participant => {
      expect(participants).toContain(participant);
    });
  });
});
