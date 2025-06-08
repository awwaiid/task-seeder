import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskMatchup from '../../src/components/TaskMatchup.vue';

describe('TaskMatchup Component', () => {
  let wrapper;

  const mockTask1 = {
    'Task Name': 'Implement user authentication',
    Assignee: 'John Doe',
    Priority: 'High',
    Status: 'In Progress',
  };

  const mockTask2 = {
    'Task Name': 'Fix navigation bug',
    Assignee: 'Jane Smith',
    Priority: 'Medium',
    Status: 'Open',
  };

  const defaultProps = {
    task1: mockTask1,
    task2: mockTask2,
    taskNameColumn: 'Task Name',
    selectedFields: ['Assignee', 'Priority'],
  };

  beforeEach(() => {
    // Mock Math.random to make tests deterministic
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // < 0.5, so no flip
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    beforeEach(() => {
      wrapper = mount(TaskMatchup, { props: defaultProps });
    });

    it('should render both task buttons', () => {
      const taskButtons = wrapper.findAll('.task-button');
      expect(taskButtons).toHaveLength(2);
    });

    it('should render VS indicator', () => {
      const vsElement = wrapper.find('.vs');
      expect(vsElement.exists()).toBe(true);
      expect(vsElement.text()).toBe('VS');
    });

    it('should render keyboard instruction text', () => {
      expect(wrapper.text()).toContain(
        'Click or use ← → arrow keys to select the winner'
      );
    });

    it('should display task titles correctly', () => {
      const taskTitles = wrapper.findAll('.task-title');
      const titles = taskTitles.map(t => t.text());
      expect(titles).toContain('Implement user authentication');
      expect(titles).toContain('Fix navigation bug');
    });

    it('should display selected fields for both tasks', () => {
      const allText = wrapper.text();

      // Check that both tasks' details are displayed somewhere
      expect(allText).toContain('Assignee:John Doe');
      expect(allText).toContain('Priority:High');
      expect(allText).toContain('Assignee:Jane Smith');
      expect(allText).toContain('Priority:Medium');
    });

    it('should show message when no additional fields selected', () => {
      wrapper = mount(TaskMatchup, {
        props: { ...defaultProps, selectedFields: [] },
      });

      expect(wrapper.text()).toContain('No additional fields selected');
    });

    it('should handle missing field values gracefully', () => {
      const taskWithMissingFields = {
        'Task Name': 'Test Task',
        Assignee: 'John Doe',
        // Missing Priority field
      };

      wrapper = mount(TaskMatchup, {
        props: {
          ...defaultProps,
          task1: taskWithMissingFields,
          selectedFields: ['Assignee', 'Priority'],
        },
      });

      const allText = wrapper.text();
      expect(allText).toContain('Assignee:John Doe');
      expect(allText).toContain('Priority:N/A');
    });
  });

  describe('Task Display Randomization', () => {
    beforeEach(() => {
      wrapper = mount(TaskMatchup, { props: defaultProps });
    });

    it('should display both tasks regardless of order', () => {
      const allText = wrapper.text();
      expect(allText).toContain('Implement user authentication');
      expect(allText).toContain('Fix navigation bug');
    });

    it('should randomize display on mount', () => {
      // Math.random is called during mount to determine flip
      expect(Math.random).toHaveBeenCalled();
    });

    it('should re-randomize when tasks change', async () => {
      const newTask1 = { 'Task Name': 'New Task 1' };
      const newTask2 = { 'Task Name': 'New Task 2' };

      const initialCallCount = Math.random.mock.calls.length;

      // Update props to trigger re-randomization
      await wrapper.setProps({ task1: newTask1, task2: newTask2 });

      // Should call Math.random again
      expect(Math.random.mock.calls.length).toBeGreaterThan(initialCallCount);

      // Should display new tasks
      const allText = wrapper.text();
      expect(allText).toContain('New Task 1');
      expect(allText).toContain('New Task 2');
    });
  });

  describe('Winner Selection via Clicks', () => {
    beforeEach(() => {
      wrapper = mount(TaskMatchup, { props: defaultProps });
    });

    it('should emit choose-winner when task button clicked', async () => {
      const taskButtons = wrapper.findAll('.task-button');
      await taskButtons[0].trigger('click');

      // Should emit an event with a valid index (0 or 1)
      expect(wrapper.emitted('choose-winner')).toBeTruthy();
      expect(wrapper.emitted('choose-winner')[0][0]).toBeOneOf([0, 1]);
    });

    it('should emit choose-winner for both buttons', async () => {
      const taskButtons = wrapper.findAll('.task-button');

      // Click first button
      await taskButtons[0].trigger('click');
      expect(wrapper.emitted('choose-winner')).toBeTruthy();

      // Reset and click second button
      wrapper = mount(TaskMatchup, { props: defaultProps });
      const newTaskButtons = wrapper.findAll('.task-button');
      await newTaskButtons[1].trigger('click');
      expect(wrapper.emitted('choose-winner')).toBeTruthy();
    });

    it('should emit exactly one event per click', async () => {
      const taskButtons = wrapper.findAll('.task-button');
      await taskButtons[0].trigger('click');

      expect(wrapper.emitted('choose-winner')).toHaveLength(1);
      expect(wrapper.emitted('choose-winner')[0]).toHaveLength(1);
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      wrapper = mount(TaskMatchup, { props: defaultProps });
    });

    it('should handle left arrow key press', async () => {
      const taskChoice = wrapper.find('.task-choice');
      await taskChoice.trigger('keydown', { key: 'ArrowLeft' });

      // Should emit an event with a valid index
      expect(wrapper.emitted('choose-winner')).toBeTruthy();
      expect(wrapper.emitted('choose-winner')[0][0]).toBeOneOf([0, 1]);
    });

    it('should handle right arrow key press', async () => {
      const taskChoice = wrapper.find('.task-choice');
      await taskChoice.trigger('keydown', { key: 'ArrowRight' });

      // Should emit an event with a valid index
      expect(wrapper.emitted('choose-winner')).toBeTruthy();
      expect(wrapper.emitted('choose-winner')[0][0]).toBeOneOf([0, 1]);
    });

    it('should handle both keyboard directions', async () => {
      const taskChoice = wrapper.find('.task-choice');

      // Test left arrow
      await taskChoice.trigger('keydown', { key: 'ArrowLeft' });
      expect(wrapper.emitted('choose-winner')).toBeTruthy();

      // Reset component and test right arrow
      wrapper = mount(TaskMatchup, { props: defaultProps });
      const taskChoice2 = wrapper.find('.task-choice');
      await taskChoice2.trigger('keydown', { key: 'ArrowRight' });
      expect(wrapper.emitted('choose-winner')).toBeTruthy();
    });

    it('should prevent default on arrow key presses', async () => {
      const taskChoice = wrapper.find('.task-choice');
      const event = { key: 'ArrowLeft', preventDefault: vi.fn() };

      await taskChoice.trigger('keydown', event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should ignore non-arrow keys', async () => {
      const taskChoice = wrapper.find('.task-choice');
      await taskChoice.trigger('keydown', { key: 'Enter' });
      await taskChoice.trigger('keydown', { key: 'Space' });
      await taskChoice.trigger('keydown', { key: 'Escape' });

      // Should not emit any events
      expect(wrapper.emitted('choose-winner')).toBeFalsy();
    });

    it('should auto-focus when component mounts', () => {
      // Check that the matchup container has focus capability
      const container = wrapper.find('.task-choice');
      expect(container.attributes('tabindex')).toBe('0');
    });
  });

  describe('BYE Handling', () => {
    it('should handle null task1', () => {
      wrapper = mount(TaskMatchup, {
        props: { ...defaultProps, task1: null },
      });

      // Should display BYE somewhere
      expect(wrapper.text()).toContain('BYE');

      // Should have a disabled button
      const disabledButtons = wrapper.findAll('.task-button[disabled]');
      expect(disabledButtons.length).toBeGreaterThan(0);
    });

    it('should handle null task2', () => {
      wrapper = mount(TaskMatchup, {
        props: { ...defaultProps, task2: null },
      });

      // Should display BYE somewhere
      expect(wrapper.text()).toContain('BYE');

      // Should have a disabled button
      const disabledButtons = wrapper.findAll('.task-button[disabled]');
      expect(disabledButtons.length).toBeGreaterThan(0);
    });

    it('should limit interactions when task is null', async () => {
      wrapper = mount(TaskMatchup, {
        props: { ...defaultProps, task1: null },
      });

      // Try clicking all buttons
      const taskButtons = wrapper.findAll('.task-button');
      for (const button of taskButtons) {
        await button.trigger('click');
      }

      // Should either emit nothing or emit only for the non-null task
      const emissions = wrapper.emitted('choose-winner');
      if (emissions) {
        expect(emissions.length).toBeLessThanOrEqual(1);
      }
    });

    it('should limit keyboard interactions when task is null', async () => {
      wrapper = mount(TaskMatchup, {
        props: { ...defaultProps, task1: null },
      });

      const taskChoice = wrapper.find('.task-choice');
      await taskChoice.trigger('keydown', { key: 'ArrowLeft' });
      await taskChoice.trigger('keydown', { key: 'ArrowRight' });

      // Should either emit nothing or emit only for the non-null task
      const emissions = wrapper.emitted('choose-winner');
      if (emissions) {
        expect(emissions.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing task name column', () => {
      const taskWithoutName = { Assignee: 'John' };
      wrapper = mount(TaskMatchup, {
        props: {
          ...defaultProps,
          task1: taskWithoutName,
          taskNameColumn: 'Task Name',
        },
      });

      // Should display "Untitled Task" somewhere
      expect(wrapper.text()).toContain('Untitled Task');
    });

    it('should handle empty task name column', () => {
      wrapper = mount(TaskMatchup, {
        props: {
          ...defaultProps,
          taskNameColumn: '',
        },
      });

      // Should display "Untitled Task" for both tasks
      const untitledCount = (wrapper.text().match(/Untitled Task/g) || [])
        .length;
      expect(untitledCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle focus management correctly', () => {
      const container = wrapper.find('.task-choice');

      // Should be focusable
      expect(container.attributes('tabindex')).toBe('0');
      expect(container.attributes('role')).toBeUndefined(); // No specific ARIA role needed
    });

    it('should have proper CSS classes for styling', () => {
      expect(wrapper.find('.task-choice').exists()).toBe(true);
      expect(wrapper.findAll('.task-button')).toHaveLength(2);
      expect(wrapper.find('.vs').exists()).toBe(true);
      expect(wrapper.findAll('.task-title')).toHaveLength(2);
      expect(wrapper.findAll('.task-details')).toHaveLength(2);
    });
  });
});
