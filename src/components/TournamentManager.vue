<template>
    <!-- Setup Phase -->
    <div class="container" v-if="currentPhase === 'setup'">
        <!-- Saved Brackets Section -->
        <div v-if="savedBrackets.length > 0" class="saved-brackets" style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <h2>Continue Previous Brackets</h2>
            <p style="color: #666; margin-bottom: 15px;">Pick up where you left off with your saved bracket tournaments:</p>
            
            <div style="display: grid; gap: 12px;">
                <div v-for="bracket in savedBrackets" :key="bracket.id" 
                     class="bracket-card"
                     style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 6px; border: 1px solid #ddd;">
                    <div class="bracket-info" style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 4px;">{{ bracket.name }}</div>
                        <div style="font-size: 12px; color: #666;">
                            {{ bracket.status === 'results' ? 'Completed' : 'In Progress' }} • 
                            {{ bracket.csvData?.length || 0 }} tasks • 
                            {{ bracket.tournamentType === 'double' ? 'Double' : 'Single' }} elimination •
                            {{ formatDate(bracket.lastModified) }}
                        </div>
                    </div>
                    <div class="bracket-actions" style="display: flex; gap: 8px;">
                        <button @click="loadBracket(bracket.id)" 
                                style="padding: 6px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            {{ bracket.status === 'results' ? 'View Results' : 'Continue' }}
                        </button>
                        <button @click="shareBracket(bracket.id)" 
                                style="padding: 6px 8px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
                                title="Share bracket via URL">
                            🔗
                        </button>
                        <button @click="deleteBracket(bracket.id)" 
                                style="padding: 6px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
                                title="Delete bracket">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- URL Bracket Loaded Notice (only shown if auto-save failed) -->
        <div v-if="loadedFromURL && currentPhase === 'setup'" style="margin-bottom: 20px; padding: 15px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0; color: #856404;">Bracket Loaded from Shared URL</h3>
            <p style="margin-bottom: 10px; color: #666;">We couldn't automatically save this shared bracket to your browser storage. You can save it manually or continue without saving.</p>
            <button @click="saveCurrentBracketLocally" style="padding: 8px 16px; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                💾 Save Locally
            </button>
            <button @click="dismissURLNotice" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Continue Without Saving
            </button>
        </div>
        
        <!-- Storage Warning -->
        <div v-if="showStorageWarning" style="margin-bottom: 20px; padding: 12px 16px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #856404; font-size: 16px;">⚠️</span>
                <span style="color: #856404; font-weight: 500;">Browser storage is {{ storageUsage.usagePercent }}% full ({{ storageUsage.totalMB }}MB). Old brackets may be automatically cleaned up.</span>
            </div>
            <button @click="cleanupStorage" style="padding: 4px 8px; background: #ffc107; color: #212529; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
                Clean Up
            </button>
        </div>
        
        <!-- Auto-save Success Notice -->
        <div v-if="showAutoSaveNotice" style="margin-bottom: 20px; padding: 12px 16px; background-color: #d1edff; border-radius: 6px; border-left: 4px solid #0ea5e9; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #0ea5e9; font-size: 16px;">💾</span>
                <span style="color: #0369a1; font-weight: 500;">Shared bracket automatically saved to your browser!</span>
            </div>
            <button @click="showAutoSaveNotice = false" style="background: none; border: none; color: #0369a1; cursor: pointer; padding: 4px; font-size: 18px;" title="Dismiss">
                ✕
            </button>
        </div>
        
        <h2>Start New Bracket</h2>
        
        <!-- Upload and Demo Options Container -->
        <div class="upload-demo-container">
            <!-- File Upload -->
            <div class="upload-section">
                <div class="file-upload-area" @click="($refs.fileInput as any)?.click()" 
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
            </div>
            
            <!-- OR Separator -->
            <div class="or-separator">
                <div class="or-line"></div>
                <span class="or-text">OR</span>
                <div class="or-line"></div>
            </div>
            
            <!-- Demo Option -->
            <div class="demo-section">
                <button @click="loadDemoData" type="button" class="demo-button">
                    🚀 Try with Demo Data (15 sample tasks)
                </button>
                <div class="demo-description">
                    Perfect for exploring TaskSeeder features
                </div>
            </div>
        </div>
        
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
                
                <!-- Select All Button -->
                <div style="margin: 10px 0;">
                    <button 
                        @click="toggleSelectAllFields"
                        type="button"
                        style="padding: 6px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;"
                    >
                        {{ allFieldsSelected ? 'Deselect All' : 'Select All' }}
                    </button>
                </div>
                
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
                <div class="tournament-options" style="margin-top: 10px;">
                    <div class="option" 
                         :class="{ 'selected': tournamentType === 'single' }"
                         @click="tournamentType = 'single'"
                         style="cursor: pointer;">
                        <strong>Single Elimination</strong><br>
                        <small>{{ calculateTotalMatchesForType('single') }} matches • Fast</small><br>
                        <small style="color: #666; margin-top: 4px; display: block;">Each task eliminated after one loss</small>
                    </div>
                    <div class="option" 
                         :class="{ 'selected': tournamentType === 'double' }"
                         @click="tournamentType = 'double'"
                         style="cursor: pointer;">
                        <strong>Double Elimination</strong><br>
                        <small>{{ calculateTotalMatchesForType('double') }} matches • More accurate</small><br>
                        <small style="color: #666; margin-top: 4px; display: block;">Tasks get a second chance</small>
                    </div>
                </div>
            </div>
            
            <!-- Seeding Options -->
            <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                <h4>Choose Seeding Method:</h4>
                <div class="tournament-options" style="margin-top: 10px;">
                    <div class="option" 
                         :class="{ 'selected': seedingMethod === 'order' }"
                         @click="seedingMethod = 'order'"
                         style="cursor: pointer;">
                        <strong>Tournament Seeding</strong><br>
                        <small>1st vs last, 2nd vs 2nd-to-last, etc.</small>
                    </div>
                    <div class="option" 
                         :class="{ 'selected': seedingMethod === 'random' }"
                         @click="seedingMethod = 'random'"
                         style="cursor: pointer;">
                        <strong>Random Seeding</strong><br>
                        <small>Randomly paired matchups</small>
                    </div>
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
            
            <!-- Progress indicator for large tournaments -->
            <div v-if="tournamentSetupProgress" style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-radius: 6px; border-left: 4px solid #2196f3;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="spinner"></div>
                    <span style="color: #1976d2; font-weight: 500;">{{ tournamentSetupProgress }}</span>
                </div>
            </div>
            
            <button @click="startBracketology" :disabled="!taskNameColumn || !tournamentName.trim() || !!tournamentSetupProgress">
                {{ tournamentSetupProgress ? 'Setting up...' : 'Start Task Ranking' }}
            </button>
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
            <button @click="restartBracketology" data-testid="restart-button" class="accent">Home</button>
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
                    <template v-for="(task, index) in finalRankings" :key="index">
                        <tr 
                            @click="toggleTaskHistory(task)" 
                            class="clickable-row"
                            :class="{ 'expanded': expandedTaskHistory === task }"
                            :title="expandedTaskHistory === task ? 'Click to hide match history' : 'Click to view match history'"
                        >
                            <td><strong>{{ index + 1 }}</strong></td>
                            <td>
                                {{ getTaskTitle(task) }}
                                <span class="expand-indicator" :class="{ 'expanded': expandedTaskHistory === task }">
                                    {{ expandedTaskHistory === task ? '▼' : '▶' }}
                                </span>
                            </td>
                            <td v-for="field in selectedSecondaryFields" :key="field">
                                {{ task[field] || '-' }}
                            </td>
                        </tr>
                        <!-- Inline History Row -->
                        <tr v-if="expandedTaskHistory === task" class="history-row">
                            <td :colspan="2 + selectedSecondaryFields.length" style="padding: 0;">
                                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #3498db;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="margin: 0; color: #2c3e50;">Match History: {{ getTaskTitle(task) }}</h4>
                                        <button @click="expandedTaskHistory = null" style="background: #e74c3c; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                                            ✕
                                        </button>
                                    </div>
                                    
                                    <div v-if="matchHistory.has(task) && matchHistory.get(task).length > 0">
                                        <div v-for="(match, matchIndex) in matchHistory.get(task)" :key="matchIndex" 
                                             style="background: white; margin-bottom: 6px; padding: 10px; border-radius: 4px; border-left: 3px solid #3498db; font-size: 14px;">
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <span style="font-weight: bold; color: #2c3e50; min-width: 60px;">Round {{ match.round }}:</span>
                                                
                                                <span v-if="match.result === 'BYE'" style="color: #7f8c8d; font-style: italic;">
                                                    Received a bye (automatic advancement)
                                                </span>
                                                
                                                <span v-else-if="match.result === 'W'" style="color: #27ae60;">
                                                    <strong>WON</strong> vs {{ getTaskTitle(match.opponent) }}
                                                </span>
                                                
                                                <span v-else-if="match.result === 'L'" style="color: #e74c3c;">
                                                    <strong>LOST</strong> to {{ getTaskTitle(match.opponent) }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div v-else style="color: #7f8c8d; font-style: italic; text-align: center; padding: 10px;">
                                        No match history available for this task.
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <button @click="exportResults" class="success" style="margin-right: 10px;">
                📥 Download Rankings CSV
            </button>
            <button @click="shareCurrentBracket" style="margin-right: 10px; padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🔗 Share Results
            </button>
            <button @click="restartBracketology" data-testid="restart-button" class="accent">Home</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';
import TournamentProgress from './TournamentProgress.vue';
import TaskMatchup from './TaskMatchup.vue';
import { Tournament } from '../utils/TournamentRunner.js';
import { BracketStorage } from '../utils/BracketStorage.js';
import { URLBracketSharing } from '../utils/URLBracketSharing.js';
import { StorageOptimizer } from '../utils/StorageOptimizer.js';

// Demo data
const DEMO_CSV_DATA = [
    {
        ID: 'PROJ-247',
        name: 'Add user authentication screen',
        description: 'Create a login/signup screen with email and password fields. Include form validation and error handling for invalid credentials.',
        created_at: '2025-05-15T09:23:00Z',
        updated_at: '2025-05-18T14:30:00Z',
        created_by: 'Sarah Chen',
        story_points: '5'
    },
    {
        ID: 'PROJ-583',
        name: 'Build profile settings page',
        description: 'Implement user profile page where users can update their personal information including name email and profile picture.',
        created_at: '2025-05-12T11:45:00Z',
        updated_at: '2025-05-20T16:22:00Z',
        created_by: 'Marcus Rodriguez',
        story_points: '3'
    },
    {
        ID: 'PROJ-129',
        name: 'Create push notification system',
        description: 'Set up Firebase Cloud Messaging integration to send and receive push notifications for important app events.',
        created_at: '2025-05-08T14:12:00Z',
        updated_at: '2025-05-19T10:15:00Z',
        created_by: 'Emily Watson',
        story_points: '4'
    },
    {
        ID: 'PROJ-756',
        name: 'Debug navigation stack issues',
        description: 'Fix navigation problems where users get stuck between screens and back button doesn\'t work properly in certain flows.',
        created_at: '2025-05-20T08:30:00Z',
        updated_at: '2025-05-22T13:45:00Z',
        created_by: 'David Kim',
        story_points: '2'
    },
    {
        ID: 'PROJ-391',
        name: 'Enhance app loading performance',
        description: 'Optimize app startup time by implementing lazy loading and reducing initial bundle size. Target sub-3 second load times.',
        created_at: '2025-05-14T16:20:00Z',
        updated_at: '2025-05-21T09:12:00Z',
        created_by: 'Jessica Thompson',
        story_points: '4'
    },
    {
        ID: 'PROJ-684',
        name: 'Fix double-submit bug on forms',
        description: 'Resolve issue where users can submit forms multiple times by rapidly tapping the submit button causing duplicate data entries.',
        created_at: '2025-05-19T13:55:00Z',
        updated_at: '2025-05-23T11:30:00Z',
        created_by: 'Sarah Chen',
        story_points: '1'
    },
    {
        ID: 'PROJ-912',
        name: 'Generate automated test suite',
        description: 'Create comprehensive unit and integration tests using Jest and React Native Testing Library for critical user flows.',
        created_at: '2025-05-10T10:18:00Z',
        updated_at: '2025-05-17T15:40:00Z',
        created_by: 'Marcus Rodriguez',
        story_points: '5'
    },
    {
        ID: 'PROJ-435',
        name: 'Handle offline mode gracefully',
        description: 'Implement offline functionality that caches data locally and syncs when connection is restored using AsyncStorage.',
        created_at: '2025-05-13T12:33:00Z',
        updated_at: '2025-05-20T08:25:00Z',
        created_by: 'Emily Watson',
        story_points: '3'
    },
    {
        ID: 'PROJ-178',
        name: 'Implement dark mode theme',
        description: 'Add dark mode support with a toggle switch in settings. Ensure all screens and components support both light and dark themes.',
        created_at: '2025-05-16T15:10:00Z',
        updated_at: '2025-05-22T12:18:00Z',
        created_by: 'David Kim',
        story_points: '3'
    },
    {
        ID: 'PROJ-829',
        name: 'Justify text accessibility compliance',
        description: 'Audit and fix accessibility issues to meet WCAG 2.1 AA standards including screen reader support and proper contrast ratios.',
        created_at: '2025-05-11T09:42:00Z',
        updated_at: '2025-05-18T17:05:00Z',
        created_by: 'Jessica Thompson',
        story_points: '4'
    },
    {
        ID: 'PROJ-356',
        name: 'Kurate app store listing',
        description: 'Prepare app store metadata including screenshots descriptions and keywords for both iOS App Store and Google Play Store.',
        created_at: '2025-05-17T14:28:00Z',
        updated_at: '2025-05-21T16:33:00Z',
        created_by: 'Sarah Chen',
        story_points: '2'
    },
    {
        ID: 'PROJ-671',
        name: 'Localize app for multiple languages',
        description: 'Add internationalization support for Spanish French and German including right-to-left text support infrastructure.',
        created_at: '2025-05-09T11:15:00Z',
        updated_at: '2025-05-19T14:50:00Z',
        created_by: 'Marcus Rodriguez',
        story_points: '5'
    },
    {
        ID: 'PROJ-493',
        name: 'Migrate to latest React Native version',
        description: 'Update from React Native 0.71 to 0.74 and resolve any breaking changes in dependencies and native modules.',
        created_at: '2025-05-18T13:07:00Z',
        updated_at: '2025-05-23T09:40:00Z',
        created_by: 'Emily Watson',
        story_points: '4'
    },
    {
        ID: 'PROJ-817',
        name: 'Normalize API error handling',
        description: 'Standardize error handling across all API calls with consistent user-friendly error messages and retry mechanisms.',
        created_at: '2025-05-21T10:52:00Z',
        updated_at: '2025-05-24T15:20:00Z',
        created_by: 'David Kim',
        story_points: '3'
    },
    {
        ID: 'PROJ-264',
        name: 'Optimize image loading and caching',
        description: 'Implement efficient image loading with progressive loading placeholders and intelligent caching to reduce memory usage.',
        created_at: '2025-05-22T16:35:00Z',
        updated_at: '2025-05-25T11:08:00Z',
        created_by: 'Jessica Thompson',
        story_points: '2'
    }
];

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
const expandedTaskHistory = ref(null); // Currently expanded task for viewing history inline
const isDragOver = ref(false);
const fileInput = ref(null);
const savedBrackets = ref([]); // List of saved brackets
const currentBracketId = ref(null); // ID of currently loaded bracket
const loadedFromURL = ref(false); // Whether current bracket was loaded from URL
const showAutoSaveNotice = ref(false); // Show auto-save success notice
const storageUsage = ref(null); // Storage usage info
const tournamentSetupProgress = ref(''); // Progress message for large tournament setup

// Performance optimization: debounced auto-save
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 10000; // Save every 10 seconds max

// Computed
const availableSecondaryFields = computed(() => {
    return csvHeaders.value.filter(header => header !== taskNameColumn.value);
});

const allFieldsSelected = computed(() => {
    return availableSecondaryFields.value.length > 0 && 
           availableSecondaryFields.value.every(field => selectedSecondaryFields.value.includes(field));
});

const showStorageWarning = computed(() => {
    return storageUsage.value && storageUsage.value.usagePercent > 80;
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

function loadDemoData() {
    // Use the demo data directly
    csvData.value = [...DEMO_CSV_DATA];
    csvHeaders.value = Object.keys(DEMO_CSV_DATA[0]);
    
    // Auto-select task name column using utility function
    taskNameColumn.value = autoDetectTaskNameColumn(csvHeaders.value);
    
    // Auto-select secondary fields using utility function
    selectedSecondaryFields.value = autoSelectSecondaryFields(csvHeaders.value, taskNameColumn.value);
    
    // Generate default tournament name
    tournamentName.value = `Demo Tournament ${new Date().toLocaleDateString()}`;
}

function toggleSelectAllFields() {
    if (allFieldsSelected.value) {
        // If all fields are selected, deselect all
        selectedSecondaryFields.value = [];
    } else {
        // If not all fields are selected, select all
        selectedSecondaryFields.value = [...availableSecondaryFields.value];
    }
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
    
    // Create new tournament instance (now fast for all sizes)
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
    
    // Auto-save the bracket (with size check for large tournaments)
    try {
        saveBracket();
    } catch (error) {
        if (error.name === 'QuotaExceededError' || error.message.includes('quota') || error.message.includes('storage')) {
            console.warn('Tournament too large to auto-save. Continuing without auto-save.', error);
            // Show a brief notice but don't block the tournament (unless in test environment)
            if (typeof window !== 'undefined' && window.alert && !(window as any).vitest) {
                setTimeout(() => {
                    alert('Note: This tournament is too large to auto-save. Your progress will be lost if you refresh the page, but you can still complete the tournament.');
                }, 1000);
            }
        } else {
            console.warn('Error auto-saving bracket (continuing):', error.message);
        }
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
        // Save immediately when tournament completes
        try {
            saveBracket();
        } catch (error) {
            console.warn('Error saving bracket on completion (continuing):', error.message);
        }
    } else {
        // Use debounced save during rapid match play for performance
        debouncedSave();
    }
}


function getTaskTitle(task) {
    if (!task) return 'Untitled Task';
    return task[taskNameColumn.value] || 'Untitled Task';
}

function toggleTaskHistory(task) {
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
        alert('Error exporting CSV: ' + error.message);
        
        // Fallback to clipboard
        try {
            if (navigator.clipboard) {
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
    // Force save before returning home to ensure no progress is lost
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    if (currentBracketId.value && tournament.value) {
        try {
            saveBracket();
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.message.includes('quota') || error.message.includes('storage')) {
                console.warn('Tournament too large to save on restart. Progress will be lost.', error);
            } else {
                console.warn('Error saving bracket on restart (continuing anyway):', error.message);
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

function loadBracket(bracketId) {
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
            tournament.value = new Tournament(state.tournament.type, state.tournament.originalEntrants);
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
        if (currentPhase.value === 'matchups' && tournament.value && tournament.value.isComplete()) {
            currentPhase.value = 'results';
            saveBracket(); // Update the bracket status
        }
    } catch (error) {
        console.error('Error loading bracket:', error);
        alert('Error loading bracket: ' + error.message);
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
            matchHistory: matchHistory.value
        });
        
        if (currentBracketId.value) {
            // Update existing bracket
            try {
                BracketStorage.updateBracket(currentBracketId.value, bracketData);
            } catch (error) {
                // If bracket doesn't exist, save as new
                console.warn('Bracket not found during update, saving as new:', error.message);
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
            if (error.name === 'QuotaExceededError' || error.message.includes('quota') || error.message.includes('storage')) {
                console.warn('Tournament too large to save during play. Skipping auto-save.', error);
                // Stop trying to auto-save for this session
                clearTimeout(saveTimeout);
            } else {
                console.error('Error saving bracket during play:', error);
            }
        }
        saveTimeout = null;
    }, SAVE_DEBOUNCE_MS);
}

function deleteBracket(bracketId) {
    if (confirm('Are you sure you want to delete this bracket? This action cannot be undone.')) {
        BracketStorage.deleteBracket(bracketId);
        loadSavedBrackets();
        updateStorageUsage();
        
        // If we deleted the currently loaded bracket, clear the ID
        if (currentBracketId.value === bracketId) {
            currentBracketId.value = null;
        }
    }
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return 'Unknown';
    }
}

// URL sharing functions
function shareBracket(bracketId) {
    try {
        const bracketData = BracketStorage.loadBracket(bracketId);
        if (!bracketData) {
            alert('Bracket not found');
            return;
        }
        
        const shareableURL = URLBracketSharing.createShareableURL(bracketData as any);
        
        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareableURL).then(() => {
                alert('Bracket URL copied to clipboard! Share this link to let others view or continue this bracket.');
            }).catch(() => {
                showURLDialog(shareableURL);
            });
        } else {
            showURLDialog(shareableURL);
        }
    } catch (error) {
        console.error('Error sharing bracket:', error);
        alert('Error creating shareable URL: ' + error.message);
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
            matchHistory: matchHistory.value
        });
        
        const shareableURL = URLBracketSharing.createShareableURL(bracketData as any);
        
        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareableURL).then(() => {
                alert('Bracket URL copied to clipboard! Share this link to let others view or continue this bracket.');
            }).catch(() => {
                showURLDialog(shareableURL);
            });
        } else {
            showURLDialog(shareableURL);
        }
    } catch (error) {
        console.error('Error sharing bracket:', error);
        alert('Error creating shareable URL: ' + error.message);
    }
}

function showURLDialog(url) {
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
            tournament.value = new Tournament(state.tournament.type, state.tournament.originalEntrants);
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
        if (currentPhase.value === 'matchups' && tournament.value && tournament.value.isComplete()) {
            currentPhase.value = 'results';
        }
        
        // Auto-save the loaded bracket to localStorage
        try {
            // Add a suffix to indicate this was loaded from a shared URL
            const originalName = tournamentName.value;
            let sharedName = originalName.includes('(Shared)') ? originalName : `${originalName} (Shared)`;
            
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
                matchHistory: matchHistory.value
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
        alert('Invalid or corrupted bracket URL: ' + error.message);
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
            matchHistory: matchHistory.value
        });
        
        currentBracketId.value = BracketStorage.saveBracket(bracketData);
        loadedFromURL.value = false;
        loadSavedBrackets(); // Refresh the list
        updateStorageUsage();
        
        alert('Bracket saved locally! You can now access it from the saved brackets list.');
    } catch (error) {
        console.error('Error saving bracket locally:', error);
        alert('Error saving bracket: ' + error.message);
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
    restartBracketology
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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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