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
      <div
        v-if="props.preserveOrder"
        style="color: #28a745; font-weight: bold; margin-bottom: 5px"
      >
        📍 Comparing new task vs anchor point
      </div>
      Click or use ← → arrow keys to select the winner
    </div>
    <div
      ref="matchupContainer"
      class="task-choice"
      tabindex="0"
      @keydown="handleKeydown"
    >
      <button
        class="task-button"
        :class="{ 'new-task': props.preserveOrder }"
        :disabled="!leftTask"
        @click="chooseWinner(0)"
      >
        <div class="task-title">{{ getTaskTitle(leftTask) }}</div>
        <div class="task-details">
          <div v-for="field in selectedFields" :key="field" class="task-field">
            <span class="task-field-label">{{ field }}:</span>
            <span class="task-field-value">
              <a
                v-if="leftTask && isUrl(leftTask[field])"
                :href="leftTask[field]"
                target="_blank"
                rel="noopener noreferrer"
                class="task-field-url"
                @click.stop
              >
                {{ leftTask[field] }}
              </a>
              <span v-else>{{
                leftTask ? leftTask[field] || 'N/A' : 'No data'
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
        <button
          v-if="leftTask && !isTaskSkipped(leftTask)"
          title="Mark as done/unrankable"
          class="skip-button"
          @click.stop="skipTask(leftTask)"
        >
          Skip
        </button>
        <div
          v-if="leftTask && isTaskSkipped(leftTask)"
          class="skipped-indicator"
        >
          SKIPPED
        </div>
      </button>
      <div class="vs">VS</div>
      <button
        class="task-button"
        :class="{ 'anchor-task': props.preserveOrder }"
        :disabled="!rightTask"
        @click="chooseWinner(1)"
      >
        <div class="task-title">{{ getTaskTitle(rightTask) }}</div>
        <div class="task-details">
          <div v-for="field in selectedFields" :key="field" class="task-field">
            <span class="task-field-label">{{ field }}:</span>
            <span class="task-field-value">
              <a
                v-if="rightTask && isUrl(rightTask[field])"
                :href="rightTask[field]"
                target="_blank"
                rel="noopener noreferrer"
                class="task-field-url"
                @click.stop
              >
                {{ rightTask[field] }}
              </a>
              <span v-else>{{
                rightTask ? rightTask[field] || 'N/A' : 'No data'
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
        <button
          v-if="rightTask && !isTaskSkipped(rightTask)"
          title="Mark as done/unrankable"
          class="skip-button"
          @click.stop="skipTask(rightTask)"
        >
          Skip
        </button>
        <div
          v-if="rightTask && isTaskSkipped(rightTask)"
          class="skipped-indicator"
        >
          SKIPPED
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

interface Task {
  [key: string]: any;
}

const props = defineProps<{
  task1: Task | null;
  task2: Task | null;
  taskNameColumn: string;
  selectedFields: string[];
  preserveOrder?: boolean; // Don't randomize left/right - for pivot-based comparisons
}>();

const emit = defineEmits<{
  'choose-winner': [winner: number];
  'skip-task': [task: Task];
}>();

// Randomly decide which task goes on which side (unless preserveOrder is true)
const shouldFlip = ref(props.preserveOrder ? false : Math.random() < 0.5);
const matchupContainer = ref<HTMLElement | null>(null);

const leftTask = computed(() => (shouldFlip.value ? props.task2 : props.task1));
const rightTask = computed(() =>
  shouldFlip.value ? props.task1 : props.task2
);

function getTaskTitle(task: Task | null): string {
  if (!task) return 'BYE';
  return task[props.taskNameColumn] || 'Untitled Task';
}

function isUrl(value: any): boolean {
  if (typeof value !== 'string') return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

function isTaskSkipped(task: Task | null): boolean {
  if (!task) return false;
  return task.__skipped === true;
}

function skipTask(task: Task): void {
  emit('skip-task', task);
}

function chooseWinner(visualSideIndex: number): void {
  // visualSideIndex: 0 = left side (as displayed), 1 = right side (as displayed)
  // Map the visual choice back to the original task indices (task1 vs task2)
  let originalTaskIndex;

  if (shouldFlip.value) {
    // Display is flipped: left=task2, right=task1
    // So if user picks left (0), they want task2 (original index 1)
    // If user picks right (1), they want task1 (original index 0)
    originalTaskIndex = visualSideIndex === 0 ? 1 : 0;
  } else {
    // Display is normal: left=task1, right=task2
    // So visual index matches original index
    originalTaskIndex = visualSideIndex;
  }

  emit('choose-winner', originalTaskIndex);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    if (leftTask.value) {
      // Select whatever task is displayed on the left (visual index 0)
      chooseWinner(0);
    }
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    if (rightTask.value) {
      // Select whatever task is displayed on the right (visual index 1)
      chooseWinner(1);
    }
  }
}

// Re-randomize when tasks change (unless preserveOrder is true)
watch(
  () => [props.task1, props.task2],
  () => {
    shouldFlip.value = props.preserveOrder ? false : Math.random() < 0.5;
    // Focus the container so keyboard events work
    if (matchupContainer.value) {
      matchupContainer.value.focus();
    }
  }
);

onMounted(() => {
  // Focus the container when component mounts
  if (matchupContainer.value) {
    matchupContainer.value.focus();
  }
});
</script>

<style scoped>
.task-field-url {
  color: #3498db;
  text-decoration: underline;
}

.task-field-url:hover {
  color: #2980b9;
  text-decoration: underline;
}

.task-field-url:visited {
  color: #8e44ad;
}

.skip-button {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
  transition: background-color 0.2s;
}

.skip-button:hover {
  background: #c0392b;
}

.skipped-indicator {
  background: #95a5a6;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 8px;
  text-align: center;
  font-weight: bold;
}

.new-task {
  border: 2px solid #17a2b8;
  box-shadow: 0 0 8px rgba(23, 162, 184, 0.3);
}

.anchor-task {
  border: 2px solid #28a745;
  box-shadow: 0 0 8px rgba(40, 167, 69, 0.3);
}

.new-task .task-title::before {
  content: '🆕 ';
  color: #17a2b8;
}

.anchor-task .task-title::before {
  content: '⚓ ';
  color: #28a745;
}
</style>
