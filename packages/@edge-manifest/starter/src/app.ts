import {
  ConfigParser,
  type ConfigParserResult,
  createD1RequestHandler,
  type D1Bindings,
  type TypedDrizzleD1,
} from '@edge-manifest/core';
import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker';
import type { Bindings } from './types';

type EmptySchema = Record<string, never>;

const emptySchema = {} as EmptySchema;

type Db = TypedDrizzleD1<EmptySchema>;

function createRequestId(): string {
  return crypto.randomUUID();
}

function defaultManifest(): ConfigParserResult {
  return new ConfigParser().loadFromObject({
    id: 'edge-manifest',
    name: 'EDGE-MANIFEST Worker',
    version: '0.0.0',
    entities: [
      {
        name: 'Health',
        fields: [{ name: 'id', kind: 'id' }],
      },
    ],
  });
}

function loadManifestFromEnv(env: Bindings): {
  manifest: ConfigParserResult;
  error?: Error;
} {
  const source = env.EDGE_MANIFEST ?? env.MANIFEST;

  if (!source) {
    return { manifest: defaultManifest() };
  }

  try {
    const manifestLike = typeof source === 'string' ? JSON.parse(source) : source;
    const parser = new ConfigParser();
    return { manifest: parser.loadFromObject(manifestLike, { sourcePath: 'env' }) };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return { manifest: defaultManifest(), error: err };
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function createApp(env: Bindings) {
  const { manifest, error: manifestError } = loadManifestFromEnv(env);

  const d1Handler = createD1RequestHandler({ schema: emptySchema });

  return new Elysia({ adapter: CloudflareAdapter })
    .decorate('env', env)
    .decorate('manifest', manifest)
    .decorate('manifestError', manifestError)
    .decorate('requestId', '')
    .decorate('requestStartMs', 0)
    .decorate('db', undefined as Db | undefined)
    .decorate('dbError', undefined as Error | undefined)
    .use(
      cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['content-type', 'authorization', 'x-request-id'],
        exposedHeaders: ['x-request-id'],
      }),
    )
    .onRequest(async (ctx) => {
      ctx.requestId = createRequestId();
      ctx.requestStartMs = Date.now();
      ctx.set.headers['x-request-id'] = ctx.requestId;

      try {
        const result = await d1Handler({}, ctx.env as D1Bindings);
        ctx.db = result.db as Db;
        ctx.dbError = undefined;
      } catch (error) {
        ctx.db = undefined;
        ctx.dbError = error instanceof Error ? error : new Error(String(error));
      }

      console.info(
        JSON.stringify({
          level: 'info',
          msg: 'request.start',
          requestId: ctx.requestId,
          method: ctx.request.method,
          url: ctx.request.url,
        }),
      );
    })
    .onAfterHandle((ctx, response) => {
      const durationMs = Date.now() - ctx.requestStartMs;

      console.info(
        JSON.stringify({
          level: 'info',
          msg: 'request.end',
          requestId: ctx.requestId,
          method: ctx.request.method,
          url: ctx.request.url,
          status: response instanceof Response ? response.status : ctx.set.status,
          durationMs,
        }),
      );

      return response;
    })
    .onError((ctx) => {
      if (!ctx.requestId) {
        ctx.requestId = createRequestId();
        ctx.set.headers['x-request-id'] = ctx.requestId;
      }

      if (!ctx.requestStartMs) {
        ctx.requestStartMs = Date.now();
      }

      const durationMs = Date.now() - ctx.requestStartMs;

      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'request.error',
          requestId: ctx.requestId,
          method: ctx.request.method,
          url: ctx.request.url,
          code: ctx.code,
          status: ctx.set.status,
          durationMs,
          error: toErrorMessage(ctx.error),
        }),
      );

      ctx.set.headers['content-type'] = 'application/json';
      ctx.set.headers['x-request-id'] = ctx.requestId;

      return {
        ok: false,
        requestId: ctx.requestId,
        error: {
          code: String(ctx.code ?? 'ERROR'),
          message: toErrorMessage(ctx.error),
        },
      };
    })
    .get('/health', ({ requestId, manifestError }) => ({
      ok: true,
      requestId,
      manifestLoaded: !manifestError,
    }))
    .get('/ready', async ({ env, dbError, requestId, set }) => {
      if (!env.DB) {
        set.status = 503;
        return {
          ok: false,
          requestId,
          ready: false,
          reason: 'D1 binding (DB) is missing',
        };
      }

      if (dbError) {
        set.status = 503;
        return {
          ok: false,
          requestId,
          ready: false,
          reason: dbError.message,
        };
      }

      try {
        const row = await env.DB.prepare('SELECT 1 as ok').first<{ ok: number }>();

        if (!row || row.ok !== 1) {
          set.status = 503;
          return {
            ok: false,
            requestId,
            ready: false,
            reason: 'Unexpected D1 response',
          };
        }

        return {
          ok: true,
          requestId,
          ready: true,
        };
      } catch (error) {
        set.status = 503;
        return {
          ok: false,
          requestId,
          ready: false,
          reason: toErrorMessage(error),
        };
      }
    })
    .compile();
}
