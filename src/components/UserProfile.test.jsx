/**
 * Tests for UserProfile component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageProvider';
import { AuthProvider } from '../contexts/AuthProvider';
import UserProfile from './UserProfile';

// Mock the auth service
vi.mock('../services/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

import { signOut, onAuthStateChanged } from '../services/auth';

// Helper to render with providers and authenticated user
function renderWithAuth(ui, user = null) {
  onAuthStateChanged.mockImplementation((callback) => {
    callback(user);
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

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when not authenticated', () => {
    it('should not render when user is null', () => {
      renderWithAuth(<UserProfile />, null);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('when authenticated', () => {
    it('should render avatar button', () => {
      renderWithAuth(<UserProfile />, mockUser);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should display user avatar', () => {
      renderWithAuth(<UserProfile />, mockUser);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('alt', 'Test User');
      expect(avatar).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('should display initials when no photo URL', () => {
      const userNoPhoto = { ...mockUser, photoURL: null };
      renderWithAuth(<UserProfile />, userNoPhoto);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('TU'); // Test User initials
    });

    it('should display first letter when only first name', () => {
      const userSingleName = { ...mockUser, displayName: 'John', photoURL: null };
      renderWithAuth(<UserProfile />, userSingleName);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('J');
    });

    it('should display ? when no display name', () => {
      const userNoName = { ...mockUser, displayName: null, photoURL: null };
      renderWithAuth(<UserProfile />, userNoName);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('?');
    });
  });

  describe('menu interaction', () => {
    it('should open menu when clicked', () => {
      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should display user name and email in menu', () => {
      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display sync status', () => {
      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Hebrew is default
      expect(screen.getByText(/מקומי בלבד/i)).toBeInTheDocument();
    });

    it('should display sign out option', () => {
      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText(/התנתק/i)).toBeInTheDocument();
    });

    it('should close menu when clicking outside', () => {
      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click backdrop/outside
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('sign out', () => {
    it('should call signOut when sign out is clicked', async () => {
      signOut.mockResolvedValueOnce();

      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const signOutMenuItem = screen.getByText(/התנתק/i);
      fireEvent.click(signOutMenuItem);

      await waitFor(() => {
        expect(signOut).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading text during sign out', async () => {
      // Make sign out take time
      signOut.mockImplementation(() => new Promise(() => {}));

      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const signOutMenuItem = screen.getByText(/התנתק/i);
      fireEvent.click(signOutMenuItem);

      await waitFor(() => {
        expect(screen.getByText(/טוען/i)).toBeInTheDocument();
      });
    });

    it('should close menu after successful sign out', async () => {
      signOut.mockResolvedValueOnce();

      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const signOutMenuItem = screen.getByText(/התנתק/i);
      fireEvent.click(signOutMenuItem);

      await waitFor(() => {
        expect(signOut).toHaveBeenCalled();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper aria attributes on button', () => {
      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should have aria-expanded when menu is open', () => {
      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-label', () => {
      renderWithAuth(<UserProfile />, mockUser);

      const button = screen.getByRole('button');
      // Hebrew is default
      expect(button).toHaveAttribute('aria-label', 'פרופיל משתמש');
    });
  });

  describe('memoization', () => {
    it('should be a memoized component', () => {
      const { rerender } = renderWithAuth(<UserProfile />, mockUser);

      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <LanguageProvider>
          <AuthProvider>
            <UserProfile />
          </AuthProvider>
        </LanguageProvider>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
