# EDGE-MANIFEST: Known Issues

**Last Updated:** 2025-12-13  
**Phase:** 2 (Backend) + Phase 3 (Generators)

---

## Critical Issues 🔴

### Issue #1: Unit Test Failures in Starter Package

**Status:** OPEN - **BLOCKING PRODUCTION**  
**Severity:** CRITICAL  
**Affected Package:** `@edge-manifest/starter`

**Description:**
22 unit tests are failing in the starter package, specifically in CRUD routes and authentication endpoints. This represents core functionality that is either broken or has misaligned test expectations.

**Failed Tests:**
- CRUD Routes (17 failures):
  - User entity: POST, GET (list), GET (by id), PUT, PATCH, DELETE, 404 handling
  - Post entity: POST, GET (list), GET (by id), PUT, DELETE
  - Response envelope format tests (2)
  - Validation tests (3)
- Auth Endpoints (5 failures):
  - JWT refresh functionality
  - POST /auth/login missing fields validation
  - POST /auth/refresh token refresh
  - POST /auth/refresh missing token validation

**Impact:**
- Cannot confidently deploy to production
- Core API functionality (CRUD + Auth) may not work as expected
- User authentication might fail in production
- Data operations might return incorrect responses

**Root Cause:**
- Unknown - requires investigation
- Possible causes:
  1. Test expectations don't match current implementation
  2. Routes not properly registered in test environment
  3. JWT middleware configuration issues
  4. Breaking changes not reflected in tests
  5. Test setup/teardown issues

**Workaround:**
None - must be fixed before production deployment

**Suggested Fix:**
1. Review each failing test individually
2. Check if routes are properly registered in test setup
3. Verify JWT middleware is correctly configured
4. Start live dev server and test endpoints manually to confirm actual behavior
5. Update tests to match implementation OR fix implementation to match tests
6. Ensure 100% test pass rate before proceeding

**Priority:** P0 - Fix immediately before any production deployment

---

## High Priority Issues 🟡

### Issue #2: Live API Testing Incomplete

**Status:** OPEN  
**Severity:** HIGH  
**Affected Component:** End-to-end validation

**Description:**
Real HTTP endpoint testing has not been performed with a running server. While unit tests exist, they don't validate the complete request/response cycle in a production-like environment.

**Impact:**
- Cannot confirm end-to-end functionality works
- Unknown if wrangler dev server starts correctly
- Unknown actual API response times
- Unknown if middleware chain works correctly
- Cannot verify JWT tokens work in real scenarios

**Workaround:**
Manual testing by starting wrangler dev and running curl commands

**Test Plan:**
See PRODUCTION_VALIDATION_REPORT.md, PART 4-6 for detailed test steps

**Steps to Complete:**
1. Start server: `cd packages/@edge-manifest/starter && bun run dev`
2. Test health endpoints
3. Test authentication flow
4. Test CRUD operations for all entities
5. Test validation and error handling
6. Document actual response times
7. Verify all 3 example configs work

**Priority:** P1 - Complete before first production deployment

---

### Issue #3: Auto-Migration Not Validated with Real D1

**Status:** OPEN  
**Severity:** HIGH  
**Affected Component:** Database migrations

**Description:**
The auto-migration system has 100% unit test coverage and generates correct SQL, but has not been tested with an actual Cloudflare D1 database in a production environment.

**Impact:**
- Unknown if migrations work in production Cloudflare Workers
- Unknown if D1 syntax compatibility is 100%
- Unknown migration performance characteristics
- Cannot verify rollback functionality
- Risk of data loss or schema corruption

**Known Working:**
- ✓ Migration SQL generation
- ✓ Migration metadata tracking
- ✓ Unit tests (100% coverage)
- ✓ SQLite syntax correctness

**Unknown/Untested:**
- ✗ D1 database compatibility
- ✗ Migration performance in production
- ✗ Rollback functionality
- ✗ Schema change handling
- ✗ Concurrent migration safety

**Workaround:**
Manual migration using `wrangler d1` commands if auto-migration fails

**Suggested Fix:**
1. Deploy to Cloudflare Workers with real D1 database
2. Test auto-migration on first deployment
3. Create test migration to add/remove fields
4. Test rollback scenarios
5. Verify concurrent request handling during migration
6. Document migration process and any gotchas

**Priority:** P1 - Validate before production data operations

---

## Medium Priority Issues 🟠

### Issue #4: Low Test Coverage in Starter Routes

**Status:** OPEN - KNOWN LIMITATION  
**Severity:** MEDIUM  
**Affected Files:**
- `packages/@edge-manifest/starter/src/crud.ts` (9.09% coverage)
- `packages/@edge-manifest/starter/src/routes.ts` (37.88% coverage)

**Description:**
Critical route registration and CRUD helper files have significantly lower test coverage than the project standard (80%). This leaves many code paths untested.

**Impact:**
- Untested code paths may contain hidden bugs
- Edge cases may not be handled correctly
- Refactoring is riskier without good test coverage
- Production issues may arise in uncommon scenarios

**Root Cause:**
- Tests focus on integration rather than unit testing these modules
- Complex Elysia types make mocking difficult
- Rapid development prioritized features over test coverage

**Workaround:**
- Integration tests can cover some gaps
- Manual testing can validate functionality
- Code review provides some confidence

**Suggested Fix:**
1. Add unit tests for `crud.ts` helper functions
2. Mock Elysia context for route registration tests
3. Test error handling in route setup
4. Test edge cases (missing fields, invalid types, etc.)
5. Target ≥80% coverage for all files
6. Consider adding integration tests for complex scenarios

**Priority:** P2 - Improve in Phase 4 or before major refactoring

---

