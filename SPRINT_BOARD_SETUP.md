# Sprint Board Setup Guide

## Quick Bulk-Set Priority (Manual Method)

### Step 1: Open Your Project Board
Go to: https://github.com/users/DubiWork/projects

### Step 2: Switch to Table View
Click the **"Table"** icon (top right) - this makes bulk editing easier

### Step 3: Bulk Set Priorities

Sort by label and set priorities in batches:

#### **P0-Critical Issues (Priority: 🔴 Urgent or 1)**
Filter by label: `P0-critical`
- #2 - Migrate from LocalStorage to IndexedDB
- #3 - Integrate React Query
- #4 - Set Up Testing Infrastructure
- #5 - Configure GitHub Actions CI/CD
- #7 - Complete PWA Configuration
- #8 - Add Offline Status Indicator
- #29 - Set up GitHub milestones and project board

**How to bulk set:**
1. Click first issue's Priority cell
2. Select "🔴 Urgent" or "1" or "High"
3. Hold Shift + Click last issue in group
4. All selected issues get same priority

#### **P1-High Issues (Priority: 🟡 High or 2)**
Filter by label: `P1-high`
- #10 - Add Date Range Filtering
- #11 - Add Categories for Donations
- #12 - Add Recurring Income Support
- #13 - Multi-Currency Support
- #15 - Create Settings Screen
- #16 - Add Data Export/Import

#### **P2-Medium Issues (Priority: 🟢 Normal or 3)**
Filter by label: `P2-medium`
- #18 - Implement Google OAuth
- #19 - Google Sheets Sync
- #21 - Monthly/Yearly Reports
- #22 - Tax Report Generation

#### **P3-Low Issues (Priority: ⚪ Low or 4)**
Filter by label: `P3-polish`
- #24 - Improve Accessibility
- #25 - Add Animations and Transitions
- #26 - Haptic Feedback (Mobile)
- #28 - Add character counter to description fields

### Step 4: Move to Current Sprint

**Current Sprint** should contain Sprint 1 work (Phase 1):
- Drag issues #2, #3, #4, #5, #7, #8, #29 to "Current Sprint" tab

**Next Iteration** can contain Phase 2 issues:
- Drag issues #10, #11, #12, #13 to "Next Iteration" tab

Everything else stays in "Prioritized Backlog"

---

## GitHub CLI Method (Faster but Requires Setup)

If you have `gh` CLI installed and authenticated, you can use this script.

### Prerequisites
```bash
# Install GitHub CLI if not installed
winget install GitHub.cli

# Authenticate
gh auth login
```

### Run This Script
```bash
cd /c/Users/I543234/source/repos/DubiWork/maaser-tracker
chmod +x scripts/set-priorities.sh
./scripts/set-priorities.sh
```

---

## Tips for Using Sprint Board

### Daily Workflow:
1. **Current Sprint** - Active work for this 2-week sprint
2. **Next Iteration** - Planned for next sprint
3. **Prioritized Backlog** - Everything else, sorted by priority

### Moving Issues:
- When you start work: Drag to "In Progress" column (if board has columns)
- When you create PR: GitHub auto-moves to "In Review" (with automation)
- When merged: GitHub auto-moves to "Done"

### Sprint Planning:
- Every 2 weeks, move completed issues to Done
- Move Next Iteration → Current Sprint
- Plan new Next Iteration from Prioritized Backlog

---

## Troubleshooting

**Q: I don't see a "Priority" field**
A: You need to add it to your project:
1. Click "+ New field" in table view
2. Select "Single select"
3. Name it "Priority"
4. Add options: Urgent, High, Normal, Low

**Q: Bulk selection doesn't work**
A: Make sure you're in Table view, not Board view. Table view is much better for bulk operations.

**Q: Issues aren't auto-moving between tabs**
A: Check Project Workflows (⋯ menu → Workflows) and enable the automation rules mentioned in Step 3 of the main guide.
