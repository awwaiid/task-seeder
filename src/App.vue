<script setup>
import TournamentManager from './components/TournamentManager.vue'
import { ref } from 'vue'

const tournamentManagerRef = ref(null)

function goHome() {
  if (tournamentManagerRef.value && tournamentManagerRef.value.restartBracketology) {
    tournamentManagerRef.value.restartBracketology()
  }
}
</script>

<template>
  <div id="app">
    <header class="app-header clickable-header" @click="goHome">
      <img src="/logo.png" alt="TaskSeeder" class="logo" />
      <div class="header-text">
        <h1>TaskSeeder</h1>
        <p class="subtitle">Bracketology for your backlog</p>
      </div>
    </header>
    <TournamentManager ref="tournamentManagerRef" />
  </div>
</template>

<style>
@import './assets/styles.css';
</style>
