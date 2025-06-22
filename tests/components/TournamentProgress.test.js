import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TournamentProgress from '../../src/components/TournamentProgress.vue';

describe('TournamentProgress Component', () => {
  let wrapper;

  const defaultProps = {
    currentRound: 0,
    currentMatchup: 0,
    completedMatches: 0,
    totalMatches: 7,
    tournamentName: 'Test Tournament',
    taskCount: 8,
  };

  beforeEach(() => {
    wrapper = mount(TournamentProgress, { props: defaultProps });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Basic Rendering', () => {
    it('should render tournament name in header', () => {
      const header = wrapper.find('h2');
      expect(header.text()).toContain('Test Tournament');
    });

    it('should display round information', () => {
      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 1 of 3'); // 8 tasks = 3 rounds
    });

    it('should display match information', () => {
      const header = wrapper.find('h2');
      expect(header.text()).toContain('Match 1 of 4'); // First round has 4 matches for 8 tasks
    });

    it('should render progress bar', () => {
      const progressBar = wrapper.find('.progress-bar');
      expect(progressBar.exists()).toBe(true);
    });

    it('should render total match information', () => {
      const text = wrapper.text();
      expect(text).toContain('Total match 1 of 7 (0%)');
    });
  });

  describe('Progress Calculations', () => {
    it('should calculate total rounds correctly for power of 2', () => {
      // 8 tasks should require 3 rounds (8->4->2->1)
      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 1 of 3');
    });

    it('should calculate total rounds correctly for non-power of 2', () => {
      wrapper = mount(TournamentProgress, {
        props: { ...defaultProps, taskCount: 5, totalMatches: 4 },
      });

      // 5 tasks should require 3 rounds (5->3->2->1, rounded up)
      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 1 of 3');
    });

    it('should calculate current round matches correctly', () => {
      // First round with 8 tasks should have 4 matches
      const header = wrapper.find('h2');
      expect(header.text()).toContain('Match 1 of 4');
    });

    it('should calculate current round matches for later rounds', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          currentRound: 1,
          currentMatchup: 0,
          completedMatches: 4,
        },
      });

      // Second round with 8 tasks should have 2 matches
      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 2 of 3');
      expect(header.text()).toContain('Match 1 of 2');
    });

    it('should handle final round correctly', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          currentRound: 2,
          currentMatchup: 0,
          completedMatches: 6,
        },
      });

      // Final round should have 1 match
      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 3 of 3');
      expect(header.text()).toContain('Match 1 of 1');
    });
  });

  describe('Progress Bar', () => {
    it('should show 0% progress initially', () => {
      const progressBar = wrapper.find('.progress-bar');
      expect(progressBar.attributes('style')).toContain('width: 0%');
    });

    it('should show correct progress percentage', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          completedMatches: 3,
          totalMatches: 7,
        },
      });

      const progressBar = wrapper.find('.progress-bar');
      const expectedWidth = (3 / 7) * 100; // ~42.86%
      expect(progressBar.attributes('style')).toContain(
        `width: ${expectedWidth}%`
      );
    });

    it('should show 100% when tournament complete', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          completedMatches: 7,
          totalMatches: 7,
        },
      });

      const progressBar = wrapper.find('.progress-bar');
      expect(progressBar.attributes('style')).toContain('width: 100%');
    });

    it('should handle division by zero gracefully', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          totalMatches: 0,
        },
      });

      const progressBar = wrapper.find('.progress-bar');
      expect(progressBar.attributes('style')).toContain('width: 0%');
    });
  });

  describe('Global Match Counter', () => {
    it('should show correct global match number', () => {
      const text = wrapper.text();
      expect(text).toContain('Total match 1 of 7');
    });

    it('should increment global match number with completed matches', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          completedMatches: 3,
        },
      });

      const text = wrapper.text();
      expect(text).toContain('Total match 4 of 7'); // 3 completed + 1 current
    });

    it('should show correct global percentage', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          completedMatches: 3,
          totalMatches: 7,
        },
      });

      const text = wrapper.text();
      const expectedPercentage = Math.round((3 / 7) * 100); // 43%
      expect(text).toContain(`(${expectedPercentage}%)`);
    });
  });

  describe('Different Tournament Sizes', () => {
    it('should handle 2-task tournament', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          taskCount: 2,
          totalMatches: 1,
        },
      });

      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 1 of 1');
      expect(header.text()).toContain('Match 1 of 1');
    });

    it('should handle 4-task tournament', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          taskCount: 4,
          totalMatches: 3,
        },
      });

      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 1 of 2'); // 4->2->1 = 2 rounds
      expect(header.text()).toContain('Match 1 of 2'); // First round has 2 matches
    });

    it('should handle 16-task tournament', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          taskCount: 16,
          totalMatches: 15,
        },
      });

      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 1 of 4'); // 16->8->4->2->1 = 4 rounds
      expect(header.text()).toContain('Match 1 of 8'); // First round has 8 matches
    });

    it('should handle odd number of tasks', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          taskCount: 7,
          totalMatches: 6,
        },
      });

      // 7 tasks: component calculates floor(7/2) = 3 matches in first round
      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 1 of 3');
      expect(header.text()).toContain('Match 1 of 3'); // floor(7/2) = 3 first round matches
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero task count', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          taskCount: 0,
          totalMatches: 0,
        },
      });

      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 1 of 0');
      expect(header.text()).toContain('Match 1 of 0');
    });

    it('should handle missing tournament name', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          tournamentName: '',
        },
      });

      const header = wrapper.find('h2');
      expect(header.exists()).toBe(true);
      // Should still render header even with empty name
    });

    it('should handle very large tournaments', () => {
      wrapper = mount(TournamentProgress, {
        props: {
          ...defaultProps,
          taskCount: 64,
          totalMatches: 63,
          currentRound: 0,
          currentMatchup: 15,
          completedMatches: 15,
          currentRoundMatch: 15, // 16th match in the round (0-indexed)
        },
      });

      const header = wrapper.find('h2');
      expect(header.text()).toContain('Round 1 of 6'); // 64->32->16->8->4->2->1 = 6 rounds
      expect(header.text()).toContain('Match 16 of 32'); // First round has 32 matches

      const text = wrapper.text();
      expect(text).toContain('Total match 16 of 63');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      expect(wrapper.find('h2').exists()).toBe(true);
      expect(wrapper.find('.progress').exists()).toBe(true);
      expect(wrapper.find('p').exists()).toBe(true);
    });

    it('should have meaningful text content', () => {
      const text = wrapper.text();
      expect(text).toContain('Round');
      expect(text).toContain('Match');
      expect(text).toContain('Total match');
      expect(text).toContain('%');
    });
  });
});
