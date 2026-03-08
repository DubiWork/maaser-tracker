/**
 * Settings Context
 *
 * Provides app-wide settings state to the entire application.
 * Created separately from the provider for clean imports.
 */

import { createContext } from 'react';

export const SettingsContext = createContext();
