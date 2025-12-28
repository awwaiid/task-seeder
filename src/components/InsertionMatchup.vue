<template>
  <div>
    <div
      style="
        text-align: center;
        margin-bottom: 15px;
        color: #7f8c8d;
        font-size: 12px;
      "
    >
      <div style="color: #2c3e50; font-weight: bold; margin-bottom: 5px">
        🎯 Interactive Insertion Ranking
      </div>
      <div
        v-if="props.remainingTasks && props.totalTasks"
        style="margin-bottom: 5px; color: #666"
      >
        {{ props.totalTasks - props.remainingTasks + 1 }} of
        {{ props.totalTasks }} tasks ({{ props.remainingTasks - 1 }} remaining)
      </div>
      Choose where this task should be positioned
    </div>

    <div
      ref="matchupContainer"
      class="insertion-choice"
      tabindex="0"
      @keydown="handleKeydown"
    >
      <!-- Current Task to Rank (left side on wide screens) -->
      <div class="task-to-rank">
        <div class="task-to-rank-header">Task to Rank</div>
        <div class="task-card current-task" :class="currentTaskColorClass">
          <div class="task-title">{{ getTaskTitle(currentTask) }}</div>
          <div class="task-details">
            <div
              v-for="field in selectedFields"
              :key="field"
              class="task-field"
            >
              <span class="task-field-label">{{ field }}:</span>
              <span class="task-field-value">
                <a
                  v-if="currentTask && isUrl(currentTask[field])"
                  :href="currentTask[field]"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="task-field-url"
                  @click.stop
                >
                  {{ currentTask[field] }}
                </a>
                <span v-else>{{
                  currentTask ? currentTask[field] || 'N/A' : 'No data'
                }}</span>
              </span>
            </div>
            <div
              v-if="selectedFields.length === 0"
              style="color: #bdc3c7; font-style: italic"
            >
              No additional fields selected
            </div>
          </div>
        </div>

        <!-- Skip Button -->
        <button
          class="skip-button"
          :disabled="!currentTask"
          title="Place this task at the lowest priority"
          @click="skipTask"
        >
          Skip (Lowest Priority)
        </button>
      </div>

      <!-- Position Selection Area (right side on wide screens) -->
      <div class="position-selection">
        <div class="position-selection-header">Choose Position</div>

        <!-- Above Button -->
        <button
          class="position-button above-button"
          :disabled="!currentTask"
          @click="choosePosition('above')"
        >
          <span class="button-label">Above</span>
          <span class="button-description">
            - {{ anchor2 ? 'Higher priority than both' : 'Higher priority' }}
          </span>
        </button>

        <!-- Anchor Task 1 -->
        <div v-if="anchor1" class="anchor-task">
          <div class="task-card anchor">
            <div class="task-title">{{ getTaskTitle(anchor1) }}</div>
            <div class="anchor-label">Task A</div>
          </div>
        </div>

        <!-- Between Button -->
        <button
          v-if="anchor1 && anchor2"
          class="position-button between-button"
          :disabled="!currentTask"
          @click="choosePosition('between')"
        >
          <span class="button-label">Between</span>
          <span class="button-description">- Priority between A and B</span>
        </button>

        <!-- Anchor Task 2 -->
        <div v-if="anchor2" class="anchor-task">
          <div class="task-card anchor">
            <div class="task-title">{{ getTaskTitle(anchor2) }}</div>
            <div class="anchor-label">Task B</div>
          </div>
        </div>

        <!-- Below Button -->
        <button
          class="position-button below-button"
          :disabled="!currentTask"
          @click="choosePosition('below')"
        >
          <span class="button-label">Below</span>
          <span class="button-description">
            - {{ anchor2 ? 'Lower priority than both' : 'Lower priority' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';

interface Task {
  [key: string]: any;
}

const props = defineProps<{
  currentTask: Task | null;
  anchor1?: Task | null;
  anchor2?: Task | null;
  taskNameColumn: string;
  selectedFields: string[];
  remainingTasks?: number;
  totalTasks?: number;
  rangeStart?: number;
  rangeEnd?: number;
  currentTaskNumber?: number;
}>();

const emit = defineEmits<{
  'choose-position': [choice: 'above' | 'between' | 'below'];
  'skip-task': [task: Task];
}>();

const matchupContainer = ref<HTMLElement | null>(null);

const currentTaskColorClass = computed(() => {
  if (!props.currentTaskNumber) return '';
  // Alternate between light green (even) and light blue (odd)
  return props.currentTaskNumber % 2 === 0
    ? 'current-task-green'
    : 'current-task-blue';
});

function getTaskTitle(task: Task | null): string {
  if (!task) return 'No Task';
  return task[props.taskNameColumn] || 'Untitled Task';
}

function isUrl(value: any): boolean {
  if (typeof value !== 'string') return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

function choosePosition(choice: 'above' | 'between' | 'below'): void {
  emit('choose-position', choice);
}

function skipTask(): void {
  if (props.currentTask) {
    emit('skip-task', props.currentTask);
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowUp' || event.key === '1') {
    event.preventDefault();
    if (props.currentTask) {
      choosePosition('above');
    }
  } else if (event.key === 'ArrowDown' || event.key === '3') {
    event.preventDefault();
    if (props.currentTask) {
      choosePosition('below');
    }
  } else if (
    (event.key === 'ArrowRight' || event.key === '2') &&
    props.anchor1 &&
    props.anchor2
  ) {
    event.preventDefault();
    if (props.currentTask) {
      choosePosition('between');
    }
  } else if (event.key === 's' || event.key === 'S') {
    event.preventDefault();
    if (props.currentTask) {
      skipTask();
    }
  }
}

// Focus when tasks change
watch(
  () => props.currentTask,
  () => {
    if (matchupContainer.value) {
      matchupContainer.value.focus();
    }
  }
);

onMounted(() => {
  if (matchupContainer.value) {
    matchupContainer.value.focus();
  }
});
</script>

<style scoped>
.insertion-choice {
  display: flex;
  gap: 30px;
  align-items: center;
  min-height: 400px;
  padding: 20px;
  outline: none;
}

.task-to-rank {
  flex: 1;
  max-width: 400px;
}

.task-to-rank-header {
  font-size: 14px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-align: center;
}

.position-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  max-width: 400px;
}

.position-selection-header {
  font-size: 14px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-align: center;
}

.task-card {
  background: white;
  border: 2px solid #bdc3c7;
  border-radius: 8px;
  padding: 20px;
  margin: 10px auto;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.task-card.current-task {
  border-color: #3498db;
  background: #f8f9fa;
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.2);
}

.task-card.current-task-blue {
  background: #e8f4fd;
  border-color: #3498db;
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.2);
}

.task-card.current-task-green {
  background: #e8f6f0;
  border-color: #27ae60;
  box-shadow: 0 4px 8px rgba(39, 174, 96, 0.2);
}

.task-card.anchor {
  border-style: dashed;
  border-color: #95a5a6;
  background: #ecf0f1;
  max-width: 300px;
  padding: 15px;
  position: relative;
}

.task-title {
  font-size: 16px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
  word-wrap: break-word;
}

.current-task .task-title {
  font-size: 18px;
  color: #2980b9;
}

.task-details {
  text-align: left;
}

.task-field {
  margin-bottom: 8px;
  font-size: 14px;
}

.task-field-label {
  font-weight: 500;
  color: #7f8c8d;
  margin-right: 8px;
}

.task-field-value {
  color: #2c3e50;
}

.task-field-url {
  color: #3498db;
  text-decoration: underline;
}

.task-field-url:hover {
  color: #2980b9;
}

.task-field-url:visited {
  color: #8e44ad;
}

.position-button {
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.position-button:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.position-button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.above-button {
  background: #27ae60;
}

.above-button:hover:not(:disabled) {
  background: #229954;
}

.between-button {
  background: #f39c12;
}

.between-button:hover:not(:disabled) {
  background: #e67e22;
}

.below-button {
  background: #e74c3c;
}

.below-button:hover:not(:disabled) {
  background: #c0392b;
}

.button-label {
  font-size: 16px;
  font-weight: bold;
}

.button-description {
  font-size: 13px;
  opacity: 0.9;
  font-weight: normal;
}

.anchor-task {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 100%;
}

.anchor-label {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #95a5a6;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.skip-button {
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 15px;
  width: 100%;
  max-width: 200px;
}

.skip-button:hover:not(:disabled) {
  background: #7f8c8d;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(149, 165, 166, 0.3);
}

.skip-button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive design - stack vertically on smaller screens */
@media (max-width: 768px) {
  .insertion-choice {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .task-to-rank,
  .position-selection {
    max-width: 100%;
  }

  .task-card {
    padding: 15px;
  }

  .position-button {
    min-width: 150px;
    padding: 10px 16px;
    font-size: 14px;
    flex-direction: column;
    gap: 4px;
  }

  .button-description {
    font-size: 11px;
  }

  .insertion-choice {
    padding: 15px;
  }
}
</style>
