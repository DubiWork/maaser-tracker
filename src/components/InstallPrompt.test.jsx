/**
 * Tests for InstallPrompt component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import InstallPrompt from './InstallPrompt';

// Mock useInstallPrompt hook
vi.mock('../hooks/useInstallPrompt', () => ({
  useInstallPrompt: vi.fn(),
}));

import { useInstallPrompt } from '../hooks/useInstallPrompt';

describe('InstallPrompt', () => {
  const defaultMockHook = {
    isIOS: false,
    isInstallable: false,
    isInstalled: false,
    isDismissed: false,
    shouldShowPrompt: false,
    promptInstall: vi.fn().mockResolvedValue({ outcome: 'accepted' }),
    dismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useInstallPrompt.mockReturnValue(defaultMockHook);
  });

  it('should not render when shouldShowPrompt is false', () => {
    useInstallPrompt.mockReturnValue({
      ...defaultMockHook,
      shouldShowPrompt: false,
    });

    const { container } = renderWithProviders(<InstallPrompt hasUserEngaged={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render snackbar when shouldShowPrompt is true', () => {
    useInstallPrompt.mockReturnValue({
      ...defaultMockHook,
      isInstallable: true,
      shouldShowPrompt: true,
    });

    renderWithProviders(<InstallPrompt hasUserEngaged={true} />);

    // Default language is Hebrew, so look for Hebrew text
    expect(screen.getByText(/התקן את האפליקציה/)).toBeInTheDocument();
    // Look for button with Hebrew text
    expect(screen.getByRole('button', { name: /התקן/ })).toBeInTheDocument();
  });

  it('should call promptInstall when Install button is clicked', async () => {
    const mockPromptInstall = vi.fn().mockResolvedValue({ outcome: 'accepted' });
    useInstallPrompt.mockReturnValue({
      ...defaultMockHook,
      isInstallable: true,
      shouldShowPrompt: true,
      promptInstall: mockPromptInstall,
    });

    renderWithProviders(<InstallPrompt hasUserEngaged={true} />);

    // Get install button (Hebrew: "התקן")
    const installButton = screen.getByRole('button', { name: /התקן/ });
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(mockPromptInstall).toHaveBeenCalled();
    });
  });

  it('should call dismiss when close button is clicked', () => {
    const mockDismiss = vi.fn();
    useInstallPrompt.mockReturnValue({
      ...defaultMockHook,
      isInstallable: true,
      shouldShowPrompt: true,
      dismiss: mockDismiss,
    });

    renderWithProviders(<InstallPrompt hasUserEngaged={true} />);

    // Close button has Hebrew aria-label "לא עכשיו"
    const closeButton = screen.getByRole('button', { name: /לא עכשיו/ });
    fireEvent.click(closeButton);

    expect(mockDismiss).toHaveBeenCalled();
  });

  it('should show iOS dialog when Install clicked on iOS', async () => {
    useInstallPrompt.mockReturnValue({
      ...defaultMockHook,
      isIOS: true,
      shouldShowPrompt: true,
    });

    renderWithProviders(<InstallPrompt hasUserEngaged={true} />);

    // Get install button (Hebrew: "התקן")
    const installButton = screen.getByRole('button', { name: /התקן/ });
    fireEvent.click(installButton);

    await waitFor(() => {
      // Hebrew: "להתקנת האפליקציה באייפון או אייפד"
      expect(screen.getByText(/להתקנת האפליקציה באייפון/)).toBeInTheDocument();
    });
  });

  it('should show iOS installation steps in dialog', async () => {
    useInstallPrompt.mockReturnValue({
      ...defaultMockHook,
      isIOS: true,
      shouldShowPrompt: true,
    });

    renderWithProviders(<InstallPrompt hasUserEngaged={true} />);

    const installButton = screen.getByRole('button', { name: /התקן/ });
    fireEvent.click(installButton);

    await waitFor(() => {
      // Hebrew steps
      expect(screen.getByText(/לחץ על כפתור השיתוף/)).toBeInTheDocument();
      expect(screen.getByText(/הוסף למסך הבית/)).toBeInTheDocument();
      expect(screen.getByText(/לחץ על "הוסף"/)).toBeInTheDocument();
    });
  });

  it('should close iOS dialog when Got it is clicked', async () => {
    useInstallPrompt.mockReturnValue({
      ...defaultMockHook,
      isIOS: true,
      shouldShowPrompt: true,
    });

    renderWithProviders(<InstallPrompt hasUserEngaged={true} />);

    // Open dialog
    const installButton = screen.getByRole('button', { name: /התקן/ });
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(screen.getByText(/להתקנת האפליקציה באייפון/)).toBeInTheDocument();
    });

    // Close dialog (Hebrew: "הבנתי")
    const gotItButton = screen.getByRole('button', { name: /הבנתי/ });
    fireEvent.click(gotItButton);

    await waitFor(() => {
      expect(screen.queryByText(/להתקנת האפליקציה באייפון/)).not.toBeInTheDocument();
    });
  });

  it('should pass hasUserEngaged to useInstallPrompt hook', () => {
    renderWithProviders(<InstallPrompt hasUserEngaged={true} />);

    expect(useInstallPrompt).toHaveBeenCalledWith({ hasUserEngaged: true });
  });
});
