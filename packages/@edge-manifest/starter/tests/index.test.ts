import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { Bindings } from '../src/types';

function request(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe('EDGE-MANIFEST Worker', () => {
  it('GET /health returns 200 and a request id', async () => {
    const app = createApp({} as Bindings);

    const res = await app.handle(request('/health'));
    expect(res.status).toBe(200);

    const body = await res.json<unknown>();
    expect(body).toMatchObject({ ok: true });

    const requestId = res.headers.get('x-request-id');
    expect(requestId).toBeTypeOf('string');
    expect(requestId?.length).toBeGreaterThan(0);
  });

  it('GET /ready returns 503 when D1 binding is missing', async () => {
    const app = createApp({} as Bindings);

    const res = await app.handle(request('/ready'));
    expect(res.status).toBe(503);

    const body = await res.json<unknown>();
    expect(body).toMatchObject({ ok: false, ready: false });
  });

  it('GET /ready returns 200 when D1 is reachable', async () => {
    const env = {
      DB: {
        prepare(query: string) {
          if (!query.toLowerCase().includes('select 1')) {
            throw new Error(`Unexpected query: ${query}`);
          }

          return {
            async first<T>() {
              return { ok: 1 } as T;
            },
          };
        },
      } as unknown as D1Database,
    } satisfies Bindings;

    const app = createApp(env);

    const res = await app.handle(request('/ready'));
    expect(res.status).toBe(200);

    const body = await res.json<unknown>();
    expect(body).toMatchObject({ ok: true, ready: true });
  });

  it('app stays healthy when manifest JSON is invalid', async () => {
    const app = createApp({ EDGE_MANIFEST: '{' } as unknown as Bindings);

    const res = await app.handle(request('/health'));
    expect(res.status).toBe(200);

    const body = await res.json<unknown>();
    expect(body).toMatchObject({ ok: true, manifestLoaded: false });
  });
});