### Issue #5: Performance Benchmarks Missing

**Status:** OPEN  
**Severity:** MEDIUM  
**Affected Component:** Performance validation

**Description:**
No performance metrics have been measured yet. Response times, cold start performance, memory usage, and bundle sizes are all unknown.

**Impact:**
- Cannot guarantee acceptable performance
- Cannot detect performance regressions
- Cannot optimize critical paths
- Unknown if bundle sizes meet targets

**Missing Metrics:**
- Average API response time (target: <50ms)
- Database query time (target: <10ms)
- Cold start time (target: <50ms)
- Memory usage
- Core bundle size (target: <50KB)
- Starter bundle size (target: <1MB gzipped)

**Workaround:**
Monitor performance after deployment and optimize if needed

**Suggested Fix:**
1. Set up performance monitoring
2. Create benchmark suite
3. Measure baseline performance
4. Run load tests with various workloads
5. Profile memory usage
6. Analyze bundle sizes
7. Document performance characteristics

**Priority:** P2 - Measure before production, optimize if needed

---

## Low Priority Issues 🟢

### Issue #6: No Integration Tests

**Status:** OPEN - BY DESIGN  
**Severity:** LOW  
**Affected Component:** Test suite

**Description:**
Project currently only has unit tests. No integration tests exist for end-to-end workflows, multi-entity relationships, or complex scenarios.

**Impact:**
- Cannot validate complete user workflows
- Multi-step processes not tested together
- Relationship integrity not fully validated
- Some bugs may only appear in integration scenarios

**Workaround:**
Manual testing can validate workflows

**Suggested Fix:**
1. Add integration test suite in Phase 4
2. Test multi-entity CRUD workflows
3. Test relationship cascades
4. Test authentication + authorization flows
5. Test error recovery scenarios

**Priority:** P3 - Add in Phase 4 or 5

---

### Issue #7: No Rate Limiting Implemented

**Status:** OPEN - FUTURE ENHANCEMENT  
**Severity:** LOW  
**Affected Component:** Security

**Description:**
No rate limiting is currently implemented for API endpoints. This could allow abuse or DoS attacks in production.

**Impact:**
- Vulnerable to brute force attacks on auth endpoints
- Vulnerable to DoS via excessive requests
- No protection against malicious users
- Could incur unexpected Cloudflare costs

**Workaround:**
- Cloudflare provides some DDoS protection at edge
- Can add Cloudflare Rate Limiting rules
- Can implement rate limiting in Phase 4

**Suggested Fix:**
1. Implement rate limiting middleware
2. Add per-endpoint rate limits
3. Add per-user/IP rate limits
4. Add retry-after headers
5. Log rate limit violations

**Priority:** P3 - Add before high-traffic production use

---

### Issue #8: Error Tracking Not Configured

**Status:** OPEN - FUTURE ENHANCEMENT  
**Severity:** LOW  
**Affected Component:** Observability

**Description:**
No error tracking service (e.g., Sentry, Bugsnag) is configured. Production errors will not be automatically reported or tracked.

**Impact:**
- Cannot proactively detect production issues
- Cannot track error frequency/patterns
- Cannot get detailed error context
- Harder to debug production issues

**Workaround:**
- Check Cloudflare Workers logs manually
- Add logging and monitor manually

**Suggested Fix:**
1. Set up error tracking service (Sentry recommended)
2. Configure source maps for better stack traces
3. Add custom error context
4. Set up alerts for critical errors
5. Create error dashboard

**Priority:** P3 - Add before large-scale production use

---

## Resolved Issues ✅

### ~~Issue #R1: TypeScript Index Signature Error~~

**Status:** RESOLVED ✅  
**Resolved:** 2025-12-13  
**Affected File:** `packages/@edge-manifest/core/src/config/config-parser.ts`

**Description:**
TypeScript strict mode error when accessing property on index signature type.

**Error:**
```
Property 'defaultRegion' comes from an index signature, 
so it must be accessed with ['defaultRegion'].
```

**Fix Applied:**
Changed from dot notation to bracket notation:
```typescript
// Before:
(merged.generators as Record<string, unknown>).defaultRegion = value;

// After:
(merged.generators as Record<string, unknown>)['defaultRegion'] = value;
```

Added biome-ignore comment to suppress linter warning while maintaining TypeScript strict mode compliance.

**Verification:**
- ✓ `bun run typecheck` passes
- ✓ `bun run lint` passes
- ✓ `bun run build` succeeds

---

## Issue Tracking Summary

| Priority | Open | In Progress | Resolved |
|----------|------|-------------|----------|
| 🔴 Critical | 1 | 0 | 1 |
| 🟡 High | 2 | 0 | 0 |
| 🟠 Medium | 2 | 0 | 0 |
| 🟢 Low | 3 | 0 | 0 |
| **Total** | **8** | **0** | **1** |

---

## Severity Definitions

- 🔴 **CRITICAL**: Blocking production deployment, core functionality broken
- 🟡 **HIGH**: Major functionality affected, should fix before production
- 🟠 **MEDIUM**: Important but has workarounds, fix in next phase
- 🟢 **LOW**: Nice to have, future enhancement, minimal impact

---

## Reporting New Issues

When reporting new issues, please include:

1. **Title**: Brief description
2. **Severity**: Critical/High/Medium/Low
3. **Affected Component**: Package/file/feature
4. **Description**: What's wrong
5. **Impact**: How it affects users/system
6. **Root Cause**: If known
7. **Workaround**: If available
8. **Suggested Fix**: Steps to resolve
9. **Priority**: When should it be fixed

---

**Document Maintained By:** Development Team  
**Next Review:** After critical test fixes  
**Contact:** See repository maintainers
