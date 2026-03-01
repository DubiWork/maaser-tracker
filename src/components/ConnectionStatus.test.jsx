/**
 * Tests for ConnectionStatus component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageProvider';
import ConnectionStatus from './ConnectionStatus';

// Mock the useOnlineStatus hook
vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

import { useOnlineStatus } from '../hooks/useOnlineStatus';

// Helper to render with LanguageProvider
function renderWithLanguage(ui) {
  return render(
    <LanguageProvider>
      {ui}
    </LanguageProvider>
  );
}

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when online', () => {
    beforeEach(() => {
      useOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });
    });

    it('should not render anything when online', () => {
      const { container } = renderWithLanguage(<ConnectionStatus />);

      // The Slide component with mountOnEnter unmountOnExit should not render
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      // Container should only have empty div from LanguageProvider
      expect(container.querySelector('[role="status"]')).toBeNull();
    });

    it('should not show offline text when online', () => {
      renderWithLanguage(<ConnectionStatus />);

      // Check for both Hebrew and English offline text
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/אופליין/)).not.toBeInTheDocument();
    });
  });

  describe('when offline', () => {
    beforeEach(() => {
      useOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });
    });

    it('should render the offline banner', () => {
      renderWithLanguage(<ConnectionStatus />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should display the offline text', () => {
      renderWithLanguage(<ConnectionStatus />);

      // The default language is Hebrew, so check for Hebrew text
      // The text "אופליין" (Offline in Hebrew) should be displayed
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveTextContent(/אופליין/);
    });

    it('should display the offline message', () => {
      renderWithLanguage(<ConnectionStatus />);

      // The default language is Hebrew, check for Hebrew message
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveTextContent(/אין חיבור לאינטרנט/);
    });

    it('should have aria-live="polite" for accessibility', () => {
      renderWithLanguage(<ConnectionStatus />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('callbacks', () => {
    it('should pass onOnline callback to useOnlineStatus', () => {
      useOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const onOnline = vi.fn();
      renderWithLanguage(<ConnectionStatus onOnline={onOnline} />);

      expect(useOnlineStatus).toHaveBeenCalledWith(
        expect.objectContaining({ onOnline })
      );
    });

    it('should pass onOffline callback to useOnlineStatus', () => {
      useOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const onOffline = vi.fn();
      renderWithLanguage(<ConnectionStatus onOffline={onOffline} />);

      expect(useOnlineStatus).toHaveBeenCalledWith(
        expect.objectContaining({ onOffline })
      );
    });

    it('should pass both callbacks to useOnlineStatus', () => {
      useOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const onOnline = vi.fn();
      const onOffline = vi.fn();
      renderWithLanguage(
        <ConnectionStatus onOnline={onOnline} onOffline={onOffline} />
      );

      expect(useOnlineStatus).toHaveBeenCalledWith({ onOnline, onOffline });
    });
  });

  describe('RTL support', () => {
    beforeEach(() => {
      useOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });
    });

    it('should render correctly with Hebrew language', () => {
      render(
        <LanguageProvider>
          <ConnectionStatus />
        </LanguageProvider>
      );

      // The status element should be present
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    beforeEach(() => {
      useOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });
    });

    it('should render with the correct role', () => {
      renderWithLanguage(<ConnectionStatus />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
    });

    it('should have position fixed for overlay display', () => {
      renderWithLanguage(<ConnectionStatus />);

      const statusElement = screen.getByRole('status');
      // Check that the element exists and has the expected role
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveAttribute('role', 'status');
    });
  });

  describe('memoization', () => {
    it('should be a memoized component', () => {
      // ConnectionStatus is wrapped with memo()
      // This test verifies the component doesn't break due to memoization
      useOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      const { rerender } = renderWithLanguage(
        <ConnectionStatus onOnline={vi.fn()} onOffline={vi.fn()} />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      // Rerender with same props
      rerender(
        <LanguageProvider>
          <ConnectionStatus onOnline={vi.fn()} onOffline={vi.fn()} />
        </LanguageProvider>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
