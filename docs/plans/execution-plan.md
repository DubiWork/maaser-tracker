# Ma'aser Tracker -- Strategic Execution Plan

**Date:** 2026-03-12
**Input:** CEO Strategic Audit (Score: 52/100 -- Adequate)
**Goal:** Move from 52/100 to real users and validated product-community fit within 90 days
**Constraint:** Solo developer, 10 hrs/week, 2-week sprints, max 3 stories/sprint

---

## Executive Summary

The CEO audit reveals a classic developer trap: engineering excellence (73/100) masking strategic absence (37/100) and community void (18/100). The product is technically ready for users but has zero infrastructure to reach them.

This plan layers **user acquisition and community engagement** on top of the existing development pipeline. It does NOT redo what works -- the epic branch model, CI/CD, staging queue, and testing lifecycle are assets, not problems.

**The core thesis:** Every hour spent building features without users is a bet placed blind. The plan front-loads user contact to validate direction before investing more engineering time.

### Current State Summary

| Asset | Status |
|-------|--------|
| **Staging queue** | 3 epics: #41 (Import/Export -- baking), #142 (External CSV -- baking), #155 (Playwright e2e -- baking) |
| **Launch blocker** | Epic #140 (Security Audit Remediation) -- 9 sub-tasks, ~10-12h, milestone v1.3.0-launch |
| **Firebase auth** | Issues #35-38 CLOSED. Auth infrastructure exists but not fully wired for public use. |
| **Production regression** | Issue #166 open (2026-03-11 failure) |
| **Open issues** | 29 open (9 security sub-tasks, 3 staging epics, 1 regression bug, 16 backlog features) |
| **Milestones** | v1.3.0-launch (10 open/4 closed), Phase 1 (1 open/16 closed), Phase 2 (7 open/25 closed) |

### What This Plan Does NOT Cover

