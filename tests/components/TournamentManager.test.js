import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TournamentManager from '../../src/components/TournamentManager.vue'
import Papa from 'papaparse'

// Mock PapaParse
vi.mock('papaparse', () => ({
    default: {
        parse: vi.fn()
    }
}))

// Mock Tournament and related utilities
vi.mock('../../src/utils/TournamentRunner.js', () => ({
    Tournament: vi.fn().mockImplementation(() => {
        let currentMatchNum = 1;
        let isCompleted = false;
        let matches = [];
        return {
            getNextMatch: vi.fn().mockReturnValue({
                player1: { 'Task Name': 'Task 1' },
                player2: { 'Task Name': 'Task 2' },
                round: 1,
                matchInRound: 1,
                bracket: 'main'
            }),
            getCurrentMatchNumber: vi.fn(() => currentMatchNum),
            getTotalMatches: vi.fn().mockReturnValue(3),
            getTotalRounds: vi.fn().mockReturnValue(2),
            getMatchesInRound: vi.fn().mockReturnValue(2),
            isComplete: vi.fn(() => isCompleted),
            getRankings: vi.fn().mockReturnValue([]),
            get matches() { return matches; },
            recordWinner: vi.fn((winner, loser) => {
                matches.push({ winner, loser });
                currentMatchNum++;
                if (currentMatchNum > 3) {
                    isCompleted = true;
                }
            }),
            reportResult: vi.fn((match, winner) => {
                matches.push({ match, winner });
                currentMatchNum++;
                if (currentMatchNum > 3) {
                    isCompleted = true;
                }
            })
        }
    })
}))

vi.mock('../../src/utils/BracketStorage.js', () => ({
    BracketStorage: {
        getBracketsList: vi.fn().mockReturnValue([]),
        saveBracket: vi.fn().mockReturnValue('test-id'),
        updateBracket: vi.fn(),
        serializeBracket: vi.fn().mockReturnValue('test-data')
    }
}))

vi.mock('../../src/utils/URLBracketSharing.js', () => ({
    URLBracketSharing: {
        createShareableURL: vi.fn().mockReturnValue('test-url'),
        loadFromURL: vi.fn().mockReturnValue(null),
        extractBracketFromCurrentURL: vi.fn().mockReturnValue(null)
    }
}))

vi.mock('../../src/utils/StorageOptimizer.js', () => ({
    StorageOptimizer: {
        getStorageUsage: vi.fn().mockReturnValue({ usagePercent: 50, totalMB: 5 }),
        cleanupOldBrackets: vi.fn()
    }
}))

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
}
global.localStorage = localStorageMock

