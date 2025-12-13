# EDGE-MANIFEST Build Pipeline Documentation

## Build Order and Dependency Chain

The monorepo uses a strict dependency order to ensure correct builds:

```
@edge-manifest/core (foundation)
    ↓
@edge-manifest/cli
@edge-manifest/starter
@edge-manifest/admin-ui
@edge-manifest/sdk
```

### Build Command
```bash
pnpm build
```

This runs:
1. `pnpm run -F @edge-manifest/core build` - Builds core FIRST
2. `pnpm run --parallel -F @edge-manifest/cli -F @edge-manifest/starter -F @edge-manifest/admin-ui -F @edge-manifest/sdk build` - Builds dependents in parallel

## Workspace Path Setup

All packages use `workspace:*` protocol for local development:

```json
{
  "dependencies": {
    "@edge-manifest/core": "workspace:*"
  }
}
```

This ensures:
- No npm fetching during development
- Immediate updates when core changes
- TypeScript resolves to local source files

## TypeScript Configuration

### Root tsconfig.json
- Uses `"files": []` (no direct source files)
- References all packages via `"references"`
- Enables project references for incremental builds

### Package tsconfig.json
- Extends `tsconfig.base.json`
- Sets `"composite": true` for project references
- References core: `"references": [{ "path": "../core" }]`
- Excludes tests from build: `"exclude": ["node_modules", "dist", "tests"]`

### Strict Mode Overrides (starter package)
The starter package uses relaxed TypeScript settings due to Elysia type complexity:
- `noImplicitAny`: false
- `noUnusedLocals`: false
- `noUnusedParameters`: false
- `exactOptionalPropertyTypes`: false
- `noPropertyAccessFromIndexSignature`: false

## Clean Build from Scratch

```bash
# Remove all build artifacts and dependencies
rm -rf node_modules pnpm-lock.yaml dist packages/*/dist packages/*/node_modules

# Install dependencies
pnpm install

# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Build all packages in correct order
pnpm build

# Run tests
pnpm test --run
```

## Troubleshooting Build Failures

### Error: "File not under rootDir"
**Cause**: TypeScript is trying to include source files from another package.
**Solution**: Ensure tsconfig has `"references"` set up correctly and uses project references.

### Error: "Cannot find module '@edge-manifest/core'"
**Cause**: Workspace path not resolved or core not built yet.
**Solution**: 
1. Run `pnpm install` to link workspace packages
2. Ensure core builds first: `pnpm --filter @edge-manifest/core build`

### Error: "Circular dependency detected"
**Cause**: Packages importing each other in a circle.
**Solution**: Refactor to ensure only one-way dependencies (core ← others).

### Error: "compatibility_date required" (wrangler)
**Cause**: Missing compatibility_date in wrangler.toml.
**Solution**: Add `compatibility_date = "2025-12-13"` to wrangler.toml.

## Commands for Development

```bash
# Build only core
pnpm --filter @edge-manifest/core build

# Build only starter
pnpm --filter @edge-manifest/starter build

# Type check without building
pnpm typecheck

# Run dev server (starter)
pnpm --filter @edge-manifest/starter dev

# Run tests for starter
pnpm --filter @edge-manifest/starter test --run

# Run tests with coverage
pnpm test --run --coverage
```

## Debugging Build Issues

1. **Check pnpm workspace links**:
   ```bash
   pnpm ls @edge-manifest/*
   ```
   Should show local paths, not npm versions.

2. **Verify build order**:
   ```bash
   pnpm build 2>&1 | grep "build:"
   ```
   Core should build first, others in parallel.

3. **Check TypeScript project references**:
   ```bash
   tsc --build --verbose
   ```
   Shows which projects are being built and in what order.

4. **Clean and rebuild incrementally**:
   ```bash
   rm -rf packages/@edge-manifest/*/dist
   pnpm --filter @edge-manifest/core build
   pnpm --filter @edge-manifest/starter build
   ```

## Authentication Implementation

JWT authentication has been implemented using the `jose` library (Web Crypto compatible):

### Auth Module (`src/auth.ts`)
- `issueJWT(payload, secret)`: Creates JWT with 1-hour expiration
- `verifyJWT(token, secret)`: Verifies JWT and returns payload or null
- `refreshJWT(token, secret)`: Refreshes valid JWT with new expiration

### Auth Endpoints (`/auth/login`, `/auth/refresh`)
- POST `/auth/login`: Accepts any email/password (placeholder auth)
- POST `/auth/refresh`: Refreshes valid JWT tokens

### Auth Middleware
- Extracts Bearer token from Authorization header
- Verifies JWT using `verifyJWT()`
- Sets `ctx.user` with payload if valid, null otherwise

### Protected Routes
All `/api/*` CRUD routes require valid JWT:
- Returns 401 if no valid JWT provided
- Checks `ctx.user` exists before processing request

### Environment Variables
- `JWT_SECRET`: Secret key for signing JWTs (defaults to dev secret if not set)

## Phase 2 Complete ✅

- [x] JWT authentication implemented (jose + Web Crypto)
- [x] Build order fixed (core first, then dependents)
- [x] Workspace paths configured (workspace:*)
- [x] TypeScript project references set up
- [x] Clean build succeeds end-to-end
- [x] All packages build correctly
- [x] Auth endpoints working (/auth/login, /auth/refresh)
- [x] CRUD routes protected with auth middleware
- [x] Build pipeline documented

## Next Steps (Phase 3)

- Code generators for TypeScript, Drizzle schemas, and API routes
- Admin UI components and hooks
- SDK client with type-safe API calls
- E2E testing of full stack
