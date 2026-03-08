# Issue #40: Error Message Copy (Bilingual)

**Date:** 2026-03-04
**Purpose:** User-facing error messages for migration scenarios
**Languages:** Hebrew (RTL) + English (LTR)

---

## Error Message Principles

1. **Non-technical language** - Avoid jargon ("network error" → "connection lost")
2. **User safety focus** - Always reassure data is safe
3. **Clear next steps** - Tell user what to do
4. **Age-appropriate** - Accessible to all ages (CEO requirement)
5. **Tone:** Calm, supportive, never blaming

---

## Error Messages Table

| Scenario | Hebrew (RTL) | English (LTR) | Action Button |
|----------|--------------|---------------|---------------|
| **Network Failure** | הסנכרון הושהה זמנית. נמשיך אוטומטית כשתחזור החיבור לאינטרנט. | Migration paused. We'll continue automatically when you're back online. | "OK" / "Try Now" |
| **Firestore Quota Exceeded** | שירות הענן זמנית מלא. הנתונים שלך בטוחים. נסה שוב בעוד שעה. | Cloud storage temporarily full. Your data is safe. Try again in 1 hour. | "Remind Me" / "Try Later" |
| **Authentication Expired** | הזדהות פגה תוקף. יש להתחבר מחדש כדי להמשיך בסנכרון. | Sign-in expired. Please sign in again to continue syncing. | "Sign In Again" |
| **Duplicate Entry Conflict** | מצאנו רשומה כפולה. נשתמש בגרסה המעודכנת ביותר. | Found a duplicate entry. We'll use the most recent version. | (Auto-resolved, info only) |
| **Invalid Entry Data** | רשומה #{id} מכילה נתונים לא תקינים ותדולג. | Entry #{id} contains invalid data and will be skipped. | "View Details" |
| **Partial Migration Success** | סנכרון הושלם ב-{percent}%. {failed} רשומות נכשלו. | Migration completed at {percent}%. {failed} entries failed. | "Retry Failed" / "Continue" |
| **Complete Migration Failure** | הסנכרון נכשל. הנתונים המקומיים שלך בטוחים ולא השתנו. | Migration failed. Your local data is safe and unchanged. | "Try Again" / "Contact Support" |
| **Cancellation Confirmed** | הסנכרון בוטל. הנתונים שלך נשארים מאוחסנים רק במכשיר זה. | Migration cancelled. Your data remains stored only on this device. | "OK" |
| **90-Day Backup Notice** | גיבוי מקומי יישמר למשך 90 יום לצורך בטיחות. ניתן למחוק בכל עת בהגדרות. | Local backup will be kept for 90 days for safety. You can delete it anytime in Settings. | "Got It" |
| **Backup Cleanup Prompt** | הגיבוי המקומי בן 90 יום. האם למחוק אותו? | Your local backup is 90 days old. Delete it now? | "Delete Backup" / "Keep 30 More Days" |
| **Permission Denied** | אין הרשאה לגשת לשירות הענן. יש לבדוק הגדרות האפליקציה. | No permission to access cloud storage. Check app settings. | "Open Settings" |
| **Unknown Error** | משהו השתבש. הנתונים שלך בטוחים. אם הבעיה נמשכת, צור קשר עם התמיכה. | Something went wrong. Your data is safe. If this continues, contact support. | "Try Again" / "Contact Support" |

---

## Large Dataset Warnings

| Scenario | Hebrew (RTL) | English (LTR) |
|----------|--------------|---------------|
| **250-500 Entries** | יש לך {count} רשומות ({size} KB). הסנכרון ייקח כ-{time} שניות. מומלץ לחבר ל-WiFi. | You have {count} entries ({size} KB). Migration will take about {time} seconds. WiFi recommended. |
| **500+ Entries** | יש לך {count} רשומות! זה ייקח מספר דקות. מומלץ מאוד: WiFi, סוללה מלאה, להשאיר את האפליקציה פתוחה. | You have {count} entries! This will take several minutes. Strongly recommended: WiFi, full battery, keep app open. |
| **Mobile Data Warning** | ⚠️ לא מחובר ל-WiFi. הסנכרון ישתמש בנתונים סלולריים (~{size} MB). | ⚠️ Not connected to WiFi. Migration will use mobile data (~{size} MB). |

---

## Success Messages

| Scenario | Hebrew (RTL) | English (LTR) |
|----------|--------------|---------------|
| **Migration Complete** | 🎉 {count} רשומות סונכרנו בהצלחה! הנתונים שלך עכשיו זמינים מכל מכשיר. | 🎉 {count} entries synced successfully! Your data is now available on all your devices. |
| **Partial Success** | ✅ {success} רשומות סונכרנו. {failed} רשומות נכשלו ונשמרו מקומית. | ✅ {success} entries synced. {failed} entries failed and remain stored locally. |
| **Manual Trigger Success** | הסנכרון הידני הושלם! | Manual sync completed! |

