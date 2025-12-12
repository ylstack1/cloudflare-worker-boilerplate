/**
 * Tests for D1 Request Handler
 *
 * These tests verify that the D1 handler:
 * - Creates isolated database connections per request
 * - Properly handles missing D1 bindings
 * - Supports query logging and error handling hooks
 * - Works with Drizzle ORM CRUD operations
 * - Maintains type safety throughout
 */

import { Database } from 'bun:sqlite';
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createD1RequestHandler, D1BindingError, type D1Bindings } from '../src/db/d1-handler';

// Define a test schema
const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
});

const schema = { users, posts };

type SqlStatement = ReturnType<Database['prepare']>;

/**
 * Mock D1PreparedStatement implementation
 */
class MockD1PreparedStatement {
  constructor(
    private stmt: SqlStatement,
    private values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): MockD1PreparedStatement {
    return new MockD1PreparedStatement(this.stmt, values);
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    try {
      const results = this.values.length > 0 ? this.stmt.all(...this.values) : this.stmt.all();
      return {
        results: results as T[],
        success: true,
        meta: {
          duration: 0,
          size_after: 0,
          rows_read: 0,
          rows_written: 0,
        },
      } as D1Result<T>;
    } catch (error) {
      throw new Error(String(error));
    }
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    try {
      const result = this.values.length > 0 ? this.stmt.get(...this.values) : this.stmt.get();
      if (!result) return null;
      if (colName) {
        return ((result as Record<string, unknown>)[colName] as T) ?? null;
      }
      return result as T;
    } catch {
      return null;
    }
  }

  async run<T = unknown>(): Promise<D1Result<T>> {
    try {
      const info = this.values.length > 0 ? this.stmt.run(...this.values) : this.stmt.run();
      return {
        success: true,
        meta: {
          changes: Number(info.changes),
          last_row_id: Number(info.lastInsertRowid),
          duration: 0,
          size_after: 0,
          rows_read: 0,
          rows_written: Number(info.changes),
        },
      } as D1Result<T>;
    } catch (error) {
      throw new Error(String(error));
    }
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    try {
      const results = this.values.length > 0 ? this.stmt.all(...this.values) : this.stmt.all();

      if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
        return results as T[];
      }

      return results.map((row) => Object.values(row as Record<string, unknown>)) as T[];
    } catch {
      return [];
    }
  }
}

/**
 * Mock D1Database implementation using better-sqlite3
 * This simulates Cloudflare's D1 API for testing purposes
 */
class MockD1Database {
  private db: Database;

