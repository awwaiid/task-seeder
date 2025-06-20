<template>
    <div>
        <div style="text-align: center; margin-bottom: 15px; color: #7f8c8d; font-size: 12px;">
            Click or use ← → arrow keys to select the winner
        </div>
        <div class="task-choice" 
             tabindex="0" 
             @keydown="handleKeydown"
             ref="matchupContainer">
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
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
    task1: Object,
    task2: Object,
    taskNameColumn: String,
    selectedFields: Array
});

const emit = defineEmits(['choose-winner']);

// Randomly decide which task goes on which side
const shouldFlip = ref(Math.random() < 0.5);
const matchupContainer = ref(null);

const leftTask = computed(() => shouldFlip.value ? props.task2 : props.task1);
const rightTask = computed(() => shouldFlip.value ? props.task1 : props.task2);

function getTaskTitle(task) {
    if (!task) return 'BYE';
    return task[props.taskNameColumn] || 'Untitled Task';
}

function chooseWinner(visualSideIndex) {
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

function handleKeydown(event) {
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

// Re-randomize when tasks change
watch(() => [props.task1, props.task2], () => {
    shouldFlip.value = Math.random() < 0.5;
    // Focus the container so keyboard events work
    if (matchupContainer.value) {
        matchupContainer.value.focus();
    }
});

onMounted(() => {
    // Focus the container when component mounts
    if (matchupContainer.value) {
        matchupContainer.value.focus();
    }
});
</script>