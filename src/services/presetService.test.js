/**
 * Tests for Preset Service Layer
 *
 * Covers CRUD operations, default preset initialization,
 * type filtering, reordering, and reset functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getPresetsByType,
  addPreset,
  updatePreset,
  deletePreset,
  reorderPresets,
  initializeDefaultPresets,
  resetDefaultPresets,
  DEFAULT_INCOME_PRESETS,
  DEFAULT_DONATION_PRESETS,
  clearAllPresets,
} from './presetService';

describe('Preset Service', () => {
  beforeEach(async () => {
    await clearAllPresets();
  });

  afterEach(async () => {
    await clearAllPresets();
  });

  describe('DEFAULT_INCOME_PRESETS', () => {
    it('should contain the expected income preset texts', () => {
      const texts = DEFAULT_INCOME_PRESETS.map((p) => p.text);
      expect(texts).toContain('Salary');
      expect(texts).toContain('Bonus');
      expect(texts).toContain('Gift');
      expect(texts).toContain('Freelance');
      expect(texts).toContain('Investment');
      expect(texts).toContain('Other');
    });

    it('should have isDefault set to true for all income presets', () => {
      DEFAULT_INCOME_PRESETS.forEach((p) => {
        expect(p.isDefault).toBe(true);
      });
    });

    it('should have type income for all default income presets', () => {
      DEFAULT_INCOME_PRESETS.forEach((p) => {
        expect(p.type).toBe('income');
      });
    });

    it('should have a sequential order field', () => {
      const orders = DEFAULT_INCOME_PRESETS.map((p) => p.order);
      orders.forEach((order, index) => {
        expect(order).toBe(index);
      });
    });
  });

  describe('DEFAULT_DONATION_PRESETS', () => {
    it('should contain the expected donation preset texts', () => {
      const texts = DEFAULT_DONATION_PRESETS.map((p) => p.text);
      expect(texts).toContain('Charity Dinner');
      expect(texts).toContain('Monthly Pledge');
      expect(texts).toContain('Synagogue');
      expect(texts).toContain('Food Bank');
      expect(texts).toContain('Emergency Relief');
      expect(texts).toContain('Other');
    });

    it('should have isDefault set to true for all donation presets', () => {
      DEFAULT_DONATION_PRESETS.forEach((p) => {
        expect(p.isDefault).toBe(true);
      });
    });

    it('should have type donation for all default donation presets', () => {
      DEFAULT_DONATION_PRESETS.forEach((p) => {
        expect(p.type).toBe('donation');
      });
    });
  });

  describe('initializeDefaultPresets', () => {
    it('should insert default income and donation presets on first call', async () => {
      await initializeDefaultPresets();

      const incomePresets = await getPresetsByType('income');
      const donationPresets = await getPresetsByType('donation');

      expect(incomePresets.length).toBe(DEFAULT_INCOME_PRESETS.length);
      expect(donationPresets.length).toBe(DEFAULT_DONATION_PRESETS.length);
    });

    it('should not insert duplicates when called twice', async () => {
      await initializeDefaultPresets();
      await initializeDefaultPresets();

      const incomePresets = await getPresetsByType('income');
      expect(incomePresets.length).toBe(DEFAULT_INCOME_PRESETS.length);
    });

    it('should mark inserted presets as isDefault true', async () => {
      await initializeDefaultPresets();

      const incomePresets = await getPresetsByType('income');
      incomePresets.forEach((p) => {
        expect(p.isDefault).toBe(true);
      });
    });

    it('should set a createdAt timestamp on each preset', async () => {
      await initializeDefaultPresets();

      const presets = await getPresetsByType('income');
      presets.forEach((p) => {
        expect(p.createdAt).toBeDefined();
        expect(typeof p.createdAt).toBe('number');
      });
    });
  });

  describe('getPresetsByType', () => {
    beforeEach(async () => {
      await initializeDefaultPresets();
    });

    it('should return only income presets when type is income', async () => {
      const presets = await getPresetsByType('income');
      presets.forEach((p) => expect(p.type).toBe('income'));
    });

    it('should return only donation presets when type is donation', async () => {
      const presets = await getPresetsByType('donation');
      presets.forEach((p) => expect(p.type).toBe('donation'));
    });

    it('should return presets sorted by order ascending', async () => {
      const presets = await getPresetsByType('income');
      for (let i = 1; i < presets.length; i++) {
        expect(presets[i].order).toBeGreaterThanOrEqual(presets[i - 1].order);
      }
    });

    it('should return empty array for unknown type', async () => {
      const presets = await getPresetsByType('unknown');
      expect(presets).toEqual([]);
    });

    it('should return empty array when no presets exist', async () => {
      await clearAllPresets();
      const presets = await getPresetsByType('income');
      expect(presets).toEqual([]);
    });
  });

  describe('addPreset', () => {
    it('should add a new income preset and return the full preset object', async () => {
      const preset = await addPreset('Consulting', 'income');

      expect(preset).toBeDefined();
      expect(preset.id).toBeDefined();
      expect(preset.text).toBe('Consulting');
      expect(preset.type).toBe('income');
      expect(preset.isDefault).toBe(false);
      expect(typeof preset.order).toBe('number');
      expect(typeof preset.createdAt).toBe('number');
    });

    it('should add a new donation preset', async () => {
      const preset = await addPreset('Local Shelter', 'donation');

      expect(preset.text).toBe('Local Shelter');
      expect(preset.type).toBe('donation');
    });

    it('should persist the preset so it appears in getPresetsByType', async () => {
      await addPreset('Consulting', 'income');

      const presets = await getPresetsByType('income');
      const found = presets.find((p) => p.text === 'Consulting');
      expect(found).toBeDefined();
    });

    it('should append preset at the end (highest order)', async () => {
      await initializeDefaultPresets();

      const beforePresets = await getPresetsByType('income');
      const maxOrderBefore = Math.max(...beforePresets.map((p) => p.order));

      const newPreset = await addPreset('Side Hustle', 'income');
      expect(newPreset.order).toBeGreaterThan(maxOrderBefore);
    });

    it('should assign order 0 when no presets of that type exist', async () => {
      const preset = await addPreset('First Preset', 'income');
      expect(preset.order).toBe(0);
    });
  });

  describe('updatePreset', () => {
    it('should update the text of an existing preset', async () => {
      const created = await addPreset('Old Text', 'income');
      const updated = await updatePreset(created.id, { text: 'New Text' });

      expect(updated.text).toBe('New Text');
      expect(updated.id).toBe(created.id);
      expect(updated.type).toBe('income');
    });

    it('should update the order of a preset', async () => {
      const created = await addPreset('Test Preset', 'income');
      const updated = await updatePreset(created.id, { order: 99 });

      expect(updated.order).toBe(99);
    });

    it('should persist updates so they appear in getPresetsByType', async () => {
      const created = await addPreset('Old Text', 'income');
      await updatePreset(created.id, { text: 'Updated Text' });

      const presets = await getPresetsByType('income');
      const found = presets.find((p) => p.id === created.id);
      expect(found.text).toBe('Updated Text');
    });

    it('should throw when preset id does not exist', async () => {
      await expect(updatePreset(99999, { text: 'Nope' })).rejects.toThrow();
    });

    it('should preserve fields not included in updates', async () => {
      const created = await addPreset('My Preset', 'income');
      const updated = await updatePreset(created.id, { text: 'Updated' });

      expect(updated.type).toBe('income');
      expect(updated.isDefault).toBe(false);
      expect(updated.createdAt).toBe(created.createdAt);
    });
  });

  describe('deletePreset', () => {
    it('should remove the preset from the store', async () => {
      const created = await addPreset('To Delete', 'income');
      await deletePreset(created.id);

      const presets = await getPresetsByType('income');
      const found = presets.find((p) => p.id === created.id);
      expect(found).toBeUndefined();
    });

    it('should not throw when deleting a non-existent id', async () => {
      await expect(deletePreset(99999)).resolves.not.toThrow();
    });

    it('should only remove the targeted preset, not others', async () => {
      const a = await addPreset('Keep This', 'income');
      const b = await addPreset('Delete This', 'income');

      await deletePreset(b.id);

      const presets = await getPresetsByType('income');
      expect(presets.find((p) => p.id === a.id)).toBeDefined();
      expect(presets.find((p) => p.id === b.id)).toBeUndefined();
    });
  });

  describe('reorderPresets', () => {
    it('should update order of each preset based on its array index', async () => {
      const a = await addPreset('A', 'income');
      const b = await addPreset('B', 'income');
      const c = await addPreset('C', 'income');

      // Reverse the order
      await reorderPresets([c.id, b.id, a.id]);

      const presets = await getPresetsByType('income');
      const updatedA = presets.find((p) => p.id === a.id);
      const updatedB = presets.find((p) => p.id === b.id);
      const updatedC = presets.find((p) => p.id === c.id);

      expect(updatedC.order).toBe(0);
      expect(updatedB.order).toBe(1);
      expect(updatedA.order).toBe(2);
    });

    it('should sort by the new order after reordering', async () => {
      const a = await addPreset('A', 'income');
      const b = await addPreset('B', 'income');
      const c = await addPreset('C', 'income');

      await reorderPresets([c.id, a.id, b.id]);

      const presets = await getPresetsByType('income');
      expect(presets[0].id).toBe(c.id);
      expect(presets[1].id).toBe(a.id);
      expect(presets[2].id).toBe(b.id);
    });

    it('should handle empty array without error', async () => {
      await expect(reorderPresets([])).resolves.not.toThrow();
    });
  });

  describe('resetDefaultPresets', () => {
    it('should delete all existing presets and re-insert defaults', async () => {
      await initializeDefaultPresets();
      await addPreset('Custom Preset', 'income');

      await resetDefaultPresets();

      const incomePresets = await getPresetsByType('income');
      const hasCustom = incomePresets.some((p) => p.text === 'Custom Preset');
      expect(hasCustom).toBe(false);
      expect(incomePresets.length).toBe(DEFAULT_INCOME_PRESETS.length);
    });

    it('should restore default donation presets too', async () => {
      await initializeDefaultPresets();
      await addPreset('Custom Donation', 'donation');

      await resetDefaultPresets();

      const donationPresets = await getPresetsByType('donation');
      expect(donationPresets.length).toBe(DEFAULT_DONATION_PRESETS.length);
    });

    it('should work even when called on an empty store', async () => {
      await expect(resetDefaultPresets()).resolves.not.toThrow();

      const incomePresets = await getPresetsByType('income');
      expect(incomePresets.length).toBe(DEFAULT_INCOME_PRESETS.length);
    });
  });
});
