# @edge-manifest/core

Core API library for EDGE-MANIFEST. This package provides essential utilities for building type-safe, edge-first applications with Cloudflare Workers.

## Features

- **D1 Request Handler**: Per-request Drizzle ORM integration with zero shared state
- **Manifest Validation**: Type-safe manifest schema validation
- **Config Parser**: Configuration management utilities
- **Web Standards Only**: No Node.js dependencies, works in any edge runtime

## Installation

```bash
pnpm add @edge-manifest/core
```

## D1 Request Handler

A per-request D1 database handler that wires Drizzle ORM to Cloudflare's D1 binding with zero shared state across requests.

### Quick Start

```typescript
import { createD1RequestHandler } from '@edge-manifest/core';
import * as schema from './schema';

// Create the handler once
const d1Handler = createD1RequestHandler({ schema });

// Use it per request
export default {
  async fetch(request: Request, env: Env) {
    const ctx = {};
    await d1Handler(ctx, env);

    // Now ctx.db is available with full type safety
    const users = await ctx.db.query.users.findMany();
    return Response.json(users);
  }
};
```

### Features

- ✅ Zero shared state between requests
- ✅ Full TypeScript type safety
- ✅ Query logging hooks for debugging
- ✅ Helpful error messages
- ✅ 99.5%+ test coverage

[Read full D1 handler documentation →](./src/db/README.md)

## API Reference

### D1 Handler

```typescript
import { 
  createD1RequestHandler,
  type InferSelectModel,
  type InferInsertModel,
  type D1HandlerOptions,
  type D1Context,
  D1BindingError
} from '@edge-manifest/core';
```

#### `createD1RequestHandler<TSchema>(options: D1HandlerOptions<TSchema>)`

Creates a per-request handler that attaches a fresh Drizzle instance to your context.

**Options:**
- `schema`: Drizzle schema object
- `onQuery?`: Query logging hook
- `onError?`: Error handling hook
- `bindingName?`: Custom D1 binding name (default: 'DB')

**Returns:** `(ctx, env) => Promise<ctx & D1Context>`

### Type Exports

```typescript
// Infer types from your schema
type User = InferSelectModel<typeof schema.users>;
type NewUser = InferInsertModel<typeof schema.users>;
```

## Requirements

- TypeScript 5.0+
- Cloudflare Workers (or compatible edge runtime)
- Drizzle ORM 0.36.4+

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Build
pnpm build

# Type check
pnpm typecheck
```

## Testing

The package includes comprehensive tests with 94%+ overall coverage:

```bash
pnpm test
```

All D1 handler features are tested using in-memory SQLite databases to ensure isolation and correctness.

## Web Standards Compliance

This package uses only Web Standards APIs:

- ✅ Fetch API
- ✅ Web Crypto API
- ✅ Streams API
- ✅ No Node.js dependencies
- ✅ No `process`, `fs`, `path`, etc.

## Performance

- **Bundle Size**: <50KB uncompressed
- **Cold Start**: <5ms overhead per request
- **Coverage**: 94%+ test coverage

## Related Packages

- `@edge-manifest/cli` - CLI tools
- `@edge-manifest/starter` - Starter template
- `@edge-manifest/admin-ui` - Admin interface
- `@edge-manifest/sdk` - Client SDK

## License

MIT

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass (`pnpm test`)
2. Coverage stays above 80% (`pnpm test -- --coverage`)
3. TypeScript strict mode is enabled
4. No Node.js dependencies in runtime code
5. Follow existing code style

## Support

- [Documentation](https://edge-manifest.dev)
- [GitHub Issues](https://github.com/yourusername/edge-manifest/issues)
- [Discord Community](https://discord.gg/edge-manifest)
