/**
 * Tests for usePresets hooks
 *
 * Tests cover:
 * - Fetching presets by type
 * - CRUD mutations (add, update, delete, reorder)
 * - Cache invalidation after mutations
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock preset service
vi.mock('../services/presetService', () => ({
  getPresetsByType: vi.fn(),
  addPreset: vi.fn(),
  updatePreset: vi.fn(),
  deletePreset: vi.fn(),
  reorderPresets: vi.fn(),
  initializeDefaultPresets: vi.fn(),
}));

import {
  getPresetsByType,
  addPreset,
  updatePreset,
  deletePreset,
  reorderPresets,
} from '../services/presetService';

import {
  usePresets,
  useAddPreset,
  useUpdatePreset,
  useDeletePreset,
  useReorderPresets,
  presetQueryKeys,
} from './usePresets';

// Sample data
const mockIncomePresets = [
  { id: 1, text: 'Salary', type: 'income', isDefault: true, order: 0, createdAt: 1000 },
  { id: 2, text: 'Bonus', type: 'income', isDefault: true, order: 1, createdAt: 1001 },
];

const mockDonationPresets = [
  { id: 3, text: 'Charity Dinner', type: 'donation', isDefault: true, order: 0, createdAt: 1002 },
];

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('presetQueryKeys', () => {
  it('should generate correct query keys', () => {
    expect(presetQueryKeys.all).toEqual(['presets']);
    expect(presetQueryKeys.lists()).toEqual(['presets', 'list']);
    expect(presetQueryKeys.byType('income')).toEqual(['presets', 'list', 'income']);
    expect(presetQueryKeys.byType('donation')).toEqual(['presets', 'list', 'donation']);
  });
});

describe('usePresets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch income presets', async () => {
    getPresetsByType.mockResolvedValue(mockIncomePresets);

    const { result } = renderHook(() => usePresets('income'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getPresetsByType).toHaveBeenCalledWith('income');
    expect(result.current.data).toEqual(mockIncomePresets);
  });

  it('should fetch donation presets', async () => {
    getPresetsByType.mockResolvedValue(mockDonationPresets);

    const { result } = renderHook(() => usePresets('donation'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getPresetsByType).toHaveBeenCalledWith('donation');
    expect(result.current.data).toEqual(mockDonationPresets);
  });

  it('should not run query when type is not provided', () => {
    const { result } = renderHook(() => usePresets(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(getPresetsByType).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    getPresetsByType.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => usePresets('income'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useAddPreset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add an income preset', async () => {
    const newPreset = { id: 10, text: 'Consulting', type: 'income', isDefault: false, order: 2, createdAt: 2000 };
    addPreset.mockResolvedValue(newPreset);

    const { result } = renderHook(() => useAddPreset(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ text: 'Consulting', type: 'income' });
    });

    expect(addPreset).toHaveBeenCalledWith('Consulting', 'income');
  });

  it('should add a donation preset', async () => {
    const newPreset = { id: 11, text: 'Local Shelter', type: 'donation', isDefault: false, order: 3, createdAt: 2001 };
    addPreset.mockResolvedValue(newPreset);

    const { result } = renderHook(() => useAddPreset(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ text: 'Local Shelter', type: 'donation' });
    });

    expect(addPreset).toHaveBeenCalledWith('Local Shelter', 'donation');
  });

  it('should expose standard mutation API', () => {
    addPreset.mockResolvedValue({});

    const { result } = renderHook(() => useAddPreset(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBeDefined();
    expect(result.current.isError).toBeDefined();
  });

  it('should handle mutation error', async () => {
    addPreset.mockRejectedValue(new Error('Failed to add'));

    const { result } = renderHook(() => useAddPreset(), {
      wrapper: createWrapper(),
    });

    await expect(async () => {
      await act(async () => {
        await result.current.mutateAsync({ text: 'Test', type: 'income' });
      });
    }).rejects.toThrow('Failed to add');
  });
});

describe('useUpdatePreset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update a preset', async () => {
    const updatedPreset = { id: 1, text: 'Updated Salary', type: 'income', isDefault: true, order: 0, createdAt: 1000 };
    updatePreset.mockResolvedValue(updatedPreset);

    const { result } = renderHook(() => useUpdatePreset(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 1, updates: { text: 'Updated Salary' } });
    });

    expect(updatePreset).toHaveBeenCalledWith(1, { text: 'Updated Salary' });
  });

  it('should handle update error', async () => {
    updatePreset.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useUpdatePreset(), {
      wrapper: createWrapper(),
    });

    await expect(async () => {
      await act(async () => {
        await result.current.mutateAsync({ id: 99, updates: { text: 'Nope' } });
      });
    }).rejects.toThrow('Update failed');
  });
});

describe('useDeletePreset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a preset by id', async () => {
    deletePreset.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeletePreset(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(deletePreset).toHaveBeenCalledWith(1);
  });

  it('should handle delete error', async () => {
    deletePreset.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useDeletePreset(), {
      wrapper: createWrapper(),
    });

    await expect(async () => {
      await act(async () => {
        await result.current.mutateAsync(99);
      });
    }).rejects.toThrow('Delete failed');
  });
});

describe('useReorderPresets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call reorderPresets with the provided id array', async () => {
    reorderPresets.mockResolvedValue(undefined);

    const { result } = renderHook(() => useReorderPresets(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync([3, 1, 2]);
    });

    expect(reorderPresets).toHaveBeenCalledWith([3, 1, 2]);
  });

  it('should handle reorder error', async () => {
    reorderPresets.mockRejectedValue(new Error('Reorder failed'));

    const { result } = renderHook(() => useReorderPresets(), {
      wrapper: createWrapper(),
    });

    await expect(async () => {
      await act(async () => {
        await result.current.mutateAsync([1, 2]);
      });
    }).rejects.toThrow('Reorder failed');
  });
});

describe('cache invalidation', () => {
  it('should invalidate preset queries after addPreset mutation', async () => {
    const newPreset = { id: 10, text: 'New', type: 'income', isDefault: false, order: 0, createdAt: 3000 };
    addPreset.mockResolvedValue(newPreset);
    getPresetsByType.mockResolvedValue([newPreset]);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAddPreset(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ text: 'New', type: 'income' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: presetQueryKeys.all })
    );
  });

  it('should invalidate preset queries after deletePreset mutation', async () => {
    deletePreset.mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useDeletePreset(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: presetQueryKeys.all })
    );
  });
});
