// Test setup file
import { vi } from 'vitest'

// Mock PapaParse for tests
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn()
  }
}))