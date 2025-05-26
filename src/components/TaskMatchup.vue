<template>
    <div class="task-choice">
        <button class="task-button" @click="chooseWinner(0)" :disabled="!leftTask">
            <div class="task-title">{{ getTaskTitle(leftTask) }}</div>
            <div class="task-details">
                <div v-for="field in selectedFields" :key="field" class="task-field">
                    <span class="task-field-label">{{ field }}:</span>
                    <span class="task-field-value">{{ leftTask ? (leftTask[field] || 'N/A') : 'No data' }}</span>
                </div>
                <div v-if="selectedFields.length === 0" style="color: #bdc3c7; font-style: italic;">
                    No additional fields selected
                </div>
            </div>
        </button>
        <div class="vs">VS</div>
        <button class="task-button" @click="chooseWinner(1)" :disabled="!rightTask">
            <div class="task-title">{{ getTaskTitle(rightTask) }}</div>
            <div class="task-details">
                <div v-for="field in selectedFields" :key="field" class="task-field">
                    <span class="task-field-label">{{ field }}:</span>
                    <span class="task-field-value">{{ rightTask ? (rightTask[field] || 'N/A') : 'No data' }}</span>
                </div>
                <div v-if="selectedFields.length === 0" style="color: #bdc3c7; font-style: italic;">
                    No additional fields selected
                </div>
            </div>
        </button>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    task1: Object,
    task2: Object,
    taskNameColumn: String,
    selectedFields: Array
});

const emit = defineEmits(['choose-winner']);

// Randomly decide which task goes on which side
const shouldFlip = ref(Math.random() < 0.5);

const leftTask = computed(() => shouldFlip.value ? props.task2 : props.task1);
const rightTask = computed(() => shouldFlip.value ? props.task1 : props.task2);

function getTaskTitle(task) {
    if (!task) return 'BYE';
    return task[props.taskNameColumn] || 'Untitled Task';
}

function chooseWinner(sideIndex) {
    // Map the visual choice back to the original task indices
    let originalIndex;
    if (shouldFlip.value) {
        // If flipped: left=task2(index1), right=task1(index0)
        originalIndex = sideIndex === 0 ? 1 : 0;
    } else {
        // If not flipped: left=task1(index0), right=task2(index1) 
        originalIndex = sideIndex;
    }
    emit('choose-winner', originalIndex);
}

// Re-randomize when tasks change
watch(() => [props.task1, props.task2], () => {
    shouldFlip.value = Math.random() < 0.5;
});
</script>