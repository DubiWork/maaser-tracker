/**
 * Tests for SignInDialog component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageProvider';
import { AuthProvider } from '../contexts/AuthProvider';
import SignInDialog from './SignInDialog';

// Mock the auth service
vi.mock('../services/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

import { signInWithGoogle, onAuthStateChanged } from '../services/auth';

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

describe('SignInDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when open is true', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      renderWithProviders(<SignInDialog open={false} onClose={mockOnClose} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display the title', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      // Hebrew is default
      expect(screen.getByText(/התחבר לגישה מכל מקום/i)).toBeInTheDocument();
    });

    it('should display benefits list', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      // Check for Hebrew benefits text
      expect(screen.getByText(/גישה מכל מכשיר/i)).toBeInTheDocument();
      expect(screen.getByText(/גיבוי אוטומטי/i)).toBeInTheDocument();
      expect(screen.getByText(/סנכרון בין מכשירים/i)).toBeInTheDocument();
    });

    it('should display current status', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      expect(screen.getByText(/כרגע: אחסון מקומי בלבד/i)).toBeInTheDocument();
    });

    it('should display privacy note', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      expect(screen.getByText(/הנתונים שלך פרטיים ומוצפנים/i)).toBeInTheDocument();
    });

    it('should display sign in with Google button', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /התחבר עם Google/i })).toBeInTheDocument();
    });

    it('should display continue without signing in button', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /המשך ללא התחברות/i })).toBeInTheDocument();
    });
  });

  describe('sign in flow', () => {
    it('should call signInWithGoogle when sign in button is clicked', async () => {
      signInWithGoogle.mockResolvedValueOnce({
        user: { uid: 'test', email: 'test@example.com' },
        isNewUser: false,
      });

      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const signInButton = screen.getByRole('button', { name: /התחבר עם Google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(signInWithGoogle).toHaveBeenCalledTimes(1);
      });
    });

    it('should close dialog on successful sign in', async () => {
      signInWithGoogle.mockResolvedValueOnce({
        user: { uid: 'test', email: 'test@example.com' },
        isNewUser: false,
      });

      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const signInButton = screen.getByRole('button', { name: /התחבר עם Google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show loading state during sign in', async () => {
      // Make sign in take time
      signInWithGoogle.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const signInButton = screen.getByRole('button', { name: /התחבר עם Google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        // Button should show loading text
        expect(screen.getByRole('button', { name: /טוען/i })).toBeInTheDocument();
      });
    });

    it('should disable buttons during sign in', async () => {
      signInWithGoogle.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const signInButton = screen.getByRole('button', { name: /התחבר עם Google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /טוען/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /המשך ללא התחברות/i })).toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should display error on sign in failure', async () => {
      const error = new Error('Sign in failed');
      error.code = 'test-error';
      signInWithGoogle.mockRejectedValueOnce(error);

      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const signInButton = screen.getByRole('button', { name: /התחבר עם Google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should display popup blocked error message', async () => {
      const error = new Error('Popup blocked');
      error.code = 'popup-blocked';
      signInWithGoogle.mockRejectedValueOnce(error);

      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const signInButton = screen.getByRole('button', { name: /התחבר עם Google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/חלון ההתחברות נחסם/i)).toBeInTheDocument();
      });
    });

    it('should display network error message', async () => {
      const error = new Error('Network error');
      error.code = 'network-error';
      signInWithGoogle.mockRejectedValueOnce(error);

      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const signInButton = screen.getByRole('button', { name: /התחבר עם Google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/שגיאת רשת/i)).toBeInTheDocument();
      });
    });

    it('should not show error when user cancels', async () => {
      const error = new Error('Cancelled');
      error.code = 'cancelled';
      signInWithGoogle.mockRejectedValueOnce(error);

      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const signInButton = screen.getByRole('button', { name: /התחבר עם Google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(signInWithGoogle).toHaveBeenCalled();
      });

      // Should not show error alert for cancellation
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('closing', () => {
    it('should call onClose when continue without signing in is clicked', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const continueButton = screen.getByRole('button', { name: /המשך ללא התחברות/i });
      fireEvent.click(continueButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close during loading', async () => {
      signInWithGoogle.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const signInButton = screen.getByRole('button', { name: /התחבר עם Google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /טוען/i })).toBeDisabled();
      });

      // Try to close - should be disabled
      const continueButton = screen.getByRole('button', { name: /המשך ללא התחברות/i });
      fireEvent.click(continueButton);

      // onClose should not be called because button is disabled
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog role', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-labelledby for dialog title', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'sign-in-dialog-title');
    });
  });

  describe('RTL support', () => {
    it('should render correctly with Hebrew language', () => {
      renderWithProviders(<SignInDialog open={true} onClose={mockOnClose} />);

      // Verify dialog is rendered and contains Hebrew text
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/התחבר לגישה מכל מקום/);
    });
  });

  describe('memoization', () => {
    it('should be a memoized component', () => {
      const { rerender } = renderWithProviders(
        <SignInDialog open={true} onClose={mockOnClose} />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(
        <LanguageProvider>
          <AuthProvider>
            <SignInDialog open={true} onClose={mockOnClose} />
          </AuthProvider>
        </LanguageProvider>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
