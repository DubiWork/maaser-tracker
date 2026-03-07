# Firestore Security Rules Audit

**Audit Date:** 2026-03-08
**Auditor:** Security Auditor Agent
**File:** `firestore.rules`
**Rules Version:** 2

---

## Executive Summary

The Firestore security rules for Ma'aser Tracker are **well-structured and production-ready**. All collections enforce authentication, user-scoped access, and appropriate write constraints. No critical or high-severity vulnerabilities were found.

**Overall Rating: PASS**

---

## Rule Structure

```
cloud.firestore
└── /databases/{database}/documents
    ├── /{document=**}                                    → Default deny all
    ├── /users/{userId}/entries/{entryId}                 → User entries (income/donations)
    ├── /users/{userId}                                   → User profile/settings
    ├── /users/{userId}/metadata/migration                → Migration status
    └── /users/{userId}/metadata/migration/history/{id}   → Migration audit trail
```

### Helper Functions

| Function | Purpose | Assessment |
|----------|---------|------------|
| `isAuthenticated()` | Checks `request.auth != null` | PASS - standard auth gate |
| `isOwner(userId)` | Checks auth + `request.auth.uid == userId` | PASS - combines auth + ownership |

---

## Detailed Assessment

### 1. Default Deny Policy

**Rule (lines 17-19):**
```
match /{document=**} {
  allow read, write: if false;
}
```

| Check | Result |
|-------|--------|
| All access denied by default | PASS |
| No open collections | PASS |
| No anonymous access paths | PASS |
| No public read access | PASS |

**Assessment:** Correct default-deny posture. Any path not explicitly matched is denied.

---

### 2. User Entries (`/users/{userId}/entries/{entryId}`)

**Rules (lines 23-39):**

| Operation | Condition | Assessment |
|-----------|-----------|------------|
| Read | `isOwner(userId)` | PASS - only owner can read |
| Create | `isOwner(userId)` AND `request.resource.data.userId == request.auth.uid` | PASS - owner + userId match |
| Update | `isOwner(userId)` AND `request.resource.data.userId == resource.data.userId` | PASS - owner + userId immutable |
| Delete | `isOwner(userId)` | PASS - only owner can delete |

**Security Properties:**
- Authentication required for all operations: PASS
- Cross-user access prevented: PASS
- userId field enforced on create: PASS
- userId field immutable on update: PASS
- GDPR deletion supported: PASS

---

### 3. User Profile (`/users/{userId}`)

**Rules (lines 43-57):**

| Operation | Condition | Assessment |
|-----------|-----------|------------|
| Read | `isOwner(userId)` | PASS |
| Create | `isOwner(userId)` | PASS |
| Update | `isOwner(userId)` AND `request.resource.data.uid == resource.data.uid` | PASS - uid immutable |
| Delete | `isOwner(userId)` | PASS - GDPR account deletion |

**Security Properties:**
- Authentication required: PASS
- Cross-user access prevented: PASS
- uid field immutable on update: PASS
- Account deletion allowed (GDPR Article 17): PASS

---

### 4. Migration Metadata (`/users/{userId}/metadata/migration`)

**Rules (lines 61-81):**

| Operation | Condition | Assessment |
|-----------|-----------|------------|
| Read | `isOwner(userId)` | PASS |
| Create | `isOwner(userId)` AND `userId` match AND `consentGivenAt != null` AND `consentVersion != null` | PASS - GDPR consent enforced |
| Update | `isOwner(userId)` AND `userId` match AND `!resource.data.completed` | PASS - completed migrations locked |
| Delete | `isOwner(userId)` | PASS - GDPR erasure |

**Security Properties:**
- GDPR consent fields required on creation: PASS
- Completed migrations immutable (prevents tampering): PASS
- Cancelled override removed (line 74 security fix): PASS
- GDPR Article 17 erasure allowed: PASS

---

### 5. Migration History (`/users/{userId}/metadata/migration/history/{eventId}`)

**Rules (lines 85-97):**

| Operation | Condition | Assessment |
|-----------|-----------|------------|
| Read | `isOwner(userId)` | PASS |
| Create | `isOwner(userId)` AND `userId` match | PASS |
| Update | `if false` | PASS - fully immutable audit trail |
| Delete | `isOwner(userId)` | PASS - GDPR erasure |

**Security Properties:**
- Audit trail integrity (updates always denied): PASS
- History entries immutable: PASS
- GDPR erasure allowed via delete: PASS

---

## OWASP Mapping

| OWASP Category | Status | Notes |
|----------------|--------|-------|
| A01: Broken Access Control | PASS | All paths require auth + ownership check |
| A02: Cryptographic Failures | N/A | Handled by Firebase infrastructure (TLS, encryption at rest) |
| A03: Injection | PASS | Firestore rules use structured queries, not string interpolation |
| A04: Insecure Design | PASS | Default-deny, defense-in-depth with helper functions |
| A05: Security Misconfiguration | PASS | No overly permissive rules, no wildcard allows |
| A07: Identification & Auth Failures | PASS | `request.auth != null` enforced on every operation |

---

## Recommendations (Defense-in-Depth Enhancements)

These are not vulnerabilities. The current rules are secure. These are optional hardening suggestions:

### R1: Schema Validation on Entry Creation (Low Priority)

Add required field validation at the rules layer for defense-in-depth:

```
allow create: if isOwner(userId)
              && request.resource.data.userId == request.auth.uid
              && request.resource.data.keys().hasAll(['amount', 'type', 'date', 'userId'])
              && request.resource.data.type in ['income', 'donation'];
```

**Rationale:** Currently enforced only at the application layer. Adding rules-layer validation prevents malformed data even if the application code has a bug.

### R2: Document Size Limits (Low Priority)

Add maximum field count constraints to prevent oversized documents:

```
&& request.resource.data.size() <= 10
```

**Rationale:** Prevents abuse where a compromised client writes excessively large documents.

### R3: Timestamp Validation (Low Priority)

Consider validating that `consentGivenAt` is a valid timestamp and not in the future:

```
&& request.resource.data.consentGivenAt is timestamp
&& request.resource.data.consentGivenAt <= request.time
```

**Rationale:** Ensures consent timestamps are meaningful for GDPR audit trails.

---

## Test Coverage

A companion test suite validates these rules via static analysis of the rules file content:

**Test file:** `src/services/__tests__/firestore-rules.test.js`

The test suite covers 31 security assertions across all rule blocks, verifying:
- Default deny policy exists
- Authentication requirements on all paths
- Ownership checks on all operations
- Field immutability constraints
- GDPR compliance (consent fields, erasure support)
- Audit trail integrity (history immutability)

---

## Conclusion

The Firestore security rules follow best practices:

1. **Default deny** prevents unauthorized access to any undeclared paths
2. **Authentication required** on every operation via `isAuthenticated()`
3. **User-scoped access** via `isOwner(userId)` prevents cross-user data access
4. **Field immutability** protects userId/uid from modification
5. **GDPR compliance** enforced at the rules layer (consent fields, erasure rights)
6. **Audit trail integrity** via fully immutable migration history entries
7. **Completed migration protection** prevents re-migration or tampering

The rules are production-ready for the Ma'aser Tracker application.
