import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../services/gdprDataService', () => ({
  exportUserData: vi.fn(),
  deleteAllCloudData: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123' } },
  isAuthenticated: vi.fn(() => true),
  getCurrentUserId: vi.fn(() => 'test-user-123'),
}));

vi.mock('./useEntries', () => ({
  useClearEntriesCache: vi.fn(() => vi.fn()),
}));

vi.mock('./useMigration', () => ({
  migrationQueryKeys: {
    status: (userId) => ['migration', 'status', userId],
  },
}));

import { useGdprActions } from './useGdprActions';
import { exportUserData, deleteAllCloudData } from '../services/gdprDataService';
import { getCurrentUserId, isAuthenticated } from '../lib/firebase';
import { useClearEntriesCache } from './useEntries';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function setupDownloadMocks() {
  const mockLink = { href: '', download: '', click: vi.fn() };
  const origCreateElement = document.createElement.bind(document);

  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'a') return mockLink;
    return origCreateElement(tag);
  });

  const origAppendChild = document.body.appendChild.bind(document.body);
  const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
    if (node === mockLink) return node;
    return origAppendChild(node);
  });

  const origRemoveChild = document.body.removeChild.bind(document.body);
  const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
    if (node === mockLink) return node;
    return origRemoveChild(node);
  });

  const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  return {
    mockLink,
    restore() {
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    },
  };
}

describe('useGdprActions', () => {
  let mockClearEntriesCache;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClearEntriesCache = vi.fn();
    useClearEntriesCache.mockReturnValue(mockClearEntriesCache);
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('test-user-123');
  });

  it('should return all expected properties', () => {
    const { result } = renderHook(() => useGdprActions(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty('handleExport');
    expect(result.current).toHaveProperty('isExporting');
    expect(result.current).toHaveProperty('exportSuccess');
    expect(result.current).toHaveProperty('exportError');
    expect(result.current).toHaveProperty('resetExport');
    expect(result.current).toHaveProperty('handleDelete');
    expect(result.current).toHaveProperty('isDeleting');
    expect(result.current).toHaveProperty('deleteSuccess');
    expect(result.current).toHaveProperty('deleteError');
    expect(result.current).toHaveProperty('resetDelete');
  });

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useGdprActions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportSuccess).toBe(false);
    expect(result.current.exportError).toBeNull();
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.deleteSuccess).toBe(false);
    expect(result.current.deleteError).toBeNull();
  });

  describe('handleExport', () => {
    it('should call exportUserData with the current userId', async () => {
      const mocks = setupDownloadMocks();
      const mockData = { exportedAt: '2026-01-01', schemaVersion: 1, entries: [] };
      exportUserData.mockResolvedValue(mockData);

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleExport();
      });

      await waitFor(() => {
        expect(exportUserData).toHaveBeenCalledWith('test-user-123');
      });

      mocks.restore();
    });

    it('should trigger file download on success', async () => {
      const mocks = setupDownloadMocks();
      const mockData = { exportedAt: '2026-01-01', schemaVersion: 1, entries: [{ id: 1 }] };
      exportUserData.mockResolvedValue(mockData);

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.exportSuccess).toBe(true);
      });

      expect(mocks.mockLink.click).toHaveBeenCalled();
      expect(mocks.mockLink.href).toBe('blob:mock-url');
      expect(mocks.mockLink.download).toMatch(/^maaser-tracker-export-/);

      mocks.restore();
    });

    it('should set exportSuccess to true on success', async () => {
      const mocks = setupDownloadMocks();
      exportUserData.mockResolvedValue({ exportedAt: '2026-01-01', schemaVersion: 1, entries: [] });

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.exportSuccess).toBe(true);
      });
      expect(result.current.isExporting).toBe(false);

      mocks.restore();
    });

    it('should set exportError on export failure', async () => {
      const error = new Error('Export failed');
      exportUserData.mockRejectedValue(error);

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.exportError).toBeTruthy();
      });
      expect(result.current.exportError.message).toBe('Export failed');
      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportSuccess).toBe(false);
    });

    it('should throw when user is not signed in', async () => {
      isAuthenticated.mockReturnValue(false);
      getCurrentUserId.mockReturnValue(null);

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.exportError).toBeTruthy();
      });
      expect(result.current.exportError.message).toBe('User must be signed in to export data');
      expect(exportUserData).not.toHaveBeenCalled();
    });
  });

  describe('handleDelete', () => {
    it('should call deleteAllCloudData with the current userId', async () => {
      deleteAllCloudData.mockResolvedValue({ deletedEntries: 10, migrationReset: true });

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleDelete();
      });

      await waitFor(() => {
        expect(deleteAllCloudData).toHaveBeenCalledWith('test-user-123');
      });
    });

    it('should clear entries cache on success', async () => {
      deleteAllCloudData.mockResolvedValue({ deletedEntries: 5, migrationReset: true });

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleDelete();
      });

      await waitFor(() => {
        expect(result.current.deleteSuccess).toBe(true);
      });
      expect(mockClearEntriesCache).toHaveBeenCalled();
    });

    it('should set deleteSuccess to true on success', async () => {
      deleteAllCloudData.mockResolvedValue({ deletedEntries: 0, migrationReset: true });

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleDelete();
      });

      await waitFor(() => {
        expect(result.current.deleteSuccess).toBe(true);
      });
      expect(result.current.isDeleting).toBe(false);
    });

    it('should set deleteError on delete failure', async () => {
      const error = new Error('Delete failed');
      deleteAllCloudData.mockRejectedValue(error);

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleDelete();
      });

      await waitFor(() => {
        expect(result.current.deleteError).toBeTruthy();
      });
      expect(result.current.deleteError.message).toBe('Delete failed');
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.deleteSuccess).toBe(false);
    });

    it('should throw when user is not signed in', async () => {
      isAuthenticated.mockReturnValue(false);
      getCurrentUserId.mockReturnValue(null);

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleDelete();
      });

      await waitFor(() => {
        expect(result.current.deleteError).toBeTruthy();
      });
      expect(result.current.deleteError.message).toBe('User must be signed in to delete data');
      expect(deleteAllCloudData).not.toHaveBeenCalled();
    });
  });

  describe('resetExport', () => {
    it('should clear export state', async () => {
      const error = new Error('fail');
      exportUserData.mockRejectedValue(error);

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.exportError).toBeTruthy();
      });

      act(() => {
        result.current.resetExport();
      });

      await waitFor(() => {
        expect(result.current.exportError).toBeNull();
      });
      expect(result.current.exportSuccess).toBe(false);
      expect(result.current.isExporting).toBe(false);
    });
  });

  describe('resetDelete', () => {
    it('should clear delete state', async () => {
      const error = new Error('fail');
      deleteAllCloudData.mockRejectedValue(error);

      const { result } = renderHook(() => useGdprActions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleDelete();
      });

      await waitFor(() => {
        expect(result.current.deleteError).toBeTruthy();
      });

      act(() => {
        result.current.resetDelete();
      });

      await waitFor(() => {
        expect(result.current.deleteError).toBeNull();
      });
      expect(result.current.deleteSuccess).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });
  });
});
