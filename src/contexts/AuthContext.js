/**
 * Authentication Context
 *
 * Provides authentication state to the entire application.
 * Created separately from the provider for clean imports.
 */

import { createContext } from 'react';

export const AuthContext = createContext();
