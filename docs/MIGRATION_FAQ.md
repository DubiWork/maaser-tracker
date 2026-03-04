# Migration FAQ

Frequently asked questions about the data migration feature in Ma'aser Tracker.

**Last Updated:** 2026-03-04
**Languages:** English | [Hebrew](#hebrew-faq)

---

## Table of Contents

1. [What is Migration?](#what-is-migration)
2. [When Does Migration Happen?](#when-does-migration-happen)
3. [How Long Does Migration Take?](#how-long-does-migration-take)
4. [What If Migration Fails?](#what-if-migration-fails)
5. [Can I Cancel Migration?](#can-i-cancel-migration)
6. [Is My Data Secure?](#is-my-data-secure)
7. [What Data is Migrated?](#what-data-is-migrated)
8. [What Happens to My Local Data?](#what-happens-to-my-local-data)
9. [Can I Access My Data on Multiple Devices?](#can-i-access-my-data-on-multiple-devices)
10. [Do I Need to Be Online?](#do-i-need-to-be-online)

---

## What is Migration?

**Q: What is data migration?**

A: Data migration is a one-time process that copies your Ma'aser Tracker data from your device to the cloud. This allows you to:

- Access your data from any device
- Never lose your data if you change phones
- Keep your data backed up automatically

Your local data isn't deleted - it's kept as a backup for 90 days.

---

## When Does Migration Happen?

**Q: When will I be asked to migrate my data?**

A: Migration happens automatically when you sign in for the first time. Here's what to expect:

1. Sign in with your Google account
2. Wait about 3 seconds (we check if you have data to migrate)
3. If you have local data, you'll see a consent dialog
4. Choose to sync or keep data local only
5. If you sync, watch the progress bar complete

**Q: Can I trigger migration manually?**

A: Yes! If you skipped migration initially, you can start it anytime:

1. Open Ma'aser Tracker
2. Tap your profile icon
3. Go to "Settings"
4. Find "Data & Sync" section
5. Tap "Sync to Cloud"

---

## How Long Does Migration Take?

**Q: How long will migration take?**

A: Migration time depends on how much data you have:

| Your Data | Estimated Time |
|-----------|----------------|
| 100 entries | ~5 seconds |
| 500 entries | ~15 seconds |
| 1000 entries | ~30 seconds |
| 5000 entries | ~3 minutes |

**Tips for faster migration:**
- Use WiFi instead of mobile data
- Keep the app open (don't switch apps)
- Stay in an area with good signal

---

## What If Migration Fails?

**Q: What happens if migration fails?**

A: Don't worry - your data is safe! If migration fails:

1. Your local data is **never deleted**
2. You'll see an error message explaining what happened
3. Most errors can be fixed by clicking "Try Again"
4. Migration resumes from where it stopped

**Common issues and fixes:**

| Problem | Solution |
|---------|----------|
| "Connection lost" | Check internet, click "Try Again" |
| "Storage temporarily full" | Wait 1 hour, then retry |
| "Sign-in expired" | Sign out and back in |

---

## Can I Cancel Migration?

**Q: Can I stop migration once it's started?**

A: Yes, you can cancel migration at any time:

1. Click the "Cancel" button during migration
2. Confirm you want to cancel
3. Any partial cloud data is deleted
4. Your local data remains unchanged

**Important:** If you cancel, any data that was partially uploaded is removed from the cloud. This is required by privacy laws (GDPR) to ensure you control your data.

You can always restart migration later from Settings.

---

## Is My Data Secure?

**Q: Is my financial data safe in the cloud?**

A: Yes! We take security seriously:

**In Transit:**
- All data is encrypted using HTTPS
- Same security as online banking

**In Storage:**
- Data stored securely in Google Cloud (Firebase)
- Only you can access your data
- We cannot see your entries

**Access Control:**
- You must be signed in to access your data
- Each user can only see their own data
- Security rules prevent unauthorized access

**Privacy:**
- We never sell your data
- We don't use your data for advertising
- You can delete all cloud data at any time

[Read our Privacy Policy](https://github.com/DubiWork/maaser-tracker/blob/main/docs/PRIVACY_POLICY.md)

---

## What Data is Migrated?

**Q: What information is uploaded to the cloud?**

A: Only your Ma'aser Tracker entries are migrated:

**What IS migrated:**
- Entry amounts (income and donations)
- Entry dates
- Entry descriptions/notes
- Accounting month selections

**What is NOT migrated:**
- Your device information (except for debugging)
- Your browsing history
- Any other app data
- Personal information beyond entries

---

## What Happens to My Local Data?

**Q: Will my local data be deleted after migration?**

A: No, your local data is kept as a backup:

1. **During migration:** Local data is copied to cloud (not moved)
2. **After migration:** Local data becomes a read-only backup
3. **90 days later:** You'll be asked if you want to delete the backup

**Why we keep the backup:**
- Extra safety in case of issues
- Works offline if cloud is unavailable
- You control when it's deleted

**After 90 days:**
- You'll see a prompt asking about the backup
- Choose "Delete Backup" to remove local data
- Choose "Keep 30 More Days" to extend backup

---

## Can I Access My Data on Multiple Devices?

**Q: Can I use Ma'aser Tracker on multiple devices?**

A: Yes! That's the main benefit of cloud sync:

1. **Sign in** with the same Google account on each device
2. **Your data syncs** automatically across all devices
3. **Changes sync** in real-time when online

**Example:**
- Add income on your phone
- See it immediately on your tablet
- Edit it on your computer
- Changes appear everywhere

**Tip:** Always use the same Google account on all devices.

---

## Do I Need to Be Online?

**Q: Can I use the app offline after migration?**

A: Yes! Ma'aser Tracker is designed to work offline:

**When online:**
- All changes sync immediately
- Data available on all devices
- Full functionality

**When offline:**
- You can still view all your data
- You can add new entries
- You can edit existing entries
- Changes save locally

**When you reconnect:**
- Offline changes sync automatically
- No action required from you
- Data merges seamlessly

---

## Additional Questions

**Q: What if I have more questions?**

A: We're here to help!

- **Documentation:** Check our [Troubleshooting Guide](MIGRATION_TROUBLESHOOTING.md)
- **GitHub Issues:** Report bugs at [GitHub Issues](https://github.com/DubiWork/maaser-tracker/issues)
- **Email Support:** support@maaser-tracker.app

---

# Hebrew FAQ

<div dir="rtl">

## שאלות נפוצות על העברת נתונים

### מה זה העברת נתונים?

**ש: מה זה העברת נתונים (מיגרציה)?**

ת: העברת נתונים היא תהליך חד-פעמי שמעתיק את הנתונים שלך מהמכשיר לענן. זה מאפשר לך:

- לגשת לנתונים מכל מכשיר
- לא לאבד נתונים כשמחליפים טלפון
- לגבות את הנתונים אוטומטית

הנתונים המקומיים לא נמחקים - הם נשמרים כגיבוי למשך 90 יום.

---

### מתי מתרחשת ההעברה?

**ש: מתי יבקשו ממני להעביר את הנתונים?**

ת: ההעברה מתרחשת אוטומטית כשמתחברים לראשונה. מה לצפות:

1. התחברות עם חשבון Google
2. המתנה של כ-3 שניות (בדיקה אם יש נתונים להעביר)
3. אם יש נתונים מקומיים, יופיע דיאלוג הסכמה
4. בחירה לסנכרן או להשאיר מקומי בלבד
5. אם בוחרים לסנכרן, צפייה בסרגל התקדמות

---

### כמה זמן לוקחת ההעברה?

**ש: כמה זמן תיקח ההעברה?**

ת: זמן ההעברה תלוי בכמות הנתונים:

| כמות הנתונים | זמן משוער |
|--------------|-----------|
| 100 רשומות | ~5 שניות |
| 500 רשומות | ~15 שניות |
| 1000 רשומות | ~30 שניות |
| 5000 רשומות | ~3 דקות |

**טיפים להעברה מהירה יותר:**
- להשתמש ב-WiFi במקום נתונים סלולריים
- להשאיר את האפליקציה פתוחה
- להישאר באזור עם קליטה טובה

---

### מה קורה אם ההעברה נכשלת?

**ש: מה קורה אם ההעברה נכשלת?**

ת: אל דאגה - הנתונים בטוחים! אם ההעברה נכשלת:

1. הנתונים המקומיים **לעולם לא נמחקים**
2. תופיע הודעת שגיאה המסבירה מה קרה
3. רוב השגיאות נפתרות על ידי לחיצה על "נסה שוב"
4. ההעברה ממשיכה מאיפה שעצרה

---

### האם אפשר לבטל את ההעברה?

**ש: האם אפשר לעצור את ההעברה אחרי שהתחילה?**

ת: כן, אפשר לבטל בכל עת:

1. לחיצה על כפתור "ביטול" במהלך ההעברה
2. אישור הביטול
3. נתונים חלקיים בענן נמחקים
4. הנתונים המקומיים נשארים ללא שינוי

---

### האם הנתונים שלי מאובטחים?

**ש: האם הנתונים הפיננסיים שלי בטוחים בענן?**

ת: כן! אנחנו מתייחסים לאבטחה ברצינות:

**בהעברה:**
- כל הנתונים מוצפנים באמצעות HTTPS
- אותה אבטחה כמו בנקאות מקוונת

**באחסון:**
- נתונים מאוחסנים בבטחה ב-Google Cloud (Firebase)
- רק אתה יכול לגשת לנתונים שלך
- אנחנו לא יכולים לראות את הרשומות שלך

---

### מה קורה לנתונים המקומיים?

**ש: האם הנתונים המקומיים יימחקו אחרי ההעברה?**

ת: לא, הנתונים המקומיים נשמרים כגיבוי:

1. **במהלך ההעברה:** נתונים מועתקים לענן (לא מועברים)
2. **אחרי ההעברה:** נתונים מקומיים הופכים לגיבוי לקריאה בלבד
3. **אחרי 90 יום:** תישאל אם למחוק את הגיבוי

---

### האם אפשר לגשת לנתונים ממספר מכשירים?

**ש: האם אפשר להשתמש באפליקציה במספר מכשירים?**

ת: כן! זה היתרון העיקרי של סנכרון לענן:

1. להתחבר עם אותו חשבון Google בכל מכשיר
2. הנתונים מסתנכרנים אוטומטית בין כל המכשירים
3. שינויים מסתנכרנים בזמן אמת כשמחוברים לאינטרנט

---

### האם צריך להיות מחובר לאינטרנט?

**ש: האם אפשר להשתמש באפליקציה אופליין אחרי ההעברה?**

ת: כן! האפליקציה מתוכננת לעבוד אופליין:

**כשמחוברים:**
- כל השינויים מסתנכרנים מיד
- נתונים זמינים בכל המכשירים

**כשלא מחוברים:**
- אפשר לצפות בכל הנתונים
- אפשר להוסיף רשומות חדשות
- אפשר לערוך רשומות קיימות
- שינויים נשמרים מקומית

**כשמתחברים מחדש:**
- שינויים אופליין מסתנכרנים אוטומטית
- לא נדרשת פעולה מהמשתמש

</div>

---

**Related Documentation:**
- [Migration Implementation Guide](MIGRATION_IMPLEMENTATION.md)
- [Migration Troubleshooting](MIGRATION_TROUBLESHOOTING.md)
- [Migration Rollout Plan](MIGRATION_ROLLOUT.md)