  constructor() {
    this.db = new Database(':memory:');
    // Initialize schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        FOREIGN KEY (author_id) REFERENCES users(id)
      );
    `);
  }

  prepare(query: string): MockD1PreparedStatement {
    const stmt = this.db.prepare(query);
    return new MockD1PreparedStatement(stmt);
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  async batch<T = unknown>(statements: MockD1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      const result = await stmt.run<T>();
      results.push(result);
    }
    return results;
  }

  async exec(query: string): Promise<D1ExecResult> {
    try {
      this.db.exec(query);
      return {
        count: 0,
        duration: 0,
      };
    } catch (error) {
      throw new Error(`Exec failed: ${String(error)}`);
    }
  }

  close() {
    this.db.close();
  }
}

describe('createD1RequestHandler', () => {
  let mockD1: MockD1Database;
  let env: D1Bindings;

  beforeEach(() => {
    mockD1 = new MockD1Database();
    env = { DB: mockD1 as unknown as D1Database };
  });

  describe('Basic Functionality', () => {
    it('should attach a Drizzle instance to the context', async () => {
      const handler = createD1RequestHandler({ schema });
      const ctx = {};

      const result = await handler(ctx, env);

      expect(result).toBeDefined();
      expect(result.db).toBeDefined();
      expect(typeof result.db).toBe('object');
    });

    it('should maintain type safety with schema', async () => {
      const handler = createD1RequestHandler({ schema });
      const ctx = {};

      const result = await handler(ctx, env);

      // TypeScript should infer these properties
      expect(result.db.query).toBeDefined();
      expect(result.db.query.users).toBeDefined();
      expect(result.db.query.posts).toBeDefined();
    });

    it('should create fresh instances per request', async () => {
      const handler = createD1RequestHandler({ schema });

      const ctx1 = {};
      const ctx2 = {};

      const result1 = await handler(ctx1, env);
      const result2 = await handler(ctx2, env);

      // Each request should get its own context
      expect(result1).not.toBe(result2);
      expect(result1.db).toBeDefined();
      expect(result2.db).toBeDefined();

      // But the db instances themselves are fresh Drizzle wrappers
      expect(result1.db).not.toBe(result2.db);
    });
  });

  describe('Error Handling', () => {
    it('should throw D1BindingError when binding is missing', async () => {
      const handler = createD1RequestHandler({ schema });
      const emptyEnv = {};

      await expect(handler({}, emptyEnv)).rejects.toThrow(D1BindingError);
      await expect(handler({}, emptyEnv)).rejects.toThrow("D1 binding 'DB' not found");
    });

    it('should throw D1BindingError with custom binding name', async () => {
      const handler = createD1RequestHandler({
        schema,
        bindingName: 'CUSTOM_DB',
      });
      const env = { DB: mockD1 }; // Wrong binding name

      await expect(handler({}, env)).rejects.toThrow(D1BindingError);
      await expect(handler({}, env)).rejects.toThrow("D1 binding 'CUSTOM_DB' not found");
    });

    it('should work with custom binding name when present', async () => {
      const handler = createD1RequestHandler({
        schema,
        bindingName: 'CUSTOM_DB',
      });
      const env = { CUSTOM_DB: mockD1 };

      const result = await handler({}, env);

      expect(result.db).toBeDefined();
    });

    it('should call onError hook when binding is missing', async () => {
      const onError = vi.fn();
      const handler = createD1RequestHandler({ schema, onError });
      const emptyEnv = {};

      await expect(handler({}, emptyEnv)).rejects.toThrow();
      expect(onError).toHaveBeenCalledWith(expect.any(D1BindingError));
    });

    it('should throw error when binding is not a D1Database', async () => {
      const handler = createD1RequestHandler({ schema });
      const invalidEnv = { DB: 'not a database' };

      await expect(handler({}, invalidEnv)).rejects.toThrow(D1BindingError);
    });
  });

  describe('Query Logging', () => {
    it('should call onQuery hook when provided', async () => {
      const onQuery = vi.fn();
      const handler = createD1RequestHandler({ schema, onQuery });

      const result = await handler({}, env);

      // Trigger a query
      await result.db.select().from(users).all();

      // onQuery should have been called
      expect(onQuery).toHaveBeenCalled();
    });

    it('should not break if onQuery throws an error', async () => {
      const onQuery = vi.fn(() => {
        throw new Error('Logging failed');
      });
      const onError = vi.fn();
      const handler = createD1RequestHandler({ schema, onQuery, onError });

      const result = await handler({}, env);

      // Should still work even if logging fails
      const queryResult = await result.db.select().from(users).all();
      expect(queryResult).toBeDefined();
    });
  });

  describe('CRUD Operations', () => {
    it('should support INSERT operations', async () => {
      const handler = createD1RequestHandler({ schema });
      const result = await handler({}, env);

      const insertResult = await result.db
        .insert(users)
        .values({
          name: 'John Doe',
          email: 'john@example.com',
        })
        .run();

      expect(insertResult).toBeDefined();
    });

    it('should support SELECT operations', async () => {
      const handler = createD1RequestHandler({ schema });
      const ctx = await handler({}, env);

      // Insert a user
      await ctx.db
        .insert(users)
        .values({
          name: 'Jane Doe',
          email: 'jane@example.com',
        })
        .run();

      // Select all users
      const allUsers = await ctx.db.select().from(users).all();

      expect(allUsers).toBeDefined();
      expect(allUsers.length).toBeGreaterThan(0);
      expect(allUsers[0]?.name).toBe('Jane Doe');
    });

    it('should support UPDATE operations', async () => {
      const handler = createD1RequestHandler({ schema });
      const ctx = await handler({}, env);

      // Insert a user
      await ctx.db
        .insert(users)
        .values({
          name: 'Bob Smith',
          email: 'bob@example.com',
        })
        .run();

      // Update the user
      await ctx.db.update(users).set({ name: 'Robert Smith' }).where(sql`email = 'bob@example.com'`).run();

      // Verify update
      const updatedUser = await ctx.db.select().from(users).where(sql`email = 'bob@example.com'`).get();

      expect(updatedUser?.name).toBe('Robert Smith');
    });

    it('should support DELETE operations', async () => {
      const handler = createD1RequestHandler({ schema });
      const ctx = await handler({}, env);

      // Insert a user
      await ctx.db
        .insert(users)
        .values({
          name: 'Alice Johnson',
          email: 'alice@example.com',
        })
        .run();

      // Delete the user
      await ctx.db.delete(users).where(sql`email = 'alice@example.com'`).run();

      // Verify deletion
      const deletedUser = await ctx.db.select().from(users).where(sql`email = 'alice@example.com'`).get();

      expect(deletedUser).toBeUndefined();
    });

    it('should support complex queries with relations', async () => {
      const handler = createD1RequestHandler({ schema });
      const ctx = await handler({}, env);

      // Insert a user
      await ctx.db
        .insert(users)
        .values({
          name: 'Author Name',
          email: 'author@example.com',
        })
        .run();

      // Get the user to find their ID
      const author = await ctx.db.select().from(users).where(sql`email = 'author@example.com'`).get();

      expect(author).toBeDefined();
      expect(author?.id).toBeDefined();

      if (author?.id) {
        // Insert a post
        await ctx.db
          .insert(posts)
          .values({
            title: 'Test Post',
            content: 'This is a test post',
            authorId: author.id,
          })
          .run();

        // Query posts
        const allPosts = await ctx.db.select().from(posts).all();

        expect(allPosts).toBeDefined();
        expect(allPosts.length).toBe(1);
        expect(allPosts[0]?.title).toBe('Test Post');
        expect(allPosts[0]?.authorId).toBe(author.id);
      }
    });
  });

  describe('Isolation Between Requests', () => {
    it('should not share data between isolated contexts', async () => {
      const handler = createD1RequestHandler({ schema });

      // Create two separate mock D1 instances
      const mockD1_1 = new MockD1Database();
      const mockD1_2 = new MockD1Database();

      const env1 = { DB: mockD1_1 as unknown as D1Database };
      const env2 = { DB: mockD1_2 as unknown as D1Database };

      // Insert into first context
      const ctx1 = await handler({}, env1);
      await ctx1.db
        .insert(users)
        .values({
          name: 'User 1',
          email: 'user1@example.com',
        })
        .run();

      // Insert into second context
      const ctx2 = await handler({}, env2);
      await ctx2.db
        .insert(users)
        .values({
          name: 'User 2',
          email: 'user2@example.com',
        })
        .run();

      // Each context should only see its own data
      const users1 = await ctx1.db.select().from(users).all();
      const users2 = await ctx2.db.select().from(users).all();

      expect(users1.length).toBe(1);
      expect(users2.length).toBe(1);
      expect(users1[0]?.email).toBe('user1@example.com');
      expect(users2[0]?.email).toBe('user2@example.com');

      // Cleanup
      mockD1_1.close();
      mockD1_2.close();
    });
  });

  describe('Type Exports', () => {
    it('should export InferSelectModel and InferInsertModel', async () => {
      const handler = createD1RequestHandler({ schema });
      const ctx = await handler({}, env);

      // These types should be available from the module
      type User = typeof users.$inferSelect;
      type NewUser = typeof users.$inferInsert;

      const newUser: NewUser = {
        name: 'Type Test User',
        email: 'typetest@example.com',
      };

      await ctx.db.insert(users).values(newUser).run();

      const selectedUser = await ctx.db.select().from(users).where(sql`email = 'typetest@example.com'`).get();

      // Should match the inferred type
      const typedUser: User | undefined = selectedUser;
      expect(typedUser?.name).toBe('Type Test User');
    });
  });
});
