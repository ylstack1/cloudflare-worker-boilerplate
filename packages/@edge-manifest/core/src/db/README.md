# D1 Request Handler

A per-request D1 database handler that wires Drizzle ORM to Cloudflare's D1 binding with zero shared state across requests.

## Features

- **Zero Shared State**: Each request gets its own isolated Drizzle instance
- **Type-Safe**: Full TypeScript support with InferSelectModel and InferInsertModel
- **Error Handling**: Helpful error messages for missing D1 bindings
- **Query Logging**: Optional hooks for debugging and monitoring
- **Web Standards Only**: No Node.js dependencies, works in Cloudflare Workers

## Installation

```bash
pnpm add @edge-manifest/core drizzle-orm
```

## Usage

### Basic Setup

```typescript
import { createD1RequestHandler } from '@edge-manifest/core';
import * as schema from './schema';

// Define your schema (using Drizzle ORM)
// ./schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

// Create the handler once
const d1Handler = createD1RequestHandler({ schema });

// Use it per request
export default {
  async fetch(request: Request, env: Env) {
    const ctx = {};
    await d1Handler(ctx, env);

    // Now ctx.db is available with full type safety
    const allUsers = await ctx.db.query.users.findMany();
    return Response.json(allUsers);
  }
};
```

### With Query Logging

```typescript
const d1Handler = createD1RequestHandler({
  schema,
  onQuery: (query, params) => {
    console.log('SQL Query:', query);
    console.log('Parameters:', params);
  }
});
```

### With Error Handling

```typescript
const d1Handler = createD1RequestHandler({
  schema,
  onError: (error) => {
    console.error('Database Error:', error.message);
    // Send to error tracking service
  }
});
```

### Custom Binding Name

By default, the handler looks for `env.DB`. You can customize this:

```typescript
const d1Handler = createD1RequestHandler({
  schema,
  bindingName: 'CUSTOM_DB'
});
```

### Type-Safe CRUD Operations

```typescript
import { createD1RequestHandler, type InferSelectModel, type InferInsertModel } from '@edge-manifest/core';
import * as schema from './schema';

const d1Handler = createD1RequestHandler({ schema });

export default {
  async fetch(request: Request, env: Env) {
    const ctx = {};
    await d1Handler(ctx, env);

    // Type-safe insert
    type NewUser = InferInsertModel<typeof schema.users>;
    const newUser: NewUser = {
      name: 'John Doe',
      email: 'john@example.com'
    };
    await ctx.db.insert(schema.users).values(newUser).run();

    // Type-safe select
    type User = InferSelectModel<typeof schema.users>;
    const users: User[] = await ctx.db.select().from(schema.users).all();

    // Type-safe update
    await ctx.db
      .update(schema.users)
      .set({ name: 'Jane Doe' })
      .where(sql`id = 1`)
      .run();

    // Type-safe delete
    await ctx.db
      .delete(schema.users)
      .where(sql`id = 1`)
      .run();

    return Response.json(users);
  }
};
```

## Configuration Options

### D1HandlerOptions

```typescript
interface D1HandlerOptions<TSchema extends Record<string, unknown>> {
  /**
   * Drizzle schema object containing table definitions
   */
  schema: TSchema;

  /**
   * Optional query logging hook for debugging and monitoring
   */
  onQuery?: (query: string, params: unknown[]) => void;

  /**
   * Optional error handler for database errors
   */
  onError?: (error: Error) => void;

  /**
   * Optional name of the D1 binding in env (defaults to 'DB')
   */
  bindingName?: string;
}
```

## Error Handling

If the D1 binding is not found in the environment, the handler throws a helpful error:

```
D1 binding 'DB' not found in environment.
Make sure your wrangler.toml includes:
[[d1_databases]]
binding = "DB"
database_name = "your-database"
database_id = "your-database-id"
```

## Isolation Guarantees

Each request gets its own Drizzle instance, ensuring:

- No shared state between requests
- No connection pooling issues
- Full isolation for concurrent requests
- Safe for use in Cloudflare Workers

## Testing

The handler is designed to work with mock D1 databases for testing:

```typescript
import { createD1RequestHandler } from '@edge-manifest/core';
import { describe, it, expect } from 'vitest';

describe('Database Tests', () => {
  it('should query users', async () => {
    const handler = createD1RequestHandler({ schema });
    const mockEnv = { DB: mockD1Database };
    
    const ctx = {};
    await handler(ctx, mockEnv);
    
    const users = await ctx.db.query.users.findMany();
    expect(users).toHaveLength(0);
  });
});
```

## Performance

- **Bundle Size**: ~50KB (including Drizzle ORM)
- **Cold Start**: <5ms overhead per request
- **No Connection Pooling**: D1 handles this at the platform level

## Best Practices

1. **Create handler once**: Initialize the handler outside your request handler
2. **Fresh context per request**: Always pass a new context object
3. **Type safety**: Use InferSelectModel and InferInsertModel for type-safe operations
4. **Error handling**: Always implement onError in production
5. **Query logging**: Use onQuery for debugging, disable in production

## Related

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Web Standards API](https://developer.mozilla.org/en-US/docs/Web/API)

## License

MIT
