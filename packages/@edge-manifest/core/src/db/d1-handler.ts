/**
 * D1 Request Handler for Drizzle ORM
 *
 * This module provides a per-request D1 database handler that wires Drizzle ORM
 * to Cloudflare's D1 binding with zero shared state across requests.
 *
 * @example
 * ```typescript
 * import { createD1RequestHandler } from '@edge-manifest/core';
 * import { drizzle } from 'drizzle-orm/d1';
 * import * as schema from './schema.js';
 *
 * const d1Handler = createD1RequestHandler({ schema });
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const ctx = {};
 *     await d1Handler(ctx, env);
 *     // ctx.db is now available with full type safety
 *     const users = await ctx.db.query.users.findMany();
 *     return Response.json(users);
 *   }
 * };
 * ```
 */

import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';

/**
 * Configuration options for the D1 request handler
 */
export interface D1HandlerOptions<TSchema extends Record<string, unknown>> {
  /**
   * Drizzle schema object containing table definitions
   * @example
   * ```typescript
   * import * as schema from './schema.js';
   * const handler = createD1RequestHandler({ schema });
   * ```
   */
  schema: TSchema;

  /**
   * Optional query logging hook for debugging and monitoring
   * @param query - The SQL query being executed
   * @param params - The parameters passed to the query
   * @example
   * ```typescript
   * const handler = createD1RequestHandler({
   *   schema,
   *   onQuery: (query, params) => console.log('SQL:', query, params)
   * });
   * ```
   */
  onQuery?: (query: string, params: unknown[]) => void;

  /**
   * Optional error handler for database errors
   * @param error - The error that occurred
   * @example
   * ```typescript
   * const handler = createD1RequestHandler({
   *   schema,
   *   onError: (error) => console.error('DB Error:', error)
   * });
   * ```
   */
  onError?: (error: Error) => void;

  /**
   * Optional name of the D1 binding in env (defaults to 'DB')
   * @default 'DB'
   */
  bindingName?: string;
}

/**
 * Context that will be extended with the database instance
 */
export interface D1Context<TSchema extends Record<string, unknown>> {
  db: DrizzleD1Database<TSchema>;
}

/**
 * Environment bindings interface for D1
 */
export interface D1Bindings {
  [key: string]: D1Database | unknown;
}

/**
 * Type-safe Drizzle instance with schema
 */
export type TypedDrizzleD1<TSchema extends Record<string, unknown>> = DrizzleD1Database<TSchema>;

/**
 * Error thrown when D1 binding is not found in environment
 */
export class D1BindingError extends Error {
  constructor(bindingName: string) {
    super(
      `D1 binding '${bindingName}' not found in environment. ` +
        'Make sure your wrangler.toml includes:\n' +
        '[[d1_databases]]\n' +
        `binding = "${bindingName}"\n` +
        `database_name = "your-database"\n` +
        `database_id = "your-database-id"`,
    );
    this.name = 'D1BindingError';
  }
}

/**
 * Creates a per-request D1 handler that attaches a fresh Drizzle instance to the context.
 *
 * This function ensures that each request gets its own isolated database connection,
 * preventing any shared state between requests. It validates that the D1 binding exists
 * and provides helpful error messages if misconfigured.
 *
 * @template TSchema - The schema type containing your table definitions
 * @param options - Configuration options including schema and optional hooks
 * @returns An async function that attaches a fresh Drizzle instance to the provided context
 *
 * @example
 * ```typescript
 * import { createD1RequestHandler } from '@edge-manifest/core';
 * import * as schema from './schema.js';
 *
 * // Create the handler once
 * const d1Handler = createD1RequestHandler({
 *   schema,
 *   onQuery: (query, params) => console.log('SQL:', query, params),
 *   onError: (error) => console.error('DB Error:', error)
 * });
 *
 * // Use it per request
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const ctx = {};
 *     await d1Handler(ctx, env);
 *
 *     // Now ctx.db is available with full type safety
 *     const users = await ctx.db.query.users.findMany();
 *     return Response.json(users);
 *   }
 * };
 * ```
 *
 * @throws {D1BindingError} When the D1 binding is not found in the environment
 */
export function createD1RequestHandler<TSchema extends Record<string, unknown>>(
  options: D1HandlerOptions<TSchema>,
): <TContext extends object>(ctx: TContext, env: D1Bindings) => Promise<TContext & D1Context<TSchema>> {
  const { schema, onQuery, onError, bindingName = 'DB' } = options;

  return async <TContext extends object>(ctx: TContext, env: D1Bindings): Promise<TContext & D1Context<TSchema>> => {
    try {
      // Validate that the D1 binding exists
      const d1Binding = env[bindingName];
      if (!d1Binding) {
        throw new D1BindingError(bindingName);
      }

      // Type guard to ensure we have a D1Database
      if (typeof d1Binding !== 'object' || d1Binding === null || !('prepare' in d1Binding)) {
        throw new D1BindingError(bindingName);
      }

      const d1Database = d1Binding as D1Database;

      // Create a fresh Drizzle instance for this request
      const db = drizzle(d1Database, { schema }) as DrizzleD1Database<TSchema>;

      // Wrap the database instance with logging if provided
      if (onQuery) {
        // Create a proxy to intercept queries
        const handler: ProxyHandler<DrizzleD1Database<TSchema>> = {
          get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            // Log queries if it's a function that might execute SQL
            if (typeof value === 'function') {
              return function (this: unknown, ...args: unknown[]) {
                try {
                  onQuery(
                    `${String(prop)} called`,
                    args.filter((arg) => arg !== undefined),
                  );
                } catch (err) {
                  // Don't let logging errors break the app
                  if (onError) {
                    onError(err instanceof Error ? err : new Error(`Logging error: ${String(err)}`));
                  }
                }
                return value.apply(this, args);
              };
            }
            return value;
          },
        };

        const proxiedDb = new Proxy(db, handler);
        return Object.assign(ctx, { db: proxiedDb });
      }

      // Assign the database instance to the context
      return Object.assign(ctx, { db });
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(`Unknown error: ${String(error)}`));
      }
      throw error;
    }
  };
}

/**
 * Re-export Drizzle types for convenience
 */
export type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
export type { DrizzleD1Database } from 'drizzle-orm/d1';
