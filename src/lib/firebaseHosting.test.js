/**
 * @vitest-environment jsdom
 *
 * Static analysis tests for firebase.json hosting configuration.
 * Verifies that HTTP security headers and CSP are present on both
 * hosting targets (production and staging).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy' },
  { key: 'Strict-Transport-Security' },
  { key: 'Content-Security-Policy' },
];

const CSP_REQUIRED_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://*.googleusercontent.com",
  "connect-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

describe('Firebase Hosting Security Headers', () => {
  let config;
  let hostingTargets;

  beforeAll(() => {
    const filePath = resolve(__dirname, '../../firebase.json');
    const raw = readFileSync(filePath, 'utf-8');
    config = JSON.parse(raw);
    hostingTargets = config.hosting;
  });

  it('should have valid firebase.json with hosting array', () => {
    expect(config).toBeDefined();
    expect(Array.isArray(hostingTargets)).toBe(true);
    expect(hostingTargets.length).toBeGreaterThanOrEqual(2);
  });

  describe.each([
    ['production'],
    ['staging'],
  ])('%s target', (targetName) => {
    let target;
    let globalHeaders;

    beforeAll(() => {
      target = hostingTargets.find((h) => h.target === targetName);
      const globalEntry = target?.headers?.find((entry) => entry.source === '**');
      globalHeaders = globalEntry?.headers || [];
    });

    it(`should have a "${targetName}" hosting target`, () => {
      expect(target).toBeDefined();
    });

    it('should have a global headers entry with source "**"', () => {
      const globalEntry = target.headers.find((entry) => entry.source === '**');
      expect(globalEntry).toBeDefined();
    });

    it.each(REQUIRED_SECURITY_HEADERS.map((h) => [h.key, h.value]))(
      'should include %s header',
      (headerKey, expectedValue) => {
        const header = globalHeaders.find((h) => h.key === headerKey);
        expect(header).toBeDefined();
        if (expectedValue) {
          expect(header.value).toBe(expectedValue);
        }
      }
    );

    it('should have HSTS with max-age of at least 1 year', () => {
      const hsts = globalHeaders.find(
        (h) => h.key === 'Strict-Transport-Security'
      );
      expect(hsts).toBeDefined();
      expect(hsts.value).toContain('max-age=31536000');
      expect(hsts.value).toContain('includeSubDomains');
    });

    it('should have Permissions-Policy disabling dangerous APIs', () => {
      const pp = globalHeaders.find((h) => h.key === 'Permissions-Policy');
      expect(pp).toBeDefined();
      expect(pp.value).toContain('camera=()');
      expect(pp.value).toContain('microphone=()');
      expect(pp.value).toContain('geolocation=()');
    });

    describe('Content-Security-Policy directives', () => {
      let cspValue;

      beforeAll(() => {
        const csp = globalHeaders.find(
          (h) => h.key === 'Content-Security-Policy'
        );
        cspValue = csp?.value || '';
      });

      it.each(CSP_REQUIRED_DIRECTIVES)(
        'should contain directive: %s',
        (directive) => {
          expect(cspValue).toContain(directive);
        }
      );

      it('should allow Firebase domains in connect-src', () => {
        expect(cspValue).toContain('https://*.googleapis.com');
        expect(cspValue).toContain('https://*.firebaseio.com');
        expect(cspValue).toContain('wss://*.firebaseio.com');
      });

      it('should allow Google Fonts in style-src', () => {
        expect(cspValue).toContain('https://fonts.googleapis.com');
      });

      it('should allow MUI unsafe-inline styles', () => {
        expect(cspValue).toMatch(/style-src[^;]*'unsafe-inline'/);
      });

      it('should allow Google profile images', () => {
        expect(cspValue).toContain('https://*.googleusercontent.com');
      });

      it('should allow service worker registration', () => {
        expect(cspValue).toMatch(/worker-src[^;]*'self'/);
      });
    });
  });

  it('should have identical security headers on both targets', () => {
    const getSecurityHeaders = (targetName) => {
      const target = hostingTargets.find((h) => h.target === targetName);
      const globalEntry = target.headers.find((entry) => entry.source === '**');
      return globalEntry.headers;
    };

    const prodHeaders = getSecurityHeaders('production');
    const stagingHeaders = getSecurityHeaders('staging');

    expect(prodHeaders).toEqual(stagingHeaders);
  });
});
