<template>
    <div>
        <h2 v-if="tournamentType === 'double'">
            {{ bracketDisplayName }} - {{ tournamentName }}
        </h2>
        <h2 v-else>
            Round {{ currentRound + 1 }} of {{ totalRounds }}, Match {{ currentRoundMatch + 1 }} of {{ currentRoundMatches }} - {{ tournamentName }}
        </h2>
        
        <div class="progress">
            <div class="progress-bar" :style="{width: progressPercentage + '%'}"></div>
        </div>
        <p>Total match {{ globalMatchNumber }} of {{ totalMatches }} ({{ globalProgressPercentage }}%)</p>
        
        <div v-if="tournamentType === 'double'" class="bracket-info" style="margin: 10px 0; padding: 10px; background-color: #f0f8ff; border-radius: 4px; border-left: 4px solid #4a90e2;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; color: #4a90e2;">
                    {{ bracketDisplayName }}
                </span>
                <span style="color: #666;">
                    {{ currentBracketType === 'winners' ? '🏆 Winners Side' : currentBracketType === 'losers' ? '🔄 Losers Side' : '⚡ Grand Final' }}
                </span>
            </div>
            <div style="font-size: 14px; color: #666; margin-top: 5px;">
                {{ bracketDescription }}
            </div>
        </div>
        
        <div class="debug-info">
            <strong>Debug:</strong>
            Tasks: {{ taskCount }} | 
            Round: {{ currentRound }} | 
            Matchup: {{ currentMatchup }} | 
            <span v-if="tournamentType === 'single'">Total Rounds: {{ totalRounds }} | Round Matches: {{ currentRoundMatches }} |</span>
            <span v-if="tournamentType === 'double'">Bracket: {{ currentBracketType }} |</span>
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
    tournamentType: { type: String, default: 'single' },
    currentBracketType: { type: String, default: 'main' },
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

const bracketDisplayName = computed(() => {
    if (props.tournamentType !== 'double') return '';
    
    if (props.currentBracketType === 'winners') {
        return `Winners Bracket - Round ${props.currentRound + 1}`;
    } else if (props.currentBracketType === 'losers') {
        return `Losers Bracket - Round ${props.currentRound + 1}`;
    } else if (props.currentBracketType === 'finals') {
        if (props.currentMatchup === 0) {
            return 'Grand Final';
        } else {
            return 'Grand Final Reset';
        }
    }
    return '';
});

const bracketDescription = computed(() => {
    if (props.tournamentType !== 'double') return '';
    
    if (props.currentBracketType === 'winners') {
        return 'Winners advance, losers drop to losers bracket';
    } else if (props.currentBracketType === 'losers') {
        return 'Losers are eliminated from the tournament';
    } else if (props.currentBracketType === 'finals') {
        if (props.currentMatchup === 0) {
            return 'Winners bracket champion vs Losers bracket champion';
        } else {
            return 'Bracket reset - both players have one loss';
        }
    }
    return '';
});
</script>