# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend Development
- `npm run dev` - Start Vite development server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build

### Backend Development  
- `npm run server:dev` - Start server in development mode with auto-reload
- `npm run build:server` - Build server TypeScript to JavaScript
- `npm start` - Start production server (build frontend + run server)

### Testing
- `npm test` - Run unit tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e-ui` - Run Playwright tests with UI

## Workflow Notes

- I am already running `npm run dev` in another tab, you don't need to run it

## Application Architecture

**TaskSeeder** is a full-stack application with Vue 3 frontend and Express.js backend, offering multiple ranking algorithms to prioritize tasks through head-to-head comparisons. Users upload CSV files and choose from tournament brackets, double elimination, or QuickSort-based ranking methods. All tournaments are persisted in SQLite database with UUID-based storage.

### Core Components Structure

- **App.vue**: Root component managing view routing (main/about)
- **TournamentManager.vue**: Main orchestrator handling all tournament phases (setup → matchups → results)
- **TournamentProgress.vue**: Displays round/match progress during tournaments
- **TaskMatchup.vue**: Presents head-to-head task comparisons
- **About.vue**: Static about page with feature explanations

### Key Utilities

#### Frontend
- **TournamentRunner.ts**: Tournament logic engine with multiple algorithms:
  - Single/Double elimination tournaments using `tournament-pairings` library
  - QuickSort-based ranking with divide-and-conquer comparisons
- **TournamentAPI.ts**: API client for database tournament persistence
- **BracketSharingAPI.ts**: API client for bracket sharing functionality
- **BracketStorage.js**: LocalStorage persistence (legacy fallback)
- **URLBracketSharing.js**: URL-based bracket sharing (legacy fallback)
- **StorageOptimizer.js**: Storage usage monitoring and automatic cleanup

#### Backend
- **server/index.ts**: Express.js server serving both frontend and API
- **server/database.ts**: SQLite database operations for tournaments and shared brackets
- **server/routes/tournaments.ts**: Tournament CRUD API endpoints
- **server/routes/brackets.ts**: Bracket sharing API endpoints

### Data Flow Architecture

1. **Setup**: CSV upload → PapaParse → auto-detect columns → select algorithm (Tournament/Double/QuickSort)
2. **Persistence**: Save tournament with UUID to SQLite database via API
3. **Ranking**: Create algorithm instance → present strategic matchups → collect results → auto-save progress
4. **Results**: Display final rankings → export CSV → share via database-backed URLs

### Storage System

**Primary Storage (Database)**:
- SQLite database for all new tournaments with UUID-based identification
- Automatic persistence on tournament start, progress updates, and completion
- JSON storage of complete tournament state (tasks, matches, history, configuration)
- Database-backed sharing with expiration (30 days default)

**Fallback Storage (Legacy)**:
- LocalStorage persistence for compatibility with older tournaments
- URL-based sharing for smaller brackets (with size limitations)
- Automatic fallback if database operations fail

**Tournament Lifecycle**:
1. Tournament created → Save to database with UUID
2. Match completed → Auto-save progress to database
3. Tournament finished → Final state saved to database
4. Sharing → Create database-backed shareable link

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
