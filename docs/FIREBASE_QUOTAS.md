# Firebase Quotas and Capacity Planning

This document covers Firebase Spark (free) plan limits, usage projections, upgrade triggers, and cost estimates for Ma'aser Tracker.

---

## 1. Firebase Spark (Free) Plan Limits

### Firestore

| Resource              | Daily / Monthly Limit      |
|-----------------------|----------------------------|
| Reads                 | 50,000 / day               |
| Writes                | 20,000 / day               |
| Deletes               | 20,000 / day               |
| Stored data           | 1 GB total                 |
| Network egress        | 10 GB / month              |
| Max document size     | 1 MiB                      |
| Max write batch size  | 500 operations             |

### Authentication

| Resource                 | Limit                     |
|--------------------------|---------------------------|
| Sign-ins (email/Google)  | Unlimited                 |
| Phone auth (SMS)         | 10 SMS / day (not used)   |
| User accounts            | Unlimited                 |

### Hosting (not used -- we deploy to GitHub Pages)

| Resource      | Limit              |
|---------------|---------------------|
| Storage       | 10 GB               |
| Bandwidth     | 360 MB / day         |

> Source: https://firebase.google.com/pricing (as of 2026-03)

---

## 2. Per-User Usage Estimates

Assumptions per active user per day:

| Action                        | Reads | Writes | Deletes |
|-------------------------------|-------|--------|---------|
| App load (dashboard)          | 5     | 0      | 0       |
| View history                  | 10    | 0      | 0       |
| Add income entry              | 0     | 1      | 0       |
| Add donation entry            | 0     | 1      | 0       |
| Edit an entry                 | 1     | 1      | 0       |
| Delete an entry               | 1     | 0      | 1       |
| Language/settings change      | 1     | 1      | 0       |
| Migration (one-time)          | 2     | varies | 0       |
| **Total per user per day**    | **~20** | **~4** | **~1** |

---

## 3. Capacity Projections

### Daily Active Users (DAU) vs. Quota Usage

| DAU   | Reads/day | Writes/day | Deletes/day | Reads % | Writes % | Status     |
|-------|-----------|------------|-------------|---------|----------|------------|
| 10    | 200       | 40         | 10          | 0.4%    | 0.2%     | Safe       |
| 50    | 1,000     | 200        | 50          | 2%      | 1%       | Safe       |
| 100   | 2,000     | 400        | 100         | 4%      | 2%       | Safe       |
| 500   | 10,000    | 2,000      | 500         | 20%     | 10%      | Monitor    |
| 1,000 | 20,000    | 4,000      | 1,000       | 40%     | 20%      | Monitor    |
| 2,000 | 40,000    | 8,000      | 2,000       | 80%     | 40%      | Warning    |
| 2,500 | 50,000    | 10,000     | 2,500       | 100%    | 50%      | **At limit** |

### Storage Estimates

Each entry document is approximately 200-400 bytes. A user with 500 entries uses about 200 KB.

| Users (total) | Avg entries/user | Storage   | % of 1 GB |
|---------------|------------------|-----------|-----------|
| 100           | 100              | 4 MB      | 0.4%      |
| 1,000         | 200              | 80 MB     | 8%        |
| 5,000         | 300              | 600 MB    | 60%       |
| 10,000        | 300              | 1.2 GB    | **Over**  |

### Network Egress

Each Firestore read response is approximately 1-2 KB.

| DAU   | Reads/day | Daily egress | Monthly egress | % of 10 GB |
|-------|-----------|-------------|----------------|------------|
| 100   | 2,000     | ~4 MB       | ~120 MB        | 1.2%       |
| 1,000 | 20,000    | ~40 MB      | ~1.2 GB        | 12%        |
| 2,500 | 50,000    | ~100 MB     | ~3 GB          | 30%        |

---

## 4. Upgrade Triggers

### When to Upgrade to Blaze (Pay-as-you-go)

Upgrade is needed when **any** of these conditions are met:

