#!/usr/bin/env node

/**
 * Deployment Verification Script
 *
 * Checks that production deployments are healthy:
 * - GitHub Pages returns 200
 * - Netlify returns 200
 * - privacy.html is accessible
 * - Netlify returns expected security headers (CSP, Permissions-Policy)
 *
 * Usage: node scripts/verify-deployments.js
 * Requires Node 18+ (built-in fetch)
 */

const GITHUB_PAGES_URL = 'https://dubiwork.github.io/maaser-tracker/';
const NETLIFY_URL = 'https://maaser-tracker.netlify.app/';
const PRIVACY_GITHUB = 'https://dubiwork.github.io/maaser-tracker/privacy.html';
const PRIVACY_NETLIFY = 'https://maaser-tracker.netlify.app/privacy.html';

const EXPECTED_NETLIFY_HEADERS = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${name}${detail ? ' -- ' + detail : ''}`);
}

async function checkUrl(label, url, expectedStatus = 200) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.status === expectedStatus) {
      record(label, true, `${res.status} OK`);
    } else {
      record(label, false, `Expected ${expectedStatus}, got ${res.status}`);
    }
    return res;
  } catch (err) {
    record(label, false, `Fetch error: ${err.message}`);
    return null;
  }
}

async function checkNetlifyHeaders(res) {
  if (!res) {
    record('Netlify security headers', false, 'No response to inspect');
    return;
  }

  for (const header of EXPECTED_NETLIFY_HEADERS) {
    const value = res.headers.get(header);
    if (value) {
      record(`Netlify header: ${header}`, true, value.substring(0, 80) + (value.length > 80 ? '...' : ''));
    } else {
      record(`Netlify header: ${header}`, false, 'Header not present');
    }
  }
}

async function main() {
  console.log('');
  console.log('=== Ma\'aser Tracker Deployment Verification ===');
  console.log('');

  // 1. GitHub Pages
  console.log('GitHub Pages:');
  await checkUrl('GitHub Pages root', GITHUB_PAGES_URL);
  await checkUrl('GitHub Pages privacy.html', PRIVACY_GITHUB);

  console.log('');

  // 2. Netlify
  console.log('Netlify:');
  const netlifyRes = await checkUrl('Netlify root', NETLIFY_URL);
  await checkUrl('Netlify privacy.html', PRIVACY_NETLIFY);

  console.log('');

  // 3. Netlify security headers
  console.log('Netlify Security Headers:');
  await checkNetlifyHeaders(netlifyRes);

  // Summary
  console.log('');
  console.log('=== Summary ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`  ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log('');

  if (failed > 0) {
    console.log('Failed checks:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.detail}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('All checks passed.');
    process.exit(0);
  }
}

main();
