# Ma'aser Tracker 📊

> A Progressive Web App for tracking Jewish charitable giving (ma'aser - מעשר)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![CI](https://github.com/DubiWork/maaser-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/DubiWork/maaser-tracker/actions/workflows/ci.yml)
[![Deploy](https://github.com/DubiWork/maaser-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/DubiWork/maaser-tracker/actions/workflows/deploy.yml)

[English](#english) | [עברית](#hebrew)

---

## English

### 🎯 Vision

Ma'aser Tracker is a local-first Progressive Web App that helps Jewish individuals and families track their charitable obligations (ma'aser - 10% of income) with ease and privacy. The app provides a simple, intuitive interface for recording income and donations, calculating obligations, and generating reports—all while keeping your financial data completely private and offline-capable.

### ✨ Features

#### Current Features (v0.1.0)
- ✅ **Bilingual Support** - Full Hebrew (RTL) and English (LTR) interface
- ✅ **Income Tracking** - Record income with dates, amounts, and notes
- ✅ **Donation Tracking** - Track charitable donations (tzedakah)
- ✅ **Ma'aser Calculation** - Automatic 10% obligation calculation
- ✅ **Dashboard** - View totals, obligations, and giving status at a glance
- ✅ **History View** - Browse, edit, and delete past entries
- ✅ **Offline-First** - Works without internet connection
- ✅ **Privacy-Focused** - All data stored locally on your device
- ✅ **Material Design** - Clean, modern UI with Material-UI components

#### In Development (v0.2.0 - Sprint 1-2)
- 🚧 **IndexedDB Storage** - Robust local database replacing LocalStorage
- 🚧 **PWA Installation** - Install as native-like app on any device
- 🚧 **Error Recovery** - Automatic data migration and backup
- 🚧 **Testing Coverage** - Comprehensive automated testing

#### Planned Features (Roadmap)
- 📅 **Date Range Filtering** - View entries for custom time periods
- 🏷️ **Donation Categories** - Organize giving by recipient type
- 🔄 **Recurring Income** - Set up automatic recurring entries
- 💱 **Multi-Currency** - Support for international currencies
- ⚙️ **Settings & Preferences** - Customize ma'aser percentage, theme, etc.
- ☁️ **Cloud Backup** - Optional Google Sheets sync
- 📊 **Reports & Analytics** - Monthly/yearly summaries
- 📄 **Tax Reports** - Generate tax-ready documentation
- ♿ **Accessibility** - WCAG 2.1 AA compliance
- 📱 **Haptic Feedback** - Enhanced mobile experience

### 🚀 Getting Started

#### Prerequisites
- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

#### Installation

```bash
# Clone the repository
git clone https://github.com/DubiWork/maaser-tracker.git
cd maaser-tracker

# Install dependencies
npm install

# Configure Firebase (see Firebase Setup below)
cp .env.example .env
# Edit .env with your Firebase credentials

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

#### Firebase Setup

This app requires Firebase for authentication and cloud storage. See [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) for detailed setup instructions.

**Quick setup:**
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Google Authentication and Firestore Database
3. Copy `.env.example` to `.env` and fill in your Firebase credentials
4. Deploy security rules: `firebase deploy --only firestore:rules`

**Note:** The app works offline-first, but requires Firebase for multi-device sync.

### 🏗️ Architecture

#### Tech Stack
- **Framework:** React 18 with Vite
- **UI Library:** Material-UI (MUI) v5
- **Styling:** Emotion (CSS-in-JS)
- **Data Layer:** IndexedDB via `idb` library
- **Cloud Storage:** Firebase Firestore
- **Authentication:** Firebase Authentication (Google OAuth)
- **State Management:** React Query (TanStack Query)
- **Internationalization:** Custom context-based i18n
- **PWA:** Vite PWA Plugin with Workbox

#### Project Structure
```
maaser-tracker/
├── src/
│   ├── components/       # React components
│   │   ├── Dashboard.jsx
│   │   ├── AddIncome.jsx
│   │   ├── AddDonation.jsx
│   │   ├── History.jsx
│   │   └── ErrorBoundary.jsx
│   ├── contexts/         # React contexts
│   │   └── LanguageProvider.jsx
│   ├── hooks/            # Custom React hooks
│   │   └── useEntries.js
│   ├── services/         # Business logic layer
│   │   ├── db.js         # IndexedDB operations
│   │   └── migration.js  # Data migration
│   ├── lib/              # Utilities and configuration
│   │   ├── queryClient.js
│   │   └── firebase.js   # Firebase initialization
│   ├── theme.js          # MUI theme configuration
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Entry point
├── public/               # Static assets
├── docs/                 # Documentation
│   └── FIREBASE_SETUP.md # Firebase setup guide
├── firestore.rules       # Firebase security rules
├── firebase.json         # Firebase configuration
├── .env.example          # Environment variables template
├── PROJECT_PLAN.md       # Detailed project roadmap
├── SPRINT_PLAN.md        # Sprint planning guide
└── package.json
```

### 📖 Usage

#### Adding Income
1. Click the **"הכנסה"** (Income) tab
2. Enter the date, amount, and optional notes
3. See the calculated ma'aser obligation (10%)
4. Click **"הוסף"** (Add) to save

#### Recording Donations
1. Click the **"תרומה"** (Donation) tab
2. Enter donation details
3. Click **"הוסף"** (Add) to save

#### Viewing Dashboard
- **Total Income** - Sum of all income entries
- **Total Donations** - Sum of all donations
- **Ma'aser Obligation** - 10% of total income
- **Remaining to Give** - Obligation minus donations
- **Percentage Given** - Progress toward obligation

### 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

#### Development Workflow
1. Pick an issue from the [Project Board](https://github.com/users/DubiWork/projects/4)
2. Create a feature branch: `feature/<issue-number>-description`
3. Make changes following the [Code Style Guide](#code-style)
4. Write/update tests
5. Submit a Pull Request

#### Code Style
- **JavaScript/React**: ES6+, functional components, hooks
- **Formatting**: 2-space indentation, semicolons
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Comments**: JSDoc for functions, inline for complex logic
- **Commits**: Reference issue numbers (`#2 Add feature`)

### 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

**Test Coverage Requirements:**
- Services layer: ≥80% statements, ≥75% branches, ≥80% functions, ≥80% lines
- Current coverage: 201 tests, ~90% overall coverage

### 🚀 CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

**CI Workflow** (`.github/workflows/ci.yml`)
- Triggers on: Pull requests and pushes to main
- Steps:
  - Linting (ESLint)
  - Unit tests (Vitest)
  - Coverage reporting
  - Coverage threshold enforcement
- Node version: 20.x
- Badge: [![CI](https://github.com/DubiWork/maaser-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/DubiWork/maaser-tracker/actions/workflows/ci.yml)

**Deploy Workflow** (`.github/workflows/deploy.yml`)
- Triggers on: Push to main branch
- Steps:
  - Build production bundle
  - Deploy to GitHub Pages
- Live site: https://dubiwork.github.io/maaser-tracker/
- Badge: [![Deploy](https://github.com/DubiWork/maaser-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/DubiWork/maaser-tracker/actions/workflows/deploy.yml)

### 📋 Roadmap

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the complete roadmap with:
- 7 epics spanning 14 weeks
- 26 user stories with detailed acceptance criteria
- Sprint planning and milestones
- Technical architecture decisions

Current Sprint: **Sprint 1 - Foundation** (Weeks 1-2)

### 📜 License

MIT License - see [LICENSE](LICENSE) for details

### 🙏 Acknowledgments

- Built with [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- UI components from [Material-UI](https://mui.com/)
- Inspired by traditional Jewish ma'aser practices

### 📞 Support

- **Issues**: [GitHub Issues](https://github.com/DubiWork/maaser-tracker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DubiWork/maaser-tracker/discussions)

---

## Hebrew

<div dir="rtl">

### 🎯 חזון

מעקב מעשר הוא אפליקציית Progressive Web App המסייעת ליחידים ומשפחות יהודיות לעקוב אחר התחייבויות הצדקה שלהם (מעשר - 10% מההכנסה) בקלות ובפרטיות. האפליקציה מספקת ממשק פשוט ואינטואיטיבי לרישום הכנסות ותרומות, חישוב התחייבויות ויצירת דוחות - הכל תוך שמירה על הנתונים הפיננסיים שלך פרטיים לחלוטין ויכולת עבודה מקוונת.

### ✨ תכונות

#### תכונות נוכחיות (v0.1.0)
- ✅ **תמיכה דו-לשונית** - ממשק מלא בעברית (מימין לשמאל) ואנגלית (משמאל לימין)
- ✅ **מעקב הכנסות** - רשום הכנסות עם תאריכים, סכומים והערות
- ✅ **מעקב תרומות** - עקוב אחר תרומות צדקה
- ✅ **חישוב מעשר** - חישוב אוטומטי של חובת 10%
- ✅ **לוח בקרה** - צפה בסכומים, התחייבויות ומצב נתינה במבט אחד
- ✅ **תצוגת היסטוריה** - עיין, ערוך ומחק רשומות קודמות
- ✅ **עבודה אופליין** - פועל ללא חיבור אינטרנט
- ✅ **פרטיות** - כל הנתונים נשמרים מקומית במכשיר שלך
- ✅ **עיצוב Material** - ממשק נקי ומודרני עם רכיבי Material-UI

#### בפיתוח (v0.2.0 - ספרינט 1-2)
- 🚧 **אחסון IndexedDB** - מאגר מקומי חזק המחליף את LocalStorage
- 🚧 **התקנת PWA** - התקן כאפליקציה דמוית-native על כל מכשיר
- 🚧 **שחזור שגיאות** - העברת נתונים וגיבוי אוטומטיים
- 🚧 **כיסוי בדיקות** - בדיקות אוטומטיות מקיפות

#### תכונות מתוכננות (מפת דרכים)
- 📅 **סינון טווח תאריכים** - צפה ברשומות לתקופות זמן מותאמות אישית
- 🏷️ **קטגוריות תרומות** - ארגן נתינה לפי סוג מקבל
- 🔄 **הכנסה חוזרת** - הגדר רשומות חוזרות אוטומטיות
- 💱 **מטבעות מרובים** - תמיכה במטבעות בינלאומיים
- ⚙️ **הגדרות** - התאם אישית אחוז מעשר, ערכת נושא וכו'
- ☁️ **גיבוי ענן** - סנכרון אופציונלי ל-Google Sheets
- 📊 **דוחות וניתוח** - סיכומים חודשיים/שנתיים
- 📄 **דוחות מס** - יצר תיעוד מוכן למס
- ♿ **נגישות** - תאימות WCAG 2.1 AA
- 📱 **משוב מישוש** - חוויית מובייל משופרת

### 🚀 התחלת עבודה

```bash
# שכפל את המאגר
git clone https://github.com/DubiWork/maaser-tracker.git
cd maaser-tracker

# התקן תלויות
npm install

# הרץ שרת פיתוח
npm run dev
```

האפליקציה תהיה זמינה ב-`http://localhost:5173`

### 📞 תמיכה

- **בעיות**: [GitHub Issues](https://github.com/DubiWork/maaser-tracker/issues)
- **דיונים**: [GitHub Discussions](https://github.com/DubiWork/maaser-tracker/discussions)

</div>

---

**Made with ❤️ for the Jewish community**
