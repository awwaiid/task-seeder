<template>
  <!-- Setup Phase -->
  <TournamentSetup
    v-if="currentPhase === 'setup'"
    :saved-brackets="savedBrackets"
    :loaded-from-url="loadedFromURL"
    :show-auto-save-notice="showAutoSaveNotice"
    :show-storage-warning="showStorageWarning"
    :storage-usage="storageUsage"
    :tournament-setup-progress="''"
    @load-bracket="loadBracket"
    @delete-bracket="deleteBracket"
    @share-bracket="shareBracket"
    @save-locally="saveCurrentBracketLocally"
    @dismiss-url-notice="dismissURLNotice"
    @dismiss-auto-save="showAutoSaveNotice = false"
    @cleanup-storage="cleanupStorage"
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
          <template v-for="(task, index) in finalRankings" :key="index">
            <tr
              class="clickable-row"
              :class="{ expanded: expandedTaskHistory === task }"
              :title="
                expandedTaskHistory === task
                  ? 'Click to hide match history'
                  : 'Click to view match history'
              "
              @click="toggleTaskHistory(task)"
            >
              <td>
                <strong>{{ index + 1 }}</strong>
              </td>
              <td>
                {{ getTaskTitle(task) }}
                <span
                  class="expand-indicator"
                  :class="{ expanded: expandedTaskHistory === task }"
                >
                  {{ expandedTaskHistory === task ? '▼' : '▶' }}
                </span>
              </td>
              <td v-for="field in selectedSecondaryFields" :key="field">
                {{ task[field] || '-' }}
              </td>
            </tr>
            <!-- Inline History Row -->
            <tr v-if="expandedTaskHistory === task" class="history-row">
              <td
                :colspan="2 + selectedSecondaryFields.length"
                style="padding: 0"
              >
                <div
                  style="
                    background: #f8f9fa;
                    padding: 15px;
                    border-left: 4px solid #3498db;
                  "
                >
                  <div
                    style="
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      margin-bottom: 10px;
                    "
                  >
                    <h4 style="margin: 0; color: #2c3e50">
                      Match History: {{ getTaskTitle(task) }}
                    </h4>
                    <button
                      style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 3px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                      "
                      @click="expandedTaskHistory = null"
                    >
                      ✕
                    </button>
                  </div>

                  <div
                    v-if="
                      matchHistory.has(task) &&
                      matchHistory.get(task)!.length > 0
                    "
                  >
                    <div
                      v-for="(match, matchIndex) in matchHistory.get(task)"
                      :key="matchIndex"
                      style="
                        background: white;
                        margin-bottom: 6px;
                        padding: 10px;
                        border-radius: 4px;
                        border-left: 3px solid #3498db;
                        font-size: 14px;
                      "
                    >
                      <div style="display: flex; align-items: center; gap: 8px">
                        <span
                          style="
                            font-weight: bold;
                            color: #2c3e50;
                            min-width: 60px;
                          "
                          >Round {{ match.round }}:</span
                        >

                        <span
                          v-if="match.result === 'BYE'"
                          style="color: #7f8c8d; font-style: italic"
                        >
                          Received a bye (automatic advancement)
                        </span>

                        <span
                          v-else-if="match.result === 'W'"
                          style="color: #27ae60"
                        >
                          <strong>WON</strong> vs
                          {{ getTaskTitle(match.opponent) }}
                        </span>

                        <span
                          v-else-if="match.result === 'L'"
                          style="color: #e74c3c"
                        >
                          <strong>LOST</strong> to
                          {{ getTaskTitle(match.opponent) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    v-else
                    style="
                      color: #7f8c8d;
                      font-style: italic;
                      text-align: center;
                      padding: 10px;
                    "
                  >
                    No match history available for this task.
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div style="text-align: center; margin-top: 30px">
      <button class="success" style="margin-right: 10px" @click="exportResults">
        📥 Download Rankings CSV
      </button>
      <button
        data-testid="restart-button"
        class="accent"
        @click="restartBracketology"
      >
        Start New Tournament
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import TournamentProgress from './TournamentProgress.vue';
import TournamentSetup from './TournamentSetup.vue';
import TaskMatchup from './TaskMatchup.vue';
import { Tournament } from '../utils/TournamentRunner';
import { BracketStorage, type SavedBracket } from '../utils/BracketStorage';
import { URLBracketSharing } from '../utils/URLBracketSharing';
import { StorageOptimizer, type StorageUsage } from '../utils/StorageOptimizer';
import type {
  TournamentType,
  Participant,
  ActiveMatch,
  MatchHistoryEntry,
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
const matchHistory = ref<Map<Participant, MatchHistoryEntry[]>>(new Map());
const expandedTaskHistory = ref<Participant | null>(null);

// Bracket storage state
const savedBrackets = ref<SavedBracket[]>([]);
const currentBracketId = ref<string | null>(null);
const loadedFromURL = ref<boolean>(false);
const showAutoSaveNotice = ref<boolean>(false);
const storageUsage = ref<StorageUsage | null>(null);

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

// User-visible matches (excludes byes and automatic matches) - used by tests
const _totalUserVisibleMatches = computed(() => {
  if (!tournament.value) return 0;
  // Count matches that actually require user input
  return tournament.value.getTotalMatches();
});

// Export for testing
defineExpose({
  _totalUserVisibleMatches,
});

// Final results
const finalRankings = computed(() => {
  if (!tournament.value || !tournament.value.isComplete()) return [];
  return tournament.value.getRankings();
});

// Storage warning
const showStorageWarning = computed(() => {
  return !!(storageUsage.value && storageUsage.value.usagePercent > 80);
});

function handleStartTournament(setupData: any) {
  // Extract tournament data from setup
  tournamentName.value = setupData.tournamentName || 'Tournament';
  tournamentType.value = setupData.tournamentType || 'single';
  taskNameColumn.value = setupData.taskNameColumn || '';
  selectedSecondaryFields.value = setupData.selectedSecondaryFields || [];
  tasks.value = setupData.csvData || [];

  // Create new tournament
  tournament.value = new Tournament(tournamentType.value, tasks.value, {
    taskNameColumn: taskNameColumn.value,
    seedingMethod: setupData.seedingMethod || 'order',
  });

  // Initialize match history for all tasks
  matchHistory.value = new Map();
  tasks.value.forEach(task => {
    matchHistory.value.set(task, []);
  });

  // Start tournament flow
  if (tournament.value.isComplete()) {
    // Single participant or already complete
    currentPhase.value = 'results';
    buildMatchHistoryFromTournament();
  } else {
    // Get first match and start
    currentMatch.value = tournament.value.getNextMatch();
    currentPhase.value = 'matchups';
  }

  // Auto-save the bracket
  try {
    saveBracket();
  } catch (error) {
    console.warn('Error auto-saving bracket:', error);
  }
}

function chooseWinner(winnerIndex: number) {
  if (!tournament.value || !currentMatch.value) return;

  // Convert index to actual participant
  const winner =
    winnerIndex === 0 ? currentMatch.value.player1 : currentMatch.value.player2;
  const loser =
    winnerIndex === 0 ? currentMatch.value.player2 : currentMatch.value.player1;
  if (!winner || !loser) return;

  // Record match history
  const matchRecord: MatchHistoryEntry = {
    round: currentMatch.value.round,
    opponent: loser,
    result: 'W',
    matchNumber: tournament.value.getCurrentMatchNumber(),
    bracket: currentMatch.value.bracket || 'main',
  };

  const loserRecord: MatchHistoryEntry = {
    round: currentMatch.value.round,
    opponent: winner,
    result: 'L',
    matchNumber: tournament.value.getCurrentMatchNumber(),
    bracket: currentMatch.value.bracket || 'main',
  };

  if (matchHistory.value.has(winner)) {
    matchHistory.value.get(winner)!.push(matchRecord);
  }
  if (matchHistory.value.has(loser)) {
    matchHistory.value.get(loser)!.push(loserRecord);
  }

  // Report the result
  tournament.value.reportResult(currentMatch.value, winner);

  // Check if tournament is complete
  if (tournament.value.isComplete()) {
    currentPhase.value = 'results';
    currentMatch.value = null;
    // Build match history from completed matches
    buildMatchHistoryFromTournament();
    // Save final bracket state
    try {
      saveBracket();
    } catch (error) {
      console.warn('Error saving bracket on completion:', error);
    }
  } else {
    // Get next match
    currentMatch.value = tournament.value.getNextMatch();
    // Auto-save progress periodically
    try {
      saveBracket();
    } catch (error) {
      console.warn('Error auto-saving bracket during play:', error);
    }
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

function toggleTaskHistory(task: Participant) {
  if (expandedTaskHistory.value === task) {
    expandedTaskHistory.value = null;
  } else {
    expandedTaskHistory.value = task;
  }
}

function buildMatchHistoryFromTournament() {
  if (!tournament.value) return;

  // Reset match history
  matchHistory.value = new Map();
  tasks.value.forEach(task => {
    matchHistory.value.set(task, []);
  });

  // Get completed matches from tournament
  const completedMatches = tournament.value.matches;
  console.log(
    'Building match history from completed matches:',
    completedMatches
  );

  completedMatches.forEach((match: any) => {
    if (match.winner && match.loser) {
      // Add win record for winner
      const winRecord: MatchHistoryEntry = {
        round: match.round || 1,
        opponent: match.loser,
        result: 'W',
        matchNumber: match.id || 0,
        bracket: 'main',
      };

      // Add loss record for loser
      const lossRecord: MatchHistoryEntry = {
        round: match.round || 1,
        opponent: match.winner,
        result: 'L',
        matchNumber: match.id || 0,
        bracket: 'main',
      };

      if (matchHistory.value.has(match.winner)) {
        matchHistory.value.get(match.winner)!.push(winRecord);
      }
      if (matchHistory.value.has(match.loser)) {
        matchHistory.value.get(match.loser)!.push(lossRecord);
      }
    }
  });
}

function exportResults() {
  if (finalRankings.value.length === 0) {
    console.log('No rankings to export');
    return;
  }

  // Create CSV content with rankings
  const csvContent = [];
  const headers = ['Rank', 'Task', ...selectedSecondaryFields.value];
  csvContent.push(headers.join(','));

  finalRankings.value.forEach((task, index) => {
    const row = [index + 1, `"${getTaskTitle(task)}"`];
    selectedSecondaryFields.value.forEach(field => {
      const value = task[field] || '';
      row.push(`"${String(value).replace(/"/g, '""')}"`);
    });
    csvContent.push(row.join(','));
  });

  // Create the CSV string
  const csvString = csvContent.join('\n');

  try {
    const filename = `${tournamentName.value.replace(/[^a-z0-9]/gi, '_')}_rankings.csv`;

    // Create and download the file
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Error exporting CSV: ' + (error as Error).message);
  }
}

function restartBracketology() {
  // Save current bracket before restarting if needed
  if (currentBracketId.value && tournament.value) {
    try {
      saveBracket();
    } catch (error) {
      console.warn('Error saving bracket on restart:', error);
    }
  }

  currentPhase.value = 'setup';
  tournament.value = null;
  currentMatch.value = null;
  tasks.value = [];
  tournamentName.value = '';
  selectedSecondaryFields.value = [];
  matchHistory.value = new Map();
  expandedTaskHistory.value = null;
  currentBracketId.value = null;
  loadedFromURL.value = false;
  showAutoSaveNotice.value = false;
}

// Bracket management functions
function loadSavedBrackets() {
  savedBrackets.value = BracketStorage.getBracketsList();
}

function loadBracket(bracketId: string) {
  try {
    const bracketData = BracketStorage.loadBracket(bracketId);
    if (!bracketData) {
      alert('Bracket not found');
      return;
    }

    const state = BracketStorage.deserializeBracket(bracketData);

    // Restore all state
    currentPhase.value = state.status;
    tournamentName.value = state.name || '';
    tournamentType.value = state.tournamentType || 'single';
    taskNameColumn.value = state.taskNameColumn || '';
    selectedSecondaryFields.value = state.selectedSecondaryFields || [];
    tasks.value = state.tasks || [];
    currentMatch.value = state.currentMatch;
    matchHistory.value = state.matchHistory || new Map();
    currentBracketId.value = bracketId;

    // Restore tournament with proper Tournament instance
    if (state.tournament) {
      tournament.value = Tournament.fromStoredState(state.tournament, {
        taskNameColumn: taskNameColumn.value,
      });

      // Update currentMatch to the actual next match
      if (currentPhase.value === 'matchups') {
        currentMatch.value = tournament.value.getNextMatch();
      }
    }

    // If we're in matchups phase, check if tournament is complete
    if (
      currentPhase.value === 'matchups' &&
      tournament.value &&
      tournament.value.isComplete()
    ) {
      currentPhase.value = 'results';
      buildMatchHistoryFromTournament();
      saveBracket(); // Update the bracket status
    }
  } catch (error) {
    console.error('Error loading bracket:', error);
    alert('Error loading bracket: ' + (error as Error).message);
  }
}

function saveBracket() {
  try {
    const bracketData = BracketStorage.serializeBracket({
      tournamentName: tournamentName.value,
      currentPhase: currentPhase.value,
      csvData: tasks.value,
      csvHeaders: selectedSecondaryFields.value,
      taskNameColumn: taskNameColumn.value,
      selectedSecondaryFields: selectedSecondaryFields.value,
      tournamentType: tournamentType.value,
      seedingMethod: 'order',
      tasks: tasks.value,
      tournament:
        tournament.value && typeof tournament.value.exportState === 'function'
          ? tournament.value.exportState()
          : null,
      currentMatch: currentMatch.value,
      matchHistory: matchHistory.value,
    });

    if (currentBracketId.value) {
      try {
        BracketStorage.updateBracket(currentBracketId.value, bracketData);
      } catch (error) {
        console.warn('Bracket not found during update, saving as new:', error);
        currentBracketId.value = BracketStorage.saveBracket(bracketData);
      }
    } else {
      currentBracketId.value = BracketStorage.saveBracket(bracketData);
    }

    loadSavedBrackets();
    updateStorageUsage();
  } catch (error) {
    console.error('Error saving bracket:', error);
  }
}

function deleteBracket(bracketId: string) {
  if (
    confirm(
      'Are you sure you want to delete this bracket? This action cannot be undone.'
    )
  ) {
    BracketStorage.deleteBracket(bracketId);
    loadSavedBrackets();
    updateStorageUsage();

    if (currentBracketId.value === bracketId) {
      currentBracketId.value = null;
    }
  }
}

function shareBracket(bracketId: string) {
  try {
    const bracketData = BracketStorage.loadBracket(bracketId);
    if (!bracketData) {
      alert('Bracket not found');
      return;
    }

    const shareableURL = URLBracketSharing.createShareableURL(
      bracketData as any
    );

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(shareableURL)
        .then(() => {
          alert(
            'Bracket URL copied to clipboard! Share this link to let others view or continue this bracket.'
          );
        })
        .catch(() => {
          showURLDialog(shareableURL);
        });
    } else {
      showURLDialog(shareableURL);
    }
  } catch (error) {
    console.error('Error sharing bracket:', error);
    alert('Error creating shareable URL: ' + (error as Error).message);
  }
}

function showURLDialog(url: string) {
  const message = 'Copy this URL to share the bracket:\\n\\n' + url;
  if (window.prompt) {
    window.prompt(message, url);
  } else {
    alert(message);
  }
}

function saveCurrentBracketLocally() {
  try {
    saveBracket();
    loadedFromURL.value = false;
    alert(
      'Bracket saved locally! You can now access it from the saved brackets list.'
    );
  } catch (error) {
    console.error('Error saving bracket locally:', error);
    alert('Error saving bracket: ' + (error as Error).message);
  }
}

function dismissURLNotice() {
  loadedFromURL.value = false;
}

function updateStorageUsage() {
  storageUsage.value = StorageOptimizer.getStorageUsage();
}

function cleanupStorage() {
  const deletedCount = StorageOptimizer.cleanupOldBrackets(3);
  updateStorageUsage();
  loadSavedBrackets();

  if (deletedCount > 0) {
    alert(
      'Cleaned up ' + deletedCount + ' old brackets to free up storage space.'
    );
  } else {
    alert('No old brackets to clean up.');
  }
}

// Initialize saved brackets on mount
onMounted(() => {
  loadSavedBrackets();
  updateStorageUsage();
});
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

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.clickable-row:hover {
  background-color: #f0f8ff;
}

.clickable-row.expanded {
  background-color: #e3f2fd;
}

.expand-indicator {
  margin-left: 8px;
  font-size: 12px;
  color: #666;
  transition: transform 0.2s ease;
}

.expand-indicator.expanded {
  transform: rotate(0deg);
}

.history-row {
  background-color: #f8f9fa !important;
}

button.success {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

button.success:hover {
  background-color: #218838;
}
</style>
