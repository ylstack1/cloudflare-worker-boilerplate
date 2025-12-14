import { cors } from '@elysiajs/cors';
import openapi from '@elysiajs/openapi';
import { drizzle } from 'drizzle-orm/d1';
import { Elysia } from 'elysia';
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker';

import { adminAssets } from '../../../../.output/admin-assets';
import { appConfig, manifest } from '../../../../.output/config';
import { createRoutesPlugin } from '../../../../.output/routes';
import * as schema from '../../../../.output/schema';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET?: string;
  KV_SESSION_TTL?: string;
};

function applySecurityHeaders(headers: Record<string, string>): void {
  headers['x-content-type-options'] = 'nosniff';
  headers['x-frame-options'] = 'DENY';
  headers['referrer-policy'] = 'no-referrer';
  headers['permissions-policy'] = 'interest-cohort=()';
}

function resolveAdminAsset(pathname: string): { contentType: string; body: string } | undefined {
  if (pathname === '/admin' || pathname === '/admin/') {
    return adminAssets['/admin/index.html'];
  }

  if (pathname.startsWith('/admin/')) {
    return adminAssets[pathname as keyof typeof adminAssets];
  }

  return undefined;
}

function createApp(env: Bindings) {
  return new Elysia({ adapter: CloudflareAdapter, aot: false })
    .decorate('env', env)
    .decorate('db', undefined as unknown)
    .decorate('requestId', '')
    .use(
      cors({
        origin: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['content-type', 'authorization', 'x-request-id'],
        exposeHeaders: ['x-request-id'],
      }),
    )
    .onRequest((ctx: any) => {
      ctx.requestId = crypto.randomUUID();
      ctx.set.headers['x-request-id'] = ctx.requestId;

      ctx.db = drizzle(env.DB, { schema });
    })
    .onAfterHandle((ctx: any) => {
      applySecurityHeaders(ctx.set.headers);
    })
    .use(createRoutesPlugin(manifest, schema))
    .get('/admin', ({ request, set }: any) => {
      const url = new URL(request.url);
      const asset = resolveAdminAsset(url.pathname);

      if (!asset) {
        set.status = 404;
        return 'Not found';
      }

      set.headers['content-type'] = asset.contentType;
      return asset.body;
    })
    .get('/admin/*', ({ request, set }: any) => {
      const url = new URL(request.url);
      const asset = resolveAdminAsset(url.pathname);

      if (!asset) {
        set.status = 404;
        return 'Not found';
      }

      set.headers['content-type'] = asset.contentType;
      return asset.body;
    })
    .use(
      openapi({
        path: '/docs',
        provider: 'scalar',
        specPath: '/openapi.json',
        documentation: {
          info: {
            title: appConfig.openapi.title,
            version: appConfig.openapi.version,
          },
        },
        exclude: {
          paths: [/^\/admin/],
        },
      }),
    );
}

let cachedApp: ReturnType<typeof createApp> | undefined;
let cachedEnv: Bindings | undefined;

export default {
  async fetch(request: Request, env: Bindings): Promise<Response> {
    if (!cachedApp || cachedEnv !== env) {
      cachedEnv = env;
      cachedApp = createApp(env);
    }

    return cachedApp.handle(request);
  },
};