- Features already in the staging queue (#41, #142, #155) -- these proceed through the existing pipeline
- Security sub-tasks (#167-#175) -- already groomed, estimated, and assigned to v1.3.0-launch
- Existing backlog items (#9-#26, #42-#43) -- these remain in the backlog, reprioritized after user feedback

---

## Phase 0: Launch Readiness Gate (Sprint 7 -- Days 1-14)

**Theme:** "Clear the runway before takeoff"
**Hours budget:** 10h/week x 2 weeks = 20h
**Dev time:** ~14h | **Non-code time:** ~6h

The product cannot be shared with real users until the security audit is resolved and the production regression is fixed. This sprint completes those blockers.

### Sprint 7 Goals

1. Fix production regression (#166)
2. Complete security audit remediation epic #140 (Wave 1 + Wave 2)
3. Write halachic disclaimer (non-code)
4. Create shareable product description (non-code)

### Story S7.1: Fix Production Regression

**Issue:** #166 (Production regression failed -- 2026-03-11)
**Priority:** P0-critical
**Estimate:** 2-4h
**Agent:** `react-specialist` or appropriate agent based on root cause

**Acceptance Criteria:**
- [ ] Root cause identified and documented in issue
- [ ] Fix implemented with regression test
- [ ] Production deployment verified green
- [ ] Regression workflow passes

**Dependencies:** None (highest priority)

### Story S7.2: Security Audit Remediation -- Wave 1

**Issues:** #167, #168, #169, #170, #171 (all size:XS, all parallel)
**Priority:** P1-high (launch-blocker dependency)
**Estimate:** ~2h total (all run in parallel)

These are the quick wins from the security audit grooming:
- #167: CI/CD Hardening (SA-17 + SA-18) -- 30min
- #168: Remove Unused Dependencies (SA-08) -- 15min
- #169: Auth API Fix (SA-01) -- 30min
- #170: Dependency Vulnerability Tracking (SA-07) -- 15min
- #171: PWA Cache Fix (SA-10) -- 15min

**Dependencies:** None (all independent, all on epic branch `epic/140-security-audit-remediation`)

### Story S7.3: Security Audit Remediation -- Wave 2

**Issues:** #172, #173, #174, #175 (medium complexity)
**Priority:** P1-high (launch-blocker)
**Estimate:** ~5h total

- #172: Max Amount Validation (SA-04) -- 45min
- #173: Migration Cancel Transaction (SA-12) -- 1h
- #174: Firestore Rules Hardening (SA-15) -- 1h (depends on #172)
- #175: HTTP Security Headers + CSP (SA-14) -- 2h (longest, start early)

**Dependencies:** #174 depends on #172 (rules must match client validation)

### Activity S7.4: Halachic Disclaimer (Non-Code)

**Type:** Content writing
**Estimate:** 1h
**Owner:** Developer (with optional rabbi review)

Write a clear disclaimer to add to the app's About/Settings screen:

> "This tool is for tracking purposes only. It does not provide halachic rulings. Consult your rabbi for specific questions about ma'aser obligations, including calculations on capital gains, gifts, business expenses, and other income types."

**Deliverable:** Hebrew and English text, ready for implementation in Sprint 8.

### Activity S7.5: Shareable Product Description (Non-Code)

**Type:** Content writing
**Estimate:** 2h
**Owner:** Developer

Write three versions of a product description:
1. **One-liner** (for WhatsApp share): "Track your ma'aser obligations easily -- offline, private, in Hebrew or English. Free and open source."
2. **Paragraph** (for community bulletins, Reddit posts): ~200 words explaining what the tool does, why it exists, and how to try it.
3. **Technical brief** (for Jewish tech communities): ~300 words including the tech stack, privacy model, and call for contributors.

**Deliverable:** Markdown file at `docs/PRODUCT_DESCRIPTION.md`, bilingual (Hebrew + English).

### Activity S7.6: Identify 10 Personal Contacts

**Type:** Personal outreach preparation
**Estimate:** 1h
**Owner:** Developer

Create a private list of 10 people to invite as beta testers:
- 3-4 family members who track ma'aser
- 3-4 friends/community members
- 2-3 tech-savvy friends who can give UX feedback

**Deliverable:** Private list (not in repo). Each person should be someone you can ask follow-up questions.

---

## Phase 1: First Users (Sprint 8 -- Days 15-28)

**Theme:** "Get 10 real users and watch what they do"
**Hours budget:** 20h
**Dev time:** ~10h | **Non-code time:** ~10h

### Sprint 8 Goals

1. Add halachic disclaimer to the app
2. Add minimal feedback mechanism
3. Deploy disclaimer + feedback to production
4. Invite 10 beta testers personally
5. Set up GitHub Sponsors

### Story S8.1: Add Halachic Disclaimer to App

**Type:** Feature (small)
**Priority:** P1-high
**Estimate:** 3h (includes translations + tests)
**Agent:** `react-specialist`
**New Issue Required:** Yes

**Description:** Add a disclaimer banner/section to the Settings or About screen. Must be bilingual. Should be visible but not intrusive -- not a blocking modal, but clearly present.

**Acceptance Criteria:**
- [ ] Disclaimer visible in Settings/About screen
- [ ] Hebrew and English versions match in meaning
- [ ] RTL rendering correct for Hebrew
- [ ] Accessible (screen reader compatible)
- [ ] Unit test for component rendering

**Implementation Notes:**
- Add to `src/translations/en.js` and `src/translations/he.js`
- Consider a collapsible `Alert` MUI component with `severity="info"`

### Story S8.2: Add Feedback Mechanism

**Type:** Feature (small)
**Priority:** P1-high
**Estimate:** 4h (includes translations + tests)
**Agent:** `react-specialist`
**New Issue Required:** Yes

**Description:** Add a "Send Feedback" button that opens a pre-filled GitHub issue template URL or a simple feedback form. For MVP, a `mailto:` link or GitHub issue link is sufficient -- no backend needed.

**Acceptance Criteria:**
- [ ] Feedback button visible in Settings or app header
- [ ] Opens GitHub issue with pre-filled template (category, description)
- [ ] Works offline (stores feedback locally, sends when online) -- OR -- degrades gracefully with "requires internet" message
- [ ] Bilingual button text
- [ ] Does not require GitHub account (consider Google Form as alternative)

**Implementation Options (choose simplest):**
1. GitHub issue link with template parameters (requires GitHub account)
2. Google Form embedded/linked (no account needed, free)
3. `mailto:` link with pre-filled subject (universal, lowest friction)

**Recommendation:** Start with Google Form (2-3 questions: What did you try? What confused you? What would you add?) -- it requires no GitHub account and the target audience is not developers.

### Story S8.3: Add Basic Analytics

**Type:** Feature (small)
**Priority:** P2-medium
**Estimate:** 3h
**Agent:** `react-specialist`
**New Issue Required:** Yes

**Description:** Add privacy-respecting analytics to understand basic usage. Plausible.io (free for <10K pageviews/mo), or a self-hosted simple counter. No cookies, no personal data, GDPR-compliant by design.

**Acceptance Criteria:**
- [ ] Analytics script loads on production only (not dev/test)
- [ ] No cookies set
- [ ] No personal data collected
- [ ] Dashboard accessible to developer
- [ ] Tracks: page views, unique visitors, PWA installs (if detectable), referrer sources
- [ ] Does not break existing GDPR consent flow

**Implementation Notes:**
- Plausible.io: Add `<script>` tag to `index.html` with production domain guard
- Alternative: Simple hit counter via Cloudflare Analytics (if using custom domain) or GoatCounter (open source, free)
- Must NOT conflict with existing consent management

### Activity S8.4: Personal Beta Outreach

**Type:** Community engagement (non-code)
**Estimate:** 4h over 2 weeks
**Owner:** Developer

**Week 1 actions:**
- Send personal message (WhatsApp/phone) to each of the 10 contacts
- Include: one-liner description + link to https://dubiwork.github.io/maaser-tracker/
- Ask: "I built a tool for tracking ma'aser. Would you try it for 2 weeks and tell me what you think?"
- Offer to help them set it up (5-minute call if needed)

**Week 2 actions:**
- Check in with each person: "Have you tried it? Any questions?"
- Note which features they used and what confused them
- Document feedback in a private note (not in repo)

**Success criteria:** At least 5 of 10 contacts actually try the app.

### Activity S8.5: Set Up GitHub Sponsors

**Type:** Infrastructure (non-code)
**Estimate:** 1h
**Owner:** Developer

- Enable GitHub Sponsors on the repository
- Write a brief sponsor description: "Support Ma'aser Tracker -- the only purpose-built tool for tracking Jewish charitable giving obligations"
- Set tier levels ($1, $5, $10/month -- symbolic, not revenue-focused)
- Add Sponsors badge to README

**Why now:** Even with zero sponsors, having the mechanism signals the project is serious and accepting support. It costs nothing and takes 30 minutes.

---

## Phase 2: Listen and Refine (Sprint 9 -- Days 29-42)

**Theme:** "Learn from what users actually do"
**Hours budget:** 20h
**Dev time:** ~8h | **Non-code time:** ~12h

### Sprint 9 Goals

1. Collect and synthesize user feedback
2. Implement top user-requested fix/improvement
3. Add Sentry error tracking
4. Improve README for non-developers
5. Draft community posting content

### Story S9.1: Implement Top User Feedback Item

**Type:** Depends on feedback
**Priority:** P0-critical (user-validated)
**Estimate:** 4-6h
**Agent:** Depends on nature of fix
**New Issue Required:** Yes (after feedback collected)

**Description:** After 2 weeks of beta testing, the single most impactful thing users struggled with gets fixed. This is deliberately left undefined because the whole point is responding to real data, not guessing.

**Common predictions (from the audit):**
- Onboarding confusion (no first-run experience)
- Unclear what to enter in which field
- Missing categories they expect
- Mobile UX friction points
- Hebrew/English switching confusion

**Acceptance Criteria:**
- [ ] Based on actual user feedback (documented)
- [ ] Addresses the most common complaint or confusion
- [ ] Validated with at least 1 beta tester before closing

### Story S9.2: Add Error Tracking (Sentry)

**Type:** Infrastructure
**Priority:** P1-high
**Estimate:** 2-3h
**Agent:** `react-specialist`
**New Issue Required:** Yes

**Description:** Add Sentry.io free tier (5K events/month) for production error tracking. Before sharing with more users, you need to know when things break.

**Acceptance Criteria:**
- [ ] Sentry SDK installed and configured
- [ ] Error boundary catches and reports React errors
- [ ] Unhandled promise rejections reported
- [ ] Source maps uploaded for readable stack traces
- [ ] Production-only (no noise from dev/test)
- [ ] Sentry project dashboard accessible
- [ ] GDPR-compliant (no PII in error reports)

**Implementation Notes:**
- `npm install @sentry/react`
- Initialize in `main.jsx` with environment guard
- Wrap `<App>` in Sentry error boundary
- Add `VITE_SENTRY_DSN` to env vars and CI/CD secrets

### Activity S9.3: Rewrite README for Users (Not Developers)

**Type:** Documentation (non-code)
**Priority:** P1-high
**Estimate:** 2h
**Owner:** Developer

The current README is developer-facing. The target audience is observant Jewish families, not React developers. Create a user-facing section at the top.

**Deliverable:** Updated README.md with:
1. **Above the fold:** What it does (in plain language), screenshot, "Try it now" link
2. **Features list:** In user language ("Track income and donations", not "IndexedDB with React Query")
3. **How to use:** 3-step quick start
4. **Privacy:** "Your data stays on your device" -- trust-building language
5. **For developers:** Existing technical content moved below a divider

### Activity S9.4: Synthesize Beta Feedback

**Type:** Analysis (non-code)
**Priority:** P0-critical
**Estimate:** 3h
**Owner:** Developer

**Actions:**
- Compile all feedback from 10 beta testers
- Categorize: UX issues, missing features, confusion points, positive signals
- Rank by frequency (how many people mentioned it)
- Create GitHub issues for top 5 items (with `user-feedback` label)
- Update project roadmap if feedback contradicts current priorities

**Deliverable:** `docs/BETA_FEEDBACK_REPORT.md` -- anonymized summary of findings.

### Activity S9.5: Draft Community Posts

**Type:** Content creation (non-code)
**Priority:** P2-medium
**Estimate:** 3h
**Owner:** Developer

Write draft posts for:
1. **Reddit r/Judaism** -- conversational, asking for feedback: "I built a free ma'aser tracking tool -- would love your thoughts"
2. **Reddit r/Jewish** -- similar, slightly different angle
3. **Jewish tech Facebook/LinkedIn groups** -- more technical, inviting contributors
4. **WhatsApp-ready message** -- short, shareable, includes link

**Deliverable:** `docs/COMMUNITY_POSTS.md` -- ready-to-post drafts.

---

## Phase 3: Community Launch (Sprint 10 -- Days 43-56)

**Theme:** "Tell the world -- strategically"
**Hours budget:** 20h
**Dev time:** ~6h | **Non-code time:** ~14h

### Sprint 10 Goals

1. Post in online Jewish communities
2. Create CONTRIBUTING.md
3. Label good-first-issues
4. Implement 1-2 more user feedback items
5. Approach one rabbi for informal feedback

### Story S10.1: Implement User Feedback Items #2 and #3

**Type:** Depends on feedback
**Priority:** P1-high
**Estimate:** 4-6h
**Agent:** Depends on nature
**New Issues Required:** Yes (from S9.4 output)

Same pattern as S9.1 -- respond to validated user needs, not assumptions.

### Story S10.2: Create CONTRIBUTING.md

**Type:** Documentation
**Priority:** P2-medium
**Estimate:** 2h
**Agent:** `documentation-engineer`
**New Issue Required:** Yes

**Description:** Lower the barrier for open-source contributors. The project's test coverage and CI pipeline make it unusually contributor-friendly -- this document should communicate that.

**Acceptance Criteria:**
- [ ] CONTRIBUTING.md in repo root
- [ ] Covers: local setup, running tests, branch naming, PR process
- [ ] References the agent-based workflow (simplified for contributors)
- [ ] Lists the tech stack clearly
- [ ] Mentions bilingual requirement (all user-facing text needs Hebrew + English)
- [ ] Links to good-first-issue labels
- [ ] Welcoming tone

### Activity S10.3: Label Good-First Issues

**Type:** Project management (non-code)
**Priority:** P2-medium
**Estimate:** 30min
**Owner:** Developer

Review backlog and label 5 issues as `good first issue`:

**Candidates:**
- #43 (Notes Presets -- self-contained UI component)
- #24 (Accessibility improvements -- well-defined scope)
- #26 (Haptic Feedback -- isolated feature)
- #134 (Offline write fix -- clear bug)
- One new issue from user feedback (simple)

### Activity S10.4: Community Posts -- Go Live

**Type:** Community engagement (non-code)
**Priority:** P0-critical
**Estimate:** 4h (posting + monitoring responses for 2 weeks)
**Owner:** Developer

**Posting schedule (staggered, not all at once):**
- **Day 1:** Reddit r/Judaism
- **Day 3:** Reddit r/Jewish
- **Day 5:** Jewish tech Facebook/LinkedIn group
- **Day 7+:** Share WhatsApp message in relevant groups

**During the 2 weeks after posting:**
- Respond to every comment within 24 hours
- Track: upvotes, comments, sign-ups, GitHub stars
- Note feature requests and confusion points
- Be genuine, not salesy -- "I built this for myself, sharing in case useful"

### Activity S10.5: Rabbi Outreach (Informal)

**Type:** Relationship building (non-code)
**Priority:** P2-medium
**Estimate:** 2h
**Owner:** Developer

**NOT asking for endorsement.** Asking for feedback.

- Identify 1-2 community rabbis who are tech-friendly
- Send a respectful message: "I built a tool to help people track ma'aser. I would value your feedback on whether the approach is sound and whether you see any halachic concerns with how it calculates."
- If they respond positively, ask if they would be willing to recommend it to congregants (future sprint)

**Key principle:** Build the relationship first. Endorsement comes after trust.

---

## Phase 4: Measure and Decide (Sprint 11 -- Days 57-70)

**Theme:** "What did we learn? What comes next?"
**Hours budget:** 20h
**Dev time:** ~10h | **Non-code time:** ~10h

### Sprint 11 Goals

1. Analyze all metrics from community launch
2. Write strategic brief (vision/mission/3-year)
3. Decide: community project vs. product path
4. Resume technical development based on validated priorities
5. Plan next quarter

### Activity S11.1: Metrics Analysis

**Type:** Analysis (non-code)
**Priority:** P0-critical
**Estimate:** 3h
**Owner:** Developer

**Measure against Day-90 targets (from CEO audit):**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Real users (not developer) | 50+ | ? | |
| Weekly active users | 20+ | ? | |
| Feedback items collected | 15+ | ? | |
| PWA installs | 10+ | ? | |
| GitHub stars | 25+ | ? | |

**Additional metrics to check:**
- Plausible.io/analytics: page views, unique visitors, referrer sources
- Sentry: error rate, most common errors
- GitHub: issues opened by external users, PRs from contributors
- Community posts: engagement, follows, DMs

**Deliverable:** `docs/LAUNCH_METRICS_REPORT.md`

### Activity S11.2: Write Strategic Brief

**Type:** Strategy document (non-code)
**Priority:** P1-high
**Estimate:** 3h
**Owner:** Developer

Now that you have real user data, write the one-page strategic brief the CEO audit recommended:

1. **Vision** (10-year): What does the world look like if Ma'aser Tracker succeeds?
2. **Mission** (why): Why does this tool exist?
3. **Strategy** (3-year): How will we get there?
4. **Values** (how): What principles guide decisions?
5. **North Star Metric**: The single number that measures success

**Deliverable:** `docs/STRATEGIC_BRIEF.md`

### Activity S11.3: Path Decision

**Type:** Strategic decision (non-code)
**Priority:** P0-critical
**Estimate:** 2h
**Owner:** Developer

Based on metrics and feedback, decide:

**If metrics are strong (50+ users, 20+ WAU, positive feedback):**
- Path B: Evolve toward product
- Next steps: Firebase auth completion, family/household feature, custom domain
- Consider: revenue model, contributor recruitment, rabbi endorsements

**If metrics are moderate (20-50 users, some positive feedback):**
- Path A+: Community project with growth intent
- Next steps: Continue community engagement, fix top UX issues, content marketing
- Hold on new features until usage grows

**If metrics are weak (<20 users, limited engagement):**
- Path A: Community project, sustainable pace
- Next steps: Reduce scope, focus on personal utility, keep it alive without pressure
- Re-evaluate in 6 months

### Story S11.4: Resume Technical Development

**Type:** Development
**Priority:** P1-high
**Estimate:** 8h
**Agent:** Appropriate specialist

Based on the path decision and user feedback, execute the highest-priority technical work. Candidates:

**If user feedback says "I need multi-device sync":**
- Resume Firebase auth/sync work (was Phase 1.5)

**If user feedback says "the app is confusing":**
- Onboarding/UX improvements

**If user feedback says "I need feature X":**
- Build feature X

**This story is deliberately not pre-defined.** The whole point of this plan is to let user data drive technical priorities.

---

## Phase 5: Sustained Growth (Sprint 12 -- Days 71-90)

**Theme:** "Build momentum, not just features"
**Hours budget:** 20h
**Dev time:** ~12h | **Non-code time:** ~8h

### Sprint 12 Goals

1. Continue implementing user-validated features
2. Write 1-2 content pieces (SEO/community value)
3. Second round of community posting
4. Quarterly plan for next 90 days

### Story S12.1: User-Validated Feature Development

**Type:** Development
**Priority:** P1-high
**Estimate:** 8-10h
**Agent:** Appropriate specialist
**Issues:** Created from validated feedback

Continue building what users actually need.

### Activity S12.2: Content Creation (SEO)

**Type:** Content writing (non-code)
**Priority:** P2-medium
**Estimate:** 4h
**Owner:** Developer

Write 1-2 articles that provide value to the target audience AND drive organic search traffic:

**Article ideas:**
- "How to Calculate Ma'aser on Stock Gains -- A Practical Guide" (high search intent)
- "Ma'aser Tracking: Why a Spreadsheet Isn't Enough" (problem-aware audience)
- "Digital Ma'aser Tracking for Families -- Getting Started" (solution-aware audience)

**Where to publish:** GitHub Pages blog section, Medium, or dev.to (cross-post).

### Activity S12.3: Quarterly Planning

**Type:** Planning (non-code)
**Priority:** P1-high
**Estimate:** 3h
**Owner:** Developer

Based on 90 days of data, create the Q2 plan:

- Review all metrics and feedback
- Prioritize backlog based on user needs (not developer interest)
- Set 3-month goals with measurable targets
- Decide on staging queue priorities (promote/demote epics)
- Update strategic brief if needed

**Deliverable:** `docs/Q2_PLAN.md`

---

## Dependency Graph

```
Phase 0 (Launch Readiness)
  S7.1 (#166 regression fix) ─────────────┐
  S7.2 (security wave 1) ─────────────────┤
  S7.3 (security wave 2) ─────────────────┤
    [S7.3: #172 → #174 sequential]        │
  S7.4 (disclaimer text) ─────────────────┤
  S7.5 (product description) ─────────────┤
  S7.6 (identify 10 contacts) ────────────┘
                                           │
                                           ▼
Phase 1 (First Users)
  S8.1 (disclaimer in app) ←── S7.4       │
  S8.2 (feedback mechanism) ──────────────┤
  S8.3 (analytics) ───────────────────────┤
  S8.4 (personal outreach) ←── S7.5, S7.6│
  S8.5 (GitHub Sponsors) ─────────────────┘
                                           │
                                           ▼
Phase 2 (Listen & Refine)
  S9.1 (top feedback fix) ←── S8.4 feedback│
  S9.2 (Sentry error tracking) ───────────┤
  S9.3 (README rewrite) ──────────────────┤
  S9.4 (feedback synthesis) ←── S8.4      │
  S9.5 (draft community posts) ───────────┘
                                           │
                                           ▼
Phase 3 (Community Launch)
  S10.1 (feedback items #2-3) ←── S9.4    │
  S10.2 (CONTRIBUTING.md) ────────────────┤
  S10.3 (good-first-issue labels) ────────┤
  S10.4 (community posts go live) ←── S9.5│
  S10.5 (rabbi outreach) ─────────────────┘
                                           │
                                           ▼
Phase 4 (Measure & Decide)
  S11.1 (metrics analysis) ←── S8.3, S10.4│
  S11.2 (strategic brief) ←── S11.1       │
  S11.3 (path decision) ←── S11.1, S11.2  │
  S11.4 (resume dev) ←── S11.3            │
                                           │
                                           ▼
Phase 5 (Sustained Growth)
  S12.1 (validated features) ←── S11.3    │
  S12.2 (content creation) ───────────────┤
  S12.3 (quarterly planning) ─────────────┘
```

---

## Time Budget Summary

| Sprint | Phase | Dev Hours | Non-Code Hours | Total |
|--------|-------|-----------|----------------|-------|
| Sprint 7 (Days 1-14) | 0: Launch Readiness | 14h | 6h | 20h |
| Sprint 8 (Days 15-28) | 1: First Users | 10h | 10h | 20h |
| Sprint 9 (Days 29-42) | 2: Listen & Refine | 8h | 12h | 20h |
| Sprint 10 (Days 43-56) | 3: Community Launch | 6h | 14h | 20h |
| Sprint 11 (Days 57-70) | 4: Measure & Decide | 10h | 10h | 20h |
| Sprint 12 (Days 71-90) | 5: Sustained Growth | 12h | 8h | 20h |
| **Total** | | **60h** | **60h** | **120h** |

**Key insight:** The plan allocates 50% of time to non-code activities. This is deliberate. The audit's lowest scores are Community (20/100) and GTM (15/100) -- both are non-code problems. Engineering (78/100) is already strong.

---

## GitHub Issue Creation Plan

### New Labels Required

| Label | Color | Description |
|-------|-------|-------------|
| `gtm` | `#FFA500` | Go-to-market and user acquisition |
| `community` | `#7057FF` | Community engagement and outreach |
| `user-feedback` | `#D4C5F9` | Sourced from real user feedback |
| `strategic` | `#0075CA` | Strategic planning and decisions |
| `content` | `#BFD4F2` | Content creation (docs, articles, posts) |

### New Milestone Required

| Milestone | Description | Due Date |
|-----------|-------------|----------|
| `v1.4.0-first-users` | First 50 real users and community launch | 2026-06-12 (90 days) |

### Issues to Create

**Note:** Only the code-related issues need GitHub issues. Non-code activities are tracked in this plan document. However, creating issues for key non-code milestones provides visibility on the project board.

---

#### Epic: Strategic Launch (NEW)

**Title:** Epic: Strategic Launch -- First 50 Users in 90 Days
**Labels:** `epic`, `gtm`, `P0-critical`, `strategic`
**Milestone:** `v1.4.0-first-users`
**Description:**
```
## Context
CEO Strategic Audit scored the project 52/100 (Adequate). Engineering is strong (78/100)
but Community (20/100) and GTM (15/100) are critical gaps. This epic tracks the non-code
and code work needed to get the first 50 real users.

## Success Criteria
- [ ] 50+ real users (not developer)
- [ ] 20+ weekly active users
- [ ] 15+ feedback items collected
- [ ] 10+ PWA installs
- [ ] 25+ GitHub stars

## Plan Reference
`docs/plans/maaser-tracker-execution-plan.md`
```

---

#### Issue: Add Halachic Disclaimer

**Title:** Add halachic disclaimer to Settings/About screen
**Labels:** `enhancement`, `frontend`, `i18n`, `P1-high`, `size:XS`, `gtm`
**Milestone:** `v1.4.0-first-users`
**Parent:** Strategic Launch epic
**Description:**
```
## User Story
As a user, I want to see a clear disclaimer about the tool's limitations so that I
understand it does not replace rabbinic guidance.

## Context
CEO audit recommendation (Risk R4 -- halachic accuracy). Required before sharing
with real users.

## Acceptance Criteria
- [ ] Disclaimer visible in Settings or About screen
- [ ] Hebrew and English versions
- [ ] RTL rendering correct
- [ ] Not a blocking modal -- informational only
- [ ] Unit test for component rendering

## Technical Notes
- MUI `Alert` component with `severity="info"`, collapsible
- Add to `src/translations/en.js` and `he.js`
- Approximate text: "This tool is for tracking purposes only. Consult your rabbi
  for specific halachic questions about ma'aser obligations."
```

---

#### Issue: Add Feedback Mechanism

**Title:** Add user feedback mechanism (Google Form or GitHub Issue link)
**Labels:** `enhancement`, `frontend`, `P1-high`, `size:XS`, `gtm`
**Milestone:** `v1.4.0-first-users`
**Parent:** Strategic Launch epic
**Description:**
```
## User Story
As a user, I want to easily share feedback about the app so that the developer
knows what to improve.

## Context
CEO audit finding: "No feedback mechanism" (PRD-02 FAIL, STK-04 FAIL).

## Acceptance Criteria
- [ ] Feedback button visible in Settings or app header/menu
- [ ] Opens feedback form (Google Form preferred -- no account needed)
- [ ] Bilingual button text
- [ ] Graceful handling when offline

## Implementation Options (pick simplest)
1. Google Form link (recommended -- no GitHub account needed)
2. GitHub issue template link
3. mailto: link

## Technical Notes
- MUI `IconButton` with feedback icon + text
- Google Form with 3 fields: What did you try? What confused you? Suggestions?
```

---

#### Issue: Add Privacy-Respecting Analytics

**Title:** Add privacy-respecting analytics (Plausible.io or equivalent)
**Labels:** `enhancement`, `infrastructure`, `P2-medium`, `size:XS`, `gtm`
**Milestone:** `v1.4.0-first-users`
**Parent:** Strategic Launch epic
**Description:**
```
## User Story
As the developer, I want to see basic usage metrics (visits, installs, retention)
so that I can make data-driven decisions about what to build next.

## Context
CEO audit: "No analytics or usage data" (PRD-03 FAIL). Required to measure success
of community launch.

## Acceptance Criteria
- [ ] Analytics loads on production only
- [ ] No cookies set (GDPR-compliant by design)
- [ ] No personal data collected
- [ ] Tracks: page views, unique visitors, referrer sources
- [ ] Developer-accessible dashboard
- [ ] Does not conflict with existing GDPR consent flow

## Technical Notes
- Plausible.io free tier (<10K pageviews/mo)
- Single `<script>` tag in index.html with production guard
- Alternative: GoatCounter (self-hosted, open source)
```

---

#### Issue: Add Sentry Error Tracking

**Title:** Add Sentry error tracking for production visibility
**Labels:** `enhancement`, `infrastructure`, `P1-high`, `size:S`
**Milestone:** `v1.4.0-first-users`
**Parent:** Strategic Launch epic
**Description:**
```
## User Story
As the developer, I want to know when the app crashes for real users so that I can
fix issues before they report them.

## Context
CEO audit: "No error tracking" (OPS-04 FAIL). Required before scaling beyond beta.

## Acceptance Criteria
- [ ] @sentry/react installed and configured
- [ ] Error boundary wraps App component
- [ ] Unhandled promise rejections reported
- [ ] Source maps uploaded for readable traces
- [ ] Production-only (dev/test excluded)
- [ ] GDPR-compliant (no PII in reports)
- [ ] VITE_SENTRY_DSN added to env + CI/CD workflows

## Technical Notes
- Sentry free tier: 5K events/month
- Initialize in main.jsx
- Add `VITE_SENTRY_DSN` to .env.example, ci.yml, deploy.yml
```

---

#### Issue: Rewrite README for Non-Technical Users

**Title:** Rewrite README with user-facing content above the fold
**Labels:** `documentation`, `P1-high`, `size:XS`, `gtm`
**Milestone:** `v1.4.0-first-users`
**Parent:** Strategic Launch epic
**Description:**
```
## Context
Current README is developer-facing. Target audience is observant Jewish families.
First impression matters for community sharing.

## Acceptance Criteria
- [ ] User-facing section at the top: what it does, screenshot, "Try it now" link
- [ ] Features in plain language
- [ ] Privacy statement (trust-building)
- [ ] 3-step quick start
- [ ] Developer section below divider
- [ ] Bilingual or at least Hebrew one-liner
```

---

#### Issue: Create CONTRIBUTING.md

**Title:** Create CONTRIBUTING.md for open-source contributors
**Labels:** `documentation`, `P2-medium`, `size:XS`
**Milestone:** `v1.4.0-first-users`
**Parent:** Strategic Launch epic
**Description:**
```
## Context
CEO audit: "No CONTRIBUTING.md, no good-first-issue labels" (ORG-04 FAIL).
The project's 981+ tests and CI pipeline make it unusually contributor-friendly.

## Acceptance Criteria
- [ ] CONTRIBUTING.md in repo root
- [ ] Local setup instructions
- [ ] How to run tests
- [ ] Branch naming and PR process
- [ ] Bilingual requirement explained
- [ ] Links to good-first-issue labels
- [ ] Welcoming, inclusive tone
```

---

#### Issue: Set Up GitHub Sponsors

**Title:** Enable GitHub Sponsors with project description
**Labels:** `gtm`, `P2-medium`, `size:XS`
**Milestone:** `v1.4.0-first-users`
**Parent:** Strategic Launch epic
**Description:**
```
## Context
CEO audit financial recommendation: "Set up GitHub Sponsors immediately. Zero cost,
zero risk." Even with $0 sponsors, the mechanism signals seriousness.

## Tasks
- [ ] Enable GitHub Sponsors on DubiWork account
- [ ] Write sponsor description
- [ ] Set tier levels ($1, $5, $10/month)
- [ ] Add Sponsors badge to README
```

---

#### Issue: Write Product Description (Bilingual)

**Title:** Write shareable product descriptions (one-liner, paragraph, technical brief)
**Labels:** `documentation`, `content`, `gtm`, `P1-high`, `size:XS`
**Milestone:** `v1.4.0-first-users`
**Parent:** Strategic Launch epic
**Description:**
```
## Context
Required for community outreach. Three versions for different channels:
1. One-liner (WhatsApp shares)
2. Paragraph (community bulletins, Reddit)
3. Technical brief (developer communities)

## Acceptance Criteria
- [ ] All three versions in Hebrew and English
- [ ] Saved to docs/PRODUCT_DESCRIPTION.md
- [ ] Non-technical language in versions 1-2
- [ ] Includes app URL and privacy positioning
```

---

## Existing Pipeline Integration

This plan does NOT interfere with the existing staging queue. Here is how they coexist:

| Existing Work | Status | Plan Interaction |
|--------------|--------|-----------------|
| Epic #140 (Security Audit) | Active, v1.3.0-launch blocker | **Phase 0 priority.** Must complete before user outreach. |
| Epic #41 (Import/Export) | Staging bake | Continues through pipeline. No change. |
| Epic #142 (External CSV) | Staging bake | Continues through pipeline. No change. |
| Epic #155 (Playwright e2e) | Staging bake | Continues through pipeline. No change. |
| Issue #166 (Prod regression) | Open, P0-critical | **Phase 0 priority.** Fix before user outreach. |
| Issue #128 (Deployment pipeline) | Open, bug | De-prioritized unless it blocks user testing. |
| Issue #134 (Offline write) | Open, P3-polish | Good candidate for `good first issue` label. |
| Backlog (#9-#26, #42-#43) | Open, various priority | **Frozen until Phase 4 path decision.** No new work until user feedback validates direction. |

### Staging Queue After Phase 0

Once Epic #140 completes and merges to develop:
1. The 3 baking epics (#41, #142, #155) proceed through normal promotion workflow
2. **No new epics enter the staging queue until Phase 4 path decision**
3. Sprint capacity reserved for user-acquisition work, not feature development

---

## Risks and Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| R1 | Nobody in the 10 contacts actually tries the app | MEDIUM | HIGH | Over-recruit (ask 15, expect 10 to try). Make it personal -- offer to set it up together. |
| R2 | Community posts get negative reception | LOW | MEDIUM | Lead with humility ("I built this for myself"). Do not be defensive. Thank every critic. |
| R3 | Non-code activities feel unproductive and get skipped | HIGH | CRITICAL | This is the biggest risk. Non-code work IS the work. Set calendar blocks. Treat outreach with the same discipline as sprints. |
| R4 | Security audit takes longer than estimated | MEDIUM | MEDIUM | CSP (#175) is the riskiest. Test in staging thoroughly. Budget extra time for Wave 2. |
| R5 | Analytics/Sentry add complexity without value at low user counts | LOW | LOW | Both are free tier, minimal code. Even 5 users worth monitoring for. |
| R6 | Developer burnout from context-switching (code + community) | MEDIUM | HIGH | Strict 50/50 split enforced by sprint structure. Community work is different enough to be mentally refreshing, not draining. |
| R7 | Rabbi outreach gets no response or negative response | MEDIUM | LOW | This is exploratory. No response is fine. Negative feedback is valuable data. Approach humbly, not as marketing. |

---

## Success Metrics by Phase

| Phase | Key Metric | Target | When to Measure |
|-------|-----------|--------|-----------------|
| Phase 0 | Security audit complete, prod green | All #140 sub-tasks closed | Day 14 |
| Phase 1 | Beta testers invited | 10 personal invites sent | Day 21 |
| Phase 1 | Beta testers active | 5+ of 10 tried the app | Day 28 |
| Phase 2 | Feedback collected | 10+ feedback items | Day 42 |
| Phase 3 | Community posts published | 3+ platforms | Day 49 |
| Phase 3 | New users from community | 20+ unique visitors | Day 56 |
| Phase 4 | Real users (not developer) | 50+ | Day 70 |
| Phase 4 | Weekly active users | 20+ | Day 70 |
| Phase 5 | Sustained growth | WAU not declining | Day 90 |
| Phase 5 | Strategic direction chosen | Brief written, path decided | Day 90 |

---

## Appendix A: Weekly Time Allocation Template

For the 10 hours/week budget:

| Day | Activity | Hours |
|-----|----------|-------|
| **Weekday evening 1** | Code: sprint stories | 2h |
| **Weekday evening 2** | Code: sprint stories | 2h |
| **Weekday evening 3** | Non-code: outreach, feedback, content | 2h |
| **Weekend block** | Mixed: code + non-code, sprint planning | 4h |
| **Total** | | **10h** |

---

## Appendix B: Score Improvement Forecast

If this plan executes successfully, projected CEO audit scores at Day 90:

| Domain | Current | Projected | Delta | Driver |
|--------|---------|-----------|-------|--------|
| 1. Vision & Strategy | 45 | 60 | +15 | Strategic brief written |
| 2. Market Position | 72 | 75 | +3 | Market sizing documented |
| 3. Financial Health | 30 | 40 | +10 | GitHub Sponsors, cost planning |
| 4. Product Strategy | 68 | 78 | +10 | User feedback loop operational |
| 5. Engineering | 78 | 82 | +4 | Sentry, analytics, Lighthouse CI |
| 6. Organization | 35 | 50 | +15 | CONTRIBUTING.md, good-first-issues, backup person |
| 7. Community | 20 | 55 | +35 | 50+ users, feedback loop, community posts |
| 8. GTM | 15 | 55 | +40 | Community-led launch executed |
| 9. Risk | 55 | 65 | +10 | Risk register, disclaimer, error tracking |
| 10. Innovation | 60 | 62 | +2 | No change -- correctly deprioritized |
| **Overall** | **52** | **65** | **+13** | |

The biggest gains come from Community (+35) and GTM (+40) -- exactly the areas the audit identified as critical. Engineering gets marginal improvements because it was already strong.

---

**Plan authored by:** Solution Designer Agent
**Input:** CEO Strategic Audit Report (2026-03-12)
**Approved by:** [Pending developer review]
**Review date:** [To be scheduled]
