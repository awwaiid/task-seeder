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
            :current-matchup="currentMatchup"
            :completed-matches="userVisibleMatches"
            :total-matches="totalUserVisibleMatches"
            :tournament-name="tournamentName"
            :task-count="tasks.length"
            :current-round-match="currentRoundMatchNumber"
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
import {
    calculateTotalMatches,
    shuffleArray,
    createTournamentBracket,
    getCurrentMatchup,
    advanceWinner,
    isTournamentComplete,
    autoDetectTaskNameColumn,
    autoSelectSecondaryFields
} from '../utils/tournament.js';

// State
const currentPhase = ref('setup');
const csvData = ref([]);
const csvHeaders = ref([]);
const taskNameColumn = ref('');
const selectedSecondaryFields = ref([]);
const seedingMethod = ref('order');
const tournamentName = ref('');
const tasks = ref([]);
const bracket = ref([]);
const currentRound = ref(0);
const currentMatchup = ref(0);
const completedMatches = ref(0);
const totalMatches = ref(0);
const userVisibleMatches = ref(0); // Count of matches actually shown to the user
const matchHistory = ref(new Map()); // Map of task -> array of match records
const selectedTaskHistory = ref(null); // Currently selected task for viewing history
const isDragOver = ref(false);
const fileInput = ref(null);

// Computed
const availableSecondaryFields = computed(() => {
    return csvHeaders.value.filter(header => header !== taskNameColumn.value);
});

const currentPair = computed(() => {
    return getCurrentMatchup(bracket.value, currentRound.value, currentMatchup.value);
});

const totalUserVisibleMatches = computed(() => {
    // Calculate how many matches will actually be shown to the user
    // This is total matches minus bye matches
    if (!tasks.value.length) return 0;
    
    const participantCount = tasks.value.length;
    let bracketSize = 1;
    while (bracketSize < participantCount) {
        bracketSize *= 2;
    }
    
    // Number of bye matches = bracketSize - participantCount
    const byeCount = bracketSize - participantCount;
    const totalMatches = calculateTotalMatches(participantCount);
    
    // User visible matches = total matches - bye matches  
    return totalMatches - byeCount;
});

const currentRoundMatchNumber = computed(() => {
    // Simple approach: count how many user-visible matches we've seen before the current one
    if (!bracket.value.length || currentRound.value >= bracket.value.length) return 0;
    
    let visibleMatches = 0;
    for (let i = 0; i < currentMatchup.value; i++) {
        if (i < bracket.value[currentRound.value].length) {
            const match = bracket.value[currentRound.value][i];
            if (match.teams[0] && match.teams[1]) {
                visibleMatches++;
            }
        }
    }
    
    return visibleMatches; // 0-indexed, so first visible match is 0
});

