<template>
    <div>
        <h2>Round {{ currentRound + 1 }} of {{ totalRounds }}, Match {{ currentRoundMatch + 1 }} of {{ currentRoundMatches }} - {{ tournamentName }}</h2>
        <div class="progress">
            <div class="progress-bar" :style="{width: progressPercentage + '%'}"></div>
        </div>
        <p>Total match {{ globalMatchNumber }} of {{ totalMatches }} ({{ globalProgressPercentage }}%)</p>
        
        <div class="debug-info">
            <strong>Debug:</strong>
            Tasks: {{ taskCount }} | 
            Round: {{ currentRound }} | 
            Matchup: {{ currentMatchup }} | 
            Total Rounds: {{ totalRounds }} | 
            Round Matches: {{ currentRoundMatches }} | 
            Global: {{ globalMatchNumber }}/{{ totalMatches }} ({{ globalProgressPercentage }}%)
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    currentRound: Number,
    currentMatchup: Number,
    completedMatches: Number,
    totalMatches: Number,
    tournamentName: String,
    taskCount: Number,
    currentRoundMatch: {
        type: Number,
        default: 0
    }
});

const totalRounds = computed(() => {
    if (!props.taskCount) return 0;
    let participantCount = props.taskCount;
    let rounds = 0;
    while (participantCount > 1) {
        participantCount = Math.ceil(participantCount / 2);
        rounds++;
    }
    return rounds;
});

const currentRoundMatches = computed(() => {
    // Calculate user-visible matches for current round
    if (!props.taskCount) return 0;
    
    let participants = props.taskCount;
    // Calculate how many participants are left at the current round
    for (let i = 0; i < props.currentRound; i++) {
        participants = Math.ceil(participants / 2);
    }
    
    // Number of matches = floor(participants / 2)
    // The odd participant (if any) gets a bye (not shown to user)
    return Math.floor(participants / 2);
});

const globalMatchNumber = computed(() => {
    return props.completedMatches + 1;
});

const progressPercentage = computed(() => {
    if (props.totalMatches === 0) return 0;
    return (props.completedMatches / props.totalMatches) * 100;
});

const globalProgressPercentage = computed(() => {
    if (props.totalMatches === 0) return 0;
    return Math.round((props.completedMatches / props.totalMatches) * 100);
});
</script>