/**
 * Test Setup
 *
 * This file runs before all tests to configure the test environment
 */

import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import 'fake-indexeddb/auto';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Create localStorage mock with reset capability
let localStorageStore = {};

const localStorageMock = {
  getItem: (key) => localStorageStore[key] ?? null,
  setItem: (key, value) => {
    localStorageStore[key] = String(value);
  },
  removeItem: (key) => {
    delete localStorageStore[key];
  },
  clear: () => {
    localStorageStore = {};
  },
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: (index) => Object.keys(localStorageStore)[index] ?? null,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Also define on global for Node environment
global.localStorage = localStorageMock;

// Reset localStorage before each test to ensure clean state
beforeEach(() => {
  localStorageStore = {};
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Clear all mocks
  vi.clearAllMocks();
  // Clear localStorage
  localStorageStore = {};
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
