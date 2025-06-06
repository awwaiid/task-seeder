<template>
    <!-- Setup Phase -->
    <div class="container" v-if="currentPhase === 'setup'">
        <h2>Load Your Tasks</h2>
        
        <!-- File Upload -->
        <div class="file-upload-area" @click="$refs.fileInput.click()" 
            :class="{ dragover: isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleFileDrop">
            <div style="font-size: 16px; margin-bottom: 10px;">
                <strong>Click to upload</strong> or drag and drop your CSV file here
            </div>
            <div style="color: #7f8c8d; font-size: 14px;">
                CSV files with tasks exported from Asana, Linear, or any project management tool
            </div>
        </div>
        <input type="file" ref="fileInput" @change="handleFileUpload" accept=".csv">
        
        <!-- Data Preview -->
        <div v-if="csvData.length > 0">
            <h3>Data Preview ({{ csvData.length }} tasks loaded)</h3>
            <div class="data-preview">
                <table>
                    <thead>
                        <tr>
                            <th v-for="header in csvHeaders" :key="header">{{ header }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, index) in csvData.slice(0, 5)" :key="index">
                            <td v-for="header in csvHeaders" :key="header">
                                {{ row[header] || '-' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-if="csvData.length > 5" style="text-align: center; margin-top: 10px; color: #7f8c8d;">
                    ... and {{ csvData.length - 5 }} more tasks
                </div>
            </div>
            
            <!-- Column Selection -->
            <div style="margin: 20px 0;">
                <h4>Select Task Name Column:</h4>
                <select v-model="taskNameColumn" style="padding: 8px;">
                    <option v-for="header in csvHeaders" :key="header" :value="header">{{ header }}</option>
                </select>
            </div>
            
            <!-- Secondary Fields Selection -->
            <div style="margin: 20px 0;">
                <h4>Select Additional Fields to Display:</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px;">
                    <label v-for="header in availableSecondaryFields" :key="header" style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" v-model="selectedSecondaryFields" :value="header">
                        <span>{{ header }}</span>
                    </label>
                </div>
            </div>
            
            <!-- Tournament Type -->
            <div style="margin: 20px 0; padding: 20px; background-color: #e8f5e8; border-radius: 6px;">
                <h4>Choose Tournament Type:</h4>
                <div style="display: flex; gap: 20px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="radio" v-model="tournamentType" value="single">
                        <span>Single Elimination (faster, {{ calculateTotalMatchesForType('single') }} matches)</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="radio" v-model="tournamentType" value="double">
                        <span>Double Elimination (more accurate, {{ calculateTotalMatchesForType('double') }} matches)</span>
                    </label>
                </div>
                <div style="margin-top: 10px; font-size: 14px; color: #666;">
                    <div v-if="tournamentType === 'single'">
                        <strong>Single Elimination:</strong> Each task gets eliminated after one loss. Fast but less forgiving.
                    </div>
                    <div v-if="tournamentType === 'double'">
                        <strong>Double Elimination:</strong> Tasks get a second chance in the losers bracket. More matches but fairer rankings.
                    </div>
                </div>
            </div>
            
            <!-- Seeding Options -->
            <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                <h4>Choose Seeding Method:</h4>
                <div style="display: flex; gap: 20px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="radio" v-model="seedingMethod" value="order">
                        <span>Tournament seeding (1st vs last, 2nd vs 2nd-to-last, etc.)</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="radio" v-model="seedingMethod" value="random">
                        <span>Random seeding</span>
                    </label>
                </div>
            </div>
            
            <!-- Tournament Name -->
            <div style="margin: 20px 0;">
                <label><strong>Tournament Name:</strong></label>
                <input type="text" v-model="tournamentName" 
                       style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;"
                       placeholder="Enter a name for this ranking session">
            </div>
            
            <p><strong>Total matches needed:</strong> {{ calculateTotalMatchesForUI() }}</p>
            <button @click="startBracketology" :disabled="!taskNameColumn || !tournamentName.trim()">Start Task Ranking</button>
        </div>
    </div>
    
    <!-- Matchup Phase -->
    <div class="container" v-if="currentPhase === 'matchups'">
        <tournament-progress 
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
        
        <task-matchup 
            data-testid="task-matchup"
            :task1="currentPair[0]"
            :task2="currentPair[1]"
            :task-name-column="taskNameColumn"
            :selected-fields="selectedSecondaryFields"
            @choose-winner="chooseWinner"
        />
        
        <div style="text-align: center; margin-top: 20px;">
            <button @click="restartBracketology" data-testid="restart-button" class="accent">Start Over</button>
        </div>
    </div>
    
    <!-- Results Phase -->
    <div class="container" v-if="currentPhase === 'results'">
        <h2>Your Task Rankings - {{ tournamentName }}</h2>
        <p>Based on your choices, here are your tasks ranked from highest to lowest priority:</p>
        
        <div class="results-table-container">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Task</th>
                        <th v-for="field in selectedSecondaryFields" :key="field">{{ field }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(task, index) in finalRankings" :key="index">
                        <td><strong>{{ index + 1 }}</strong></td>
                        <td>
                            {{ getTaskTitle(task) }}
                            <button 
                                @click="viewTaskHistory(task)" 
                                class="history-button"
                                style="margin-left: 8px; padding: 2px 6px; font-size: 12px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;"
                                title="View match history"
                            >
                                📊
                            </button>
                        </td>
                        <td v-for="field in selectedSecondaryFields" :key="field">
                            {{ task[field] || '-' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- Match History Section -->
        <div v-if="selectedTaskHistory" style="margin-top: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3>Match History: {{ getTaskTitle(selectedTaskHistory) }}</h3>
                <button @click="selectedTaskHistory = null" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            
            <div v-if="matchHistory.has(selectedTaskHistory) && matchHistory.get(selectedTaskHistory).length > 0">
                <div v-for="(match, index) in matchHistory.get(selectedTaskHistory)" :key="index" 
                     style="background: white; margin-bottom: 8px; padding: 12px; border-radius: 5px; border-left: 4px solid #3498db;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: bold; color: #2c3e50;">Round {{ match.round }}:</span>
                        
                        <span v-if="match.result === 'BYE'" style="color: #7f8c8d; font-style: italic;">
                            Received a bye (automatic advancement)
                        </span>
                        
                        <span v-else style="display: flex; align-items: center; gap: 8px;">
                            <span>vs</span>
                            <span style="background: #ecf0f1; padding: 4px 8px; border-radius: 3px;">
                                {{ getTaskTitle(match.opponent) }}
                            </span>
                            <span :style="{
                                color: match.result === 'W' ? '#27ae60' : '#e74c3c',
                                fontWeight: 'bold',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                background: match.result === 'W' ? '#d5f4e6' : '#fceaea'
                            }">
                                {{ match.result === 'W' ? '🏆 WON' : '❌ LOST' }}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            
            <div v-else style="color: #7f8c8d; font-style: italic;">
                No matches recorded for this task.
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <button @click="exportResults" class="success" style="margin-right: 10px;">
                📥 Download Rankings CSV
            </button>
            <button @click="restartBracketology" data-testid="restart-button" class="accent">Start Over</button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';
import TournamentProgress from './TournamentProgress.vue';
import TaskMatchup from './TaskMatchup.vue';
import { Tournament } from '../utils/TournamentRunner.js';

// CSV/UI utility functions
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function autoDetectTaskNameColumn(headers) {
    if (!headers || headers.length === 0) return null;
    
    const keywords = ['name', 'title', 'task', 'summary'];
    
    // Look for exact matches first (case insensitive)
    for (const keyword of keywords) {
        const found = headers.find(header => header.toLowerCase() === keyword);
        if (found) return found;
    }
    
    // Look for partial matches
    for (const keyword of keywords) {
        const found = headers.find(header => header.toLowerCase().includes(keyword));
        if (found) return found;
    }
    
    return headers[0];
}

function autoSelectSecondaryFields(headers, taskNameColumn, maxFields = 4) {
    if (!headers || headers.length === 0) return [];
    
    const commonFields = ['Assignee', 'Status', 'Product area', 'Sprint', 'Priority', 'Due Date'];
    const autoSelectedFields = headers.filter(header => 
        header !== taskNameColumn && 
        commonFields.some(common => header.toLowerCase().includes(common.toLowerCase()))
    );
    
    return autoSelectedFields.slice(0, maxFields);
}

// State
const currentPhase = ref('setup');
const csvData = ref([]);
const csvHeaders = ref([]);
const taskNameColumn = ref('');
const selectedSecondaryFields = ref([]);
const tournamentType = ref('single');
const seedingMethod = ref('order');
const tournamentName = ref('');
const tasks = ref([]);
const tournament = ref(null); // New TournamentRunner instance
const currentMatch = ref(null); // Current match from tournament
const matchHistory = ref(new Map()); // Map of task -> array of match records
const selectedTaskHistory = ref(null); // Currently selected task for viewing history
const isDragOver = ref(false);
const fileInput = ref(null);

// Computed
const availableSecondaryFields = computed(() => {
    return csvHeaders.value.filter(header => header !== taskNameColumn.value);
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

// Compatibility computed properties for existing tests
const currentMatchup = computed(() => {
    if (!tournament.value) return 0;
    return tournament.value.matches.length; // Use completed matches count as matchup number
});

const totalMatches = computed(() => {
    return totalUserVisibleMatches.value;
});

const finalRankings = computed(() => {
    if (currentPhase.value !== 'results' || !tournament.value) return [];
    
    // Use the tournament's built-in ranking system
    return tournament.value.getRankings();
});

// Methods
function handleFileDrop(event) {
    isDragOver.value = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        processFile(file);
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a CSV file.');
        return;
    }
    
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            csvData.value = results.data;
            csvHeaders.value = results.meta.fields || Object.keys(results.data[0] || {});
            
            // Auto-select task name column using utility function
            taskNameColumn.value = autoDetectTaskNameColumn(csvHeaders.value);
            
            // Auto-select secondary fields using utility function
            selectedSecondaryFields.value = autoSelectSecondaryFields(csvHeaders.value, taskNameColumn.value);
            
            // Generate default tournament name
            tournamentName.value = `Task Ranking ${new Date().toLocaleDateString()}`;
        },
        error: function(error) {
            alert('Error parsing CSV file: ' + error.message);
        }
    });
}

// Calculate total matches for different tournament types
const calculateTotalMatchesForType = (type) => {
    const participantCount = csvData.value.length;
    if (type === 'double') {
        return (participantCount * 2) - 1; // Double elimination
    }
    return Math.max(0, participantCount - 1); // Single elimination
};

// Use current tournament type for UI display
const calculateTotalMatchesForUI = () => calculateTotalMatchesForType(tournamentType.value);

function startBracketology() {
    if (!taskNameColumn.value || !tournamentName.value.trim()) {
        alert('Please select a task name column and enter a tournament name.');
        return;
    }
    
    if (csvData.value.length < 2) {
        alert('Please upload a CSV with at least 2 tasks to compare.');
        return;
    }
    
    // Prepare tasks
    tasks.value = [...csvData.value];
    
    // Apply seeding
    if (seedingMethod.value === 'random') {
        tasks.value = shuffleArray(tasks.value);
    }
    
    // Create new tournament instance
    tournament.value = new Tournament(tournamentType.value, tasks.value);
    
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
}


function chooseWinner(winnerIndex) {
    if (!currentMatch.value || !tournament.value) return;
    
    const winner = winnerIndex === 0 ? currentMatch.value.player1 : currentMatch.value.player2;
    const loser = winnerIndex === 0 ? currentMatch.value.player2 : currentMatch.value.player1;
    
    // Record match history
    const matchRecord = {
        round: currentMatch.value.round,
        opponent: loser,
        result: 'W',
        matchNumber: tournament.value.getCurrentMatchNumber(),
        bracket: currentMatch.value.bracket || 'main'
    };
    
    const loserRecord = {
        round: currentMatch.value.round,
        opponent: winner,
        result: 'L',
        matchNumber: tournament.value.getCurrentMatchNumber(),
        bracket: currentMatch.value.bracket || 'main'
    };
    
    if (matchHistory.value.has(winner)) {
        matchHistory.value.get(winner).push(matchRecord);
    }
    if (matchHistory.value.has(loser)) {
        matchHistory.value.get(loser).push(loserRecord);
    }
    
    // Report result to tournament
    tournament.value.reportResult(currentMatch.value, winner);
    
    // Get next match
    currentMatch.value = tournament.value.getNextMatch();
    
    // Check if tournament is complete
    if (tournament.value.isComplete()) {
        currentPhase.value = 'results';
    }
}


function getTaskTitle(task) {
    if (!task) return 'Untitled Task';
    return task[taskNameColumn.value] || 'Untitled Task';
}

function viewTaskHistory(task) {
    selectedTaskHistory.value = task;
}

function exportResults() {
    console.log('Export button clicked');
    console.log('Final rankings length:', finalRankings.value.length);
    
    if (finalRankings.value.length === 0) {
        console.log('No rankings to export');
        return;
    }
    
    try {
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
        alert('Error exporting CSV: ' + error.message);
        
        // Fallback to clipboard
        try {
            if (navigator.clipboard) {
                const csvString = csvContent.join('\n');
                navigator.clipboard.writeText(csvString).then(() => {
                    alert('CSV data copied to clipboard! You can paste it into a text file and save as .csv');
                });
            }
        } catch (e) {
            console.error('Clipboard fallback failed:', e);
        }
    }
}


function restartBracketology() {
    if (confirm('Are you sure you want to start over?')) {
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
        selectedTaskHistory.value = null;
        seedingMethod.value = 'order';
    }
}
</script>