const finalRankings = computed(() => {
    if (currentPhase.value !== 'results') return [];
    
    const rankings = [];
    
    // We need to traverse the bracket to determine elimination order
    // For now, let's create a simple ranking based on when tasks were eliminated
    // This would need to be enhanced to properly track elimination rounds
    
    // Winner is the last remaining task
    if (bracket.value.length > 0) {
        const finalRound = bracket.value[bracket.value.length - 1];
        if (finalRound.length > 0 && finalRound[0].winner) {
            rankings.push(finalRound[0].winner);
            
            // Runner-up is the other finalist
            const finalist1 = finalRound[0].teams[0];
            const finalist2 = finalRound[0].teams[1];
            const runnerUp = finalist1 === finalRound[0].winner ? finalist2 : finalist1;
            if (runnerUp) rankings.push(runnerUp);
        }
    }
    
    // For now, add remaining tasks in their original order
    // This is a simplified version - a complete implementation would track elimination order
    const remainingTasks = tasks.value.filter(task => !rankings.includes(task));
    rankings.push(...remainingTasks);
    
    return rankings;
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

// Use utility function for calculating total matches
const calculateTotalMatchesForUI = () => calculateTotalMatches(csvData.value.length);

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
    
    // Create the tournament bracket using utility function
    bracket.value = createTournamentBracket(tasks.value);
    
    // Set counters
    currentRound.value = 0;
    currentMatchup.value = 0;
    completedMatches.value = 0;
    totalMatches.value = calculateTotalMatches(tasks.value.length);
    userVisibleMatches.value = 0;
    
    // Initialize match history for all tasks
    matchHistory.value = new Map();
    tasks.value.forEach(task => {
        matchHistory.value.set(task, []);
    });
    
    // Move to matchup phase
    currentPhase.value = 'matchups';
    
    // Skip any initial bye matches
    skipByeMatches();
}


function chooseWinner(winnerIndex) {
    const match = bracket.value[currentRound.value][currentMatchup.value];
    const winner = match.teams[winnerIndex];
    const loser = match.teams[1 - winnerIndex];
    
    // Record the winner
    match.winner = winner;
    
    // Record match history for both participants
    const matchRecord = {
        round: currentRound.value + 1,
        opponent: loser,
        result: 'W',
        matchNumber: userVisibleMatches.value + 1
    };
    
    const loserRecord = {
        round: currentRound.value + 1,
        opponent: winner,
        result: 'L',
        matchNumber: userVisibleMatches.value + 1
    };
    
    if (matchHistory.value.has(winner)) {
        matchHistory.value.get(winner).push(matchRecord);
    }
    if (matchHistory.value.has(loser)) {
        matchHistory.value.get(loser).push(loserRecord);
    }
    
    // Advance winner to next round
    advanceWinner(bracket.value, winner, currentRound.value, currentMatchup.value);
    
    // Move to next match
    completedMatches.value++;
    userVisibleMatches.value++; // Increment user-visible matches counter
    moveToNextMatch();
}


function moveToNextMatch() {
    currentMatchup.value++;
    
    if (currentMatchup.value >= bracket.value[currentRound.value].length) {
        currentRound.value++;
        currentMatchup.value = 0;
        
        if (isTournamentComplete(bracket.value, currentRound.value)) {
            currentPhase.value = 'results';
            return;
        }
    }
    
    // Skip any bye matches
    skipByeMatches();
}

function skipByeMatches() {
    // Continue skipping until we find a match with two real opponents or tournament is complete
    while (currentRound.value < bracket.value.length) {
        const currentMatch = bracket.value[currentRound.value][currentMatchup.value];
        
        // If both teams exist, this is a real match - stop here
        if (currentMatch.teams[0] && currentMatch.teams[1]) {
            break;
        }
        
        // This is a bye match - automatically advance the non-null team
        if (currentMatch.teams[0] || currentMatch.teams[1]) {
            const byeWinner = currentMatch.teams[0] || currentMatch.teams[1];
            currentMatch.winner = byeWinner;
            
            // Record bye in match history
            if (matchHistory.value.has(byeWinner)) {
                matchHistory.value.get(byeWinner).push({
                    round: currentRound.value + 1,
                    opponent: null,
                    result: 'BYE',
                    matchNumber: null
                });
            }
            
            advanceWinner(bracket.value, byeWinner, currentRound.value, currentMatchup.value);
        }
        
        // Move to next match
        currentMatchup.value++;
        
        if (currentMatchup.value >= bracket.value[currentRound.value].length) {
            currentRound.value++;
            currentMatchup.value = 0;
            
            if (isTournamentComplete(bracket.value, currentRound.value)) {
                currentPhase.value = 'results';
                return;
            }
        }
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
        bracket.value = [];
        currentRound.value = 0;
        currentMatchup.value = 0;
        completedMatches.value = 0;
        totalMatches.value = 0;
        userVisibleMatches.value = 0;
        matchHistory.value = new Map();
        selectedTaskHistory.value = null;
        seedingMethod.value = 'order';
    }
}
</script>