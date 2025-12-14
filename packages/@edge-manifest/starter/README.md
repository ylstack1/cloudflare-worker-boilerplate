# @edge-manifest/starter

Single-file Cloudflare Worker runtime for EDGE-MANIFEST.

## How it works

- The **manifest** lives in your workspace (`manifest.ts` by default).
- `pnpm generate` runs the `edge-manifest` CLI and writes generated artifacts to the repo-level `.output/` directory.
- The Worker (`src/index.ts`) imports only from `.output/*` at runtime.

## Local development

From the repo root:

```bash
pnpm install
pnpm dev
```

Wrangler runs on `http://127.0.0.1:8787`.

### Endpoints

- `GET /api/health` — basic health check
- `GET/POST/PATCH/DELETE /api/{users,stores,products}` — generated CRUD endpoints
- `GET /docs` — OpenAPI + Scalar UI
- `GET /openapi.json` — OpenAPI spec
- `GET /admin` — embedded admin UI assets

### Smoke test

Once `pnpm dev` is running:

```bash
./test-endpoints.sh
```

## Deploy

```bash
pnpm deploy
```

## Notes

- Elysia is instantiated with `{ aot: false }` for Cloudflare Workers compatibility.
- Manifest loading is file-based (no D1/KV manifest loading at runtime).
