<template>
  <!-- Setup Phase -->
  <TournamentSetup
    v-if="currentPhase === 'setup'"
    :saved-brackets="savedBrackets"
    :loaded-from-url="loadedFromURL"
    :show-auto-save-notice="showAutoSaveNotice"
    :show-storage-warning="showStorageWarning"
    :storage-usage="storageUsage"
    :tournament-setup-progress="tournamentSetupProgress"
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
      :total-matches="totalUserVisibleMatches"
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
        style="
          margin-right: 10px;
          padding: 10px 20px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        "
        @click="shareCurrentBracket"
      >
        🔗 Share Results
      </button>
      <button
        data-testid="restart-button"
        class="accent"
        @click="restartBracketology"
      >
        Home
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import TournamentProgress from './TournamentProgress.vue';
import TaskMatchup from './TaskMatchup.vue';
import TournamentSetup from './TournamentSetup.vue';
import {
  Tournament,
  type ActiveMatch,
  type TournamentType,
} from '../utils/TournamentRunner';
import { BracketStorage, type SavedBracket } from '../utils/BracketStorage';
import { URLBracketSharing } from '../utils/URLBracketSharing';
import { StorageOptimizer, type StorageUsage } from '../utils/StorageOptimizer';
import type {
  Task,
  MatchHistoryEntry,
  CurrentPhase,
  SeedingMethod,
  Participant,
} from '../types/tournament';

// CSV/UI utility functions
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j]!, newArray[i]!];
  }
  return newArray;
}

// State
const currentPhase = ref<CurrentPhase>('setup');
const csvData = ref<Task[]>([]);
const csvHeaders = ref<string[]>([]);
const taskNameColumn = ref<string>('');
const selectedSecondaryFields = ref<string[]>([]);
const tournamentType = ref<TournamentType>('single');
const seedingMethod = ref<SeedingMethod>('order');
const tournamentName = ref<string>('');
const tasks = ref<Participant[]>([]);
const tournament = ref<Tournament | null>(null);
const currentMatch = ref<ActiveMatch | null>(null);
const matchHistory = ref<Map<Participant, MatchHistoryEntry[]>>(new Map());
const expandedTaskHistory = ref<Participant | null>(null);
const savedBrackets = ref<SavedBracket[]>([]);
const currentBracketId = ref<string | null>(null);
const loadedFromURL = ref<boolean>(false);
const showAutoSaveNotice = ref<boolean>(false);
const storageUsage = ref<StorageUsage | null>(null);
const tournamentSetupProgress = ref<string>('');

// Performance optimization: debounced auto-save
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 10000; // Save every 10 seconds max

// Computed

const showStorageWarning = computed(() => {
  return !!(storageUsage.value && storageUsage.value.usagePercent > 80);
});

const currentPair = computed(() => {
  if (!currentMatch.value) return [null, null];
  return [currentMatch.value.player1, currentMatch.value.player2];
});

const totalUserVisibleMatches = computed(() => {
  if (!tournament.value) return 0;
  return tournament.value.getTotalMatches();
});

const currentMatchNumber = computed(() => {
  if (!tournament.value) return 1;
  return tournament.value.getCurrentMatchNumber();
});

const currentRound = computed(() => {
  if (!currentMatch.value) return 1;
  return currentMatch.value.round;
});

const totalRounds = computed(() => {
  if (!tournament.value) return 0;
  return tournament.value.getTotalRounds();
});

const currentRoundMatches = computed(() => {
  if (!tournament.value || !currentMatch.value) return 0;
  return tournament.value.getMatchesInRound(currentMatch.value.round);
});

const currentMatchInRound = computed(() => {
  if (!currentMatch.value) return 1;
  return currentMatch.value.matchInRound;
});

const currentBracketType = computed(() => {
  if (!currentMatch.value || !currentMatch.value.bracket) return 'main';
  return currentMatch.value.bracket;
});

// Removed unused compatibility computed properties

const finalRankings = computed(() => {
  if (currentPhase.value !== 'results' || !tournament.value) return [];

  // Use the tournament's built-in ranking system
  return tournament.value.getRankings();
});

// Methods

