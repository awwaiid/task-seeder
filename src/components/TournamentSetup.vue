<template>
  <div class="container">
    <!-- Saved Brackets Section -->
    <div
      v-if="savedBrackets.length > 0"
      class="saved-brackets"
      style="
        margin-bottom: 30px;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 8px;
      "
    >
      <h2>Continue Previous Brackets</h2>
      <p style="color: #666; margin-bottom: 15px">
        Pick up where you left off with your saved bracket tournaments:
      </p>

      <div style="display: grid; gap: 12px">
        <div
          v-for="bracket in savedBrackets"
          :key="bracket.id || bracket.name || ''"
          class="bracket-card"
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #ddd;
          "
        >
          <div class="bracket-info" style="flex: 1">
            <div style="font-weight: bold; margin-bottom: 4px">
              {{ bracket.name }}
            </div>
            <div style="font-size: 12px; color: #666">
              {{ bracket.status === 'results' ? 'Completed' : 'In Progress' }} •
              {{ bracket.csvData?.length || 0 }} tasks •
              {{ 
                bracket.tournamentType === 'double' ? 'Double elimination' : 
                bracket.tournamentType === 'quicksort' ? 'QuickSort ranking' : 
                'Single elimination' 
              }} •
              {{ formatDate(bracket.lastModified) }}
            </div>
          </div>
          <div class="bracket-actions" style="display: flex; gap: 8px">
            <button
              style="
                padding: 6px 12px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              "
              @click="$emit('load-bracket', bracket.id || '')"
            >
              {{ bracket.status === 'results' ? 'View Results' : 'Continue' }}
            </button>
            <button
              style="
                padding: 6px 8px;
                background: #27ae60;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              "
              title="Share bracket via URL"
              @click="$emit('share-bracket', bracket.id || '')"
            >
              🔗
            </button>
            <button
              style="
                padding: 6px 8px;
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              "
              title="Delete bracket"
              @click="$emit('delete-bracket', bracket.id || '')"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- URL Bracket Loaded Notice (only shown if auto-save failed) -->
    <div
      v-if="loadedFromUrl"
      style="
        margin-bottom: 20px;
        padding: 15px;
        background-color: #fff3cd;
        border-radius: 8px;
        border-left: 4px solid #ffc107;
      "
    >
      <h3 style="margin-top: 0; color: #856404">
        Bracket Loaded from Shared URL
      </h3>
      <p style="margin-bottom: 10px; color: #666">
        We couldn't automatically save this shared bracket to your browser
        storage. You can save it manually or continue without saving.
      </p>
      <button
        style="
          padding: 8px 16px;
          background: #ffc107;
          color: #212529;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 10px;
        "
        @click="$emit('save-locally')"
      >
        💾 Save Locally
      </button>
      <button
        style="
          padding: 8px 16px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        "
        @click="$emit('dismiss-url-notice')"
      >
        Continue Without Saving
      </button>
    </div>

    <!-- Storage Warning -->
    <div
      v-if="showStorageWarning"
      style="
        margin-bottom: 20px;
        padding: 12px 16px;
        background-color: #fff3cd;
        border-radius: 6px;
        border-left: 4px solid #ffc107;
        display: flex;
        justify-content: space-between;
        align-items: center;
      "
    >
      <div style="display: flex; align-items: center; gap: 8px">
        <span style="color: #856404; font-size: 16px">⚠️</span>
        <span style="color: #856404; font-weight: 500"
          >Browser storage is {{ storageUsage?.usagePercent }}% full ({{
            storageUsage?.totalMB
          }}MB). Old brackets may be automatically cleaned up.</span
        >
      </div>
      <button
        style="
          padding: 4px 8px;
          background: #ffc107;
          color: #212529;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        "
        @click="$emit('cleanup-storage')"
      >
        Clean Up
      </button>
    </div>

    <!-- Auto-save Success Notice -->
    <div
      v-if="showAutoSaveNotice"
      style="
        margin-bottom: 20px;
        padding: 12px 16px;
        background-color: #d1edff;
        border-radius: 6px;
        border-left: 4px solid #0ea5e9;
        display: flex;
        justify-content: space-between;
        align-items: center;
      "
    >
      <div style="display: flex; align-items: center; gap: 8px">
        <span style="color: #0ea5e9; font-size: 16px">💾</span>
        <span style="color: #0369a1; font-weight: 500"
          >Shared bracket automatically saved to your browser!</span
        >
      </div>
      <button
        style="
          background: none;
          border: none;
          color: #0369a1;
          cursor: pointer;
          padding: 4px;
          font-size: 18px;
        "
        title="Dismiss"
        @click="$emit('dismiss-auto-save')"
      >
        ✕
      </button>
    </div>

    <h2>Start New Bracket</h2>

    <!-- Upload and Demo Options Container -->
    <div class="upload-demo-container">
      <!-- File Upload -->
      <div class="upload-section">
        <div
          class="file-upload-area"
          :class="{ dragover: isDragOver }"
          @click="fileInput?.click()"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @drop.prevent="handleFileDrop"
        >
          <div style="font-size: 16px; margin-bottom: 10px">
            <strong>Click to upload</strong> or drag and drop your CSV file here
          </div>
          <div style="color: #7f8c8d; font-size: 14px">
            CSV files with tasks exported from Asana, Linear, or any project
            management tool
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          @change="handleFileUpload"
        />
      </div>

      <!-- OR Separator -->
      <div class="or-separator">
        <div class="or-line"></div>
        <span class="or-text">OR</span>
        <div class="or-line"></div>
      </div>

      <!-- Demo Option -->
      <div class="demo-section">
        <button type="button" class="demo-button" @click="loadDemoData">
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
        <div
          v-if="csvData.length > 5"
          style="text-align: center; margin-top: 10px; color: #7f8c8d"
        >
          ... and {{ csvData.length - 5 }} more tasks
        </div>
      </div>

      <!-- Column Selection -->
      <div style="margin: 20px 0">
        <h4>Select Task Name Column:</h4>
        <select v-model="taskNameColumn" style="padding: 8px">
          <option v-for="header in csvHeaders" :key="header" :value="header">
            {{ header }}
          </option>
        </select>
      </div>

      <!-- Secondary Fields Selection -->
      <div style="margin: 20px 0">
        <h4>Select Additional Fields to Display:</h4>

        <!-- Select All Button -->
        <div style="margin: 10px 0">
          <button
            type="button"
            style="
              padding: 6px 12px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            "
            @click="toggleSelectAllFields"
          >
            {{ allFieldsSelected ? 'Deselect All' : 'Select All' }}
          </button>
        </div>

        <div
          style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 10px;
          "
        >
          <label
            v-for="header in availableSecondaryFields"
            :key="header"
            style="display: flex; align-items: center; gap: 8px"
          >
            <input
              v-model="selectedSecondaryFields"
              type="checkbox"
              :value="header"
            />
            <span>{{ header }}</span>
          </label>
        </div>
      </div>

      <!-- Tournament Type -->
      <div
        style="
          margin: 20px 0;
          padding: 20px;
          background-color: #e8f5e8;
          border-radius: 6px;
        "
      >
        <h4>Choose Tournament Type:</h4>
        <div class="tournament-options" style="margin-top: 10px">
          <div
            class="option"
            :class="{ selected: tournamentType === 'single' }"
            style="cursor: pointer"
            @click="tournamentType = 'single'"
          >
            <strong>Single Elimination</strong><br />
            <small
              >{{ calculateTotalMatchesForType('single') }} matches •
              Fast</small
            ><br />
            <small style="color: #666; margin-top: 4px; display: block"
              >Each task eliminated after one loss</small
            >
          </div>
          <div
            class="option"
            :class="{ selected: tournamentType === 'double' }"
            style="cursor: pointer"
            @click="tournamentType = 'double'"
          >
            <strong>Double Elimination</strong><br />
            <small
              >{{ calculateTotalMatchesForType('double') }} matches • More
              accurate</small
            ><br />
            <small style="color: #666; margin-top: 4px; display: block"
              >Tasks get a second chance</small
            >
          </div>
          <div
            class="option"
            :class="{ selected: tournamentType === 'quicksort' }"
            style="cursor: pointer"
            @click="tournamentType = 'quicksort'"
          >
            <strong>QuickSort Ranking</strong><br />
            <small
              >{{ calculateTotalMatchesForType('quicksort') }} matches •
              Efficient</small
            ><br />
            <small style="color: #666; margin-top: 4px; display: block"
              >Algorithm-based comparisons</small
            >
          </div>
        </div>
      </div>

      <!-- Seeding Options -->
      <div
        style="
          margin: 20px 0;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 6px;
        "
      >
        <h4>Choose Seeding Method:</h4>
        <div class="tournament-options" style="margin-top: 10px">
          <div
            class="option"
            :class="{ selected: seedingMethod === 'order' }"
            style="cursor: pointer"
            @click="seedingMethod = 'order'"
          >
            <strong>Tournament Seeding</strong><br />
            <small>1st vs last, 2nd vs 2nd-to-last, etc.</small>
          </div>
          <div
            class="option"
            :class="{ selected: seedingMethod === 'random' }"
            style="cursor: pointer"
            @click="seedingMethod = 'random'"
          >
            <strong>Random Seeding</strong><br />
            <small>Randomly paired matchups</small>
          </div>
        </div>
      </div>

      <!-- Tournament Name -->
      <div style="margin: 20px 0">
        <label><strong>Tournament Name:</strong></label>
        <input
          v-model="tournamentName"
          type="text"
          style="
            width: 100%;
            padding: 10px;
            margin-top: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
          "
          placeholder="Enter a name for this ranking session"
        />
      </div>

      <p>
        <strong>Total matches needed:</strong>
        {{ calculateTotalMatchesForUI() }}
      </p>

      <!-- Progress indicator for large tournaments -->
      <div
        v-if="tournamentSetupProgress"
        style="
          margin: 20px 0;
          padding: 15px;
          background-color: #e3f2fd;
          border-radius: 6px;
          border-left: 4px solid #2196f3;
        "
      >
        <div style="display: flex; align-items: center; gap: 10px">
          <div class="spinner"></div>
          <span style="color: #1976d2; font-weight: 500">{{
            tournamentSetupProgress
          }}</span>
        </div>
      </div>

      <button
        :disabled="
          !taskNameColumn || !tournamentName.trim() || !!tournamentSetupProgress
        "
        @click="handleStartTournament"
      >
        {{ tournamentSetupProgress ? 'Setting up...' : 'Start Task Ranking' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Papa from 'papaparse';
import type { StorageUsage } from '../utils/StorageOptimizer';
import type { Task, TournamentType, SeedingMethod } from '../types/tournament';

// Demo data from original
const DEMO_CSV_DATA = [
  {
    ID: 'PROJ-247',
    name: 'Add user authentication screen',
    description:
      'Create a login/signup screen with email and password fields. Include form validation and error handling for invalid credentials.',
    created_at: '2025-05-15T09:23:00Z',
    updated_at: '2025-05-18T14:30:00Z',
    created_by: 'Sarah Chen',
    story_points: '5',
  },
  {
    ID: 'PROJ-583',
    name: 'Build profile settings page',
    description:
      'Implement user profile page where users can update their personal information including name email and profile picture.',
    created_at: '2025-05-12T11:45:00Z',
    updated_at: '2025-05-20T16:22:00Z',
    created_by: 'Marcus Rodriguez',
    story_points: '3',
  },
  {
    ID: 'PROJ-129',
    name: 'Create push notification system',
    description:
      'Set up Firebase Cloud Messaging integration to send and receive push notifications for important app events.',
    created_at: '2025-05-08T14:12:00Z',
    updated_at: '2025-05-19T10:15:00Z',
    created_by: 'Emily Watson',
    story_points: '4',
  },
  {
    ID: 'PROJ-756',
    name: 'Debug navigation stack issues',
    description:
      "Fix navigation problems where users get stuck between screens and back button doesn't work properly in certain flows.",
    created_at: '2025-05-20T08:30:00Z',
    updated_at: '2025-05-22T13:45:00Z',
    created_by: 'David Kim',
    story_points: '2',
  },
  {
    ID: 'PROJ-391',
    name: 'Enhance app loading performance',
    description:
      'Optimize app startup time by implementing lazy loading and reducing initial bundle size. Target sub-3 second load times.',
    created_at: '2025-05-14T16:20:00Z',
    updated_at: '2025-05-21T09:12:00Z',
    created_by: 'Jessica Thompson',
    story_points: '4',
  },
  {
    ID: 'PROJ-684',
    name: 'Fix double-submit bug on forms',
    description:
      'Resolve issue where users can submit forms multiple times by rapidly tapping the submit button causing duplicate data entries.',
    created_at: '2025-05-19T13:55:00Z',
    updated_at: '2025-05-23T11:30:00Z',
    created_by: 'Sarah Chen',
    story_points: '1',
  },
  {
    ID: 'PROJ-912',
    name: 'Generate automated test suite',
    description:
      'Create comprehensive unit and integration tests using Jest and React Native Testing Library for critical user flows.',
    created_at: '2025-05-10T10:18:00Z',
    updated_at: '2025-05-17T15:40:00Z',
    created_by: 'Marcus Rodriguez',
    story_points: '5',
  },
  {
    ID: 'PROJ-435',
    name: 'Handle offline mode gracefully',
    description:
      'Implement offline functionality that caches data locally and syncs when connection is restored using AsyncStorage.',
    created_at: '2025-05-13T12:33:00Z',
    updated_at: '2025-05-20T08:25:00Z',
    created_by: 'Emily Watson',
    story_points: '3',
  },
  {
    ID: 'PROJ-178',
    name: 'Implement dark mode theme',
    description:
      'Add dark mode support with a toggle switch in settings. Ensure all screens and components support both light and dark themes.',
    created_at: '2025-05-16T15:10:00Z',
    updated_at: '2025-05-22T12:18:00Z',
    created_by: 'David Kim',
    story_points: '3',
  },
  {
    ID: 'PROJ-829',
    name: 'Justify text accessibility compliance',
    description:
      'Audit and fix accessibility issues to meet WCAG 2.1 AA standards including screen reader support and proper contrast ratios.',
    created_at: '2025-05-11T09:42:00Z',
    updated_at: '2025-05-18T17:05:00Z',
    created_by: 'Jessica Thompson',
    story_points: '4',
  },
  {
    ID: 'PROJ-356',
    name: 'Kurate app store listing',
    description:
      'Prepare app store metadata including screenshots descriptions and keywords for both iOS App Store and Google Play Store.',
    created_at: '2025-05-17T14:28:00Z',
    updated_at: '2025-05-21T16:33:00Z',
    created_by: 'Sarah Chen',
    story_points: '2',
  },
  {
    ID: 'PROJ-671',
    name: 'Localize app for multiple languages',
    description:
      'Add internationalization support for Spanish French and German including right-to-left text support infrastructure.',
    created_at: '2025-05-09T11:15:00Z',
    updated_at: '2025-05-19T14:50:00Z',
    created_by: 'Marcus Rodriguez',
    story_points: '5',
  },
  {
    ID: 'PROJ-493',
    name: 'Migrate to latest React Native version',
    description:
      'Update from React Native 0.71 to 0.74 and resolve any breaking changes in dependencies and native modules.',
    created_at: '2025-05-18T13:07:00Z',
    updated_at: '2025-05-23T09:40:00Z',
    created_by: 'Emily Watson',
    story_points: '4',
  },
  {
    ID: 'PROJ-817',
    name: 'Normalize API error handling',
    description:
      'Standardize error handling across all API calls with consistent user-friendly error messages and retry mechanisms.',
    created_at: '2025-05-21T10:52:00Z',
    updated_at: '2025-05-24T15:20:00Z',
    created_by: 'David Kim',
    story_points: '3',
  },
  {
    ID: 'PROJ-264',
    name: 'Optimize image loading and caching',
    description:
      'Implement efficient image loading with progressive loading placeholders and intelligent caching to reduce memory usage.',
    created_at: '2025-05-22T16:35:00Z',
    updated_at: '2025-05-25T11:08:00Z',
    created_by: 'Jessica Thompson',
    story_points: '2',
  },
];

// Props
defineProps<{
  savedBrackets: any[];
  loadedFromUrl: boolean;
  showAutoSaveNotice: boolean;
  showStorageWarning: boolean;
  storageUsage: StorageUsage | null;
  tournamentSetupProgress: string;
}>();

// Emits
const emit = defineEmits<{
  'load-bracket': [bracketId: string];
  'delete-bracket': [bracketId: string];
  'share-bracket': [bracketId: string];
  'save-locally': [];
  'dismiss-url-notice': [];
  'dismiss-auto-save': [];
  'cleanup-storage': [];
  'start-tournament': [
    config: {
      csvData: Task[];
      csvHeaders: string[];
      taskNameColumn: string;
      selectedSecondaryFields: string[];
      tournamentType: TournamentType;
      seedingMethod: SeedingMethod;
      tournamentName: string;
    },
  ];
}>();

// State
const csvData = ref<Task[]>([]);
const csvHeaders = ref<string[]>([]);
const taskNameColumn = ref<string>('');
const selectedSecondaryFields = ref<string[]>([]);
const tournamentType = ref<TournamentType>('single');
const seedingMethod = ref<SeedingMethod>('order');
const tournamentName = ref<string>('');
const isDragOver = ref<boolean>(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Computed
const availableSecondaryFields = computed(() => {
  return csvHeaders.value.filter(header => header !== taskNameColumn.value);
});

const allFieldsSelected = computed(() => {
  return (
    availableSecondaryFields.value.length > 0 &&
    availableSecondaryFields.value.every(field =>
      selectedSecondaryFields.value.includes(field)
    )
  );
});

// CSV/UI utility functions
function autoDetectTaskNameColumn(headers: string[]): string | null {
  if (!headers || headers.length === 0) return null;

  const keywords = ['name', 'title', 'task', 'summary'];

  // Look for exact matches first (case insensitive)
  for (const keyword of keywords) {
    const found = headers.find(header => header.toLowerCase() === keyword);
    if (found) return found;
  }

  // Look for partial matches
  for (const keyword of keywords) {
    const found = headers.find(header =>
      header.toLowerCase().includes(keyword)
    );
    if (found) return found;
  }

  return headers[0] || null;
}

function autoSelectSecondaryFields(
  headers: string[],
  taskNameColumn: string,
  maxFields = 4
): string[] {
  if (!headers || headers.length === 0) return [];

  const commonFields = [
    'Assignee',
    'Status',
    'Product area',
    'Sprint',
    'Priority',
    'Due Date',
  ];
  const autoSelectedFields = headers.filter(
    header =>
      header !== taskNameColumn &&
      commonFields.some(common =>
        header.toLowerCase().includes(common.toLowerCase())
      )
  );

  return autoSelectedFields.slice(0, maxFields);
}

// Methods
function handleFileDrop(event: DragEvent) {
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    processFile(file);
  }
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
}

function processFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    alert('Please upload a CSV file.');
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results: any) {
      csvData.value = results.data as Task[];
      csvHeaders.value =
        results.meta.fields || Object.keys(results.data[0] || {});

      // Auto-select task name column using utility function
      taskNameColumn.value = autoDetectTaskNameColumn(csvHeaders.value) || '';

      // Auto-select secondary fields using utility function
      selectedSecondaryFields.value = autoSelectSecondaryFields(
        csvHeaders.value,
        taskNameColumn.value || ''
      );

      // Generate default tournament name
      tournamentName.value = `Task Ranking ${new Date().toLocaleDateString()}`;
    },
    error: function (error: any) {
      alert('Error parsing CSV file: ' + error.message);
    },
  });
}

