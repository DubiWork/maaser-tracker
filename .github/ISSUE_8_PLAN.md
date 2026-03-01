# Issue #8: Offline Status Indicator - Implementation Plan

## Overview
Add visual indicators and notifications for online/offline status and sync state.

## Implementation Tasks

### 1. Create useOnlineStatus Hook
**File:** `src/hooks/useOnlineStatus.js`
- Track `navigator.onLine` status
- Listen to `online` and `offline` browser events
- Return current online status

### 2. Create ConnectionStatus Component
**File:** `src/components/ConnectionStatus.jsx`
- Subtle banner when offline
- Sync state indicator (when syncing)
- Integrate with app bar or top of layout
- Hebrew/English text support

### 3. Add Toast Notifications
- Use MUI Snackbar for notifications
- Notify when connection is lost
- Notify when connection is restored
- Auto-dismiss after a few seconds

### 4. Integration Points
- Add ConnectionStatus to main App layout
- Toast notifications trigger on status changes
- Graceful degradation when offline

## Testing Strategy
- Unit tests for useOnlineStatus hook
- Component tests for ConnectionStatus
- Mock navigator.onLine for testing
- Test toast notifications

## Dependencies
- MUI Snackbar (already available)
- Browser APIs: navigator.onLine, online/offline events
