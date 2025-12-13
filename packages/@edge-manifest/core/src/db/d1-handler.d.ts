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
 * import * as schema from './schema';
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
/**
 * Configuration options for the D1 request handler
 */
export interface D1HandlerOptions<TSchema extends Record<string, unknown>> {
  /**
   * Drizzle schema object containing table definitions
   * @example
   * ```typescript
   * import * as schema from './schema';
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
export declare class D1BindingError extends Error {
  constructor(bindingName: string);
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
 * import * as schema from './schema';
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
export declare function createD1RequestHandler<TSchema extends Record<string, unknown>>(
  options: D1HandlerOptions<TSchema>,
): <TContext extends object>(ctx: TContext, env: D1Bindings) => Promise<TContext & D1Context<TSchema>>;
/**
 * Re-export Drizzle types for convenience
 */
export type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
export type { DrizzleD1Database } from 'drizzle-orm/d1';
//# sourceMappingURL=d1-handler.d.ts.map
