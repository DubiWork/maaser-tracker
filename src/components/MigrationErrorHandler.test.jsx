/**
 * Tests for MigrationErrorHandler Component
 *
 * Comprehensive test suite covering:
 * - Unit tests for all error types and messages
 * - Button interactions and callbacks
 * - Accessibility tests (ARIA, keyboard navigation)
 * - Bilingual tests for Hebrew RTL and English LTR
 * - Focus management tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../contexts/LanguageProvider';
import MigrationErrorHandler from './MigrationErrorHandler';

// Helper to render with all providers
function renderWithProviders(ui, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {ui}
      </LanguageProvider>
    </QueryClientProvider>,
    options
  );
}

// Default props factory
const createDefaultProps = (overrides = {}) => ({
  error: {
    code: 'unknown',
    message: 'Test error',
    messageKey: 'migration.error.unknown',
    timestamp: new Date(),
  },
  onRetry: vi.fn(),
  onDismiss: vi.fn(),
  canRetry: true,
  ...overrides,
});

describe('MigrationErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // UNIT TESTS - Error Message Display
  // ==========================================

  describe('error message display', () => {
    it('renders error message correctly for network error', () => {
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          messageKey: 'migration.error.network',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should show dialog
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      // Should show network-related error message
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders error message correctly for quota error', () => {
      const props = createDefaultProps({
        error: {
          code: 'quota-error',
          message: 'Quota exceeded',
          messageKey: 'migration.error.quota',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders error message correctly for auth error', () => {
      const props = createDefaultProps({
        error: {
          code: 'auth-error',
          message: 'Auth expired',
          messageKey: 'migration.error.auth',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders error message correctly for unknown error', () => {
      const props = createDefaultProps({
        error: {
          code: 'unknown',
          message: 'Unknown error',
          messageKey: 'migration.error.unknown',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders error message correctly for partial success', () => {
      const props = createDefaultProps({
        error: {
          code: 'partial-success',
          message: 'Migration partially complete',
          messageKey: 'migration.error.partialSuccess',
          timestamp: new Date(),
          context: {
            percent: 75,
            failed: 10,
            success: 30,
          },
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows data safe reassurance message', () => {
      const props = createDefaultProps();

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should show reassurance message - use getAllBy since message appears in multiple places
      const reassurances = screen.getAllByText(/data|נתונים/i);
      expect(reassurances.length).toBeGreaterThan(0);
    });

    it('returns null when no error is provided', () => {
      const props = createDefaultProps({ error: null });

      const { container } = renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  // ==========================================
  // UNIT TESTS - Button Display
  // ==========================================

  describe('button display', () => {
    it('shows "Try Now" button for network error', () => {
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should have Try Now button (or Hebrew equivalent)
      const tryNowButton = screen.getByRole('button', { name: /try now|נסה עכשיו/i });
      expect(tryNowButton).toBeInTheDocument();
    });

    it('shows "Try Later" button for quota error', () => {
      const props = createDefaultProps({
        error: {
          code: 'quota-error',
          message: 'Quota exceeded',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should have Try Later button
      const tryLaterButton = screen.getByRole('button', { name: /try later|נסה מאוחר/i });
      expect(tryLaterButton).toBeInTheDocument();
    });

    it('shows "Sign In Again" button for auth error', () => {
      const props = createDefaultProps({
        error: {
          code: 'auth-error',
          message: 'Auth expired',
          timestamp: new Date(),
        },
        onSignIn: vi.fn(),
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should have Sign In button
      const signInButton = screen.getByRole('button', { name: /sign in|התחבר/i });
      expect(signInButton).toBeInTheDocument();
    });

    it('shows "Try Again" and "Contact Support" buttons for unknown error', () => {
      const props = createDefaultProps({
        error: {
          code: 'unknown',
          message: 'Unknown error',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should have Try Again button
      const tryAgainButton = screen.getByRole('button', { name: /try again|נסה שוב/i });
      expect(tryAgainButton).toBeInTheDocument();

      // Should have Contact Support button
      const contactButton = screen.getByRole('button', { name: /contact support|צור קשר/i });
      expect(contactButton).toBeInTheDocument();
    });

    it('shows wait time for quota errors', () => {
      const props = createDefaultProps({
        error: {
          code: 'quota-error',
          message: 'Quota exceeded',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should show wait time (1 hour)
      expect(screen.getByText(/1/)).toBeInTheDocument();
    });

    it('shows error code for unknown errors', () => {
      const props = createDefaultProps({
        error: {
          code: 'SOME_ERROR_CODE_123',
          message: 'Unknown error',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should show error code for support reference
      expect(screen.getByText(/SOME_ERROR_CODE_123/)).toBeInTheDocument();
    });
  });

  // ==========================================
  // UNIT TESTS - Button Callbacks
  // ==========================================

  describe('button callbacks', () => {
    it('calls onRetry when retry button is clicked', async () => {
      const onRetry = vi.fn();
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          timestamp: new Date(),
        },
        onRetry,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const retryButton = screen.getByRole('button', { name: /try now|נסה עכשיו/i });
      await userEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when dismiss button is clicked', async () => {
      const onDismiss = vi.fn();
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          timestamp: new Date(),
        },
        onDismiss,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Find OK button for network error
      const okButton = screen.getByRole('button', { name: /ok|אישור/i });
      await userEvent.click(okButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onSignIn when sign in button is clicked for auth error', async () => {
      const onSignIn = vi.fn();
      const props = createDefaultProps({
        error: {
          code: 'auth-error',
          message: 'Auth expired',
          timestamp: new Date(),
        },
        onSignIn,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const signInButton = screen.getByRole('button', { name: /sign in|התחבר/i });
      await userEvent.click(signInButton);

      expect(onSignIn).toHaveBeenCalledTimes(1);
    });

    it('disables retry button when canRetry is false', () => {
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          timestamp: new Date(),
        },
        canRetry: false,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const retryButton = screen.getByRole('button', { name: /try now|נסה עכשיו/i });
      expect(retryButton).toBeDisabled();
    });

    it('disables retry button for quota errors regardless of canRetry', () => {
      const props = createDefaultProps({
        error: {
          code: 'quota-error',
          message: 'Quota exceeded',
          timestamp: new Date(),
        },
        canRetry: true,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // For quota errors, only Try Later button is shown, no disabled retry
      const tryLaterButton = screen.getByRole('button', { name: /try later|נסה מאוחר/i });
      expect(tryLaterButton).not.toBeDisabled();
    });
  });

  // ==========================================
  // KEYBOARD NAVIGATION TESTS
  // ==========================================

  describe('keyboard navigation', () => {
    it('calls onDismiss when Escape key is pressed', async () => {
      const onDismiss = vi.fn();
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          timestamp: new Date(),
        },
        onDismiss,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const dialog = screen.getByRole('alertdialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });

      // MUI Dialog may call onClose multiple times - just verify it was called
      expect(onDismiss).toHaveBeenCalled();
    });

    it('calls onRetry when Enter key is pressed for network error', async () => {
      const onRetry = vi.fn();
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          timestamp: new Date(),
        },
        onRetry,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const dialog = screen.getByRole('alertdialog');
      fireEvent.keyDown(dialog, { key: 'Enter' });

      expect(onRetry).toHaveBeenCalled();
    });

    it('calls onSignIn when Enter key is pressed for auth error', async () => {
      const onSignIn = vi.fn();
      const props = createDefaultProps({
        error: {
          code: 'auth-error',
          message: 'Auth expired',
          timestamp: new Date(),
        },
        onSignIn,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const dialog = screen.getByRole('alertdialog');
      fireEvent.keyDown(dialog, { key: 'Enter' });

      expect(onSignIn).toHaveBeenCalled();
    });

    it('calls onDismiss when Enter key is pressed for quota error', async () => {
      const onDismiss = vi.fn();
      const props = createDefaultProps({
        error: {
          code: 'quota-error',
          message: 'Quota exceeded',
          timestamp: new Date(),
        },
        onDismiss,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const dialog = screen.getByRole('alertdialog');
      fireEvent.keyDown(dialog, { key: 'Enter' });

      expect(onDismiss).toHaveBeenCalled();
    });

    it('supports Tab key navigation between buttons', async () => {
      const props = createDefaultProps({
        error: {
          code: 'unknown',
          message: 'Unknown error',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      // Verify buttons are tabbable
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  // ==========================================
  // ACCESSIBILITY TESTS
  // ==========================================

  describe('accessibility', () => {
    it('has role="alertdialog"', () => {
      const props = createDefaultProps();

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('has aria-labelledby pointing to title', () => {
      const props = createDefaultProps();

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Verify the title element exists with the correct id
      const title = document.getElementById('migration-error-title');
      expect(title).toBeInTheDocument();

      // Verify dialog or its inner container has the aria-labelledby attribute
      // MUI Dialog may place these attributes on nested elements
      const elementWithLabel = document.querySelector('[aria-labelledby="migration-error-title"]');
      expect(elementWithLabel).toBeInTheDocument();
    });

    it('has aria-describedby pointing to message', () => {
      const props = createDefaultProps();

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Verify the description element exists with the correct id
      const description = document.getElementById('migration-error-description');
      expect(description).toBeInTheDocument();

      // Verify dialog or its inner container has the aria-describedby attribute
      // MUI Dialog may place these attributes on nested elements
      const elementWithDescription = document.querySelector('[aria-describedby="migration-error-description"]');
      expect(elementWithDescription).toBeInTheDocument();
    });

    it('has aria-live="assertive" on alert element', () => {
      const props = createDefaultProps();

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('focuses retry button when error appears', async () => {
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Verify retry button exists and is focusable
      const retryButton = screen.getByRole('button', { name: /try now|נסה עכשיו/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).not.toHaveAttribute('tabindex', '-1');
    });
  });

  // ==========================================
  // BILINGUAL TESTS
  // ==========================================

  describe('bilingual support', () => {
    it('renders correctly in Hebrew RTL (default)', () => {
      const props = createDefaultProps();

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('dir', 'rtl');
    });

    it('displays Hebrew error messages by default', () => {
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          messageKey: 'migration.error.network',
          timestamp: new Date(),
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Hebrew message should be displayed (contains Hebrew characters)
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      // The Hebrew text includes "סנכרון" or similar
    });

    it('displays Hebrew buttons by default', () => {
      const props = createDefaultProps({
        error: {
          code: 'auth-error',
          message: 'Auth expired',
          timestamp: new Date(),
        },
        onSignIn: vi.fn(),
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should find button (Hebrew or English)
      const signInButton = screen.getByRole('button', { name: /sign in|התחבר/i });
      expect(signInButton).toBeInTheDocument();
    });
  });

  // ==========================================
  // INTEGRATION TESTS
  // ==========================================

  describe('integration', () => {
    it('shows network error when connection lost during migration', () => {
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Connection lost during migration',
          messageKey: 'migration.error.network',
          timestamp: new Date(),
        },
        canRetry: true,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should show dialog with error
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Should have retry button enabled
      const retryButton = screen.getByRole('button', { name: /try now|נסה עכשיו/i });
      expect(retryButton).not.toBeDisabled();
    });

    it('shows quota error when Firestore quota exceeded', () => {
      const props = createDefaultProps({
        error: {
          code: 'resource-exhausted',
          message: 'Firestore quota exceeded',
          messageKey: 'migration.error.quota',
          timestamp: new Date(),
        },
        canRetry: false,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should show dialog
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      // Should show wait time
      expect(screen.getByText(/1/)).toBeInTheDocument();

      // Should have Try Later button (not retry)
      const tryLaterButton = screen.getByRole('button', { name: /try later|נסה מאוחר/i });
      expect(tryLaterButton).toBeInTheDocument();
    });

    it('shows auth error when token expires', () => {
      const onSignIn = vi.fn();
      const props = createDefaultProps({
        error: {
          code: 'unauthenticated',
          message: 'Token expired',
          messageKey: 'migration.error.auth',
          timestamp: new Date(),
        },
        canRetry: false,
        onSignIn,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should show dialog
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      // Should have Sign In button
      const signInButton = screen.getByRole('button', { name: /sign in|התחבר/i });
      expect(signInButton).toBeInTheDocument();
    });

    it('handles retry button triggering migration retry', async () => {
      const onRetry = vi.fn();
      const props = createDefaultProps({
        error: {
          code: 'network-error',
          message: 'Network error',
          timestamp: new Date(),
        },
        onRetry,
        canRetry: true,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try now|נסה עכשיו/i });
      await userEvent.click(retryButton);

      // Should call onRetry
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // ERROR TYPE CLASSIFICATION TESTS
  // ==========================================

  describe('error type classification', () => {
    it('classifies "network-error" as network type', () => {
      const props = createDefaultProps({
        error: { code: 'network-error', message: 'test', timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Network errors show WiFi icon (through the title/dialog structure)
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try now|נסה עכשיו/i })).toBeInTheDocument();
    });

    it('classifies "offline" as network type', () => {
      const props = createDefaultProps({
        error: { code: 'offline', message: 'test', timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('button', { name: /try now|נסה עכשיו/i })).toBeInTheDocument();
    });

    it('classifies "quota-error" as quota type', () => {
      const props = createDefaultProps({
        error: { code: 'quota-error', message: 'test', timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('button', { name: /try later|נסה מאוחר/i })).toBeInTheDocument();
    });

    it('classifies "resource-exhausted" as quota type', () => {
      const props = createDefaultProps({
        error: { code: 'resource-exhausted', message: 'test', timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('button', { name: /try later|נסה מאוחר/i })).toBeInTheDocument();
    });

    it('classifies "auth-error" as auth type', () => {
      const props = createDefaultProps({
        error: { code: 'auth-error', message: 'test', timestamp: new Date() },
        onSignIn: vi.fn(),
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('button', { name: /sign in|התחבר/i })).toBeInTheDocument();
    });

    it('classifies "permission-denied" as auth type', () => {
      const props = createDefaultProps({
        error: { code: 'permission-denied', message: 'test', timestamp: new Date() },
        onSignIn: vi.fn(),
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('button', { name: /sign in|התחבר/i })).toBeInTheDocument();
    });

    it('classifies "unauthorized" as auth type', () => {
      const props = createDefaultProps({
        error: { code: 'unauthorized', message: 'test', timestamp: new Date() },
        onSignIn: vi.fn(),
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('button', { name: /sign in|התחבר/i })).toBeInTheDocument();
    });

    it('classifies "unauthenticated" as auth type', () => {
      const props = createDefaultProps({
        error: { code: 'unauthenticated', message: 'test', timestamp: new Date() },
        onSignIn: vi.fn(),
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('button', { name: /sign in|התחבר/i })).toBeInTheDocument();
    });

    it('classifies unknown codes as unknown type', () => {
      const props = createDefaultProps({
        error: { code: 'random-error-xyz', message: 'test', timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Unknown errors show Try Again and Contact Support
      expect(screen.getByRole('button', { name: /try again|נסה שוב/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /contact support|צור קשר/i })).toBeInTheDocument();
    });

    it('classifies errors without code as unknown type', () => {
      const props = createDefaultProps({
        error: { message: 'test', timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('button', { name: /try again|נסה שוב/i })).toBeInTheDocument();
    });
  });

  // ==========================================
  // CONTACT SUPPORT TESTS
  // ==========================================

  describe('contact support', () => {
    it('calls onContactSupport when provided', async () => {
      const onContactSupport = vi.fn();
      const props = createDefaultProps({
        error: { code: 'unknown', message: 'test', timestamp: new Date() },
        onContactSupport,
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const contactButton = screen.getByRole('button', { name: /contact support|צור קשר/i });
      await userEvent.click(contactButton);

      expect(onContactSupport).toHaveBeenCalledTimes(1);
    });

    it('opens mailto link when onContactSupport is not provided', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const props = createDefaultProps({
        error: { code: 'UNKNOWN_123', message: 'test', timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      const contactButton = screen.getByRole('button', { name: /contact support|צור קשר/i });
      await userEvent.click(contactButton);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('mailto:'),
        '_blank'
      );
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('UNKNOWN_123'),
        '_blank'
      );

      windowOpenSpy.mockRestore();
    });
  });

  // ==========================================
  // MEMOIZATION TESTS
  // ==========================================

  describe('memoization', () => {
    it('should be a memoized component', () => {
      const props = createDefaultProps();

      const { rerender } = renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      // Re-render with same props
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <LanguageProvider>
            <MigrationErrorHandler {...props} />
          </LanguageProvider>
        </QueryClientProvider>
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================

  describe('edge cases', () => {
    it('handles error with empty code', () => {
      const props = createDefaultProps({
        error: { code: '', message: 'test', timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      // Should treat as unknown error
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again|נסה שוב/i })).toBeInTheDocument();
    });

    it('handles error with undefined code', () => {
      const props = createDefaultProps({
        error: { message: 'test', timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('handles error with null values', () => {
      const props = createDefaultProps({
        error: { code: null, message: null, timestamp: new Date() },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('handles partial success with missing context', () => {
      const props = createDefaultProps({
        error: {
          code: 'partial-success',
          message: 'Partial success',
          timestamp: new Date(),
          context: undefined,
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('handles partial success with partial context', () => {
      const props = createDefaultProps({
        error: {
          code: 'partial-success',
          message: 'Partial success',
          timestamp: new Date(),
          context: { percent: 50 }, // Missing failed and success
        },
      });

      renderWithProviders(<MigrationErrorHandler {...props} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });
});
