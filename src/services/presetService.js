/**
 * Preset Service Layer for Ma'aser Tracker
 *
 * Manages note presets stored in the 'notePresets' IndexedDB object store.
 * Presets are short text labels (e.g. "Salary", "Charity Dinner") that users
 * can pick when entering income or donation records.
 *
 * Schema (notePresets store):
 *   id        — auto-increment integer (keyPath)
 *   text      — string
 *   type      — 'income' | 'donation'
 *   isDefault — boolean
 *   order     — number (sort position within the same type)
 *   createdAt — Unix timestamp (ms)
 */

import { initDB, PRESETS_STORE_NAME } from './db';

// ─── Default presets ──────────────────────────────────────────────────────────

export const DEFAULT_INCOME_PRESETS = [
  { text: 'Salary', type: 'income', isDefault: true, order: 0 },
  { text: 'Bonus', type: 'income', isDefault: true, order: 1 },
  { text: 'Gift', type: 'income', isDefault: true, order: 2 },
  { text: 'Freelance', type: 'income', isDefault: true, order: 3 },
  { text: 'Investment', type: 'income', isDefault: true, order: 4 },
  { text: 'Other', type: 'income', isDefault: true, order: 5 },
];

export const DEFAULT_DONATION_PRESETS = [
  { text: 'Charity Dinner', type: 'donation', isDefault: true, order: 0 },
  { text: 'Monthly Pledge', type: 'donation', isDefault: true, order: 1 },
  { text: 'Synagogue', type: 'donation', isDefault: true, order: 2 },
  { text: 'Food Bank', type: 'donation', isDefault: true, order: 3 },
  { text: 'Emergency Relief', type: 'donation', isDefault: true, order: 4 },
  { text: 'Other', type: 'donation', isDefault: true, order: 5 },
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get all presets for a given type, sorted by order ascending.
 *
 * @param {string} type - 'income' | 'donation'
 * @returns {Promise<Array>} Presets sorted by order
 */
export async function getPresetsByType(type) {
  try {
    const db = await initDB();
    const index = db.transaction(PRESETS_STORE_NAME).store.index('type');
    const presets = await index.getAll(type);
    return presets.sort((a, b) => a.order - b.order);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('PresetService: Failed to get presets by type', error);
    }
    throw error;
  }
}

/**
 * Add a new custom preset.
 *
 * @param {string} text - Preset label text
 * @param {string} type - 'income' | 'donation'
 * @returns {Promise<Object>} The stored preset (including auto-assigned id)
 */
export async function addPreset(text, type) {
  try {
    const db = await initDB();
    const existing = await getPresetsByType(type);
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.order)) : -1;

    const preset = {
      text,
      type,
      isDefault: false,
      order: maxOrder + 1,
      createdAt: Date.now(),
    };

    const id = await db.add(PRESETS_STORE_NAME, preset);
    const stored = { ...preset, id };

    if (import.meta.env.DEV) {
      console.log('PresetService: Preset added', id);
    }

    return stored;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('PresetService: Failed to add preset', error);
    }
    throw error;
  }
}

/**
 * Update fields of an existing preset.
 *
 * @param {number} id - Preset id (auto-increment key)
 * @param {Object} updates - Partial preset fields to apply
 * @returns {Promise<Object>} The updated preset
 * @throws {Error} If the preset does not exist
 */
export async function updatePreset(id, updates) {
  try {
    const db = await initDB();
    const existing = await db.get(PRESETS_STORE_NAME, id);

    if (!existing) {
      throw new Error(`Preset not found: ${id}`);
    }

    const updated = { ...existing, ...updates, id };
    await db.put(PRESETS_STORE_NAME, updated);

    if (import.meta.env.DEV) {
      console.log('PresetService: Preset updated', id);
    }

    return updated;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('PresetService: Failed to update preset', error);
    }
    throw error;
  }
}

/**
 * Delete a preset by id.
 * No-op if the preset does not exist.
 *
 * @param {number} id - Preset id
 * @returns {Promise<void>}
 */
export async function deletePreset(id) {
  try {
    const db = await initDB();
    await db.delete(PRESETS_STORE_NAME, id);

    if (import.meta.env.DEV) {
      console.log('PresetService: Preset deleted', id);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('PresetService: Failed to delete preset', error);
    }
    throw error;
  }
}

/**
 * Reorder presets by assigning each id a new order value equal to its index
 * in the provided array.
 *
 * @param {number[]} presetIds - Ordered list of preset ids (first = order 0)
 * @returns {Promise<void>}
 */
export async function reorderPresets(presetIds) {
  if (!presetIds || presetIds.length === 0) {
    return;
  }

  try {
    const db = await initDB();
    const tx = db.transaction(PRESETS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PRESETS_STORE_NAME);

    for (let i = 0; i < presetIds.length; i++) {
      const id = presetIds[i];
      const preset = await store.get(id);
      if (preset) {
        await store.put({ ...preset, order: i });
      }
    }

    await tx.done;

    if (import.meta.env.DEV) {
      console.log('PresetService: Presets reordered', presetIds);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('PresetService: Failed to reorder presets', error);
    }
    throw error;
  }
}

/**
 * Initialize default presets on first launch.
 * Checks if any presets exist; if none, inserts all defaults.
 * Safe to call on every app startup — idempotent.
 *
 * @returns {Promise<void>}
 */
export async function initializeDefaultPresets() {
  try {
    const db = await initDB();
    const count = await db.count(PRESETS_STORE_NAME);

    if (count > 0) {
      // Already initialized
      return;
    }

    const allDefaults = [...DEFAULT_INCOME_PRESETS, ...DEFAULT_DONATION_PRESETS];
    const now = Date.now();

    const tx = db.transaction(PRESETS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PRESETS_STORE_NAME);

    for (const preset of allDefaults) {
      await store.add({ ...preset, createdAt: now });
    }

    await tx.done;

    if (import.meta.env.DEV) {
      console.log('PresetService: Default presets initialized');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('PresetService: Failed to initialize default presets', error);
    }
    throw error;
  }
}

/**
 * Reset presets to defaults.
 * Clears all existing presets and re-inserts the defaults.
 *
 * @returns {Promise<void>}
 */
export async function resetDefaultPresets() {
  try {
    await clearAllPresets();
    const db = await initDB();
    const allDefaults = [...DEFAULT_INCOME_PRESETS, ...DEFAULT_DONATION_PRESETS];
    const now = Date.now();

    const tx = db.transaction(PRESETS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PRESETS_STORE_NAME);

    for (const preset of allDefaults) {
      await store.add({ ...preset, createdAt: now });
    }

    await tx.done;

    if (import.meta.env.DEV) {
      console.log('PresetService: Default presets restored');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('PresetService: Failed to reset default presets', error);
    }
    throw error;
  }
}

/**
 * Clear all presets from the store.
 * Primarily used in tests; also called by resetDefaultPresets.
 *
 * @returns {Promise<void>}
 */
export async function clearAllPresets() {
  try {
    const db = await initDB();
    await db.clear(PRESETS_STORE_NAME);

    if (import.meta.env.DEV) {
      console.log('PresetService: All presets cleared');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('PresetService: Failed to clear presets', error);
    }
    throw error;
  }
}
