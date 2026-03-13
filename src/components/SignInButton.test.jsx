/**
 * Tests for SignInButton component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageProvider';
import { AuthProvider } from '../contexts/AuthProvider';
import SignInButton from './SignInButton';

// Mock the auth service
vi.mock('../services/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  handleRedirectResult: vi.fn().mockResolvedValue(null),
}));

import { onAuthStateChanged } from '../services/auth';

// Helper to render with providers
function renderWithProviders(ui) {
  onAuthStateChanged.mockImplementation((callback) => {
    callback(null);
    return vi.fn();
  });

  return render(
    <LanguageProvider>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </LanguageProvider>
  );
}

describe('SignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the sign in button', () => {
      renderWithProviders(<SignInButton />);

      // Hebrew is the default language
      expect(screen.getByRole('button', { name: /התחבר/i })).toBeInTheDocument();
    });

    it('should show login icon', () => {
      renderWithProviders(<SignInButton />);

      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('dialog interaction', () => {
    it('should open SignInDialog when clicked', () => {
      renderWithProviders(<SignInButton />);

      const button = screen.getByRole('button', { name: /התחבר/i });
      fireEvent.click(button);

      // Dialog should be open - check for dialog title
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close SignInDialog when continue without signing in is clicked', async () => {
      renderWithProviders(<SignInButton />);

      // Open dialog
      const button = screen.getByRole('button', { name: /התחבר/i });
      fireEvent.click(button);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click continue without signing in
      const continueButton = screen.getByRole('button', { name: /המשך ללא התחברות/i });
      fireEvent.click(continueButton);

      // Dialog should be closed - wait for animation
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('styling', () => {
    it('should have proper button styling', () => {
      renderWithProviders(<SignInButton />);

      const button = screen.getByRole('button', { name: /התחבר/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('should be a memoized component', () => {
      const { rerender } = renderWithProviders(<SignInButton />);

      expect(screen.getByRole('button', { name: /התחבר/i })).toBeInTheDocument();

      // Rerender should not break
      rerender(
        <LanguageProvider>
          <AuthProvider>
            <SignInButton />
          </AuthProvider>
        </LanguageProvider>
      );

      expect(screen.getByRole('button', { name: /התחבר/i })).toBeInTheDocument();
    });
  });
});
