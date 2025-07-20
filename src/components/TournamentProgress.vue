<template>
  <div>
    <h2>
      Match {{ displayMatch }} of {{ currentRoundMatches }}, Round
      {{ displayRound }} of {{ totalRounds }} - {{ tournamentName }}
    </h2>

    <h3
      v-if="tournamentType === 'double'"
      style="margin-top: 5px; color: #666; font-weight: normal"
    >
      {{ bracketDisplayName }}
    </h3>

    <div class="progress">
      <div
        class="progress-bar"
        :style="{ width: progressPercentage + '%' }"
      ></div>
    </div>
    <p>
      Total match {{ globalMatchNumber }} of {{ totalMatches }} ({{
        globalProgressPercentage
      }}%)
    </p>

    <div
      v-if="tournamentType === 'samplesort'"
      class="phase-info"
      style="
        margin: 10px 0;
        padding: 10px;
        background-color: #f0f8ff;
        border-radius: 4px;
        border-left: 4px solid #28a745;
      "
    >
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span style="font-weight: bold; color: #28a745">
          {{ currentBracketType === 'samplesort-sample' ? 'Phase 1: Ranking Sample' : 'Phase 2: Inserting Tasks' }}
        </span>
        <span style="font-size: 14px; color: #666">
          {{ currentBracketType === 'samplesort-sample' ? 'Building anchor points' : 'Finding positions relative to anchors' }}
        </span>
      </div>
    </div>

    <div
      v-if="tournamentType === 'double'"
      class="bracket-info"
      style="
        margin: 10px 0;
        padding: 10px;
        background-color: #f0f8ff;
        border-radius: 4px;
        border-left: 4px solid #4a90e2;
      "
    >
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
        "
      >
        <span style="font-weight: bold; color: #4a90e2">
          {{ bracketDisplayName }}
        </span>
        <span style="color: #666">
          {{
            currentBracketType === 'winners'
              ? '🏆 Winners Side'
              : currentBracketType === 'losers'
                ? '🔄 Losers Side'
                : '⚡ Grand Final'
          }}
        </span>
      </div>
      <div style="font-size: 14px; color: #666; margin-top: 5px">
        {{ bracketDescription }}
      </div>
    </div>

    <!-- Debug info hidden for production
        <div class="debug-info">
            <strong>Debug:</strong>
            Tasks: {{ taskCount }} | 
            Round: {{ currentRound }} | 
            Matchup: {{ currentMatchup }} | 
            <span v-if="tournamentType === 'single'">Total Rounds: {{ totalRounds }} | Round Matches: {{ currentRoundMatches }} |</span>
            <span v-if="tournamentType === 'double'">Bracket: {{ currentBracketType }} |</span>
            Global: {{ globalMatchNumber }}/{{ totalMatches }} ({{ globalProgressPercentage }}%)
        </div>
        -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  currentRound: { type: Number, default: 0 },
  currentMatchup: { type: Number, default: 0 },
  completedMatches: { type: Number, default: 0 },
  totalMatches: { type: Number, default: 0 },
  tournamentName: { type: String, default: '' },
  taskCount: { type: Number, default: 0 },
  tournamentType: { type: String, default: 'single' },
  currentBracketType: { type: String, default: 'main' },
  currentRoundMatch: {
    type: Number,
    default: 0,
  },
  totalRounds: {
    type: Number,
    default: 0,
  },
  currentRoundMatches: {
    type: Number,
    default: 0,
  },
});

const totalRounds = computed(() => {
  // Use the prop value from TournamentRunner, with fallback for tests
  if (props.totalRounds > 0) {
    return props.totalRounds;
  }

  // Fallback calculation for tests that don't provide totalRounds prop
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
  // Use the prop value from TournamentRunner, with fallback for tests
  if (props.currentRoundMatches > 0) {
    return props.currentRoundMatches;
  }

  // Fallback calculation for tests that don't provide currentRoundMatches prop
  if (!props.taskCount) return 0;

  let participants = props.taskCount;
  // Calculate how many participants are left at the current round
  for (let i = 0; i < (props.currentRound || 0); i++) {
    participants = Math.ceil(participants / 2);
  }

  return Math.floor(participants / 2);
});

const globalMatchNumber = computed(() => {
  return (props.completedMatches || 0) + 1;
});

const progressPercentage = computed(() => {
  if ((props.totalMatches || 0) === 0) return 0;
  return ((props.completedMatches || 0) / (props.totalMatches || 1)) * 100;
});

const globalProgressPercentage = computed(() => {
  if ((props.totalMatches || 0) === 0) return 0;
  return Math.round(
    ((props.completedMatches || 0) / (props.totalMatches || 1)) * 100
  );
});

const bracketDisplayName = computed(() => {
  if (props.tournamentType !== 'double') return '';

  // Use the same round number logic as displayRound
  const roundNumber =
    (props.totalRounds || 0) > 0
      ? props.currentRound || 0 // TournamentRunner: 1-indexed
      : (props.currentRound || 0) + 1; // Tests: convert from 0-indexed

  if (props.currentBracketType === 'winners') {
    return `Winners Bracket - Round ${roundNumber}`;
  } else if (props.currentBracketType === 'losers') {
    return `Losers Bracket - Round ${roundNumber}`;
  } else if (props.currentBracketType === 'finals') {
    if (props.currentMatchup === 0) {
      return 'Grand Final';
    } else {
      return 'Grand Final Reset';
    }
  }
  return '';
});

const displayRound = computed(() => {
  // If using TournamentRunner (indicated by totalRounds prop), use 1-indexed values directly
  if ((props.totalRounds || 0) > 0) {
    return props.currentRound || 0;
  }
  // Otherwise, convert from 0-indexed (for tests)
  return (props.currentRound || 0) + 1;
});

const displayMatch = computed(() => {
  // If using TournamentRunner (indicated by totalRounds prop), use 1-indexed values directly
  if (props.totalRounds > 0) {
    return props.currentRoundMatch;
  }
  // Otherwise, convert from 0-indexed (for tests)
  return props.currentRoundMatch + 1;
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
  return props.currentBracketType;
});
</script>
