import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

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

type Variables = {
  requestId: string;
  db: ReturnType<typeof drizzle>;
};

function applySecurityHeaders(headers: Headers): void {
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('permissions-policy', 'interest-cohort=()');
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

function createApp() {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  // CORS middleware
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['content-type', 'authorization', 'x-request-id'],
      exposeHeaders: ['x-request-id'],
    }),
  );

  // Request ID and DB middleware
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    c.set('db', drizzle(c.env.DB, { schema }));
    await next();
  });

  // Security headers middleware
  app.use('*', async (c, next) => {
    await next();
    applySecurityHeaders(c.res.headers);
    c.res.headers.set('x-request-id', c.get('requestId'));
  });

  // Register generated routes
  const routesApp = createRoutesPlugin(manifest, schema);
  app.route('/', routesApp);

  // Admin UI routes
  app.get('/admin', (c) => {
    const url = new URL(c.req.url);
    const asset = resolveAdminAsset(url.pathname);

    if (!asset) {
      return c.text('Not found', 404);
    }

    return c.body(asset.body, 200, {
      'content-type': asset.contentType,
    });
  });

  app.get('/admin/*', (c) => {
    const url = new URL(c.req.url);
    const asset = resolveAdminAsset(url.pathname);

    if (!asset) {
      return c.text('Not found', 404);
    }

    return c.body(asset.body, 200, {
      'content-type': asset.contentType,
    });
  });

  // OpenAPI documentation
  app.get('/docs', (c) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${appConfig.openapi.title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script 
    id="api-reference" 
    data-url="/openapi.json"
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;
    return c.html(html);
  });

  app.get('/openapi.json', (c) => {
    const openapi = {
      openapi: '3.0.0',
      info: {
        title: appConfig.openapi.title,
        version: appConfig.openapi.version,
      },
      paths: {},
    };
    return c.json(openapi);
  });

  return app;
}

let cachedApp: ReturnType<typeof createApp> | undefined;

export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    if (!cachedApp) {
      cachedApp = createApp();
    }

    return cachedApp.fetch(request, env, ctx);
  },
};