function handleStartTournament(config: {
  csvData: Task[];
  csvHeaders: string[];
  taskNameColumn: string;
  selectedSecondaryFields: string[];
  tournamentType: TournamentType;
  seedingMethod: SeedingMethod;
  tournamentName: string;
}) {
  // Update state from the setup component
  csvData.value = config.csvData;
  csvHeaders.value = config.csvHeaders;
  taskNameColumn.value = config.taskNameColumn;
  selectedSecondaryFields.value = config.selectedSecondaryFields;
  tournamentType.value = config.tournamentType;
  seedingMethod.value = config.seedingMethod;
  tournamentName.value = config.tournamentName;

  // Prepare tasks - use the full task objects
  tasks.value = [...config.csvData];

  // Apply seeding
  if (config.seedingMethod === 'random') {
    tasks.value = shuffleArray(tasks.value);
  }

  // Create new tournament instance (now fast for all sizes)
  try {
    console.log('Creating tournament with:', {
      type: config.tournamentType,
      tasks: tasks.value,
    });
    tournament.value = new Tournament(config.tournamentType, tasks.value, {
      taskNameColumn: config.taskNameColumn,
    });
    console.log('Tournament created successfully:', tournament.value);
  } catch (error) {
    console.error('Error creating tournament:', error);
    alert('Error creating tournament: ' + (error as Error).message);
    return;
  }

  // Initialize match history for all tasks
  matchHistory.value = new Map();
  tasks.value.forEach(task => {
    matchHistory.value.set(task, []);
  });

  // Get first match
  currentMatch.value = tournament.value.getNextMatch();

  // Move to matchup phase
  currentPhase.value = 'matchups';

  // Check if tournament is complete (single participant case)
  if (tournament.value.isComplete()) {
    currentPhase.value = 'results';
  }

  // Auto-save the bracket (with size check for large tournaments)
  try {
    saveBracket();
  } catch (error) {
    const err = error as Error;
    if (
      err.name === 'QuotaExceededError' ||
      err.message.includes('quota') ||
      err.message.includes('storage')
    ) {
      console.warn(
        'Tournament too large to auto-save. Continuing without auto-save.',
        error
      );
      // Show a brief notice but don't block the tournament (unless in test environment)
      if (typeof window !== 'undefined' && window.alert !== undefined) {
        setTimeout(() => {
          alert(
            'Note: This tournament is too large to auto-save. Your progress will be lost if you refresh the page, but you can still complete the tournament.'
          );
        }, 1000);
      }
    } else {
      console.warn('Error auto-saving bracket (continuing):', err.message);
    }
  }
}

function chooseWinner(winnerIndex: number) {
  if (!currentMatch.value || !tournament.value) return;

  const winner =
    winnerIndex === 0 ? currentMatch.value.player1 : currentMatch.value.player2;
  const loser =
    winnerIndex === 0 ? currentMatch.value.player2 : currentMatch.value.player1;

  // Report result to tournament (always call this to ensure tournament progresses)
  if (winner) {
    // Only record match history if both players are valid (non-null)
    if (winner && loser) {
      // Record match history
      const matchRecord = {
        round: currentMatch.value.round,
        opponent: loser,
        result: 'W' as const,
        matchNumber: tournament.value.getCurrentMatchNumber(),
        bracket: currentMatch.value.bracket || 'main',
      };

      const loserRecord = {
        round: currentMatch.value.round,
        opponent: winner,
        result: 'L' as const,
        matchNumber: tournament.value.getCurrentMatchNumber(),
        bracket: currentMatch.value.bracket || 'main',
      };

      if (matchHistory.value.has(winner)) {
        matchHistory.value.get(winner)!.push(matchRecord);
      }
      if (matchHistory.value.has(loser)) {
        matchHistory.value.get(loser)!.push(loserRecord);
      }
    }

    // Always report result to ensure tournament progression
    tournament.value.reportResult(currentMatch.value, winner);
  }

  // Get next match
  currentMatch.value = tournament.value.getNextMatch();

  // Check if tournament is complete
  if (tournament.value.isComplete()) {
    currentPhase.value = 'results';
    // Save immediately when tournament completes
    try {
      saveBracket();
    } catch (error) {
      console.warn(
        'Error saving bracket on completion (continuing):',
        (error as Error).message
      );
    }
  } else {
    // Use debounced save during rapid match play for performance
    debouncedSave();
  }
}

