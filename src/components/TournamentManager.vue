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
                      getUuidByTask(task) &&
                      matchHistory.has(getUuidByTask(task)!) &&
                      matchHistory.get(getUuidByTask(task)!)!.length > 0
                    "
                  >
                    <div
                      v-for="(match, matchIndex) in matchHistory.get(getUuidByTask(task)!)"
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
  ParticipantUUID,
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
const matchHistory = ref<Map<ParticipantUUID, MatchHistoryEntry[]>>(new Map());  // Now uses UUID as key
const expandedTaskHistory = ref<Participant | null>(null);

// UUID mapping for participants
const taskUuidMap = ref<Map<ParticipantUUID, Participant>>(new Map());  // UUID -> original task
const taskToUuidMap = ref<Map<Participant, ParticipantUUID>>(new Map());  // original task -> UUID
let nextTaskId = 0;

// Bracket storage state
const savedBrackets = ref<SavedBracket[]>([]);
const currentBracketId = ref<string | null>(null);
const loadedFromURL = ref<boolean>(false);
const showAutoSaveNotice = ref<boolean>(false);
const storageUsage = ref<StorageUsage | null>(null);

// Current match state
const currentMatch = ref<ActiveMatch | null>(null);
const currentPair = computed(() => {
  if (!currentMatch.value || !currentMatch.value.player1 || !currentMatch.value.player2) {
    return [null, null];
  }
  // Convert UUIDs to participant objects for display
  const player1 = getTaskByUuid(currentMatch.value.player1);
  const player2 = getTaskByUuid(currentMatch.value.player2);
  return [player1, player2];
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
  const rankingUuids = tournament.value.getRankings();  // Returns UUIDs
  console.log("rankingUuids", rankingUuids);
  // Convert UUIDs back to participant objects for display
  return rankingUuids.map(uuid => getTaskByUuid(uuid)).filter(Boolean);
});

// Storage warning
const showStorageWarning = computed(() => {
  return !!(storageUsage.value && storageUsage.value.usagePercent > 80);
});

// UUID management functions
function generateTaskUuid(): ParticipantUUID {
  return `task_${nextTaskId++}` as ParticipantUUID;
}

function createTaskUuidMapping(taskList: Participant[], existingUuids?: ParticipantUUID[]) {
  // Clear existing mappings
  taskUuidMap.value.clear();
  taskToUuidMap.value.clear();
  nextTaskId = 0;
  
  // Create UUID for each task
  taskList.forEach((task, index) => {
    let uuid: ParticipantUUID;
    
    if (existingUuids && existingUuids[index]) {
      // Use existing UUID from saved state
      uuid = existingUuids[index];
      // Update nextTaskId to avoid conflicts
      const idMatch = uuid.match(/^task_(\d+)$/);
      if (idMatch && idMatch[1]) {
        const idNumber = parseInt(idMatch[1], 10);
        nextTaskId = Math.max(nextTaskId, idNumber + 1);
      }
    } else {
      // Generate new UUID
      uuid = generateTaskUuid();
    }
    
    taskUuidMap.value.set(uuid, task);
    taskToUuidMap.value.set(task, uuid);
  });
}

function getTaskByUuid(uuid: ParticipantUUID): Participant {
  const task = taskUuidMap.value.get(uuid);
  if (!task) {
    throw new Error(`No task found for UUID: ${uuid}`);
  }
  return task;
}

function getUuidByTask(task: Participant): ParticipantUUID | null {
  return taskToUuidMap.value.get(task) || null;
}