---

## Consent Dialog Copy

### Title
- **Hebrew:** האם לסנכרן את הנתונים שלך לענן?
- **English:** Sync Your Data to Cloud?

### Body
- **Hebrew:** נעלה {count} רשומות ל-Firebase כדי שתוכל לגשת אליהן מכל מכשיר. [מדיניות פרטיות]
- **English:** We'll upload {count} entries to Firebase so you can access them from any device. [Privacy Policy]

### What Data is Processed
- **Hebrew:** אילו נתונים יעובדו?
- **English:** What data will be processed?

**List Items:**
- Amounts / סכומים
- Dates / תאריכים
- Descriptions / תיאורים

### Where is it Stored
- **Hebrew:** איפה זה יאוחסן?
- **English:** Where will it be stored?

**Answer:**
- **Hebrew:** Google Cloud (Firebase) - ארה"ב
- **English:** Google Cloud (Firebase) - United States

### Your Rights
- **Hebrew:** הזכויות שלך:
- **English:** Your rights:

**List Items:**
- Cancel migration anytime / לבטל סנכרון בכל עת
- Delete all cloud data / למחוק את כל הנתונים בענן
- Export your data / לייצא את הנתונים שלך
- 90-day local backup / גיבוי מקומי למשך 90 יום

### Action Buttons
- **Decline (Hebrew):** להשאיר מקומי בלבד
- **Decline (English):** Keep Local Only
- **Accept (Hebrew):** לסנכרן לענן
- **Accept (English):** Sync to Cloud

---

## Progress Messages

| Scenario | Hebrew (RTL) | English (LTR) |
|----------|--------------|---------------|
| **Checking Status** | בודק מצב סנכרון... | Checking sync status... |
| **Starting** | מתחיל סנכרון... | Starting migration... |
| **In Progress** | מסנכרן {completed} מתוך {total} רשומות... | Migrating {completed} of {total} entries... |
| **Verifying** | מאמת נתונים... | Verifying data... |
| **Finalizing** | משלים סנכרון... | Finalizing migration... |
| **Cleaning Up** | מסיים... | Cleaning up... |

---

## Notification Toasts

| Scenario | Hebrew (RTL) | English (LTR) | Duration |
|----------|--------------|---------------|----------|
| **Started** | הסנכרון התחיל | Migration started | 2s |
| **Paused** | הסנכרון הושהה | Migration paused | 3s |
| **Resumed** | הסנכרון התחדש | Migration resumed | 2s |
| **Success** | ✅ הסנכרון הושלם! | ✅ Migration complete! | 3s |
| **Failed** | ❌ הסנכרון נכשל | ❌ Migration failed | 5s |

---

## Implementation Notes

### Translation Files
Add to `src/translations/he.js` and `src/translations/en.js`:

```javascript
// src/translations/en.js
export default {
  // ... existing translations
  migration: {
    errors: {
      networkFailure: "Migration paused. We'll continue automatically when you're back online.",
      quotaExceeded: "Cloud storage temporarily full. Your data is safe. Try again in 1 hour.",
      authExpired: "Sign-in expired. Please sign in again to continue syncing.",
      // ... all messages from table above
    },
    success: {
      complete: "🎉 {count} entries synced successfully! Your data is now available on all your devices.",
      partial: "✅ {success} entries synced. {failed} entries failed and remain stored locally.",
    },
    // ... other sections
  }
};
```

### Usage in Components
```jsx
import { useTranslation } from './contexts/LanguageContext';

function MigrationComponent() {
  const { t } = useTranslation();

  // Error handling
  try {
    await migrateData();
  } catch (error) {
    if (error.code === 'network-error') {
      showError(t('migration.errors.networkFailure'));
    }
  }

  // Success
  showSuccess(t('migration.success.complete', { count: 142 }));
}
```

---

## Testing Checklist

- [ ] All Hebrew messages display correctly in RTL
- [ ] All English messages display correctly in LTR
- [ ] Variables ({count}, {size}, {time}) replaced correctly
- [ ] Tone is calm and supportive (not technical)
- [ ] All ages can understand messages (CEO requirement)
- [ ] No blame language ("you did X wrong")
- [ ] Always reassures data is safe
- [ ] Clear next steps provided
- [ ] Links to support/privacy policy work

---

**Created:** 2026-03-04
**For:** Issue #40 - IndexedDB to Firestore Migration
**Gap:** Error message copy specification (MEDIUM priority)
**Status:** Ready for implementation
