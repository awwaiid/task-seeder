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
                        <span>Use file order (first task = #1 seed)</span>
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
            
            <p><strong>Total matches needed:</strong> {{ calculateTotalMatches() }}</p>
            <button @click="startBracketology" :disabled="!taskNameColumn || !tournamentName.trim()">Start Task Ranking</button>
        </div>
    </div>
    
    <!-- Matchup Phase -->
    <div class="container" v-if="currentPhase === 'matchups'">
        <tournament-progress 
            :current-round="currentRound"
            :current-matchup="currentMatchup"
            :completed-matches="completedMatches"
            :total-matches="totalMatches"
            :tournament-name="tournamentName"
            :task-count="tasks.length"
        />
        
        <task-matchup 
            :task1="currentPair[0]"
            :task2="currentPair[1]"
            :task-name-column="taskNameColumn"
            :selected-fields="selectedSecondaryFields"
            @choose-winner="chooseWinner"
        />
        
        <div style="text-align: center; margin-top: 20px;">
            <button @click="restartBracketology" class="accent">Start Over</button>
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
                        <td>{{ getTaskTitle(task) }}</td>
                        <td v-for="field in selectedSecondaryFields" :key="field">
                            {{ task[field] || '-' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <button @click="exportResults" class="success" style="margin-right: 10px;">
                📥 Download Rankings CSV
            </button>
            <button @click="restartBracketology" class="accent">Start Over</button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';
import TournamentProgress from './TournamentProgress.vue';
import TaskMatchup from './TaskMatchup.vue';

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
const isDragOver = ref(false);
const fileInput = ref(null);

// Computed
const availableSecondaryFields = computed(() => {
    return csvHeaders.value.filter(header => header !== taskNameColumn.value);
});

const currentPair = computed(() => {
    if (bracket.value.length === 0 || 
        currentRound.value >= bracket.value.length || 
        currentMatchup.value >= bracket.value[currentRound.value].length) {
        return [null, null];
    }
    
    return bracket.value[currentRound.value][currentMatchup.value].teams;
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
            
            // Auto-select task name column
            const nameColumns = ['name', 'title', 'task', 'summary', 'Name', 'Title', 'Task', 'Summary'];
            const foundColumn = csvHeaders.value.find(header => 
                nameColumns.some(col => header.toLowerCase().includes(col.toLowerCase()))
            );
            if (foundColumn) {
                taskNameColumn.value = foundColumn;
            } else if (csvHeaders.value.length > 0) {
                taskNameColumn.value = csvHeaders.value[0];
            }
            
            // Auto-select secondary fields
            const commonFields = ['Assignee', 'Status', 'Product area', 'Sprint', 'Priority', 'Due Date'];
            const autoSelectedFields = csvHeaders.value.filter(header => 
                header !== taskNameColumn.value && 
                commonFields.some(common => header.toLowerCase().includes(common.toLowerCase()))
            );
            selectedSecondaryFields.value = autoSelectedFields.slice(0, 4);
            
            // Generate default tournament name
            tournamentName.value = `Task Ranking ${new Date().toLocaleDateString()}`;
        },
        error: function(error) {
            alert('Error parsing CSV file: ' + error.message);
        }
    });
}

function calculateTotalMatches() {
    const taskCount = csvData.value.length;
    return taskCount > 0 ? taskCount - 1 : 0;
}

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
    
    // Create the tournament bracket
    createBracket(tasks.value);
    
    // Set counters
    currentRound.value = 0;
    currentMatchup.value = 0;
    completedMatches.value = 0;
    totalMatches.value = calculateTotalMatches();
    
    // Move to matchup phase
    currentPhase.value = 'matchups';
}

function createBracket(tasksList) {
    console.log('Creating bracket with', tasksList.length, 'tasks');
    bracket.value = [];
    
    // Calculate bracket size (power of 2)
    const participantCount = tasksList.length;
    let bracketSize = 1;
    while (bracketSize < participantCount) {
        bracketSize *= 2;
    }
    
    // Create first round
    const firstRound = [];
    let remainingTasks = [...tasksList];
    
    for (let i = 0; i < bracketSize / 2; i++) {
        const team1 = remainingTasks.shift() || null;
        const team2 = remainingTasks.shift() || null;
        
        firstRound.push({
            teams: [team1, team2],
            winner: null
        });
    }
    
    bracket.value.push(firstRound);
    
    // Create subsequent rounds
    let matchesInRound = bracketSize / 4;
    while (matchesInRound >= 1) {
        const round = [];
        for (let i = 0; i < matchesInRound; i++) {
            round.push({
                teams: [null, null],
                winner: null
            });
        }
        bracket.value.push(round);
        matchesInRound /= 2;
    }
    
    console.log('Bracket created with', bracket.value.length, 'rounds');
}

function chooseWinner(winnerIndex) {
    const match = bracket.value[currentRound.value][currentMatchup.value];
    const winner = match.teams[winnerIndex];
    
    // Record the winner
    match.winner = winner;
    
    // Advance winner to next round
    advanceWinner(winner);
    
    // Move to next match
    completedMatches.value++;
    moveToNextMatch();
}

function advanceWinner(winner) {
    if (currentRound.value >= bracket.value.length - 1) return;
    
    const nextRoundMatchIndex = Math.floor(currentMatchup.value / 2);
    const nextRoundTeamIndex = currentMatchup.value % 2;
    
    bracket.value[currentRound.value + 1][nextRoundMatchIndex].teams[nextRoundTeamIndex] = winner;
}

function moveToNextMatch() {
    currentMatchup.value++;
    
    if (currentMatchup.value >= bracket.value[currentRound.value].length) {
        currentRound.value++;
        currentMatchup.value = 0;
        
        if (currentRound.value >= bracket.value.length) {
            currentPhase.value = 'results';
            return;
        }
    }
    
    // Skip matches with byes (but don't count them as completed matches)
    const currentMatch = bracket.value[currentRound.value][currentMatchup.value];
    if (!currentMatch.teams[0] || !currentMatch.teams[1]) {
        currentMatch.winner = currentMatch.teams[0] || currentMatch.teams[1];
        advanceWinner(currentMatch.winner);
        // Don't increment completedMatches for byes - they're not real matches
        moveToNextMatch();
    }
}

function getTaskTitle(task) {
    if (!task) return 'Untitled Task';
    return task[taskNameColumn.value] || 'Untitled Task';
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

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
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
        seedingMethod.value = 'order';
    }
}
</script>