// Test setup file
import { vi, expect } from 'vitest';
import { config } from '@vue/test-utils';

// Configure Vue Test Utils for better DOM handling
config.global.config.warnHandler = () => {};

// Mock PapaParse for tests
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
  },
}));

// Setup global DOM mocks
global.URL = {
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn(),
};
global.Blob = vi.fn((content, options) => ({ content, options }));

// Setup proper DOM environment
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true,
});

// Custom matchers
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});
