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

**TaskSeeder** is a Vue 3 application offering multiple ranking algorithms to prioritize tasks through head-to-head comparisons. Users upload CSV files and choose from tournament brackets, double elimination, or QuickSort-based ranking methods.

### Core Components Structure

- **App.vue**: Root component managing view routing (main/about)
- **TournamentManager.vue**: Main orchestrator handling all tournament phases (setup → matchups → results)
- **TournamentProgress.vue**: Displays round/match progress during tournaments
- **TaskMatchup.vue**: Presents head-to-head task comparisons
- **About.vue**: Static about page with feature explanations

### Key Utilities

- **TournamentRunner.ts**: Tournament logic engine with multiple algorithms:
  - Single/Double elimination tournaments using `tournament-pairings` library
  - QuickSort-based ranking with divide-and-conquer comparisons
- **BracketStorage.js**: LocalStorage persistence with compression and optimization
- **URLBracketSharing.js**: URL-based bracket sharing with encoding/compression
- **StorageOptimizer.js**: Storage usage monitoring and automatic cleanup

### Data Flow Architecture

1. **Setup**: CSV upload → PapaParse → auto-detect columns → select algorithm (Tournament/Double/QuickSort)
2. **Ranking**: Create algorithm instance → present strategic matchups → collect results → track history
3. **Results**: Display final rankings → export CSV → share via compressed URLs

### Storage System

Multi-layer approach: in-memory algorithm state, LocalStorage persistence with debounced auto-save (10s intervals), and URL encoding for sharing. Large datasets (>storage quota) skip auto-save to prevent quota errors. All three algorithms (Tournament/Double/QuickSort) use the same storage system.

### Performance Optimizations

- Debounced auto-save during rapid matchup sequences
- Pre-computed tournament structures for O(1) match lookups
- QuickSort algorithm provides O(n log n) efficiency vs O(n²) full comparison
- Participant index compression in storage
- Smart match ordering for balanced bracket progression

## Ranking Algorithms

TaskSeeder offers three distinct ranking algorithms, each optimized for different use cases:

### Tournament Mode (Single Elimination)
- **Best for**: Finding a clear winner from any size list
- **Process**: Traditional bracket elimination (winner advances, loser eliminated)
- **Comparisons**: Exactly `n-1` matches required
- **Output**: Winner + elimination order
- **Efficiency**: Most efficient for determining top choice

### Double Elimination
- **Best for**: More robust winner selection with second chances
- **Process**: Losers bracket gives eliminated participants another chance
- **Comparisons**: Up to `2n-1` matches (typically fewer)
- **Output**: Winner + detailed elimination order
- **Efficiency**: Balanced between robustness and speed

### QuickSort Mode
- **Best for**: Complete priority rankings of medium-sized lists (10-50 tasks)
- **Process**: Divide-and-conquer algorithm using pivot comparisons
- **Comparisons**: Approximately `n log n` matches on average
- **Output**: Complete sorted order from highest to lowest priority
- **Efficiency**: Optimal for full rankings without excessive comparisons

#### QuickSort Algorithm Details
- **Implementation**: Custom QuickSort tournament class in `TournamentRunner.ts:852-1221`
- **Pivot Strategy**: Uses middle element to minimize worst-case scenarios
- **Partitioning**: Compares all elements against pivot, creating sub-partitions
- **State Management**: Maintains partition stack and comparison history
- **Completion**: Tournament ends when all partitions are fully sorted

#### When to Choose Each Algorithm
| Algorithm | Participants | Goal | Time Investment |
|-----------|-------------|------|-----------------|
| **Tournament** | Any size | Find winner | Minimal |
| **Double Elimination** | Any size | Robust winner | Moderate |
| **QuickSort** | 10-50 | Complete ranking | Efficient |

## Testing Rules

- Never ever use waitForTimeout (or sleeps) in playwright tests. Instead wait for specific content to be on the screen
- Feel free to use `rg` (ripgrep) for codebase searches, it works great
- Tests mock PapaParse, DOM APIs (URL, Blob), and browser functions (alert, confirm)
- Unit tests use Vitest with JSDOM environment
- E2E tests use Playwright against preview server (localhost:4173)
- Use mcp playwright to do manual interactive testing and validation
