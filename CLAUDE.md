# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run unit tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e-ui` - Run Playwright tests with UI

## Workflow Notes

- I am already running `npm run dev` in another tab, you don't need to run it

## Application Architecture

**TaskSeeder** is a Vue 3 application using tournament-style bracket elimination to rank tasks. Users upload CSV files and make head-to-head comparisons to determine priority rankings.

### Core Components Structure

- **App.vue**: Root component managing view routing (main/about)
- **TournamentManager.vue**: Main orchestrator handling all tournament phases (setup → matchups → results)
- **TournamentProgress.vue**: Displays round/match progress during tournaments
- **TaskMatchup.vue**: Presents head-to-head task comparisons
- **About.vue**: Static about page with feature explanations

### Key Utilities

- **TournamentRunner.js**: Tournament logic engine using `tournament-pairings` library
- **BracketStorage.js**: LocalStorage persistence with compression and optimization
- **URLBracketSharing.js**: URL-based bracket sharing with encoding/compression
- **StorageOptimizer.js**: Storage usage monitoring and automatic cleanup

### Data Flow Architecture

1. **Setup**: CSV upload → PapaParse → auto-detect columns → configure tournament options
2. **Tournament**: Create Tournament instance → present matchups → collect results → track history
3. **Results**: Display final rankings → export CSV → share via compressed URLs

### Storage System

Multi-layer approach: in-memory tournament state, LocalStorage persistence with debounced auto-save (10s intervals), and URL encoding for sharing. Large tournaments (>storage quota) skip auto-save to prevent quota errors.

### Performance Optimizations

- Debounced auto-save during rapid matchup sequences
- Pre-computed tournament structures for O(1) match lookups
- Participant index compression in storage
- Smart match ordering for balanced bracket progression

## Testing Rules

- Never ever use waitForTimeout (or sleeps) in playwright tests. Instead wait for specific content to be on the screen
- Feel free to use `rg` (ripgrep) for codebase searches, it works great
- Tests mock PapaParse, DOM APIs (URL, Blob), and browser functions (alert, confirm)
- Unit tests use Vitest with JSDOM environment
- E2E tests use Playwright against preview server (localhost:4173)
- Use mcp playwright to do manual interactive testing and validation