| Trigger                           | Threshold         | Estimated DAU |
|-----------------------------------|--------------------|---------------|
| Daily reads approaching limit     | > 40,000 / day     | ~2,000        |
| Daily writes approaching limit    | > 16,000 / day     | ~4,000        |
| Storage approaching limit         | > 800 MB           | ~4,000 users  |
| Monthly egress approaching limit  | > 8 GB / month     | ~6,500 DAU    |

**Recommended action:** Upgrade to Blaze when reaching **2,000 DAU** or **4,000 total users with substantial data**. The Blaze plan includes the same free tier allowances, so there is no cost increase until usage exceeds the free quotas.

### Monitoring Approach

1. **Firebase Console** -- Usage tab shows reads/writes/deletes per day
2. **Budget Alerts** -- Set at $0, $5, $25 in Google Cloud Console
3. **Firestore Usage Metrics** -- Monitor via Google Cloud Monitoring
4. **Weekly Review** -- Check Firebase Console usage dashboard weekly once DAU exceeds 500

---

## 5. Blaze Plan Cost Projections

Blaze plan uses pay-as-you-go pricing **after** the free tier is exhausted.

### Per-Unit Pricing (Beyond Free Tier)

| Resource              | Price                      |
|-----------------------|----------------------------|
| Reads                 | $0.06 / 100,000            |
| Writes                | $0.18 / 100,000            |
| Deletes               | $0.02 / 100,000            |
| Storage               | $0.18 / GB / month         |
| Network egress        | $0.12 / GB                 |

### Monthly Cost Estimates (Beyond Free Tier)

| DAU   | Extra reads/mo   | Extra writes/mo  | Est. monthly cost |
|-------|------------------|------------------|-------------------|
| 2,500 | 0 (at limit)     | 0                | $0.00             |
| 5,000 | 3,000,000        | 600,000          | ~$2.90            |
| 10,000| 9,000,000        | 1,800,000        | ~$8.60            |
| 25,000| 21,000,000       | 4,500,000        | ~$20.70           |
| 50,000| 45,000,000       | 10,500,000       | ~$45.90           |

> Costs are approximate and based on 30-day months. Storage and egress costs are additional but typically small relative to read/write costs at these scales.

### Cost Optimization Strategies

- **Client-side caching via React Query** -- reduces redundant reads
- **Firestore offline persistence** -- serves reads from local cache
- **Batch writes** -- already implemented (500 entries/batch)
- **Pagination** -- load history in pages rather than all at once
- **Index optimization** -- keep composite indexes minimal

---

## 6. Service Worker Update Strategy

### Current Configuration

The service worker is configured in `vite.config.js` with:

```javascript
VitePWA({
  registerType: 'autoUpdate',
  // ...
})
```

### How `autoUpdate` Works

1. **Registration:** On first visit, the service worker registers and caches all static assets
2. **Update check:** Every time the user navigates to the app, the browser checks for a new service worker file
3. **Background install:** If a new service worker is found, it installs in the background
4. **Activation:** The new service worker activates immediately (no waiting for tabs to close) because `autoUpdate` calls `skipWaiting()` automatically
5. **Cache refresh:** Workbox precaching compares asset hashes and updates changed files

### Cache Invalidation

- **Build-time hashing:** Vite appends content hashes to filenames (e.g., `index-a1b2c3.js`)
- **Precache manifest:** Workbox generates a manifest of all assets with their hashes
- **Delta updates:** Only changed files are re-fetched on update
- **Runtime caches:** Google Fonts use `CacheFirst` with 365-day expiry and max 10 entries

### Force-Update Procedure

If a user reports stale content:

1. **Hard refresh:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear service worker cache manually:**
   ```javascript
   // Run in browser DevTools console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```
3. **Clear all caches:**
   ```javascript
   // Run in browser DevTools console
   caches.keys().then(names => {
     names.forEach(name => caches.delete(name));
   });
   ```
4. **Full reset:** DevTools > Application tab > Clear Storage > Clear site data

### Known Considerations

- `autoUpdate` provides the best UX for this app because users expect to see the latest data
- There is no "update available" prompt -- updates happen silently
- If a critical update must reach all users immediately, a new deployment triggers the service worker update on the next navigation
- IndexedDB data is not affected by service worker updates
