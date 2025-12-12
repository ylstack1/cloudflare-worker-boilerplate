# EDGE-MANIFEST

A batteries-included [ElysiaJS](https://elysiajs.com/) boilerplate for [Cloudflare Workers](https://workers.cloudflare.com/) with [Scalar](https://scalar.com/), organized as a pnpm-based monorepo.

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

### Building

Build all packages:

```bash
pnpm build
```

Build a specific package:

```bash
pnpm -C packages/@edge-manifest/starter build
```

### Development Server

Start the Cloudflare Worker development server:

```bash
pnpm dev
```

Or run from a specific package:

```bash
pnpm -C packages/@edge-manifest/starter dev
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
