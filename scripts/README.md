# Project Automation Scripts

This folder contains utility scripts for managing the Ma'aser Tracker project.

## Available Scripts

### `set-priorities.js`

Automatically sets the Priority field on all GitHub Project issues based on their labels.

**What it does:**
- Maps issue labels to project priorities:
  - `P0-critical` → Urgent
  - `P1-high` → High
  - `P2-medium` → Normal
  - `P3-polish` → Low
- Adds all issues to your project board (if not already added)
- Sets the Priority field value for each issue

**Prerequisites:**

1. **Node.js installed** (check: `node --version`)
   - Download: https://nodejs.org/

2. **Install dependencies:**
   ```bash
   npm install @octokit/graphql
   ```

3. **Create GitHub Personal Access Token:**
   - Go to: https://github.com/settings/tokens/new
   - Name: "Project Automation"
   - Scopes needed:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `project` (Full control of projects)
   - Click "Generate token"
   - Copy the token (you won't see it again!)

4. **Find your Project Number:**
   - Go to your project: https://github.com/users/DubiWork/projects
   - Look at the URL, it will be something like: `.../projects/1`
   - The number at the end is your PROJECT_NUMBER

**Usage:**

```bash
# Set environment variables
export GITHUB_TOKEN="your_token_here"
export PROJECT_NUMBER=1

# Run the script
node scripts/set-priorities.js
```

**Windows (CMD):**
```cmd
set GITHUB_TOKEN=your_token_here
set PROJECT_NUMBER=1
node scripts\set-priorities.js
```

**Windows (PowerShell):**
```powershell
$env:GITHUB_TOKEN="your_token_here"
$env:PROJECT_NUMBER=1
node scripts/set-priorities.js
```

**Expected Output:**
```
🔍 Fetching project structure...

✅ Found project: Ma'aser Tracker Development
✅ Found priority field with options: Urgent, High, Normal, Low

📋 Found 28 open issues

✅ #2 Migrate from LocalStorage to IndexedDB
   Priority set to: Urgent (P0-critical)

✅ #3 Integrate React Query
   Priority set to: Urgent (P0-critical)

...

============================================================
✅ Updated: 28 issues
⚠️  Skipped: 0 issues
============================================================
```

## Troubleshooting

### Error: "GITHUB_TOKEN environment variable not set"
- Make sure you've set the token in your terminal session
- The token is session-specific; you'll need to set it each time you open a new terminal

### Error: "Priority field not found in project"
- Your project needs a "Priority" field
- Add it manually:
  1. Open your project board
  2. Switch to Table view
  3. Click "+ New field"
  4. Select "Single select"
  5. Name: "Priority"
  6. Options: Urgent, High, Normal, Low

### Error: "MODULE_NOT_FOUND: @octokit/graphql"
- Run: `npm install @octokit/graphql` in the project root

### Issues not updating
- Check that your token has the correct permissions (`repo` and `project`)
- Make sure you're using the correct PROJECT_NUMBER
- Try regenerating your token if it's old

## Alternative: Manual Setup

If the script doesn't work or you prefer manual control, see: [SPRINT_BOARD_SETUP.md](../SPRINT_BOARD_SETUP.md)

The manual guide walks through using GitHub's web interface to:
- Bulk-set priorities using table view
- Organize issues into sprints
- Configure automation workflows
