/**
 * Firestore Security Rules - Static Analysis Test Suite
 *
 * Since the Firebase emulator cannot run in CI, this test suite validates the
 * security properties of firestore.rules by parsing the rules file content
 * and verifying that expected security patterns exist.
 *
 * Each test corresponds to a security requirement from the rules audit
 * documented in docs/FIRESTORE_RULES_AUDIT.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Read the rules file once for all tests
let rulesContent;

beforeAll(() => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  rulesContent = fs.readFileSync(rulesPath, 'utf-8');
});

/**
 * Helper: extract a specific match block from the rules file.
 * Accepts a LITERAL Firestore path (e.g. '/{document=**}') and finds the
 * corresponding 'match <path> {' in the rules text, then extracts everything
 * from that match keyword through its balanced closing brace.
 */
function extractMatchBlock(rules, literalPath) {
  const searchStr = 'match ' + literalPath + ' {';
  const idx = rules.indexOf(searchStr);
  if (idx === -1) return null;

  let depth = 1;
  let i = idx + searchStr.length;
  while (i < rules.length && depth > 0) {
    if (rules[i] === '{') depth++;
    if (rules[i] === '}') depth--;
    i++;
  }
  return rules.substring(idx, i);
}

/**
 * Helper: extract the /users/{userId} profile block specifically.
 * Uses indexOf to find 'match /users/{userId} {' in the rules text
 * and then brace-balances to extract only that block.
 */
function extractProfileBlock(rules) {
  const searchStr = 'match /users/{userId} {';
  const idx = rules.indexOf(searchStr);
  if (idx === -1) return null;

  let depth = 1;
  let i = idx + searchStr.length;
  while (i < rules.length && depth > 0) {
    if (rules[i] === '{') depth++;
    if (rules[i] === '}') depth--;
    i++;
  }
  return rules.substring(idx, i);
}