function getTaskTitle(task: Participant | null): string {
  if (!task) return 'Untitled Task';
  return task[taskNameColumn.value] || 'Untitled Task';
}

function toggleTaskHistory(task: Participant) {
  if (expandedTaskHistory.value === task) {
    expandedTaskHistory.value = null; // Collapse if already expanded
  } else {
    expandedTaskHistory.value = task; // Expand this task
  }
}

function exportResults() {
  console.log('Export button clicked');
  console.log('Final rankings length:', finalRankings.value.length);

  if (finalRankings.value.length === 0) {
    console.log('No rankings to export');
    return;
  }

  // Create CSV content with rankings
  const csvContent = [];
  const headers = ['Rank', 'Task', ...csvHeaders.value];
  console.log('CSV headers:', headers);
  csvContent.push(headers.join(','));

  finalRankings.value.forEach((task, index) => {
    const row = [index + 1, `"${getTaskTitle(task)}"`];
    csvHeaders.value.forEach(header => {
      const value = task[header] || '';
      row.push(`"${String(value).replace(/"/g, '""')}"`);
    });
    csvContent.push(row.join(','));
  });

  console.log('CSV content created, rows:', csvContent.length);

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

    // Fallback to clipboard
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(csvString).then(() => {
          alert(
            'CSV data copied to clipboard! You can paste it into a text file and save as .csv'
          );
        });
      }
    } catch (e) {
      console.error('Clipboard fallback failed:', e);
    }
  }
}

function restartBracketology() {
  // Force save before returning home to ensure no progress is lost
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (currentBracketId.value && tournament.value) {
    try {
      saveBracket();
    } catch (error) {
      const err = error as Error;
      if (
        err.name === 'QuotaExceededError' ||
        err.message.includes('quota') ||
        err.message.includes('storage')
      ) {
        console.warn(
          'Tournament too large to save on restart. Progress will be lost.',
          error
        );
      } else {
        console.warn(
          'Error saving bracket on restart (continuing anyway):',
          err.message
        );
      }
    }
  }

  currentPhase.value = 'setup';
  csvData.value = [];
  csvHeaders.value = [];
  taskNameColumn.value = '';
  selectedSecondaryFields.value = [];
  tournamentName.value = '';
  tasks.value = [];
  tournament.value = null;
  currentMatch.value = null;
  matchHistory.value = new Map();
  expandedTaskHistory.value = null;
  seedingMethod.value = 'order';
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
    csvData.value = state.csvData || [];
    csvHeaders.value = state.csvHeaders || [];
    taskNameColumn.value = state.taskNameColumn || '';
    selectedSecondaryFields.value = state.selectedSecondaryFields || [];
    tournamentType.value = state.tournamentType || 'single';
    seedingMethod.value = state.seedingMethod || 'order';
    tournamentName.value = state.name || '';
    tasks.value = state.tasks || [];
    currentMatch.value = state.currentMatch;
    matchHistory.value = state.matchHistory || new Map();
    currentBracketId.value = bracketId;

    // Restore tournament with proper Tournament instance
    if (state.tournament) {
      tournament.value = new Tournament(
        state.tournament.type,
        state.tournament.originalEntrants,
        {
          taskNameColumn: taskNameColumn.value,
        }
      );
      // Copy over the tournament state
      Object.assign(tournament.value, state.tournament);

      // Restore Maps
      if (state.tournament.lossCount) {
        tournament.value.lossCount = new Map(state.tournament.lossCount);
      }
      if (state.tournament.matchIndex) {
        tournament.value.matchIndex = new Map(state.tournament.matchIndex);
      }

      // Rebuild internal state for performance optimizations
      tournament.value.rebuildInternalState();

      // Update currentMatch to the actual next match after rebuilding state
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
      csvData: csvData.value,
      csvHeaders: csvHeaders.value,
      taskNameColumn: taskNameColumn.value,
      selectedSecondaryFields: selectedSecondaryFields.value,
      tournamentType: tournamentType.value,
      seedingMethod: seedingMethod.value,
      tasks: tasks.value,
      tournament: tournament.value,
      currentMatch: currentMatch.value,
      matchHistory: matchHistory.value,
    });

    if (currentBracketId.value) {
      // Update existing bracket
      try {
        BracketStorage.updateBracket(currentBracketId.value, bracketData);
      } catch (error) {
        // If bracket doesn't exist, save as new
        console.warn(
          'Bracket not found during update, saving as new:',
          (error as Error).message
        );
        currentBracketId.value = BracketStorage.saveBracket(bracketData);
      }
    } else {
      // Save new bracket
      currentBracketId.value = BracketStorage.saveBracket(bracketData);
    }

    // Refresh the saved brackets list and storage usage
    loadSavedBrackets();
    updateStorageUsage();
  } catch (error) {
    console.error('Error saving bracket:', error);
  }
}

