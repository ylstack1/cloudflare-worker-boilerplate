import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');
const outputDir = path.join(repoRoot, '.output');

async function write(pathname: string, content: string): Promise<void> {
  const absPath = path.join(outputDir, pathname);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, content, 'utf-8');
}

async function ensureOutputStubs(): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  await write(
    'config.ts',
    `export const manifest = { id: 'test', name: 'Test', version: '0.0.0', entities: [] } as const;\n\nexport const appConfig = {\n  id: manifest.id,\n  name: manifest.name,\n  version: manifest.version,\n  openapi: { title: manifest.name, version: manifest.version },\n  entities: [],\n} as const;\n`,
  );

  await write('schema.ts', 'export const __schema = {};\nexport type Schema = typeof __schema;\n');

  await write(
    'routes.ts',
    `import { Elysia } from 'elysia';\nimport type { EdgeManifest } from '@edge-manifest/core';\n\nexport function createRoutesPlugin(_manifest: EdgeManifest, _schema: unknown) {\n  return new Elysia({ name: 'test.routes', aot: false }).get('/api/health', () => ({ ok: true }));\n}\n`,
  );

  await write(
    'admin-assets.ts',
    `export const adminAssets = {\n  '/admin/index.html': { contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body>admin</body></html>' },\n  '/admin/admin.js': { contentType: 'text/javascript; charset=utf-8', body: '/* admin */' },\n  '/admin/styles.css': { contentType: 'text/css; charset=utf-8', body: 'body{}' },\n} as const;\n`,
  );
}

type WorkerEnv = {
  DB: D1Database;
  KV: KVNamespace;
};

function createMockEnv(): WorkerEnv {
  const db = {
    prepare() {
      return {
        all: async () => ({ results: [] }),
        run: async () => ({ success: true }),
        first: async () => null,
      };
    },
  } as unknown as D1Database;

  const kv = {
    get: async () => null,
    put: async () => {},
    delete: async () => {},
    list: async () => ({ keys: [], list_complete: true, cursor: '' }),
  } as unknown as KVNamespace;

  return { DB: db, KV: kv };
}

beforeAll(async () => {
  await ensureOutputStubs();
});

describe('@edge-manifest/starter worker', () => {
  it('GET /api/health -> 200', async () => {
    const workerMod = await import('../src/index');
    const worker = workerMod.default as { fetch(request: Request, env: WorkerEnv): Promise<Response> };

    const res = await worker.fetch(new Request('http://localhost/api/health'), createMockEnv());
    expect(res.status).toBe(200);

    const json = (await res.json()) as unknown;
    expect(json).toEqual({ ok: true });
  });

  it('GET /admin -> 200 and serves HTML', async () => {
    const workerMod = await import('../src/index');
    const worker = workerMod.default as { fetch(request: Request, env: WorkerEnv): Promise<Response> };

    const res = await worker.fetch(new Request('http://localhost/admin'), createMockEnv());
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain('<!doctype html>');
  });
});
