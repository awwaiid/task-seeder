<template>
  <div class="container">
    <h1>TaskSeeder Tournament Setup</h1>
    <p>Upload a CSV file and configure your tournament settings</p>

    <!-- CSV Upload -->
    <div class="upload-section">
      <h2>1. Upload CSV File</h2>
      <input
        type="file"
        accept=".csv"
        class="file-input"
        @change="handleFileUpload"
      />
      
      <button @click="loadDemoData" class="demo-button">
        Load Demo Data (4 tasks)
      </button>

      <div v-if="csvData.length > 0" class="preview">
        <h3>Preview ({{ csvData.length }} tasks)</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th v-for="header in csvHeaders" :key="header">{{ header }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in csvData.slice(0, 5)" :key="index">
                <td v-for="header in csvHeaders" :key="header">
                  {{ row[header] || '' }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="csvData.length > 5" class="more-rows">
            ... and {{ csvData.length - 5 }} more rows
          </p>
        </div>
      </div>
    </div>

    <!-- Tournament Configuration -->
    <div v-if="csvData.length > 0" class="config-section">
      <h2>2. Configure Tournament</h2>

      <div class="form-group">
        <label>Tournament Name:</label>
        <input
          v-model="tournamentName"
          type="text"
          placeholder="My Task Tournament"
          class="text-input"
        />
      </div>

      <div class="form-group">
        <label>Tournament Type:</label>
        <select v-model="tournamentType" class="select-input">
          <option value="single">Single Elimination</option>
          <option value="double">Double Elimination</option>
        </select>
      </div>

      <div class="form-group">
        <label>Task Name Column:</label>
        <select v-model="taskNameColumn" class="select-input">
          <option value="">Auto-detect</option>
          <option v-for="header in csvHeaders" :key="header" :value="header">
            {{ header }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Secondary Fields to Display:</label>
        <div class="checkbox-group">
          <label
            v-for="header in csvHeaders"
            :key="header"
            class="checkbox-label"
          >
            <input
              v-model="selectedSecondaryFields"
              type="checkbox"
              :value="header"
            />
            {{ header }}
          </label>
        </div>
      </div>

      <button
        :disabled="csvData.length === 0"
        class="start-button"
        @click="startTournament"
      >
        Start Tournament
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Papa from 'papaparse';

const emit = defineEmits<{
  'start-tournament': [
    data: {
      name: string;
      type: 'single' | 'double';
      taskNameColumn: string;
      selectedSecondaryFields: string[];
      tasks: any[];
    },
  ];
}>();

// CSV data
const csvData = ref<any[]>([]);
const csvHeaders = computed(() => {
  if (csvData.value.length === 0) return [];
  return Object.keys(csvData.value[0]);
});

// Tournament configuration
const tournamentName = ref('My Task Tournament');
const tournamentType = ref<'single' | 'double'>('single');
const taskNameColumn = ref('');
const selectedSecondaryFields = ref<string[]>([]);

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: results => {
      csvData.value = results.data as any[];

      // Auto-detect task name column if not set
      if (!taskNameColumn.value) {
        const nameFields = ['name', 'title', 'task', 'summary', 'description'];
        for (const field of nameFields) {
          if (csvHeaders.value.includes(field)) {
            taskNameColumn.value = field;
            break;
          }
        }
      }

      // Auto-select some common secondary fields
      selectedSecondaryFields.value = csvHeaders.value.filter(header =>
        ['priority', 'status', 'category', 'description'].includes(
          header.toLowerCase()
        )
      );
    },
    error: error => {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format.');
    },
  });
}

function loadDemoData() {
  csvData.value = [
    { name: 'Fix critical bug', priority: 'high' },
    { name: 'Add new feature', priority: 'medium' },
    { name: 'Update documentation', priority: 'low' },
    { name: 'Refactor code', priority: 'medium' }
  ];
  
  // Auto-set configuration for demo data
  taskNameColumn.value = 'name';
  selectedSecondaryFields.value = ['priority'];
  tournamentName.value = 'Demo Tournament';
}

function startTournament() {
  if (csvData.value.length === 0) return;

  emit('start-tournament', {
    name: tournamentName.value,
    type: tournamentType.value,
    taskNameColumn: taskNameColumn.value,
    selectedSecondaryFields: selectedSecondaryFields.value,
    tasks: csvData.value,
  });
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.upload-section,
.config-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.file-input {
  margin: 10px 0;
  padding: 10px;
  border: 2px dashed #ddd;
  border-radius: 4px;
  width: 100%;
}

.demo-button {
  margin: 10px 0;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.demo-button:hover {
  background-color: #0056b3;
}

.preview {
  margin-top: 20px;
}

.table-container {
  overflow-x: auto;
  margin: 10px 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
}

th,
td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.more-rows {
  font-style: italic;
  color: #666;
  margin: 10px 0;
}

.form-group {
  margin: 15px 0;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.text-input,
.select-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: normal;
}

.start-button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.start-button:hover:not(:disabled) {
  background-color: #218838;
}

.start-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
</style>
