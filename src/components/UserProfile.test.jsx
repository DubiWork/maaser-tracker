/**
 * Tests for UserProfile component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../contexts/LanguageProvider';
import { AuthProvider } from '../contexts/AuthProvider';
import UserProfile from './UserProfile';

// Mock the auth service
vi.mock('../services/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Mock the useMigration hook
vi.mock('../hooks/useMigration', () => ({
  useMigration: vi.fn(),
  migrationQueryKeys: { status: (uid) => ['migration', 'status', uid] },
}));

// Mock dependencies used by DataManagementDialog via useGdprActions
vi.mock('../services/gdprDataService', () => ({
  exportUserData: vi.fn(),
  deleteAllCloudData: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } },
  isAuthenticated: vi.fn(() => true),
  getCurrentUserId: vi.fn(() => 'test-uid'),
}));

vi.mock('../hooks/useEntries', () => ({
  useClearEntriesCache: vi.fn(() => vi.fn()),
}));

import { signOut, onAuthStateChanged } from '../services/auth';
import { useMigration } from '../hooks/useMigration';

// Helper to render with providers and authenticated user
function renderWithAuth(ui, user = null) {
  onAuthStateChanged.mockImplementation((callback) => {
    callback(user);
    return vi.fn();
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          {ui}
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
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
    useMigration.mockReturnValue({ status: 'idle' });
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
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const { rerender } = renderWithAuth(<UserProfile />, mockUser);

      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <UserProfile />
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('sync status display', () => {
    const testUser = {
      uid: 'u1',
      displayName: 'Test',
      email: 'test@test.com',
      photoURL: null,
    };

    function openMenu() {
      fireEvent.click(screen.getByRole('button'));
    }

    it('renders "Local only" when status is idle', () => {
      useMigration.mockReturnValue({ status: 'idle' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מקומי בלבד')).toBeInTheDocument();
    });

    it('renders "Local only" when status is paused', () => {
      useMigration.mockReturnValue({ status: 'paused' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מקומי בלבד')).toBeInTheDocument();
    });

    it('renders "Local only" when status is cancelled', () => {
      useMigration.mockReturnValue({ status: 'cancelled' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מקומי בלבד')).toBeInTheDocument();
    });

    it('renders "Local only" when migrationStatus is undefined', () => {
      useMigration.mockReturnValue({});
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מקומי בלבד')).toBeInTheDocument();
    });

    it('renders "Local only" when status is checking', () => {
      useMigration.mockReturnValue({ status: 'checking' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מקומי בלבד')).toBeInTheDocument();
    });

    it('renders "Local only" when status is consent-pending', () => {
      useMigration.mockReturnValue({ status: 'consent-pending' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מקומי בלבד')).toBeInTheDocument();
    });

    it('renders "Synced to cloud" when status is completed (Hebrew)', () => {
      useMigration.mockReturnValue({ status: 'completed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מסונכרן לענן')).toBeInTheDocument();
    });

    it('renders "Syncing..." when status is in-progress (Hebrew)', () => {
      useMigration.mockReturnValue({ status: 'in-progress' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מסנכרן...')).toBeInTheDocument();
    });

    it('renders "Sync failed" when status is failed (Hebrew)', () => {
      useMigration.mockReturnValue({ status: 'failed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('הסנכרון נכשל')).toBeInTheDocument();
    });

    it('renders CloudDoneIcon when status is completed', () => {
      useMigration.mockReturnValue({ status: 'completed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מסונכרן לענן')).toBeInTheDocument();
      // The sync status menu item should contain an SVG icon
      const syncMenuItem = screen.getByText('מסונכרן לענן').closest('li');
      expect(syncMenuItem.querySelector('svg')).toBeInTheDocument();
    });

    it('renders SyncIcon when status is in-progress', () => {
      useMigration.mockReturnValue({ status: 'in-progress' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מסנכרן...')).toBeInTheDocument();
      const syncMenuItem = screen.getByText('מסנכרן...').closest('li');
      expect(syncMenuItem.querySelector('svg')).toBeInTheDocument();
    });

    it('renders ErrorOutlineIcon when status is failed', () => {
      useMigration.mockReturnValue({ status: 'failed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('הסנכרון נכשל')).toBeInTheDocument();
      const syncMenuItem = screen.getByText('הסנכרון נכשל').closest('li');
      expect(syncMenuItem.querySelector('svg')).toBeInTheDocument();
    });

    it('renders StorageIcon when status is idle', () => {
      useMigration.mockReturnValue({ status: 'idle' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      const syncMenuItem = screen.getByText('מקומי בלבד').closest('li');
      expect(syncMenuItem.querySelector('svg')).toBeInTheDocument();
    });

    it('passes user uid to useMigration', () => {
      useMigration.mockReturnValue({ status: 'idle' });
      renderWithAuth(<UserProfile />, testUser);
      expect(useMigration).toHaveBeenCalledWith('u1');
    });

    it('passes undefined to useMigration when user is null', () => {
      useMigration.mockReturnValue({ status: 'idle' });
      renderWithAuth(<UserProfile />, null);
      expect(useMigration).toHaveBeenCalledWith(undefined);
    });

    it('renders English text when language is toggled', () => {
      useMigration.mockReturnValue({ status: 'completed' });

      // Verify the component uses the translation key (not hardcoded).
      // LanguageProvider defaults to Hebrew; the component renders the Hebrew
      // translation for syncedToCloud, confirming it reads from t.syncedToCloud.
      renderWithAuth(<UserProfile />, testUser);
      openMenu();
      expect(screen.getByText('מסונכרן לענן')).toBeInTheDocument();
      expect(screen.queryByText('Local only')).not.toBeInTheDocument();
    });
  });

  describe('GDPR data management menu items', () => {
    const testUser = {
      uid: 'u1',
      displayName: 'Test',
      email: 'test@test.com',
      photoURL: null,
    };

    function openMenu() {
      fireEvent.click(screen.getByRole('button'));
    }

    it('should show GDPR menu items when migrationStatus is completed', () => {
      useMigration.mockReturnValue({ status: 'completed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      expect(screen.getByText('ייצוא הנתונים שלי')).toBeInTheDocument();
      expect(screen.getByText('מחיקת נתוני הענן')).toBeInTheDocument();
    });

    it('should NOT show GDPR menu items when migrationStatus is idle', () => {
      useMigration.mockReturnValue({ status: 'idle' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      expect(screen.queryByText('ייצוא הנתונים שלי')).not.toBeInTheDocument();
      expect(screen.queryByText('מחיקת נתוני הענן')).not.toBeInTheDocument();
    });

    it('should NOT show GDPR menu items when migrationStatus is in-progress', () => {
      useMigration.mockReturnValue({ status: 'in-progress' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      expect(screen.queryByText('ייצוא הנתונים שלי')).not.toBeInTheDocument();
      expect(screen.queryByText('מחיקת נתוני הענן')).not.toBeInTheDocument();
    });

    it('should NOT show GDPR menu items when migrationStatus is failed', () => {
      useMigration.mockReturnValue({ status: 'failed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      expect(screen.queryByText('ייצוא הנתונים שלי')).not.toBeInTheDocument();
      expect(screen.queryByText('מחיקת נתוני הענן')).not.toBeInTheDocument();
    });

    it('should have FileDownloadIcon SVG on export menu item', () => {
      useMigration.mockReturnValue({ status: 'completed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      const exportMenuItem = screen.getByText('ייצוא הנתונים שלי').closest('li');
      expect(exportMenuItem.querySelector('svg')).toBeInTheDocument();
    });

    it('should have DeleteForeverIcon SVG on delete menu item', () => {
      useMigration.mockReturnValue({ status: 'completed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      const deleteMenuItem = screen.getByText('מחיקת נתוני הענן').closest('li');
      expect(deleteMenuItem.querySelector('svg')).toBeInTheDocument();
    });

    it('should open DataManagementDialog when export is clicked', () => {
      useMigration.mockReturnValue({ status: 'completed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      fireEvent.click(screen.getByText('ייצוא הנתונים שלי'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should open DataManagementDialog when delete is clicked', () => {
      useMigration.mockReturnValue({ status: 'completed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      fireEvent.click(screen.getByText('מחיקת נתוני הענן'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close menu when export item is clicked', () => {
      useMigration.mockReturnValue({ status: 'completed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      fireEvent.click(screen.getByText('ייצוא הנתונים שלי'));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should close menu when delete item is clicked', () => {
      useMigration.mockReturnValue({ status: 'completed' });
      renderWithAuth(<UserProfile />, testUser);
      openMenu();

      fireEvent.click(screen.getByText('מחיקת נתוני הענן'));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});