function loadDemoData() {
  // Use the demo data directly
  csvData.value = [...DEMO_CSV_DATA];
  csvHeaders.value = Object.keys(DEMO_CSV_DATA[0] || {});

  // Auto-select task name column using utility function
  taskNameColumn.value = autoDetectTaskNameColumn(csvHeaders.value) || '';

  // Auto-select secondary fields using utility function
  selectedSecondaryFields.value = autoSelectSecondaryFields(
    csvHeaders.value,
    taskNameColumn.value || ''
  );

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
const calculateTotalMatchesForType = (type: string) => {
  const participantCount = csvData.value.length;
  if (type === 'double') {
    return participantCount * 2 - 1; // Double elimination
  }
  if (type === 'quicksort') {
    return Math.ceil(participantCount * Math.log2(participantCount)); // QuickSort estimation
  }
  return Math.max(0, participantCount - 1); // Single elimination
};

// Use current tournament type for UI display
const calculateTotalMatchesForUI = () =>
  calculateTotalMatchesForType(tournamentType.value);

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return 'Unknown';
  }
}

function handleStartTournament() {
  if (!taskNameColumn.value || !tournamentName.value.trim()) {
    alert('Please select a task name column and enter a tournament name.');
    return;
  }

  if (csvData.value.length < 2) {
    alert('Please upload a CSV with at least 2 tasks to compare.');
    return;
  }

  emit('start-tournament', {
    csvData: csvData.value,
    csvHeaders: csvHeaders.value,
    taskNameColumn: taskNameColumn.value,
    selectedSecondaryFields: selectedSecondaryFields.value,
    tournamentType: tournamentType.value,
    seedingMethod: seedingMethod.value,
    tournamentName: tournamentName.value,
  });
}
</script>

<style scoped>
.tournament-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
</style>
