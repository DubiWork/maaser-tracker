/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase modules before importing
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' }))
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    name: 'test-auth'
  })),
  connectAuthEmulator: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({
    name: 'test-firestore'
  })),
  connectFirestoreEmulator: vi.fn()
}));

describe('Firebase Module', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Reset module cache to ensure fresh imports
    vi.resetModules();

    // Set up environment variables for testing
    import.meta.env.VITE_FIREBASE_API_KEY = 'test-api-key';
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
    import.meta.env.VITE_FIREBASE_PROJECT_ID = 'test-project';
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '123456789';
    import.meta.env.VITE_FIREBASE_APP_ID = 'test-app-id';
    import.meta.env.DEV = false;
    import.meta.env.VITE_USE_FIREBASE_EMULATOR = 'false';
  });

  describe('Firebase Initialization', () => {
    it('should initialize Firebase with correct config', async () => {
      const { initializeApp } = await import('firebase/app');
      await import('../lib/firebase.js');

      expect(initializeApp).toHaveBeenCalledTimes(1);
      expect(initializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test-project.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test-project.appspot.com',
        messagingSenderId: '123456789',
        appId: 'test-app-id'
      });
    });

    it('should initialize Auth and Firestore services', async () => {
      const { getAuth } = await import('firebase/auth');
      const { getFirestore } = await import('firebase/firestore');
      const firebase = await import('../lib/firebase.js');

      expect(getAuth).toHaveBeenCalledTimes(1);
      expect(getFirestore).toHaveBeenCalledTimes(1);
      expect(firebase.auth).toBeDefined();
      expect(firebase.db).toBeDefined();
    });

    it('should export default app instance', async () => {
      const firebase = await import('../lib/firebase.js');
      expect(firebase.default).toBeDefined();
      expect(firebase.default.name).toBe('test-app');
    });
  });

  describe('Environment Variable Validation', () => {
    it('should throw error when VITE_FIREBASE_API_KEY is missing', async () => {
      delete import.meta.env.VITE_FIREBASE_API_KEY;

      await expect(async () => {
        await import('../lib/firebase.js');
      }).rejects.toThrow(/Missing environment variables/);
    });

    it('should throw error when VITE_FIREBASE_PROJECT_ID is missing', async () => {
      delete import.meta.env.VITE_FIREBASE_PROJECT_ID;

      await expect(async () => {
        await import('../lib/firebase.js');
      }).rejects.toThrow(/Missing environment variables/);
    });

    it('should throw error when multiple env vars are missing', async () => {
      delete import.meta.env.VITE_FIREBASE_API_KEY;
      delete import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
      delete import.meta.env.VITE_FIREBASE_PROJECT_ID;

      await expect(async () => {
        await import('../lib/firebase.js');
      }).rejects.toThrow(/Missing environment variables/);
    });
  });

  describe('Firebase Emulator Support', () => {
    it('should not connect to emulators by default', async () => {
      const { connectAuthEmulator } = await import('firebase/auth');
      const { connectFirestoreEmulator } = await import('firebase/firestore');

      import.meta.env.DEV = true;
      import.meta.env.VITE_USE_FIREBASE_EMULATOR = 'false';

      await import('../lib/firebase.js');

      expect(connectAuthEmulator).not.toHaveBeenCalled();
      expect(connectFirestoreEmulator).not.toHaveBeenCalled();
    });

    it('should connect to emulators when enabled in dev mode', async () => {
      const { connectAuthEmulator } = await import('firebase/auth');
      const { connectFirestoreEmulator } = await import('firebase/firestore');

      import.meta.env.DEV = true;
      import.meta.env.VITE_USE_FIREBASE_EMULATOR = 'true';

      await import('../lib/firebase.js');

      expect(connectAuthEmulator).toHaveBeenCalledTimes(1);
      expect(connectAuthEmulator).toHaveBeenCalledWith(
        expect.anything(),
        'http://localhost:9099',
        { disableWarnings: true }
      );
      expect(connectFirestoreEmulator).toHaveBeenCalledTimes(1);
      expect(connectFirestoreEmulator).toHaveBeenCalledWith(
        expect.anything(),
        'localhost',
        8080
      );
    });

    it('should not connect to emulators in production mode', async () => {
      const { connectAuthEmulator } = await import('firebase/auth');
      const { connectFirestoreEmulator } = await import('firebase/firestore');

      import.meta.env.DEV = false;
      import.meta.env.VITE_USE_FIREBASE_EMULATOR = 'true';

      await import('../lib/firebase.js');

      expect(connectAuthEmulator).not.toHaveBeenCalled();
      expect(connectFirestoreEmulator).not.toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    it('isFirebaseInitialized should return true when Firebase is initialized', async () => {
      const firebase = await import('../lib/firebase.js');
      expect(firebase.isFirebaseInitialized()).toBe(true);
    });

    it('getCurrentUserId should return null when no user is authenticated', async () => {
      const { getAuth } = await import('firebase/auth');
      getAuth.mockReturnValue({
        currentUser: null
      });
      const firebase = await import('../lib/firebase.js');
      expect(firebase.getCurrentUserId()).toBeNull();
    });

    it('getCurrentUserId should return user ID when authenticated', async () => {
      const { getAuth } = await import('firebase/auth');
      getAuth.mockReturnValue({
        currentUser: { uid: 'test-user-123' }
      });

      const firebase = await import('../lib/firebase.js');
      expect(firebase.getCurrentUserId()).toBe('test-user-123');
    });

    it('isAuthenticated should return false when no user is authenticated', async () => {
      const { getAuth } = await import('firebase/auth');
      getAuth.mockReturnValue({
        currentUser: null
      });
      const firebase = await import('../lib/firebase.js');
      expect(firebase.isAuthenticated()).toBe(false);
    });

    it('isAuthenticated should return true when user is authenticated', async () => {
      const { getAuth } = await import('firebase/auth');
      getAuth.mockReturnValue({
        currentUser: { uid: 'test-user-123' }
      });

      const firebase = await import('../lib/firebase.js');
      expect(firebase.isAuthenticated()).toBe(true);
    });

    it('getProjectId should return the Firebase project ID', async () => {
      const firebase = await import('../lib/firebase.js');
      expect(firebase.getProjectId()).toBe('test-project');
    });
  });

  describe('Error Handling', () => {
    it('should handle Firebase initialization errors gracefully', async () => {
      vi.resetModules();
      const { initializeApp } = await import('firebase/app');
      const error = new Error('Firebase initialization failed');
      initializeApp.mockImplementationOnce(() => {
        throw error;
      });

      await expect(async () => {
        await import('../lib/firebase.js');
      }).rejects.toThrow('Firebase initialization failed');
    });

    it('should warn when emulator connection fails', async () => {
      vi.resetModules();
      const { connectAuthEmulator } = await import('firebase/auth');
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      connectAuthEmulator.mockImplementationOnce(() => {
        throw new Error('Emulator connection failed');
      });

      import.meta.env.DEV = true;
      import.meta.env.VITE_USE_FIREBASE_EMULATOR = 'true';

      await import('../lib/firebase.js');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to connect to Firebase Emulators:',
        'Emulator connection failed'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Console Logging', () => {
    it('should log success message on successful initialization', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');

      vi.resetModules();
      await import('../lib/firebase.js');

      expect(consoleLogSpy).toHaveBeenCalledWith('Firebase initialized successfully');

      consoleLogSpy.mockRestore();
    });

    it('should log emulator connection message when using emulators', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');

      import.meta.env.DEV = true;
      import.meta.env.VITE_USE_FIREBASE_EMULATOR = 'true';

      vi.resetModules();
      await import('../lib/firebase.js');

      expect(consoleLogSpy).toHaveBeenCalledWith('🔧 Connected to Firebase Emulators');

      consoleLogSpy.mockRestore();
    });

    it('should log error message when env vars are missing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      delete import.meta.env.VITE_FIREBASE_API_KEY;
      delete import.meta.env.VITE_FIREBASE_PROJECT_ID;

      vi.resetModules();
      try {
        await import('../lib/firebase.js');
      } catch {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Missing required Firebase environment variables:',
        expect.arrayContaining(['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID'])
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
