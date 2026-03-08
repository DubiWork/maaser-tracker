# Sprint Planning - Ma'aser Tracker

**Board:** https://github.com/users/DubiWork/projects/4

## How to Organize Your Board

### Step 1: Add All Issues
1. Go to your board: https://github.com/users/DubiWork/projects/4
2. Click "+ Add item" at the bottom
3. Type `#` and select all issues (#1-#26)
4. They'll all appear in the first column

### Step 2: Create Iterations (Sprints)
1. Click "..." menu on your board → "Settings"
2. Find "Iterations" field
3. Click "Configure" → Enable iterations
4. Create 2-week sprints:
   - **Sprint 1** (Week 1-2): Feb 27 - Mar 12
   - **Sprint 2** (Week 3-4): Mar 13 - Mar 26
   - **Sprint 3** (Week 5-6): Mar 27 - Apr 9
   - **Sprint 4** (Week 7-8): Apr 10 - Apr 23
   - **Sprint 5** (Week 9-10): Apr 24 - May 7
   - **Sprint 6** (Week 11-12): May 8 - May 21
   - **Sprint 7** (Week 13-14): May 22 - Jun 4

### Step 3: Assign Issues to Sprints

## Sprint 1 (Week 1-2) - Foundation Part 1
**Goal:** Complete IndexedDB migration and React Query setup
**Story Points:** 4 SP (~16 hours)

- [ ] #1 - Epic 1: Foundation and Infrastructure (epic, tracking only)
- [ ] #2 - Migrate from LocalStorage to IndexedDB [3 SP] ⭐ START HERE
- [ ] #3 - Integrate React Query [1 SP] (depends on #2)

**Sprint 1 Tasks:**
- Day 1-3: Complete #2 (IndexedDB migration)
- Day 4-5: Complete #3 (React Query)

---

## Sprint 2 (Week 3-4) - Foundation Part 2
**Goal:** Complete testing and CI/CD, start PWA
**Story Points:** 6 SP (~24 hours)

- [ ] #4 - Set Up Testing Infrastructure [3 SP]
- [ ] #5 - Configure GitHub Actions CI/CD [1 SP]
- [ ] #6 - Epic 2: PWA and Offline Functionality (epic, tracking only)
- [ ] #7 - Complete PWA Configuration [2 SP]

**Sprint 2 Tasks:**
- Day 1-3: Complete #4 (Testing)
- Day 4: Complete #5 (CI/CD)
- Day 5-7: Complete #7 (PWA)

---

## Sprint 3 (Week 5-6) - Core Features Part 1
**Goal:** PWA completion + date filtering + categories
**Story Points:** 5 SP (~20 hours)

- [ ] #8 - Add Offline Status Indicator [1 SP]
- [ ] #9 - Epic 3: Core Feature Enhancements (epic, tracking only)
- [ ] #10 - Add Date Range Filtering [2 SP]
- [ ] #11 - Add Categories for Donations [2 SP]

**Sprint 3 Tasks:**
- Day 1: Complete #8 (Offline indicator)
- Day 2-4: Complete #10 (Date filtering)
- Day 5-7: Complete #11 (Categories)

---

## Sprint 4 (Week 7-8) - Core Features Part 2
**Goal:** Multi-currency, settings, recurring income
**Story Points:** 8 SP (~32 hours)

- [ ] #13 - Multi-Currency Support [2 SP]
- [ ] #14 - Epic 4: User Preferences and Settings (epic, tracking only)
- [ ] #15 - Create Settings Screen [3 SP]
- [ ] #12 - Add Recurring Income Support [3 SP]

**Sprint 4 Tasks:**
- Day 1-3: Complete #13 (Multi-currency)
- Day 4-6: Complete #15 (Settings)
- Day 7-9: Complete #12 (Recurring income)

---

## Sprint 5 (Week 9-10) - Cloud Sync
**Goal:** Google OAuth and Sheets sync
**Story Points:** 7 SP (~28 hours)

- [ ] #16 - Add Data Export/Import [2 SP]
- [ ] #17 - Epic 5: Cloud Sync with Google (epic, tracking only)
- [ ] #18 - Implement Google OAuth [2 SP]
- [ ] #19 - Google Sheets Sync [3 SP]

**Sprint 5 Tasks:**
- Day 1-3: Complete #16 (Export/Import)
- Day 4-5: Complete #18 (OAuth)
- Day 6-9: Complete #19 (Sheets sync)

---

## Sprint 6 (Week 11-12) - Analytics & Reporting
**Goal:** Reports and tax documentation
**Story Points:** 5 SP (~20 hours)

- [ ] #20 - Epic 6: Analytics and Reporting (epic, tracking only)
- [ ] #21 - Monthly/Yearly Reports [3 SP]
- [ ] #22 - Tax Report Generation [2 SP]

**Sprint 6 Tasks:**
- Day 1-5: Complete #21 (Reports)
- Day 6-8: Complete #22 (Tax reports)

---

## Sprint 7 (Week 13-14) - Polish & Launch
**Goal:** Accessibility, animations, final polish
**Story Points:** 3.5 SP (~14 hours)

- [ ] #23 - Epic 7: Polish and UX Improvements (epic, tracking only)
- [ ] #24 - Improve Accessibility [2 SP]
- [ ] #25 - Add Animations and Transitions [1 SP]
- [ ] #26 - Haptic Feedback (Mobile) [0.5 SP]

**Sprint 7 Tasks:**
- Day 1-3: Complete #24 (Accessibility)
- Day 4-5: Complete #25 (Animations)
- Day 6: Complete #26 (Haptics)
- Day 7-10: Final testing, bug fixes, documentation

---

## Story Points Summary by Sprint

| Sprint | Story Points | Hours | Issues |
|--------|-------------|-------|--------|
| Sprint 1 | 4 SP | ~16h | #2, #3 |
| Sprint 2 | 6 SP | ~24h | #4, #5, #7 |
| Sprint 3 | 5 SP | ~20h | #8, #10, #11 |
| Sprint 4 | 8 SP | ~32h | #12, #13, #15 |
| Sprint 5 | 7 SP | ~28h | #16, #18, #19 |
| Sprint 6 | 5 SP | ~20h | #21, #22 |
| Sprint 7 | 3.5 SP | ~14h | #24, #25, #26 |
| **Total** | **38.5 SP** | **~154h** | **19 stories + 7 epics** |

---

## Priority Labels for Board Views

Create these saved views on your board:

### View 1: "Current Sprint"
- Filter: `iteration:@current`
- Shows only issues in the current sprint

### View 2: "P0 - Critical"
- Filter: `label:"P0-critical"`
- Shows all critical priority items

### View 3: "Ready to Start"
- Filter: `status:"Ready" no:assignee`
- Shows unassigned issues ready to be worked on

### View 4: "Epics Overview"
- Filter: `label:"epic"`
- Group by: Status
- Shows high-level epic progress

---

## Daily Workflow

### Starting Your Day
1. Go to board → "Current Sprint" view
2. Move an issue from "Backlog" → "In Progress"
3. Create feature branch: `git checkout -b feature/<issue>-<name>`
4. Assign yourself to the issue

### During Work
1. Reference issue in commits: `git commit -m "#2 Add IndexedDB service"`
2. Update issue with progress comments
3. Check off sub-tasks in issue description

### Completing Work
1. Push branch and create PR
2. Move issue to "In Review" on board
3. Link PR to issue: "Closes #<issue>"
4. Wait for CI to pass
5. Merge PR
6. Issue automatically moves to "Done" ✅

---

## Quick Start for Today

**Right now, to get started:**

1. Open board: https://github.com/users/DubiWork/projects/4
2. Add all issues (#1-#26) using "+ Add item"
3. Create Sprint 1 iteration (Feb 27 - Mar 12)
4. Move these to Sprint 1:
   - #1 (Epic)
   - #2 (IndexedDB)
   - #3 (React Query)
5. Move #2 to "In Progress"
6. Create branch: `git checkout -b feature/2-indexeddb-migration`
7. Start working on the 5 sub-tasks in issue #2

---

**Current Status:** Ready to start Sprint 1, Issue #2! 🚀
