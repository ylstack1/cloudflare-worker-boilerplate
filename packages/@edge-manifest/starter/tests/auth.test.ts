import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');
const outputDir = path.join(repoRoot, '.output');

async function ensureOutputStubs(): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, 'config.ts'),
    `export const manifest = { id: 'test', name: 'Test', version: '0.0.0', entities: [] } as const;\n\nexport const appConfig = {\n  id: manifest.id,\n  name: manifest.name,\n  version: manifest.version,\n  openapi: { title: manifest.name, version: manifest.version },\n  entities: [],\n} as const;\n`,
    'utf-8',
  );

  await writeFile(path.join(outputDir, 'schema.ts'), 'export const __schema = {};\n', 'utf-8');

  await writeFile(
    path.join(outputDir, 'routes.ts'),
    `import { Elysia } from 'elysia';\nimport type { EdgeManifest } from '@edge-manifest/core';\n\nexport function createRoutesPlugin(_manifest: EdgeManifest, _schema: unknown) {\n  return new Elysia({ name: 'test.routes', aot: false }).get('/api/health', () => ({ ok: true }));\n}\n`,
    'utf-8',
  );

  await writeFile(
    path.join(outputDir, 'admin-assets.ts'),
    `export const adminAssets = {\n  '/admin/index.html': { contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body>admin</body></html>' },\n} as const;\n`,
    'utf-8',
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

describe('@edge-manifest/starter docs', () => {
  it('GET /docs returns 200', async () => {
    const workerMod = await import('../src/index');
    const worker = workerMod.default as { fetch(request: Request, env: WorkerEnv): Promise<Response> };

    const res = await worker.fetch(new Request('http://localhost/docs'), createMockEnv());
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });
});