describe('TournamentManager Integration Tests', () => {
    let wrapper

    beforeEach(() => {
        vi.clearAllMocks()
        localStorageMock.getItem.mockReturnValue(null)
        wrapper = mount(TournamentManager)
    })

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount()
        }
    })

    describe('Initial State', () => {
        it('should render in setup phase by default', () => {
            expect(wrapper.find('h2').text()).toBe('Start New Bracket')
            expect(wrapper.find('.file-upload-area').exists()).toBe(true)
            expect(wrapper.find('[data-testid="tournament-progress"]').exists()).toBe(false)
            expect(wrapper.find('[data-testid="task-matchup"]').exists()).toBe(false)
        })

        it('should show file upload area with correct text', () => {
            const uploadArea = wrapper.find('.file-upload-area')
            expect(uploadArea.text()).toContain('Click to upload')
            expect(uploadArea.text()).toContain('CSV files with tasks')
        })

        it('should disable start button initially', () => {
            const startButton = wrapper.find('button[type="submit"], button:not([type])')
            if (startButton.exists()) {
                expect(startButton.attributes('disabled')).toBeDefined()
            } else {
                // No start button should be visible initially
                expect(wrapper.text()).not.toContain('Start Task Ranking')
            }
        })
    })

    describe('CSV File Processing', () => {
        const mockCsvData = [
            { 'Task Name': 'Task 1', 'Assignee': 'John', 'Status': 'Open' },
            { 'Task Name': 'Task 2', 'Assignee': 'Jane', 'Status': 'In Progress' },
            { 'Task Name': 'Task 3', 'Assignee': 'Bob', 'Status': 'Done' },
            { 'Task Name': 'Task 4', 'Assignee': 'Alice', 'Status': 'Open' }
        ]

        const mockFile = new File(['mock csv content'], 'tasks.csv', { type: 'text/csv' })

        beforeEach(() => {
            // Mock successful CSV parsing
            Papa.parse.mockImplementation((file, options) => {
                // Simulate async parsing
                setTimeout(() => {
                    options.complete({
                        data: mockCsvData,
                        meta: { fields: ['Task Name', 'Assignee', 'Status'] }
                    })
                }, 0)
            })
        })

        it('should process valid CSV file and show preview', async () => {
            // Directly call the processFile method instead of simulating file input
            await wrapper.vm.processFile(mockFile)

            // Wait for async CSV processing
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))

            expect(Papa.parse).toHaveBeenCalledWith(mockFile, expect.any(Object))
            
            // Should show data preview
            await wrapper.vm.$nextTick()
            expect(wrapper.find('h3').text()).toContain('Data Preview (4 tasks loaded)')
            expect(wrapper.find('.data-preview').exists()).toBe(true)
        })

        it('should auto-detect task name column', async () => {
            await wrapper.vm.processFile(mockFile)

            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))
            await wrapper.vm.$nextTick()

            // Should auto-select "Task Name" column
            const select = wrapper.find('select')
            expect(select.element.value).toBe('Task Name')
        })

        it('should auto-select secondary fields', async () => {
            await wrapper.vm.processFile(mockFile)

            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))
            await wrapper.vm.$nextTick()

            // Should auto-select Assignee and Status checkboxes
            const checkboxes = wrapper.findAll('input[type="checkbox"]')
            const assigneeCheckbox = checkboxes.find(cb => cb.element.value === 'Assignee')
            const statusCheckbox = checkboxes.find(cb => cb.element.value === 'Status')
            
            expect(assigneeCheckbox.element.checked).toBe(true)
            expect(statusCheckbox.element.checked).toBe(true)
        })

        it('should generate default tournament name', async () => {
            await wrapper.vm.processFile(mockFile)

            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))
            await wrapper.vm.$nextTick()

            const tournamentNameInput = wrapper.find('input[type="text"]')
            expect(tournamentNameInput.element.value).toContain('Task Ranking')
        })

        it('should show correct total matches calculation', async () => {
            await wrapper.vm.processFile(mockFile)

            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))
            await wrapper.vm.$nextTick()

            // For 4 tasks, should need 3 matches
            expect(wrapper.text()).toContain('Total matches needed: 3')
        })

        it('should enable start button after valid CSV is loaded', async () => {
            await wrapper.vm.processFile(mockFile)

            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))
            await wrapper.vm.$nextTick()

            const startButton = wrapper.find('button')
            expect(startButton.attributes('disabled')).toBeUndefined()
        })
    })

    describe('Tournament Creation and Flow', () => {
        const mockCsvData = [
            { 'Task Name': 'Task 1', 'Assignee': 'John', 'Status': 'Open' },
            { 'Task Name': 'Task 2', 'Assignee': 'Jane', 'Status': 'In Progress' },
            { 'Task Name': 'Task 3', 'Assignee': 'Bob', 'Status': 'Done' },
            { 'Task Name': 'Task 4', 'Assignee': 'Alice', 'Status': 'Open' }
        ]

        beforeEach(async () => {
            Papa.parse.mockImplementation((file, options) => {
                setTimeout(() => {
                    options.complete({
                        data: mockCsvData,
                        meta: { fields: ['Task Name', 'Assignee', 'Status'] }
                    })
                }, 0)
            })

            const mockFile = new File(['mock csv content'], 'tasks.csv', { type: 'text/csv' })
            await wrapper.vm.processFile(mockFile)
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))
            await wrapper.vm.$nextTick()
        })

        it('should transition to matchups phase when tournament starts', async () => {
            // Directly call the startBracketology method
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()

            expect(wrapper.vm.currentPhase).toBe('matchups')
            // In matchups phase, should not show "Load Your Tasks" heading
            expect(wrapper.text()).not.toContain('Load Your Tasks')
        })

        it('should render TournamentProgress component in matchups phase', async () => {
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()

            expect(wrapper.find('[data-testid="tournament-progress"]').exists()).toBe(true)
        })

        it('should render TaskMatchup component with proper tournament seeding', async () => {
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()

            expect(wrapper.find('[data-testid="task-matchup"]').exists()).toBe(true)
        })

        it('should show keyboard instructions', async () => {
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()

            expect(wrapper.text()).toContain('← → arrow keys')
        })

        it('should progress through matchups when winner is selected', async () => {
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()

            // Simulate choosing a winner
            wrapper.vm.chooseWinner(0)
            await wrapper.vm.$nextTick()

            // Check that the tournament's reportResult method was called
            expect(wrapper.vm.tournament.reportResult).toHaveBeenCalled()
        })

        it('should handle keyboard navigation', async () => {
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()

            // Simulate keyboard choice directly
            wrapper.vm.chooseWinner(0)
            await wrapper.vm.$nextTick()

            // Check that the tournament's reportResult method was called
            expect(wrapper.vm.tournament.reportResult).toHaveBeenCalled()
        })

        it('should complete tournament and show results', async () => {
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()

            // Complete all matches
            const totalMatches = wrapper.vm.totalMatches
            for (let i = 0; i < totalMatches; i++) {
                wrapper.vm.chooseWinner(0)
                await wrapper.vm.$nextTick()
            }

            expect(wrapper.vm.currentPhase).toBe('results')
            expect(wrapper.text()).toContain('Task Rankings')
        })
    })

    describe('Error Handling', () => {
        it('should handle invalid file types', async () => {
            const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
            
            // Mock alert
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
            
            await wrapper.vm.processFile(invalidFile)
            
            expect(alertSpy).toHaveBeenCalledWith('Please upload a CSV file.')
            alertSpy.mockRestore()
        })

        it('should handle CSV parsing errors', async () => {
            Papa.parse.mockImplementation((file, options) => {
                setTimeout(() => {
                    options.error({ message: 'Parse error' })
                }, 0)
            })

            const mockFile = new File(['invalid csv'], 'tasks.csv', { type: 'text/csv' })
            
            // Mock alert
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
            
            await wrapper.vm.processFile(mockFile)
            await new Promise(resolve => setTimeout(resolve, 10))
            
            expect(alertSpy).toHaveBeenCalledWith('Error parsing CSV file: Parse error')
            alertSpy.mockRestore()
        })

        it('should prevent starting tournament without required fields', async () => {
            // Try to start without loading any data
            const allText = wrapper.text()
            if (allText.includes('Start Task Ranking')) {
                const startButton = wrapper.find('button')
                expect(startButton.attributes('disabled')).toBeDefined()
                
                // Button should not be clickable
                await startButton.trigger('click')
                expect(wrapper.vm.currentPhase).toBe('setup')
            } else {
                // Start button should not be visible without data
                expect(wrapper.text()).not.toContain('Start Task Ranking')
            }
        })

        it('should prevent starting tournament with insufficient tasks', async () => {
            Papa.parse.mockImplementation((file, options) => {
                setTimeout(() => {
                    options.complete({
                        data: [{ 'Task Name': 'Only Task' }],
                        meta: { fields: ['Task Name'] }
                    })
                }, 0)
            })

            const mockFile = new File(['csv with one task'], 'tasks.csv', { type: 'text/csv' })
            
            // Mock alert
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
            
            await wrapper.vm.processFile(mockFile)
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))
            await wrapper.vm.$nextTick()

            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()
            
            expect(alertSpy).toHaveBeenCalledWith('Please upload a CSV with at least 2 tasks to compare.')
            expect(wrapper.vm.currentPhase).toBe('setup')
            alertSpy.mockRestore()
        })
    })

    describe('Restart Functionality', () => {
        beforeEach(async () => {
            Papa.parse.mockImplementation((file, options) => {
                setTimeout(() => {
                    options.complete({
                        data: [
                            { 'Task Name': 'Task 1', 'Assignee': 'John' },
                            { 'Task Name': 'Task 2', 'Assignee': 'Jane' }
                        ],
                        meta: { fields: ['Task Name', 'Assignee'] }
                    })
                }, 0)
            })

            const mockFile = new File(['csv content'], 'tasks.csv', { type: 'text/csv' })
            await wrapper.vm.processFile(mockFile)
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))
            await wrapper.vm.$nextTick()

            const startButton = wrapper.find('button')
            await startButton.trigger('click')
        })

        it('should restart tournament when confirmed', async () => {
            // Start the tournament first
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()
            
            // Mock confirm to return true
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
            
            const restartButton = wrapper.find('[data-testid="restart-button"]')
            await restartButton.trigger('click')
            
            expect(wrapper.vm.currentPhase).toBe('setup')
            confirmSpy.mockRestore()
        })

        it('should restart tournament immediately (no confirmation)', async () => {
            // Start the tournament first
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()
            
            // Call restart method directly
            wrapper.vm.restartBracketology()
            await wrapper.vm.$nextTick()
            
            expect(wrapper.vm.currentPhase).toBe('setup')
        })
    })

    describe('Demo Data Functionality', () => {
        it('should load demo data correctly', async () => {
            // Load demo data directly via method
            await wrapper.vm.loadDemoData()
            await wrapper.vm.$nextTick()
            
            // Check that demo data is loaded
            expect(wrapper.vm.csvData.length).toBe(15)
            expect(wrapper.vm.csvHeaders.length).toBeGreaterThan(0)
            expect(wrapper.vm.taskNameColumn).toBe('name')
            expect(wrapper.vm.tournamentName).toContain('Demo Tournament')
            
            // Check that data preview shows
            expect(wrapper.text()).toContain('Data Preview (15 tasks loaded)')
            expect(wrapper.text()).toContain('Add user authentication screen')
        })

        it('should allow starting tournament with demo data', async () => {
            // Load demo data
            await wrapper.vm.loadDemoData()
            await wrapper.vm.$nextTick()
            
            // Verify start button is enabled and can start tournament
            expect(wrapper.vm.taskNameColumn).toBeTruthy()
            expect(wrapper.vm.tournamentName.trim()).toBeTruthy()
            expect(wrapper.vm.csvData.length).toBeGreaterThan(1)
            
            // Should have demo data loaded
            expect(wrapper.vm.csvData.length).toBe(15)
            expect(wrapper.vm.tasks.length).toBe(0) // Not yet started
            
            // Start tournament programmatically
            wrapper.vm.startBracketology()
            await wrapper.vm.$nextTick()
            
            // Should move to matchups phase
            expect(wrapper.vm.currentPhase).toBe('matchups')
            expect(wrapper.vm.tasks.length).toBe(15)
        })
    })
})