function handleStartTournament(setupData: any) {
  // Extract tournament data from setup
  tournamentName.value = setupData.tournamentName || 'Tournament';
  tournamentType.value = setupData.tournamentType || 'single';
  taskNameColumn.value = setupData.taskNameColumn || '';
  selectedSecondaryFields.value = setupData.selectedSecondaryFields || [];
  tasks.value = setupData.csvData || [];

  // Create UUID mapping for all tasks
  createTaskUuidMapping(tasks.value);

  // Get UUIDs for tournament creation
  const taskUuids = tasks.value.map(task => getUuidByTask(task)!);

  // Create new tournament with UUIDs instead of raw tasks
  tournament.value = new Tournament(tournamentType.value, taskUuids, {
    taskNameColumn: taskNameColumn.value,
    seedingMethod: setupData.seedingMethod || 'order',
  });

  // Initialize match history using UUIDs as keys
  matchHistory.value = new Map();
  taskUuids.forEach(uuid => {
    matchHistory.value.set(uuid, []);
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

  // Convert index to actual UUID (player1 and player2 are now UUIDs)
  const winnerUuid =
    winnerIndex === 0 ? currentMatch.value.player1 : currentMatch.value.player2;
  const loserUuid =
    winnerIndex === 0 ? currentMatch.value.player2 : currentMatch.value.player1;
  if (!winnerUuid || !loserUuid) return;

  // Get actual participant objects for display
  const winnerTask = getTaskByUuid(winnerUuid);
  const loserTask = getTaskByUuid(loserUuid);
  if (!winnerTask || !loserTask) return;

  // Record match history using UUIDs as keys and storing opponent's original task for display
  const matchRecord: MatchHistoryEntry = {
    round: currentMatch.value.round,
    opponent: loserTask,  // Store original task for display
    result: 'W',
    matchNumber: tournament.value.getCurrentMatchNumber(),
    bracket: currentMatch.value.bracket || 'main',
  };

  const loserRecord: MatchHistoryEntry = {
    round: currentMatch.value.round,
    opponent: winnerTask,  // Store original task for display
    result: 'L',
    matchNumber: tournament.value.getCurrentMatchNumber(),
    bracket: currentMatch.value.bracket || 'main',
  };

  if (matchHistory.value.has(winnerUuid)) {
    matchHistory.value.get(winnerUuid)!.push(matchRecord);
  }
  if (matchHistory.value.has(loserUuid)) {
    matchHistory.value.get(loserUuid)!.push(loserRecord);
  }

  // Report the result (pass winner UUID)
  tournament.value.reportResult(currentMatch.value, winnerUuid);

  // Check if tournament is complete
  if (tournament.value.isComplete()) {
    currentPhase.value = 'results';
    currentMatch.value = null;
    // Don't rebuild match history - we already have the correct data from active play
    // buildMatchHistoryFromTournament() should only be used when loading saved tournaments
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

  // Reset match history using UUIDs as keys
  matchHistory.value = new Map();
  const rankingUuids = tournament.value.getRankings();  // Now returns UUIDs
  rankingUuids.forEach(uuid => {
    matchHistory.value.set(uuid, []);
  });

  // Use the Tournament class's matches getter which already filters and processed matches correctly
  const completedMatches = tournament.value.matches;
  
  completedMatches.forEach((match: any, index: number) => {
    const winnerUuid = match.winner;  // Now UUIDs
    const loserUuid = match.loser;    // Now UUIDs
    
    if (!winnerUuid || !loserUuid) return;

    // Get original task objects for display
    const winnerTask = getTaskByUuid(winnerUuid);
    const loserTask = getTaskByUuid(loserUuid);
    
    if (!winnerTask || !loserTask) return;

    // Add win record for winner
    const winRecord: MatchHistoryEntry = {
      round: match.round || 1,
      opponent: loserTask,  // Store original task for display
      result: 'W',
      matchNumber: index + 1,
      bracket: 'main',
    };

    // Add loss record for loser
    const lossRecord: MatchHistoryEntry = {
      round: match.round || 1,
      opponent: winnerTask,  // Store original task for display
      result: 'L',
      matchNumber: index + 1,
      bracket: 'main',
    };

    if (matchHistory.value.has(winnerUuid)) {
      matchHistory.value.get(winnerUuid)!.push(winRecord);
    }
    if (matchHistory.value.has(loserUuid)) {
      matchHistory.value.get(loserUuid)!.push(lossRecord);
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
  
  // Clear UUID mappings
  taskUuidMap.value.clear();
  taskToUuidMap.value.clear();
  nextTaskId = 0;
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
    
    // Rebuild UUID mappings using saved UUIDs (if available)
    createTaskUuidMapping(tasks.value, state.csvDataUUID);
    
    // Restore matchHistory - ensure it's a proper Map with UUID keys
    if (state.matchHistory && state.matchHistory instanceof Map) {
      matchHistory.value = state.matchHistory;
    } else if (state.matchHistory) {
      // Convert object back to Map if it was serialized
      matchHistory.value = new Map(Object.entries(state.matchHistory));
    } else {
      matchHistory.value = new Map();
    }
    currentBracketId.value = bracketId;

    // Tournament instance already restored by deserializeBracket
    if (state.tournament) {
      tournament.value = state.tournament;

      // Update currentMatch to the actual next match
      if (currentPhase.value === 'matchups' && tournament.value) {
        currentMatch.value = tournament.value.getNextMatch();
      }
      
      // Always rebuild match history for completed tournaments
      if (currentPhase.value === 'results' && tournament.value && tournament.value.isComplete()) {
        buildMatchHistoryFromTournament();
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
    // Extract UUID array from the mapping
    const csvDataUUID = tasks.value.map(task => getUuidByTask(task)!);
    
    const bracketData = BracketStorage.serializeBracket({
      tournamentName: tournamentName.value,
      currentPhase: currentPhase.value,
      csvData: tasks.value,
      csvDataUUID: csvDataUUID,
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
