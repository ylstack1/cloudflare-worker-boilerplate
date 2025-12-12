import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { describe, expect, it, vi } from 'vitest';
import { createD1RequestHandler, D1BindingError, type D1Bindings } from '../src/db/d1-handler';

const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

const schema = { users };

type D1ResultMeta = {
  duration: number;
  size_after: number;
  rows_read: number;
  rows_written: number;
  changes?: number;
  last_row_id?: number;
};

type D1ResultLike<T> = {
  results?: T[];
  success: boolean;
  meta: D1ResultMeta;
};

class MockD1PreparedStatement {
  constructor(
    private readonly db: MockD1Database,
    private readonly query: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...params: unknown[]) {
    return new MockD1PreparedStatement(this.db, this.query, params);
  }

  async all<T = unknown>(): Promise<D1ResultLike<T>> {
    this.db.lastQuery = this.query;
    this.db.lastParams = [...this.params];

    return {
      results: [],
      success: true,
      meta: {
        duration: 0,
        size_after: 0,
        rows_read: 0,
        rows_written: 0,
      },
    };
  }

  async first<T = unknown>(): Promise<T | null> {
    this.db.lastQuery = this.query;
    this.db.lastParams = [...this.params];

    return null;
  }

  async run<T = unknown>(): Promise<D1ResultLike<T>> {
    this.db.lastQuery = this.query;
    this.db.lastParams = [...this.params];

    return {
      success: true,
      meta: {
        changes: 0,
        last_row_id: 0,
        duration: 0,
        size_after: 0,
        rows_read: 0,
        rows_written: 0,
      },
    };
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    this.db.lastQuery = this.query;
    this.db.lastParams = [...this.params];

    return [];
  }
}

class MockD1Database {
  lastQuery: string | undefined;
  lastParams: unknown[] | undefined;

  prepare(query: string): MockD1PreparedStatement {
    return new MockD1PreparedStatement(this, query);
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  async batch<T = unknown>(): Promise<D1ResultLike<T>[]> {
    return [];
  }

  async exec(): Promise<D1ExecResult> {
    return { count: 0, duration: 0 };
  }
}

describe('createD1RequestHandler', () => {
  it('attaches a Drizzle instance to the context', async () => {
    const handler = createD1RequestHandler({ schema });

    const ctx = {};
    const env: D1Bindings = { DB: new MockD1Database() as unknown as D1Database };

    const result = await handler(ctx, env);

    expect(result.db).toBeDefined();
    expect(typeof result.db).toBe('object');
  });

  it('throws D1BindingError when binding is missing', async () => {
    const handler = createD1RequestHandler({ schema });

    await expect(handler({}, {})).rejects.toBeInstanceOf(D1BindingError);
  });

  it('supports a custom binding name', async () => {
    const handler = createD1RequestHandler({ schema, bindingName: 'DATABASE' });

    const env: D1Bindings = { DATABASE: new MockD1Database() as unknown as D1Database };

    const result = await handler({}, env);
    expect(result.db).toBeDefined();
  });

  it('creates a fresh Drizzle wrapper per request', async () => {
    const handler = createD1RequestHandler({ schema });
    const env: D1Bindings = { DB: new MockD1Database() as unknown as D1Database };

    const result1 = await handler({}, env);
    const result2 = await handler({}, env);

    expect(result1.db).not.toBe(result2.db);
  });

  it('calls onQuery hook when database functions are invoked', async () => {
    const onQuery = vi.fn();

    const handler = createD1RequestHandler({ schema, onQuery });
    const mockDb = new MockD1Database();
    const env: D1Bindings = { DB: mockDb as unknown as D1Database };

    const { db } = await handler({}, env);

    await db.select().from(users).all();

    expect(mockDb.lastQuery?.toLowerCase()).toContain('select');
    expect(onQuery).toHaveBeenCalled();
  });

  it('does not break if onQuery throws and reports to onError', async () => {
    const onError = vi.fn();
    const onQuery = vi.fn(() => {
      throw new Error('log failure');
    });

    const handler = createD1RequestHandler({ schema, onQuery, onError });
    const env: D1Bindings = { DB: new MockD1Database() as unknown as D1Database };

    const { db } = await handler({}, env);
    await db.select({ value: sql`1` }).from(users).all();

    expect(onQuery).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('calls onError hook for binding errors', async () => {
    const onError = vi.fn();

    const handler = createD1RequestHandler({ schema, onError });

    await expect(handler({}, {})).rejects.toBeInstanceOf(D1BindingError);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