// Debounced save function for performance during rapid matches
function debouncedSave() {
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Set new timeout
  saveTimeout = setTimeout(() => {
    try {
      saveBracket();
    } catch (error) {
      const err = error as Error;
      if (
        err.name === 'QuotaExceededError' ||
        err.message.includes('quota') ||
        err.message.includes('storage')
      ) {
        console.warn(
          'Tournament too large to save during play. Skipping auto-save.',
          error
        );
        // Stop trying to auto-save for this session
        if (saveTimeout) clearTimeout(saveTimeout);
      } else {
        console.error('Error saving bracket during play:', error);
      }
    }
    saveTimeout = null;
  }, SAVE_DEBOUNCE_MS);
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

    // If we deleted the currently loaded bracket, clear the ID
    if (currentBracketId.value === bracketId) {
      currentBracketId.value = null;
    }
  }
}

// URL sharing functions
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

    // Copy to clipboard
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

function shareCurrentBracket() {
  try {
    const bracketData = BracketStorage.serializeBracket({
      tournamentName: tournamentName.value,
      currentPhase: currentPhase.value,
      csvData: csvData.value,
      csvHeaders: csvHeaders.value,
      taskNameColumn: taskNameColumn.value,
      selectedSecondaryFields: selectedSecondaryFields.value,
      tournamentType: tournamentType.value,
      seedingMethod: seedingMethod.value,
      tasks: tasks.value,
      tournament: tournament.value,
      currentMatch: currentMatch.value,
      matchHistory: matchHistory.value,
    });

    const shareableURL = URLBracketSharing.createShareableURL(
      bracketData as any
    );

    // Copy to clipboard
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
  const message = `Copy this URL to share the bracket:\n\n${url}`;
  if (window.prompt) {
    window.prompt(message, url);
  } else {
    alert(message);
  }
}

function loadBracketFromURL() {
  try {
    const bracketData = URLBracketSharing.extractBracketFromCurrentURL();
    if (!bracketData) return false;

    const state = BracketStorage.deserializeBracket(bracketData as any);

    // Restore all state
    currentPhase.value = state.status;
    csvData.value = state.csvData || [];
    csvHeaders.value = state.csvHeaders || [];
    taskNameColumn.value = state.taskNameColumn || '';
    selectedSecondaryFields.value = state.selectedSecondaryFields || [];
    tournamentType.value = state.tournamentType || 'single';
    seedingMethod.value = state.seedingMethod || 'order';
    tournamentName.value = state.name || '';
    tasks.value = state.tasks || [];
    currentMatch.value = state.currentMatch;
    matchHistory.value = state.matchHistory || new Map();
    currentBracketId.value = null; // URL brackets don't have local IDs
    loadedFromURL.value = true; // Mark as loaded from URL

    // Restore tournament with proper Tournament instance
    if (state.tournament) {
      tournament.value = new Tournament(
        state.tournament.type,
        state.tournament.originalEntrants,
        {
          taskNameColumn: taskNameColumn.value,
        }
      );
      // Copy over the tournament state
      Object.assign(tournament.value, state.tournament);

      // Restore Maps
      if (state.tournament.lossCount) {
        tournament.value.lossCount = new Map(state.tournament.lossCount);
      }
      if (state.tournament.matchIndex) {
        tournament.value.matchIndex = new Map(state.tournament.matchIndex);
      }

      // Rebuild internal state for performance optimizations
      tournament.value.rebuildInternalState();

      // Update currentMatch to the actual next match after rebuilding state
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
    }

    // Auto-save the loaded bracket to localStorage
    try {
      // Add a suffix to indicate this was loaded from a shared URL
      const originalName = tournamentName.value;
      let sharedName = originalName.includes('(Shared)')
        ? originalName
        : `${originalName} (Shared)`;

      // Check if a bracket with this name already exists and add a number if needed
      const existingBrackets = BracketStorage.getBracketsList();
      const existingNames = existingBrackets.map(b => b.name);
      let counter = 1;
      let finalName = sharedName;

      while (existingNames.includes(finalName)) {
        finalName = `${sharedName} (${counter})`;
        counter++;
      }

      sharedName = finalName;

      const bracketData = BracketStorage.serializeBracket({
        tournamentName: sharedName,
        currentPhase: currentPhase.value,
        csvData: csvData.value,
        csvHeaders: csvHeaders.value,
        taskNameColumn: taskNameColumn.value,
        selectedSecondaryFields: selectedSecondaryFields.value,
        tournamentType: tournamentType.value,
        seedingMethod: seedingMethod.value,
        tasks: tasks.value,
        tournament: tournament.value,
        currentMatch: currentMatch.value,
        matchHistory: matchHistory.value,
      });

      // Update the display name to match
      tournamentName.value = sharedName;

      currentBracketId.value = BracketStorage.saveBracket(bracketData);
      loadedFromURL.value = false; // Since we auto-saved it, no need to show the notice

      // Show success notification
      showAutoSaveNotice.value = true;

      // Auto-dismiss the notice after 5 seconds
      setTimeout(() => {
        showAutoSaveNotice.value = false;
      }, 5000);

      // Refresh the saved brackets list to show the new bracket
      loadSavedBrackets();
      updateStorageUsage();
    } catch (error) {
      console.error('Error auto-saving URL bracket:', error);
      // If auto-save fails, still show the manual save option
      loadedFromURL.value = true;
    }

    return true;
  } catch (error) {
    console.error('Error loading bracket from URL:', error);
    alert('Invalid or corrupted bracket URL: ' + (error as Error).message);
    return false;
  }
}

function saveCurrentBracketLocally() {
  try {
    // Save the current bracket to localStorage
    const bracketData = BracketStorage.serializeBracket({
      tournamentName: tournamentName.value,
      currentPhase: currentPhase.value,
      csvData: csvData.value,
      csvHeaders: csvHeaders.value,
      taskNameColumn: taskNameColumn.value,
      selectedSecondaryFields: selectedSecondaryFields.value,
      tournamentType: tournamentType.value,
      seedingMethod: seedingMethod.value,
      tasks: tasks.value,
      tournament: tournament.value,
      currentMatch: currentMatch.value,
      matchHistory: matchHistory.value,
    });

    currentBracketId.value = BracketStorage.saveBracket(bracketData);
    loadedFromURL.value = false;
    loadSavedBrackets(); // Refresh the list
    updateStorageUsage();

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
    alert(`Cleaned up ${deletedCount} old brackets to free up storage space.`);
  } else {
    alert('No old brackets to clean up.');
  }
}

// Initialize saved brackets on mount and check for URL bracket
onMounted(() => {
  loadSavedBrackets();
  updateStorageUsage();

  // Check if there's a bracket in the URL
  const urlBracketLoaded = loadBracketFromURL();

  // If we loaded a bracket from URL, clear the URL parameter for cleaner URLs
  if (urlBracketLoaded) {
    URLBracketSharing.clearBracketFromURL();
  }
});

// Expose functions for parent component
defineExpose({
  restartBracketology,
});
</script>

<style scoped>
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #2196f3;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.tournament-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.option {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 2px solid #ddd;
  text-align: center;
  transition: all 0.2s ease;
}

.option:hover {
  border-color: var(--secondary);
  background-color: #f8f9fa;
}

.option.selected {
  border-color: var(--secondary);
  background-color: #e3f2fd;
  box-shadow: 0 2px 4px rgba(52, 152, 219, 0.1);
}

@media (max-width: 768px) {
  .tournament-options {
    grid-template-columns: 1fr;
  }
}
</style>
