<script setup lang="ts">
import TournamentManager from './components/TournamentManager.vue';
import About from './components/About.vue';
import { ref } from 'vue';

type CurrentView = 'main' | 'about';

interface TournamentManagerInstance {
  restartBracketology: () => void;
}

const tournamentManagerRef = ref<TournamentManagerInstance | null>(null);
const currentView = ref<CurrentView>('main');

function goHome(): void {
  currentView.value = 'main';
  if (
    tournamentManagerRef.value &&
    tournamentManagerRef.value.restartBracketology
  ) {
    tournamentManagerRef.value.restartBracketology();
  }
}

function showAbout(): void {
  currentView.value = 'about';
}
</script>

<template>
  <div id="app">
    <div class="app-container">
      <header class="app-header">
        <div class="header-left clickable-header" @click="goHome">
          <img src="/logo.png" alt="TaskSeeder" class="logo" />
          <div class="header-text">
            <h1>TaskSeeder</h1>
            <p class="subtitle">Bracketology for your backlog</p>
          </div>
        </div>
        <nav class="header-nav">
          <a href="#" class="nav-link" @click.prevent="showAbout">About</a>
          <a
            href="https://github.com/awwaiid/task-seeder/discussions"
            target="_blank"
            class="nav-link"
            >Feedback</a
          >
          <a
            href="https://github.com/awwaiid/task-seeder"
            target="_blank"
            class="nav-link github-link"
            title="View on GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
              />
            </svg>
          </a>
        </nav>
      </header>
      <TournamentManager
        v-if="currentView === 'main'"
        ref="tournamentManagerRef"
      />
      <About v-if="currentView === 'about'" @go-home="goHome" />
    </div>
  </div>
</template>

<style>
@import './assets/styles.css';

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  line-height: 1.7;
}
</style>
