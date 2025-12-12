# D1 Handler Usage Examples

## Basic Example

```typescript
// schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

```typescript
// worker.ts
import { createD1RequestHandler, type InferSelectModel, type InferInsertModel } from '@edge-manifest/core';
import * as schema from './schema';

// Create handler once at module level
const d1Handler = createD1RequestHandler({
  schema,
  onQuery: (query, params) => {
    console.log('📊 SQL Query:', query);
    console.log('📝 Parameters:', params);
  },
  onError: (error) => {
    console.error('❌ Database Error:', error.message);
  }
});

// Type-safe user types
type User = InferSelectModel<typeof schema.users>;
type NewUser = InferInsertModel<typeof schema.users>;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Initialize database context for this request
    const ctx = {};
    await d1Handler(ctx, env);

    // Route handling with type-safe database operations
    if (url.pathname === '/users' && request.method === 'GET') {
      const users = await ctx.db.select().from(schema.users).all();
      return Response.json(users);
    }

    if (url.pathname === '/users' && request.method === 'POST') {
      const data = await request.json() as NewUser;
      const result = await ctx.db
        .insert(schema.users)
        .values({
          ...data,
          createdAt: new Date()
        })
        .run();
      
      return Response.json({ 
        success: true, 
        id: result.meta.last_row_id 
      });
    }

    if (url.pathname.startsWith('/users/') && request.method === 'GET') {
      const id = parseInt(url.pathname.split('/')[2] || '0');
      const user = await ctx.db
        .select()
        .from(schema.users)
        .where(sql`id = ${id}`)
        .get();
      
      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      
      return Response.json(user);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }
};
```

## With Elysia Framework

```typescript
import { Elysia } from 'elysia';
import { createD1RequestHandler, type InferSelectModel } from '@edge-manifest/core';
import * as schema from './schema';

const d1Handler = createD1RequestHandler({ schema });

type User = InferSelectModel<typeof schema.users>;

const app = new Elysia()
  .decorate('db', async (env: Env) => {
    const ctx = {};
    await d1Handler(ctx, env);
    return ctx.db;
  })
  .get('/users', async ({ env }) => {
    const db = await (app as any).decorator.db(env);
    const users: User[] = await db.select().from(schema.users).all();
    return users;
  })
  .post('/users', async ({ body, env }) => {
    const db = await (app as any).decorator.db(env);
    const result = await db
      .insert(schema.users)
      .values(body)
      .run();
    return { id: result.meta.last_row_id };
  });

export default app;
```

## Advanced: Query Builder Helpers

```typescript
import { createD1RequestHandler } from '@edge-manifest/core';
import { eq, and, or, like, gt, lt } from 'drizzle-orm';
import * as schema from './schema';

const d1Handler = createD1RequestHandler({ schema });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ctx = {};
    await d1Handler(ctx, env);
    
    // Complex queries with Drizzle operators
    const searchTerm = new URL(request.url).searchParams.get('q');
    
    if (searchTerm) {
      const users = await ctx.db
        .select()
        .from(schema.users)
        .where(
          or(
            like(schema.users.name, `%${searchTerm}%`),
            like(schema.users.email, `%${searchTerm}%`)
          )
        )
        .all();
      
      return Response.json(users);
    }

    // Pagination
    const page = parseInt(new URL(request.url).searchParams.get('page') || '1');
    const limit = 10;
    const offset = (page - 1) * limit;

    const users = await ctx.db
      .select()
      .from(schema.users)
      .limit(limit)
      .offset(offset)
      .all();

    return Response.json({ users, page, limit });
  }
};
```

## With Relations

```typescript
import { createD1RequestHandler } from '@edge-manifest/core';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

const d1Handler = createD1RequestHandler({ schema });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ctx = {};
    await d1Handler(ctx, env);
    
    const userId = 1;

    // Get user with their posts
    const user = await ctx.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const posts = await ctx.db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.authorId, userId))
      .all();

    return Response.json({ user, posts });
  }
};
```

## Error Handling

```typescript
import { createD1RequestHandler, D1BindingError } from '@edge-manifest/core';
import * as schema from './schema';

const d1Handler = createD1RequestHandler({
  schema,
  onError: (error) => {
    // Log to external service
    console.error('Database error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const ctx = {};
      await d1Handler(ctx, env);
      
      const users = await ctx.db.select().from(schema.users).all();
      return Response.json(users);
    } catch (error) {
      if (error instanceof D1BindingError) {
        return Response.json({
          error: 'Database not configured',
          message: error.message
        }, { status: 503 });
      }
      
      return Response.json({
        error: 'Internal server error'
      }, { status: 500 });
    }
  }
};
```

## Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createD1RequestHandler } from '@edge-manifest/core';
import * as schema from './schema';
import Database from 'better-sqlite3';

describe('User API', () => {
  let mockD1: any;
  let env: any;

  beforeEach(() => {
    // Create in-memory SQLite database for testing
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      )
    `);
    
    // Mock D1 interface
    mockD1 = {
      prepare: (query: string) => {
        const stmt = db.prepare(query);
        return {
          bind: (...values: any[]) => ({
            all: async () => ({
              results: stmt.all(...values),
              success: true
            }),
            run: async () => ({
              success: true,
              meta: { last_row_id: 1 }
            })
          })
        };
      }
    };
    
    env = { DB: mockD1 };
  });

  it('should create and retrieve users', async () => {
    const handler = createD1RequestHandler({ schema });
    const ctx = {};
    await handler(ctx, env);

    // Create user
    await ctx.db
      .insert(schema.users)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date()
      })
      .run();

    // Retrieve users
    const users = await ctx.db.select().from(schema.users).all();
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe('Test User');
  });
});
```

## wrangler.toml Configuration

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-database-id"

# For local development
[dev]
port = 8787
```

## Migration Example

```typescript
// migrations/0001_create_users.ts
import { sql } from 'drizzle-orm';

export async function up(db: any) {
  await db.exec(sql`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `);
}

export async function down(db: any) {
  await db.exec(sql`DROP TABLE users`);
}
```
