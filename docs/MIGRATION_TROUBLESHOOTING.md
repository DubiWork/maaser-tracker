# Migration Troubleshooting Guide

Support documentation for diagnosing and resolving migration issues in Ma'aser Tracker.

**Document Version:** 1.0
**Last Updated:** 2026-03-04
**Owner:** Support Team
**Status:** Production Ready

---

## Table of Contents

1. [Common Issues](#1-common-issues)
2. [Error Code Reference](#2-error-code-reference)
3. [User Actions](#3-user-actions)
4. [Diagnostic Steps](#4-diagnostic-steps)
5. [Support Escalation](#5-support-escalation)

---

## 1. Common Issues

### 1.1 Migration Stuck at X%

**Symptoms:**
- Progress bar shows percentage but doesn't advance
- App appears frozen or unresponsive
- No error message displayed

**Possible Causes:**
1. Network connection lost
2. Firestore throttling
3. Large batch taking longer than expected
4. Browser tab became inactive

**Resolution Steps:**

1. **Check Network Connection**
   - Is the device online?
   - Try opening another website
   - If offline, wait for reconnection - migration will resume automatically

2. **Wait for Current Batch**
   - Each batch processes 500 entries
   - Large batches can take 30+ seconds on slow connections
   - Wait at least 60 seconds before considering stuck

3. **Keep App in Foreground**
   - Some browsers throttle background tabs
   - Keep the Ma'aser Tracker tab active
   - Don't switch to other apps on mobile

4. **Refresh and Retry**
   - If stuck for >2 minutes, refresh the page
   - Migration progress is saved - will resume from last batch
   - Use the "Retry" button when prompted

**User Message:**
```
Your migration is still in progress. Please keep the app open and wait
for it to complete. If it's been stuck for more than 2 minutes, try
refreshing the page.
```

---

### 1.2 Migration Failed

**Symptoms:**
- Error message displayed
- Progress stopped
- "Migration failed" status shown

**Possible Causes:**
1. Network error during batch write
2. Authentication token expired
3. Firestore quota exceeded
4. Invalid entry data

**Resolution Steps:**

1. **Check the Error Type**
   - Network error: Retry when online
   - Auth error: Sign in again
   - Quota error: Wait 1 hour
   - Unknown error: Contact support

2. **Verify Network Connection**
   ```
   Can you open other websites?
   Are you on WiFi or mobile data?
   ```

3. **Try Retry Button**
   - Most failures are network-related
   - Clicking "Try Again" often resolves the issue
   - Migration resumes from where it left off

4. **Re-authenticate if Needed**
   - Sign out and sign back in
   - Try migration again from Settings

**User Message:**
```
The migration encountered an error but your data is safe. Your local
data hasn't been changed. Please check your internet connection and
try again using the "Retry" button.
```

---

### 1.3 Data Not Syncing After Migration

**Symptoms:**
- Migration shows as "complete"
- New entries don't appear on other devices
- Dashboard shows different totals on different devices

**Possible Causes:**
1. App using local data instead of cloud
2. Cache not refreshed
3. Authentication issue on second device
4. Migration actually didn't complete

**Resolution Steps:**

1. **Verify Migration Status**
   - Go to Settings > Data & Sync
   - Should show "Synced to Cloud"
   - If not shown, migration may not be complete

2. **Refresh the App**
   - Pull down to refresh (mobile)
   - Press F5 or Cmd+R (desktop)
   - Close and reopen the app

3. **Sign Out and Back In**
   - Sign out from profile menu
   - Sign back in with same Google account
   - App should fetch cloud data

4. **Check Other Device**
   - Ensure signed into same Google account
   - App may need a moment to sync
   - Try refreshing on both devices

**User Message:**
```
After migration, it may take a moment for other devices to sync.
Try signing out and back in on both devices to ensure they're
using the latest cloud data.
```

---

### 1.4 Duplicate Entries Appearing

**Symptoms:**
- Same entry appears multiple times
- Dashboard totals are higher than expected
- History shows duplicate rows

**Possible Causes:**
1. Migration ran while entries were being added
2. Same entry existed in both IndexedDB and Firestore
3. Race condition during batch write

**Resolution:**

The migration uses a **last-write-wins** strategy:
- If an entry exists in both places, the newer version wins
- Duplicates by ID should be automatically resolved
- This is by design to prevent data loss

**If User Still Sees Duplicates:**

1. **Verify Entry IDs**
   - Entries with same ID are deduplicated
   - Entries with different IDs are both kept
   - Check if entries have different timestamps

2. **Manual Cleanup**
   - User can delete duplicates from History
   - Deletion syncs to cloud immediately
   - Recommend deleting the older one

**User Message:**
```
If you see duplicate entries, they may have been created with different
IDs. You can safely delete the duplicate from the History page. The
deletion will sync to all your devices.
```

---

### 1.5 Migration Taking Too Long

**Symptoms:**
- Migration started but seems very slow
- Progress advancing slowly
- User concerned about time

**Expected Times:**

| Entry Count | Expected Time |
|-------------|---------------|
| 100 entries | ~5 seconds |
| 500 entries | ~15 seconds |
| 1000 entries | ~30 seconds |
| 5000 entries | ~3 minutes |

**Possible Causes:**
1. Slow network connection (cellular, poor WiFi)
2. Large number of entries (>1000)
3. Server throttling

**Resolution:**

1. **Set Expectations**
   ```
   For 1000 entries, migration typically takes about 30 seconds.
   For larger datasets (5000+), it may take several minutes.
   ```

2. **Recommend WiFi**
   - If on cellular, suggest switching to WiFi
   - Faster connection = faster migration
   - More reliable for large datasets

3. **Keep App Open**
   - Migration may slow if app is backgrounded
   - Recommend keeping app in foreground

**User Message:**
```
Migration time depends on your data size and connection speed. For
larger datasets, please use WiFi and keep the app open. The migration
will save progress so you won't lose data if interrupted.
```

---

## 2. Error Code Reference

### 2.1 Network Errors

| Code | Description | Retryable | User Action |
|------|-------------|-----------|-------------|
| `migration/network-error` | Connection lost | Yes | Check internet, retry |
| `network-request-failed` | Request couldn't complete | Yes | Wait for connection |
| `unavailable` | Firestore unavailable | Yes | Wait 1-2 minutes, retry |
| `ECONNREFUSED` | Connection refused | Yes | Check network settings |
| `ETIMEDOUT` | Connection timed out | Yes | Check network, retry |

**Recommended Response:**
```
Your connection was interrupted. The migration will automatically
continue when you're back online. Your data is safe.
```

---

### 2.2 Quota Errors

| Code | Description | Retryable | User Action |
|------|-------------|-----------|-------------|
| `migration/quota-exceeded` | Daily quota exceeded | No (wait) | Try again in 1 hour |
| `resource-exhausted` | Firebase quota hit | No (wait) | Try again later |

**Recommended Response:**
```
Our cloud storage is temporarily at capacity. Your data is safe and
stored locally. Please try again in about 1 hour.
```

---

### 2.3 Authentication Errors

| Code | Description | Retryable | User Action |
|------|-------------|-----------|-------------|
| `migration/not-authenticated` | Not signed in | No | Sign in first |
| `migration/user-mismatch` | Wrong user | No | Sign in with correct account |
| `unauthenticated` | Token invalid | No | Sign out and back in |
| `permission-denied` | No access | No | Contact support |

**Recommended Response:**
```
Your sign-in session has expired. Please sign out and sign back in,
then try the migration again.
```

---

### 2.4 Validation Errors

| Code | Description | Retryable | User Action |
|------|-------------|-----------|-------------|
| `migration/invalid-entry` | Entry failed validation | No | Entry skipped, contact support |
| `invalid-argument` | Bad data format | No | Contact support |

**Recommended Response:**
```
Some entries couldn't be migrated due to data issues. Most entries
have been migrated successfully. Please contact support if you're
missing important data.
```

---

### 2.5 Status Errors

| Code | Description | Retryable | User Action |
|------|-------------|-----------|-------------|
| `migration-status/already-completed` | Already migrated | No | No action needed |
| `migration-engine/already-completed` | Migration done | No | Data is already in cloud |

**Recommended Response:**
```
Your data has already been migrated to the cloud. You can access it
from any device by signing in with the same Google account.
```

---

### 2.6 Engine Errors

| Code | Description | Retryable | User Action |
|------|-------------|-----------|-------------|
| `migration-engine/cancelled` | User cancelled | N/A | Retry when ready |
| `migration-engine/verification-failed` | Count mismatch | Yes | Contact support if data missing |

---

## 3. User Actions

### 3.1 How to Check Migration Status

**Mobile:**
1. Open Ma'aser Tracker app
2. Tap the profile icon (top right)
3. Select "Settings"
4. Look for "Data & Sync" section
5. Status shown: "Synced to Cloud" or "Local Only"

**Desktop:**
1. Open Ma'aser Tracker in browser
2. Click profile icon (top right)
3. Select "Settings"
4. Find "Data & Sync" section
5. Check migration status

---

### 3.2 How to Retry Failed Migration

**From Error Dialog:**
1. When error appears, click "Try Again"
2. Migration resumes from last successful batch
3. Keep app open until complete

**From Settings:**
1. Go to Settings > Data & Sync
2. If migration incomplete, see "Sync to Cloud" button
3. Tap/click to start migration
4. Follow consent prompt
5. Wait for completion

---

### 3.3 How to Cancel Migration

**During Migration:**
1. Click/tap the "Cancel" button in progress dialog
2. Confirm cancellation when prompted
3. Any partial cloud data is deleted (GDPR compliance)
4. Local data remains unchanged
5. Can retry later from Settings

**Important:** Cancelled migrations delete partial cloud data to comply with GDPR. Your local data is never deleted.

---

### 3.4 How to Export Data (Fallback Option)

If migration consistently fails, users can export data manually:

1. Go to Settings > Data & Sync
2. Click "Export Data"
3. Choose format (CSV or JSON)
4. Save file to device
5. Can import on another device or use as backup

---

## 4. Diagnostic Steps

### 4.1 Support Checklist

When a user reports a migration issue, collect:

```
[ ] User's email/Google account (for lookup)
[ ] Device type (iOS/Android/Desktop)
[ ] Browser (Chrome/Safari/Firefox/Edge)
[ ] Number of entries (approximate)
[ ] Error message shown (exact text or screenshot)
[ ] When did the issue occur?
[ ] Network type (WiFi/cellular)
[ ] Has user tried retry?
[ ] Has user signed out and back in?
```

### 4.2 Checking Firebase Console

For internal support staff:

1. **Check Firestore Data:**
   - Firebase Console > Firestore Database
   - Navigate to `users/{userId}/entries`
   - Count documents vs. reported local count

2. **Check Migration Status:**
   - Navigate to `users/{userId}/metadata/migration`
   - Check `completed`, `completedAt`, `entriesMigrated`

3. **Check Audit History:**
   - Navigate to `users/{userId}/metadata/migration/history`
   - Review migration attempts and failures

### 4.3 Common Log Patterns

**Successful Migration:**
```
Migration Engine: Checking migration status...
Migration Engine: Found 150 entries to migrate
Migration Engine: Processing batch 1 (150 entries)
Migration Engine: Batch 1 complete - 150 success, 0 failed
Migration Engine: Verifying migration...
Migration Engine: Verification - Verified: 150 entries
Migration Engine: Marking migration as complete...
Migration Engine: Migration complete
```

**Network Failure:**
```
Migration Engine: Processing batch 1...
Migration Engine: Batch 1 failed (attempt 1): Network error
Network Monitor: Retrying in 2000ms (attempt 1/3)...
Migration Engine: Batch 1 failed (attempt 2): Network error
Network Monitor: Retrying in 4000ms (attempt 2/3)...
```

**Quota Error:**
```
Migration Engine: Batch 1 failed: resource-exhausted
Migration Engine: Quota exceeded, returning partial success
```

---

## 5. Support Escalation

### 5.1 When to Escalate

**Escalate to Engineering if:**
- Multiple users report same issue (>3)
- Data loss confirmed
- Security concern identified
- Error not in documentation
- Migration consistently fails after multiple retries

### 5.2 What to Include in Escalation

```markdown
## Support Escalation

**Issue Summary:**
[Brief description]

**Affected Users:**
- User ID: [xxx]
- Count affected: [n]

**Error Details:**
- Error code: [code]
- Error message: [message]
- Frequency: [once/intermittent/always]

**Diagnostic Info:**
- Device/Browser: [info]
- Entry count: [n]
- Network type: [WiFi/cellular]

**Steps Tried:**
- [ ] Retry button
- [ ] Sign out/in
- [ ] Refresh app
- [ ] Different network

**Screenshots/Logs:**
[Attach]

**Impact:**
[High/Medium/Low]
```

### 5.3 Escalation Contacts

| Severity | Contact | Response Time |
|----------|---------|---------------|
| Critical (data loss) | On-call engineer | <1 hour |
| High (blocking users) | Tech lead | <4 hours |
| Medium (workaround exists) | Support queue | <24 hours |
| Low (minor issue) | GitHub issue | <1 week |

### 5.4 Creating GitHub Issues

For non-critical issues, create a GitHub issue:

**Title Format:** `[Migration] Brief description of issue`

**Body Template:**
```markdown
## Issue Description
[Description]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Device: [device]
- Browser: [browser]
- Entry count: [n]

## Error Details
- Code: [code]
- Message: [message]

## User Impact
[Number of users affected, severity]

## Logs/Screenshots
[Attach]
```

---

## Appendix: Quick Reference

### Error Message Quick Reference

| User Sees | Error Code | Quick Fix |
|-----------|------------|-----------|
| "Connection lost" | network-error | Check internet, retry |
| "Storage temporarily full" | quota-exceeded | Wait 1 hour |
| "Sign-in expired" | not-authenticated | Sign out and back in |
| "Something went wrong" | unknown-error | Retry, then contact support |
| "Migration already complete" | already-completed | No action needed |

### Contact Information

- **Support Email:** support@maaser-tracker.app
- **GitHub Issues:** github.com/DubiWork/maaser-tracker/issues
- **Documentation:** github.com/DubiWork/maaser-tracker/docs

---

**Related Documentation:**
- [Migration Implementation Guide](MIGRATION_IMPLEMENTATION.md)
- [Migration Rollout Plan](MIGRATION_ROLLOUT.md)
- [Migration FAQ](MIGRATION_FAQ.md)
- [Error Messages Reference](../.github/ISSUE_40_ERROR_MESSAGES.md)
