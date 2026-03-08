# Changelog

All notable changes to Ma'aser Tracker will be documented in this file.

## [1.2.0] - 2026-03-07

### Added
- Privacy Policy page accessible at `#/privacy` (in-app) and `/privacy.html` (static)
- Bilingual privacy policy content (English + Hebrew) covering GDPR Articles 13, 17, 20
- Hash-based routing for privacy policy page
- Privacy Policy link in UserProfile menu (visible to all users)
- Privacy policy link in SignInDialog and MigrationPrompt
- 614 lines of new test coverage (PrivacyPolicy + routing tests)

## [1.1.0] - 2026-03-07

### Added
- GDPR Data Management: Export and Delete Cloud Data (Issue #53)
  - Export user data as JSON (GDPR Article 20 — Right to Data Portability)
  - Delete all cloud data (GDPR Article 17 — Right to Erasure)
  - DataManagementDialog with 6 states and progress tracking
  - 104 new GDPR unit tests

### Fixed
- Language selection now persists across page refreshes (Issue #50)
- Character counter on note fields now color-coded (yellow at 90%, red at limit) (Issue #28)

## [1.0.0] - 2026-03-06

### Added
- Core ma'aser tracking (income and donations)
- IndexedDB offline-first storage
- Firebase Authentication (Google Sign-In)
- Firestore cloud sync with migration engine
- Dynamic sync status in UserProfile
- Positive dashboard redesign
- Bilingual support (Hebrew RTL / English LTR)
- PWA with offline support and install prompt
- CI/CD pipeline (GitHub Actions → GitHub Pages + Netlify)
