# QUICKSTART

## Prerequisites

- pnpm 9.x
- Cloudflare Wrangler (installed via workspace deps)

## 1) Install

```bash
pnpm install
```

## 2) Generate artifacts

The CLI reads the workspace `manifest.ts` (or `.manifest.{json,yaml,yml}` / `manifest.{json,yaml,yml}`) and writes a repo-level `.output/` directory.

```bash
pnpm generate
```

## 3) Run locally

```bash
pnpm dev
```

The dev server listens on `http://127.0.0.1:8787`.

## 4) Smoke test endpoints

In another terminal:

```bash
./test-endpoints.sh
```
