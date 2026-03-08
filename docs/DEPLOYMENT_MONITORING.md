# Deployment Monitoring & Status

This document explains how to monitor deployments and configure alerts for both GitHub Pages and Netlify.

## Quick Status Check

### GitHub Actions (CI/CD)
- **Status Page:** https://github.com/DubiWork/maaser-tracker/actions
- **CI Workflow:** https://github.com/DubiWork/maaser-tracker/actions/workflows/ci.yml
- **Deploy Workflow:** https://github.com/DubiWork/maaser-tracker/actions/workflows/deploy.yml

**Badges (README.md):**
```markdown
[![CI](https://github.com/DubiWork/maaser-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/DubiWork/maaser-tracker/actions/workflows/ci.yml)
[![Deploy](https://github.com/DubiWork/maaser-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/DubiWork/maaser-tracker/actions/workflows/deploy.yml)
```

### Netlify
- **Dashboard:** https://app.netlify.com/sites/maaser-tracker/deploys
- **Production:** https://maaser-tracker.netlify.app/
- **Preview URLs:** Shown in PR comments automatically

## Automatic Notifications (Already Configured)

### GitHub Actions ✅
**Currently Active:**
- Email notifications for failed workflows (to repository owner)
- PR status checks (CI must pass before merge)
- Commit status badges

**What You Get:**
- ✅ Email when CI fails on your PR
- ✅ Email when deployment fails
- ✅ PR comment with deployment status
- ✅ Prevent merging if CI fails

### Netlify ✅
**Currently Active:**
- PR comments with preview deployment links
- Deployment status on PR checks
- Deploy status badge (add to README if needed)

**What You Get:**
- ✅ Automatic comment on every PR with preview URL
- ✅ PR status check for Netlify deployment
- ✅ Deploy success/failure in GitHub PR UI

## Optional: Enhanced Notifications

### GitHub Actions - Slack/Discord
If you want notifications in Slack or Discord:

**1. Add Slack Webhook to GitHub Secrets:**
```yaml
# .github/workflows/ci.yml or deploy.yml
# Add this step at the end:

- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "❌ CI Failed for ${{ github.repository }}"
      }
```

**2. Get Slack Webhook URL:**
- Go to https://api.slack.com/apps
- Create app → Incoming Webhooks → Activate
- Add webhook to workspace → Copy URL
- Add to GitHub Secrets as `SLACK_WEBHOOK_URL`

### Netlify - Email Notifications
To get email notifications for Netlify deployments:

**1. Go to Netlify Dashboard:**
https://app.netlify.com/sites/maaser-tracker/settings/notifications

**2. Configure Notifications:**
- Deploy succeeded: ✅ (recommended: OFF for previews, ON for production)
- Deploy failed: ✅ (recommended: ON)
- Deploy started: ⚠️ (optional, can be noisy)

**3. Choose Recipients:**
- Email address(es) to notify
- Slack/Discord webhook (optional)

### Netlify - Status Badge
Add Netlify status badge to README.md:

**1. Get Badge URL:**
- Go to: https://app.netlify.com/sites/maaser-tracker/settings/general
- Scroll to "Status badges"
- Copy markdown code

**2. Add to README.md:**
```markdown
[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-SITE-ID/deploy-status)](https://app.netlify.com/sites/maaser-tracker/deploys)
```

## Monitoring Commands

### Check GitHub Actions Status (CLI)
```bash
# Install GitHub CLI first (already available)
export PATH="$PATH:/c/Program Files/GitHub CLI"

# List recent workflow runs
gh run list --limit 10

# View specific run details
gh run view <run-id>

# Watch a running workflow
gh run watch

# View logs for a workflow
gh run view --log
```

### Check Deployment Status
```bash
# GitHub Pages
# Check if site is live
curl -I https://dubiwork.github.io/maaser-tracker/

# Netlify Production
curl -I https://maaser-tracker.netlify.app/

# Netlify Preview (replace PR number)
curl -I https://deploy-preview-39--maaser-tracker.netlify.app/
```

### Monitor Build Times
```bash
# GitHub Actions average build time
gh run list --workflow=ci.yml --limit 20 --json conclusion,createdAt,updatedAt

# Calculate average from results
```

## Troubleshooting

### CI Workflow Fails
**1. Check logs:**
```bash
gh run view --log
```

**2. Common issues:**
- Linting errors: Run `npm run lint` locally
- Test failures: Run `npm test` locally
- Coverage too low: Check `npm test -- --coverage`
- Firebase env vars missing: Check GitHub Secrets

### Deploy Workflow Fails
**1. Check build locally:**
```bash
npm run build
```

**2. Common issues:**
- Build errors: Check console output
- Missing env vars: Check `.github/workflows/deploy.yml`
- Firebase config issues: Check `src/lib/firebase.js`

### Netlify Deploy Fails
**1. Check Netlify dashboard:**
https://app.netlify.com/sites/maaser-tracker/deploys

**2. View deploy logs:**
Click on failed deploy → "Deploy log"

**3. Common issues:**
- Build command failed: Check `netlify.toml`
- Missing env vars: Check Netlify Environment Variables
- Firebase config: Check Netlify Environment Variables

## Health Checks

### Automated Health Check Script
Create `.github/workflows/health-check.yml` (optional):

```yaml
name: Health Check

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  check-production:
    runs-on: ubuntu-latest
    steps:
      - name: Check GitHub Pages
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://dubiwork.github.io/maaser-tracker/)
          if [ $STATUS -ne 200 ]; then
            echo "GitHub Pages returned $STATUS"
            exit 1
          fi

      - name: Check Netlify
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://maaser-tracker.netlify.app/)
          if [ $STATUS -ne 200 ]; then
            echo "Netlify returned $STATUS"
            exit 1
          fi

      - name: Notify on Failure
        if: failure()
        run: echo "❌ Production health check failed!"
```

### Manual Health Check
```bash
# Check both sites are responding
echo "GitHub Pages:" && curl -I https://dubiwork.github.io/maaser-tracker/ | head -1
echo "Netlify:" && curl -I https://maaser-tracker.netlify.app/ | head -1

# Expected output:
# GitHub Pages: HTTP/2 200
# Netlify: HTTP/2 200
```

## Summary

**Current Monitoring (No Setup Needed):**
- ✅ GitHub Actions email notifications
- ✅ PR status checks (CI must pass)
- ✅ Netlify PR comments with preview URLs
- ✅ Deployment badges in README

**Optional Enhancements:**
- ⚠️ Slack/Discord notifications (if you use those)
- ⚠️ Netlify status badge (nice to have)
- ⚠️ Scheduled health checks (for peace of mind)

**Recommendation:** Current setup is sufficient for solo developer. Add Slack/Discord only if you use them daily. Add health checks only if you're concerned about uptime.

---

**Last Updated:** 2026-03-03
