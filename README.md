# EDGE-MANIFEST

A production-ready, local-first, manifest-driven backend for Cloudflare Workers.

This repo uses **pnpm (9.x) as the only supported package manager**.

## Monorepo Structure

```
packages/@edge-manifest/
├── core/          # Core API library
├── cli/           # Command-line interface
├── starter/       # Cloudflare Worker template
├── admin-ui/      # Admin UI web interface
└── sdk/           # JavaScript/TypeScript SDK
```

## Development

### Setup

Install all dependencies using pnpm:

```bash
pnpm install
```

### Generate from `manifest.ts`

A default `manifest.ts` is included at the repo root. Generate the Worker artifacts into `.output/`:

```bash
pnpm generate
```

### Development Server

Start the Cloudflare Worker development server (runs `pnpm generate`, applies local D1 migrations, and starts `wrangler dev`):

```bash
pnpm dev
```

Once the server is running, you can run the curl smoke test in another terminal:

```bash
./test-endpoints.sh
```

### Building

Build all packages:

```bash
pnpm build
```

Build a specific package:

```bash
pnpm -C packages/@edge-manifest/starter build
```

### Testing

Run tests across all packages with Vitest:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

Run tests with coverage report:

```bash
pnpm test:coverage
```

### Linting & Formatting

Check code with Biome:

```bash
pnpm lint
```

Fix code with Biome:

```bash
pnpm lint:fix
```

### Type Checking

Type check all packages:

```bash
pnpm typecheck
```

## Deployment

Deploy the Cloudflare Worker:

```bash
pnpm -C packages/@edge-manifest/starter deploy
```

## Testing in CI

The CI workflow will:
1. Install dependencies
2. Run linting
3. Type check all packages
4. Build all packages
5. Run tests with coverage reporting (minimum 80%)

For local testing before pushing:

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test --run --coverage
```
