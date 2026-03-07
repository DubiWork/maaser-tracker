/**
 * Unit tests for Build Artifact Security Scanner
 *
 * Tests the core scanning logic using in-memory fixtures
 * (no actual build or file system access needed for most tests).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  scanContentForSecrets,
  findSourceMaps,
  findEnvFiles,
  walkDir,
  runScan,
  SECRET_PATTERNS,
} from './scan-build-artifacts.js';

// ---------------------------------------------------------------------------
// scanContentForSecrets
// ---------------------------------------------------------------------------

describe('scanContentForSecrets', () => {
  it('detects RSA private key', () => {
    const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...';
    const findings = scanContentForSecrets(content, 'test.js');

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('P0');
    expect(findings[0].pattern).toContain('Private Key');
    expect(findings[0].line).toBe(1);
  });

  it('detects generic private key header', () => {
    const content = '-----BEGIN PRIVATE KEY-----\ndata...';
    const findings = scanContentForSecrets(content, 'test.js');

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('P0');
  });

  it('detects AWS secret access key pattern', () => {
    const content = 'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY01"';
    const findings = scanContentForSecrets(content, 'config.js');

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('P0');
    expect(findings[0].pattern).toContain('AWS');
  });

  it('detects Stripe-style sk_ keys', () => {
    // Build fake key at runtime to avoid GitHub Push Protection false positive
    const fakeKey = ['sk', 'live', 'abcdefghijklmnopqrst1234567890'].join('_');
    const content = `const key = "${fakeKey}";`;
    const findings = scanContentForSecrets(content, 'payment.js');

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('P0');
    expect(findings[0].pattern).toContain('sk_');
  });

  it('detects hardcoded password assignment', () => {
    const content = 'password = "SuperSecretPassword123!"';
    const findings = scanContentForSecrets(content, 'auth.js');

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('P1');
    expect(findings[0].pattern).toContain('password');
  });

  it('allows password in schema/validation context (allowlist)', () => {
    const content = 'password: { type: "string", required: true, label: "Password" }';
    const findings = scanContentForSecrets(content, 'schema.js');

    expect(findings).toHaveLength(0);
  });

  it('detects generic secret token assignment', () => {
    const content = 'secret_key = "aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2u"';
    const findings = scanContentForSecrets(content, 'config.js');

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('P1');
  });

  it('allows Firebase API key (AIza prefix)', () => {
    const content = 'token_key = "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz012345_"';
    const findings = scanContentForSecrets(content, 'firebase.js');

    expect(findings).toHaveLength(0);
  });

  it('detects .env.local reference', () => {
    const content = 'Load config from .env.local file';
    const findings = scanContentForSecrets(content, 'readme.js');

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('P1');
  });

  it('allows .env reference in error messages', () => {
    const content = 'Please check your .env.local file and configuration error details';
    const findings = scanContentForSecrets(content, 'error.js');

    expect(findings).toHaveLength(0);
  });

  it('returns empty array for clean content', () => {
    const content = 'const x = 42;\nfunction hello() { return "world"; }';
    const findings = scanContentForSecrets(content, 'clean.js');

    expect(findings).toHaveLength(0);
  });

  it('reports correct line numbers', () => {
    const content = 'line 1\nline 2\n-----BEGIN PRIVATE KEY-----\nline 4';
    const findings = scanContentForSecrets(content, 'test.js');

    expect(findings[0].line).toBe(3);
  });

  it('includes file path in findings', () => {
    const content = '-----BEGIN PRIVATE KEY-----';
    const findings = scanContentForSecrets(content, '/dist/assets/bundle.js');

    expect(findings[0].file).toBe('/dist/assets/bundle.js');
  });
});

// ---------------------------------------------------------------------------
// walkDir
// ---------------------------------------------------------------------------

describe('walkDir', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'scan-test-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array for non-existent directory', () => {
    const result = walkDir('/nonexistent/path/12345');
    expect(result).toEqual([]);
  });

  it('lists files recursively', () => {
    writeFileSync(join(tmpDir, 'a.js'), 'code');
    mkdirSync(join(tmpDir, 'sub'));
    writeFileSync(join(tmpDir, 'sub', 'b.js'), 'code');

    const files = walkDir(tmpDir);
    expect(files).toHaveLength(2);
    expect(files.some(f => f.endsWith('a.js'))).toBe(true);
    expect(files.some(f => f.endsWith('b.js'))).toBe(true);
  });

  it('returns empty array for empty directory', () => {
    const files = walkDir(tmpDir);
    expect(files).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findSourceMaps
// ---------------------------------------------------------------------------

describe('findSourceMaps', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'scan-maps-' + Date.now());
    mkdirSync(join(tmpDir, 'assets'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects .map files in assets directory', () => {
    writeFileSync(join(tmpDir, 'assets', 'bundle.js.map'), '{}');
    writeFileSync(join(tmpDir, 'assets', 'bundle.js'), 'code');

    const maps = findSourceMaps(tmpDir);
    expect(maps).toHaveLength(1);
    expect(maps[0]).toContain('bundle.js.map');
  });

  it('returns empty when no .map files', () => {
    writeFileSync(join(tmpDir, 'assets', 'bundle.js'), 'code');

    const maps = findSourceMaps(tmpDir);
    expect(maps).toHaveLength(0);
  });

  it('returns empty when assets directory missing', () => {
    rmSync(join(tmpDir, 'assets'), { recursive: true });

    const maps = findSourceMaps(tmpDir);
    expect(maps).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findEnvFiles
// ---------------------------------------------------------------------------

describe('findEnvFiles', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'scan-env-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects .env files in dist', () => {
    writeFileSync(join(tmpDir, '.env'), 'SECRET=123');
    writeFileSync(join(tmpDir, '.env.local'), 'SECRET=456');

    const envFiles = findEnvFiles(tmpDir);
    expect(envFiles).toHaveLength(2);
  });

  it('returns empty when no .env files', () => {
    writeFileSync(join(tmpDir, 'index.html'), '<html>');

    const envFiles = findEnvFiles(tmpDir);
    expect(envFiles).toHaveLength(0);
  });

  it('does not flag non-.env files', () => {
    writeFileSync(join(tmpDir, 'environment.js'), 'code');

    const envFiles = findEnvFiles(tmpDir);
    expect(envFiles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// runScan (integration)
// ---------------------------------------------------------------------------

describe('runScan', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'scan-full-' + Date.now());
    mkdirSync(join(tmpDir, 'assets'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns clean results for safe build', () => {
    writeFileSync(join(tmpDir, 'assets', 'bundle.js'), 'const x = 42;');
    writeFileSync(join(tmpDir, 'index.html'), '<html></html>');

    // Use tmpDir as projectRoot too (no git history)
    const result = runScan(tmpDir, tmpDir);

    expect(result.findings).toHaveLength(0);
    expect(result.sourceMaps).toHaveLength(0);
    expect(result.envFiles).toHaveLength(0);
    expect(result.hasP0).toBe(false);
    expect(result.hasP1).toBe(false);
  });

  it('flags P0 when source maps exist', () => {
    writeFileSync(join(tmpDir, 'assets', 'app.js'), 'code');
    writeFileSync(join(tmpDir, 'assets', 'app.js.map'), '{}');

    const result = runScan(tmpDir, tmpDir);

    expect(result.sourceMaps).toHaveLength(1);
    expect(result.hasP0).toBe(true);
  });

  it('flags P0 when .env file in dist', () => {
    writeFileSync(join(tmpDir, '.env'), 'API_KEY=secret');

    const result = runScan(tmpDir, tmpDir);

    expect(result.envFiles).toHaveLength(1);
    expect(result.hasP0).toBe(true);
  });

  it('flags P0 when private key found in bundle', () => {
    writeFileSync(
      join(tmpDir, 'assets', 'bundle.js'),
      'const key = "-----BEGIN PRIVATE KEY-----\\nMIIE..."'
    );

    const result = runScan(tmpDir, tmpDir);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('P0');
    expect(result.hasP0).toBe(true);
  });

  it('flags P1 for password but not P0', () => {
    writeFileSync(
      join(tmpDir, 'assets', 'config.js'),
      'password = "mysecretpassword123"'
    );

    const result = runScan(tmpDir, tmpDir);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('P1');
    expect(result.hasP0).toBe(false);
    expect(result.hasP1).toBe(true);
  });

  it('skips non-text files', () => {
    writeFileSync(join(tmpDir, 'assets', 'image.png'), Buffer.from([0x89, 0x50]));

    const result = runScan(tmpDir, tmpDir);

    expect(result.findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SECRET_PATTERNS structure
// ---------------------------------------------------------------------------

describe('SECRET_PATTERNS', () => {
  it('has required fields for each pattern', () => {
    for (const pattern of SECRET_PATTERNS) {
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('regex');
      expect(pattern).toHaveProperty('severity');
      expect(pattern.regex).toBeInstanceOf(RegExp);
      expect(['P0', 'P1']).toContain(pattern.severity);
    }
  });

  it('has at least one P0 pattern', () => {
    const p0Patterns = SECRET_PATTERNS.filter(p => p.severity === 'P0');
    expect(p0Patterns.length).toBeGreaterThan(0);
  });
});
