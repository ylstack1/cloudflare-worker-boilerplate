# @edge-manifest/generators

Manifest-driven code generators used by the `edge-manifest` CLI.

## Outputs

`generateAll(manifest)` returns an object of strings (and string maps) that can be written directly into a repo-level `.output/` directory:

- `schema` → `schema.ts` (Drizzle schema for D1/SQLite)
- `types` + `apiTypes` → `types.ts` (TypeScript types for entities and API envelopes)
- `routes` → `routes.ts` (exports `createRoutesPlugin(manifest, schema)`)
- `config` → `config.ts` (manifest metadata + OpenAPI info; does not require D1/KV)
- `migrations` → `migrations/<timestamp>_init.sql` (SQL migration)
- `adminAssetsModule` → `admin-assets.ts` (embeddable admin UI assets)
- `adminAssets` → `admin/*` (optional raw files used by `adminAssetsModule`)

## Worker consumption

A Worker can import only from `.output/*`:

```ts
import { appConfig, manifest } from '../.output/config';
import * as schema from '../.output/schema';
import { createRoutesPlugin } from '../.output/routes';
import { adminAssets } from '../.output/admin-assets';

// app.use(createRoutesPlugin(manifest, schema))
```

## CLI consumption

The CLI loads a manifest from `manifest.ts` / `.manifest.{json,yaml,yml}` / `manifest.{json,yaml,yml}`, validates it with `validateManifest()`, calls `generateAll()`, and materializes `.output/`.
