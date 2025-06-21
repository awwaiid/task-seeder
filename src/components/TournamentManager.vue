<template>
  <!-- Setup Phase -->
  <TournamentSetup
    v-if="currentPhase === 'setup'"
    @start-tournament="handleStartTournament"
  />

  <!-- Matchup Phase -->
  <div v-if="currentPhase === 'matchups'" class="container">
    <TournamentProgress
      data-testid="tournament-progress"
      :current-round="currentRound"
      :current-matchup="currentMatchInRound"
      :completed-matches="currentMatchNumber - 1"
      :total-matches="totalMatches"
      :tournament-name="tournamentName"
      :task-count="tasks.length"
      :current-round-match="currentMatchInRound"
      :tournament-type="tournamentType"
      :current-bracket-type="currentBracketType"
      :total-rounds="totalRounds"
      :current-round-matches="currentRoundMatches"
    />

    <TaskMatchup
      data-testid="task-matchup"
      :task1="currentPair[0] || null"
      :task2="currentPair[1] || null"
      :task-name-column="taskNameColumn"
      :selected-fields="selectedSecondaryFields"
      @choose-winner="chooseWinner"
    />

    <div style="text-align: center; margin-top: 20px">
      <button
        data-testid="restart-button"
        class="accent"
        @click="restartBracketology"
      >
        Home
      </button>
    </div>
  </div>

  <!-- Results Phase -->
  <div v-if="currentPhase === 'results'" class="container">
    <h2>Your Task Rankings - {{ tournamentName }}</h2>
    <p>
      Based on your choices, here are your tasks ranked from highest to lowest
      priority:
    </p>

    <div class="results-table-container">
      <table class="results-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Task</th>
            <th v-for="field in selectedSecondaryFields" :key="field">
              {{ field }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(task, index) in finalRankings" :key="index">
            <td>
              <strong>{{ index + 1 }}</strong>
            </td>
            <td>
              {{ getTaskTitle(task) }}
            </td>
            <td v-for="field in selectedSecondaryFields" :key="field">
              {{ task[field] || '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="text-align: center; margin-top: 20px">
      <button class="accent" @click="restartBracketology">
        Start New Tournament
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TournamentProgress from './TournamentProgress.vue';
import TournamentSetup from './TournamentSetup.vue';
import TaskMatchup from './TaskMatchup.vue';
import { Tournament } from '../utils/TournamentRunner';
import type {
  TournamentType,
  Participant,
  ActiveMatch,
} from '../types/tournament';

// Phase management
type CurrentPhase = 'setup' | 'matchups' | 'results';
const currentPhase = ref<CurrentPhase>('setup');

// Tournament state
const tournament = ref<Tournament | null>(null);
const tournamentName = ref<string>('');
const tournamentType = ref<TournamentType>('single');
const taskNameColumn = ref<string>('');
const selectedSecondaryFields = ref<string[]>([]);
const tasks = ref<Participant[]>([]);

// Current match state
const currentMatch = ref<ActiveMatch | null>(null);
const currentPair = computed(() => {
  if (!currentMatch.value) return [null, null];
  return [currentMatch.value.player1, currentMatch.value.player2];
});

// Tournament progress
const currentRound = computed(() => currentMatch.value?.round || 1);
const currentMatchInRound = computed(
  () => currentMatch.value?.matchInRound || 1
);
const currentMatchNumber = computed(
  () => tournament.value?.getCurrentMatchNumber() || 1
);
const totalMatches = computed(() => tournament.value?.getTotalMatches() || 0);
const totalRounds = computed(() => tournament.value?.getTotalRounds() || 1);
const currentRoundMatches = computed(
  () => tournament.value?.getMatchesInRound(currentRound.value) || 1
);
const currentBracketType = computed(() => 'main'); // Simplified for now

// User-visible matches (excludes byes and automatic matches)
const totalUserVisibleMatches = computed(() => {
  if (!tournament.value) return 0;
  // Count matches that actually require user input
  return tournament.value.getTotalMatches();
});

// Final results
const finalRankings = computed(() => {
  if (!tournament.value || !tournament.value.isComplete()) return [];
  return tournament.value.getRankings();
});

function handleStartTournament(setupData: any) {
  // Extract tournament data from setup
  tournamentName.value = setupData.name || 'Tournament';
  tournamentType.value = setupData.type || 'single';
  taskNameColumn.value = setupData.taskNameColumn || '';
  selectedSecondaryFields.value = setupData.selectedSecondaryFields || [];
  tasks.value = setupData.tasks || [];

  // Create new tournament
  tournament.value = new Tournament(tournamentType.value, tasks.value, {
    taskNameColumn: taskNameColumn.value,
  });

  // Start tournament flow
  if (tournament.value.isComplete()) {
    // Single participant or already complete
    currentPhase.value = 'results';
  } else {
    // Get first match and start
    currentMatch.value = tournament.value.getNextMatch();
    currentPhase.value = 'matchups';
  }
}

function chooseWinner(winnerIndex: number) {
  if (!tournament.value || !currentMatch.value) return;

  // Convert index to actual participant
  const winner =
    winnerIndex === 0 ? currentMatch.value.player1 : currentMatch.value.player2;
  if (!winner) return;

  // Report the result
  tournament.value.reportResult(currentMatch.value, winner);

  // Check if tournament is complete
  if (tournament.value.isComplete()) {
    currentPhase.value = 'results';
    currentMatch.value = null;
  } else {
    // Get next match
    currentMatch.value = tournament.value.getNextMatch();
  }
}

function getTaskTitle(task: Participant): string {
  if (typeof task === 'string') return task;

  if (typeof task === 'object' && task) {
    if (taskNameColumn.value && task[taskNameColumn.value]) {
      return task[taskNameColumn.value].toString();
    }

    const nameFields = ['name', 'title', 'task', 'summary'];
    for (const field of nameFields) {
      if (task[field]) {
        return task[field].toString();
      }
    }
  }

  return 'Untitled Task';
}

function restartBracketology() {
  currentPhase.value = 'setup';
  tournament.value = null;
  currentMatch.value = null;
  tasks.value = [];
  tournamentName.value = '';
  selectedSecondaryFields.value = [];
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.results-table-container {
  overflow-x: auto;
  margin: 20px 0;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.results-table th,
.results-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.results-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.results-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

button.accent {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

button.accent:hover {
  background-color: #0056b3;
}
</style>
