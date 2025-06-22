<template>
  <div class="container">
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
            :class="{ selected: seedingMethod === 'tournament' }"
            style="cursor: pointer"
            @click="seedingMethod = 'tournament'"
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

      <button
        :disabled="!taskNameColumn || !tournamentName.trim()"
        @click="handleStartTournament"
      >
        Start Task Ranking
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Papa from 'papaparse';

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

const emit = defineEmits<{
  'start-tournament': [
    config: {
      csvData: any[];
      csvHeaders: string[];
      taskNameColumn: string;
      selectedSecondaryFields: string[];
      tournamentType: 'single' | 'double';
      seedingMethod: 'tournament' | 'random';
      tournamentName: string;
    },
  ];
}>();

// State
const csvData = ref<any[]>([]);
const csvHeaders = ref<string[]>([]);
const taskNameColumn = ref<string>('');
const selectedSecondaryFields = ref<string[]>([]);
const tournamentType = ref<'single' | 'double'>('single');
const seedingMethod = ref<'tournament' | 'random'>('tournament');
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
      csvData.value = results.data as any[];
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
  return Math.max(0, participantCount - 1); // Single elimination
};

// Use current tournament type for UI display
const calculateTotalMatchesForUI = () =>
  calculateTotalMatchesForType(tournamentType.value);

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