describe('Firestore Security Rules - Static Analysis', () => {
  describe('File Structure', () => {
    it('should use rules_version 2', () => {
      expect(rulesContent).toMatch(/rules_version\s*=\s*["']2["']/);
    });

    it('should define the cloud.firestore service', () => {
      expect(rulesContent).toMatch(/service\s+cloud\.firestore/);
    });

    it('should define isAuthenticated helper function', () => {
      expect(rulesContent).toMatch(
        /function\s+isAuthenticated\(\)\s*\{[^}]*request\.auth\s*!=\s*null/
      );
    });

    it('should define isOwner helper that checks both auth and uid match', () => {
      expect(rulesContent).toMatch(
        /function\s+isOwner\(userId\)\s*\{[^}]*isAuthenticated\(\)\s*&&\s*request\.auth\.uid\s*==\s*userId/
      );
    });
  });

  describe('SEC-FS-13: Default Deny Policy', () => {
    it('should have a root wildcard match that denies all access', () => {
      const defaultDenyBlock = extractMatchBlock(rulesContent, '/{document=**}');
      expect(defaultDenyBlock).not.toBeNull();
      expect(defaultDenyBlock).toMatch(/allow\s+read,\s*write:\s*if\s+false/);
    });
  });

  describe('Entries Collection (/users/{userId}/entries/{entryId})', () => {
    let entriesBlock;

    beforeAll(() => {
      entriesBlock = extractMatchBlock(
        rulesContent,
        '/users/{userId}/entries/{entryId}'
      );
    });

    it('should define the entries match block', () => {
      expect(entriesBlock).not.toBeNull();
    });

    it('SEC-FS-01 & SEC-FS-02: should require authentication for read and write via isOwner', () => {
      expect(entriesBlock).toMatch(/allow\s+read:\s*if\s+isOwner\(userId\)/);
      expect(entriesBlock).toMatch(/allow\s+create:\s*if\s+isOwner\(userId\)/);
      expect(entriesBlock).toMatch(/allow\s+update:\s*if\s+isOwner\(userId\)/);
      expect(entriesBlock).toMatch(/allow\s+delete:\s*if\s+isOwner\(userId\)/);
    });

    it('SEC-FS-03 & SEC-FS-04: should scope read access to owner via isOwner(userId)', () => {
      expect(entriesBlock).toMatch(/allow\s+read:\s*if\s+isOwner\(userId\)/);
    });

    it('SEC-FS-05: should allow create with matching userId field', () => {
      expect(entriesBlock).toMatch(
        /allow\s+create:\s*if\s+isOwner\(userId\)\s*\r?\n?\s*&&\s*request\.resource\.data\.userId\s*==\s*request\.auth\.uid/
      );
    });

    it('SEC-FS-06 & SEC-FS-14: should require userId field on create that matches auth uid', () => {
      expect(entriesBlock).toMatch(
        /allow\s+create:[^;]*request\.resource\.data\.userId\s*==\s*request\.auth\.uid/
      );
    });

    it('SEC-FS-07: should prevent userId change on update', () => {
      expect(entriesBlock).toMatch(
        /allow\s+update:[^;]*request\.resource\.data\.userId\s*==\s*resource\.data\.userId/
      );
    });

    it('SEC-FS-08: should scope delete to owner only', () => {
      expect(entriesBlock).toMatch(/allow\s+delete:\s*if\s+isOwner\(userId\)/);
    });
  });

  describe('User Profile (/users/{userId})', () => {
    let profileBlock;

    beforeAll(() => {
      profileBlock = extractProfileBlock(rulesContent);
    });

    it('should define the user profile match block', () => {
      expect(profileBlock).not.toBeNull();
    });

    it('should require authentication for all operations', () => {
      expect(profileBlock).toMatch(/allow\s+read:\s*if\s+isOwner\(userId\)/);
      expect(profileBlock).toMatch(/allow\s+create:\s*if\s+isOwner\(userId\)/);
      expect(profileBlock).toMatch(/allow\s+update:\s*if\s+isOwner\(userId\)/);
      expect(profileBlock).toMatch(/allow\s+delete:\s*if\s+isOwner\(userId\)/);
    });

    it('SEC-FS-12: should prevent uid field change on profile update', () => {
      expect(profileBlock).toMatch(
        /allow\s+update:[^;]*request\.resource\.data\.uid\s*==\s*resource\.data\.uid/
      );
    });

    it('should allow profile deletion for GDPR account removal', () => {
      expect(profileBlock).toMatch(/allow\s+delete:\s*if\s+isOwner\(userId\)/);
    });
  });

  describe('Migration Metadata (/users/{userId}/metadata/migration)', () => {
    let migrationBlock;

    beforeAll(() => {
      migrationBlock = extractMatchBlock(
        rulesContent,
        '/users/{userId}/metadata/migration'
      );
    });

    it('should define the migration metadata match block', () => {
      expect(migrationBlock).not.toBeNull();
    });

    it('should require GDPR consent fields on migration creation', () => {
      expect(migrationBlock).toMatch(
        /allow\s+create:[^;]*consentGivenAt\s*!=\s*null/
      );
      expect(migrationBlock).toMatch(
        /allow\s+create:[^;]*consentVersion\s*!=\s*null/
      );
    });

    it('should require userId match on migration creation', () => {
      expect(migrationBlock).toMatch(
        /allow\s+create:[^;]*request\.resource\.data\.userId\s*==\s*request\.auth\.uid/
      );
    });

    it('SEC-FS-09: should prevent update of completed migrations', () => {
      expect(migrationBlock).toMatch(
        /allow\s+update:[^;]*!resource\.data\.completed/
      );
    });

    it('should require userId match on migration update', () => {
      expect(migrationBlock).toMatch(
        /allow\s+update:[^;]*request\.resource\.data\.userId\s*==\s*request\.auth\.uid/
      );
    });

    it('SEC-FS-11: should allow migration deletion for GDPR erasure', () => {
      expect(migrationBlock).toMatch(/allow\s+delete:\s*if\s+isOwner\(userId\)/);
    });
  });

  describe('Migration History (/users/{userId}/metadata/migration/history/{eventId})', () => {
    let historyBlock;

    beforeAll(() => {
      historyBlock = extractMatchBlock(
        rulesContent,
        '/users/{userId}/metadata/migration/history/{eventId}'
      );
    });

    it('should define the migration history match block', () => {
      expect(historyBlock).not.toBeNull();
    });

    it('SEC-FS-10: should make history entries fully immutable (deny all updates)', () => {
      expect(historyBlock).toMatch(/allow\s+update:\s*if\s+false/);
    });

    it('should require userId match on history creation', () => {
      expect(historyBlock).toMatch(
        /allow\s+create:[^;]*request\.resource\.data\.userId\s*==\s*request\.auth\.uid/
      );
    });

    it('should allow history deletion for GDPR erasure', () => {
      expect(historyBlock).toMatch(/allow\s+delete:\s*if\s+isOwner\(userId\)/);
    });

    it('should scope read access to owner only', () => {
      expect(historyBlock).toMatch(/allow\s+read:\s*if\s+isOwner\(userId\)/);
    });
  });

  describe('SEC-FS-15: Comprehensive Entry Creation Validation', () => {
    it('should enforce both ownership and userId field match for valid entry creation', () => {
      const entriesBlock = extractMatchBlock(
        rulesContent,
        '/users/{userId}/entries/{entryId}'
      );
      // A valid creation requires:
      // 1. isOwner(userId) - path-level ownership (auth.uid == path userId)
      // 2. request.resource.data.userId == request.auth.uid - document-level userId match
      expect(entriesBlock).toMatch(
        /allow\s+create:\s*if\s+isOwner\(userId\)\s*\r?\n?\s*&&\s*request\.resource\.data\.userId\s*==\s*request\.auth\.uid/
      );
    });
  });

  describe('No Overly Permissive Rules', () => {
    it('should not contain any unconditional allow rules', () => {
      const unconditionalAllow = /allow\s+(?:read|write|create|update|delete):\s*if\s+true/;
      expect(rulesContent).not.toMatch(unconditionalAllow);
    });

    it('should not allow write access via a single broad rule on entries', () => {
      const entriesBlock = extractMatchBlock(
        rulesContent,
        '/users/{userId}/entries/{entryId}'
      );
      // Should have separate create, update, delete rules - not a single write
      expect(entriesBlock).toMatch(/allow\s+create:/);
      expect(entriesBlock).toMatch(/allow\s+update:/);
      expect(entriesBlock).toMatch(/allow\s+delete:/);
      expect(entriesBlock).not.toMatch(/allow\s+write:/);
    });

    it('should not contain any admin or service account bypass rules', () => {
      expect(rulesContent).not.toMatch(/request\.auth\.token\.admin/);
      expect(rulesContent).not.toMatch(/allow\s+.*:\s*if\s+true/);
    });
  });
});