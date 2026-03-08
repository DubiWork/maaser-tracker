# Firebase Setup Guide

This guide walks you through setting up Firebase for the Ma'aser Tracker application.

## Prerequisites

- Firebase account (free tier is sufficient)
- Node.js 20.x or higher
- npm or yarn

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `maaser-tracker` (or your preferred name)
4. Disable Google Analytics (optional for this project)
5. Click "Create project"

## Step 2: Register Web App

1. In your Firebase project, click the web icon (`</>`) to add a web app
2. Enter app nickname: `Ma'aser Tracker Web`
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the configuration values (you'll need these in Step 4)

## Step 3: Enable Firebase Services

### Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Google** provider:
   - Click on "Google"
   - Toggle "Enable"
   - Select a support email
   - Click "Save"

### Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Select **Production mode** (we'll deploy security rules later)
4. Choose a location (select closest to your users)
5. Click "Enable"

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Firebase configuration values:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

   **Where to find these values:**
   - Go to Firebase Console > Project Settings > General
   - Scroll down to "Your apps" section
   - Click on your web app
   - Copy the configuration values from `firebaseConfig` object

3. **Important:** Never commit `.env` file to git (it's already in `.gitignore`)

## Step 5: Deploy Security Rules

Security rules ensure users can only access their own data.

### Option A: Using Firebase CLI (Recommended)

1. Install Firebase CLI globally:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select **Firestore** and **Hosting**
   - Use existing project
   - Accept default `firestore.rules` file
   - Accept default `firebase.json` file
   - Select `dist` as public directory
   - Configure as single-page app: **Yes**
   - Set up automatic builds: **No**

4. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option B: Manual Deployment

1. Go to Firebase Console > Firestore Database > Rules
2. Copy the contents of `firestore.rules` file
3. Paste into the rules editor
4. Click "Publish"

## Step 6: Configure GitHub Actions (For Deployment)

If you're using GitHub Actions for CI/CD, add Firebase configuration as repository secrets:

1. Go to GitHub Repository > Settings > Secrets and variables > Actions
2. Click "New repository secret" for each of these:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## Step 7: Test Firebase Connection

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open browser console and check for:
   - ✅ "Firebase initialized successfully"
   - ❌ No error messages

## Local Development with Firebase Emulators (Optional)

For development without using production Firebase:

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Start emulators:
   ```bash
   firebase emulators:start
   ```

3. Set environment variable in `.env`:
   ```env
   VITE_USE_FIREBASE_EMULATOR=true
   ```

4. Start your app:
   ```bash
   npm run dev
   ```

5. Access emulator UI at: http://localhost:4000

**Emulator Ports:**
- Auth Emulator: `http://localhost:9099`
- Firestore Emulator: `http://localhost:8080`
- Emulator UI: `http://localhost:4000`

## Troubleshooting

### Error: Missing Firebase environment variables

**Symptom:** Console error about missing environment variables

**Solution:**
1. Ensure `.env` file exists and is in project root
2. Verify all required `VITE_FIREBASE_*` variables are set
3. Restart development server (`npm run dev`)

### Error: Firebase app not initialized

**Symptom:** Firebase functions throw "Firebase app not initialized"

**Solution:**
1. Check that environment variables are correct
2. Verify Firebase project exists in console
3. Check browser console for initialization errors

### Authentication not working

**Symptom:** Sign-in button doesn't work or throws error

**Solution:**
1. Verify Google Sign-In is enabled in Firebase Console
2. Check that `authDomain` in `.env` matches Firebase Console
3. Ensure your domain is authorized in Firebase Console > Authentication > Settings > Authorized domains

### Firestore permission denied

**Symptom:** "Missing or insufficient permissions" error

**Solution:**
1. Verify security rules are deployed (`firebase deploy --only firestore:rules`)
2. Check that user is authenticated before accessing Firestore
3. Verify user is accessing their own data (check `userId` matches `auth.uid`)

## Security Best Practices

1. ✅ **Never commit `.env` file** - Contains sensitive credentials
2. ✅ **Use environment variables** - For all Firebase config
3. ✅ **Deploy security rules** - Always use restrictive rules in production
4. ✅ **Test with emulators** - Use emulators for local development
5. ✅ **Rotate credentials** - If `.env` is accidentally committed, regenerate API keys
6. ✅ **Use GitHub Secrets** - For CI/CD deployments

## Next Steps

After Firebase setup is complete:

1. ✅ Issue #35: Implement Firebase Authentication
2. ✅ Issue #36: Implement Firestore data model
3. ✅ Issue #37: Implement offline-first sync logic
4. ✅ Issue #38: Implement user profile and settings

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
