# EDGE-MANIFEST Progress Status (manifest-driven backend)

This file tracks the current state of the “Complete edge-native manifest-driven backend” ticket implementation.

## ✅ Done

### Phase 1 — Standardize package manager (pnpm)
- Removed Bun usage from repo scripts.
- Added `bun.lock`/`bun.lockb` to `.gitignore`.
- Updated root scripts to use pnpm workspace commands.
- Updated docs to state pnpm as the supported package manager.

### Phase 2 — Upgrade manifest generators
- `generateAll()` extended to return additional artifacts:
  - `config` (written to `.output/config.ts`)
  - `adminAssetsModule` (written to `.output/admin-assets.ts`)
  - `adminAssets` (raw files under `.output/admin/*`)
- API generator now produces `routes.ts` exporting:
  - `createRoutesPlugin(manifest, schema)`
  - CRUD endpoints under `/api/<plural>` with D1 Drizzle queries
  - `sql` import fixed (pagination count)
- Schema generator adjustments:
  - JSON fields now use `text(..., { mode: 'json' })` (SQLite-friendly)
  - `id` no longer forced to UUID format in Zod output (only `uuid` kind uses `.uuid()`)
- Migration generator adjustments:
  - Deterministic filename strategy implemented by CLI (see Phase 3)
  - Unique indexes use `CREATE UNIQUE INDEX IF NOT EXISTS ...`

### Phase 3 — Setup CLI
- Implemented real `edge-manifest` binary via `@edge-manifest/cli` `bin` field.
- Implemented `edge-manifest setup [--manifest PATH] [--out-dir PATH] [--force]`:
  - Auto-detects manifest (`manifest.ts`, `.manifest.*`, `manifest.*`) by scanning workspace
  - Loads TS manifests via `esbuild-register`
  - Loads YAML via `yaml`
  - Validates with `validateManifest()`
  - Writes `.output/` artifacts:
    - `schema.ts`, `types.ts`, `routes.ts`, `config.ts`, `admin-assets.ts`
    - `admin/*` assets
    - `migrations/<timestamp>_init.sql`
- Added default repo-root `manifest.ts` (User, Store, Product).
- Root scripts wired:
  - `pnpm generate` → CLI generation
  - `pnpm dev` → generate + start Worker
  - `pnpm build` → generate + build packages + worker build
  - `pnpm migrate:prod`, `pnpm deploy` wired to starter

### Phase 4 — Single edge worker runtime
- Starter runtime collapsed into **single file**: `packages/@edge-manifest/starter/src/index.ts`
- Worker now:
  - Instantiates Elysia with `{ aot: false }`
  - Enables CORS
  - Adds request-id and basic secure headers
  - Registers OpenAPI + Scalar (`/docs`, `/openapi.json`)
  - Registers generated CRUD routes via `createRoutesPlugin()`
  - Serves embedded admin UI under `/admin`
- Starter `wrangler.toml` updated:
  - D1 binding `DB` (database_name `edge-manifest-db`)
  - KV binding `KV`
  - `migrations_dir = "../../.output/migrations"`
  - dev server default `127.0.0.1:8787`
  - `.dev.vars.example` updated

### Phase 5 — Curl smoke tests
- Added root `test-endpoints.sh` (POSIX shell):
  - Uses `BASE_URL` (default `http://127.0.0.1:8787`)
  - CRUD tests for users/stores/products
  - Fails fast with clear diagnostics

## ⚠️ Not done / needs verification

### pnpm lockfile
- The ticket expects a committed `pnpm-lock.yaml` generated from `pnpm install`.
  - If missing, run `corepack prepare pnpm@9.0.0 --activate && pnpm install` and commit the lockfile.

### Local dev validation
- Expected manual validation steps (recommended before production deploy):
  1. `pnpm install`
  2. `pnpm generate` (verify `.output/` is created)
  3. `pnpm dev`
  4. In another terminal: `./test-endpoints.sh`
  5. Visit:
     - `http://127.0.0.1:8787/admin`
     - `http://127.0.0.1:8787/docs`

## Known limitations (intentional for this ticket scope)
- No auth/permissions enforced on CRUD endpoints (public by default), per ticket constraints.
- Admin UI is an embedded minimal UI (static assets) rather than a full SvelteKit bundle.

## Recommended next steps (production hardening)
- Add proper typed context for Elysia routes (remove any remaining implicit casts).
- Add response schemas and richer OpenAPI metadata (tags, descriptions, security schemes).
- Add structured logging and request metrics.
- Add foreign key and relation support in manifest + generators.
