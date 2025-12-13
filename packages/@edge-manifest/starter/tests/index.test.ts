/* biome-ignore lint/suspicious/noExplicitAny: Test file */
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { Bindings } from '../src/types';

declare global {
  // eslint-disable-next-line no-var
  var __edgeManifestMockDb: Record<string, Array<Record<string, unknown>>> | undefined;
}

function request(path: string, method = 'GET', body?: unknown): Request {
  const options: RequestInit = {
    method,
  };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers = {
      'content-type': 'application/json',
    };
  }
  return new Request(`http://localhost${path}`, options);
}

function setupMockDb(): void {
  globalThis.__edgeManifestMockDb = {
    user: [],
    post: [],
    item: [],
    product: [],
  };
}

function _clearMockDb(): void {
  globalThis.__edgeManifestMockDb = undefined;
}

class MockD1Database {
  prepare(_query: string): { first(): Promise<{ ok: number }>; all(): Promise<[]> } {
    return {
      first: async () => ({ ok: 1 }),
      all: async () => [],
    };
  }

  insertTestRow(tableName: string, data: Record<string, unknown>): Record<string, unknown> {
    if (!globalThis.__edgeManifestMockDb) {
      setupMockDb();
    }
    const mutableData = data;
    if (!mutableData.id) {
      mutableData.id = `${tableName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    globalThis.__edgeManifestMockDb[tableName].push({ ...mutableData });
    return mutableData;
  }
}

describe('EDGE-MANIFEST Worker', () => {
  beforeEach(() => {
    if (!globalThis.__edgeManifestMockDb) {
      setupMockDb();
    }
  });

  describe('Health and Readiness', () => {
    it('GET /health returns 200 and a request id', async () => {
      const app = await createApp({} as Bindings);

      const res = await app.handle(request('/health'));
      expect(res.status).toBe(200);

      const body = await res.json<any>();
      expect(body).toMatchObject({ ok: true });

      const requestId = res.headers.get('x-request-id');
      expect(requestId).toBeTypeOf('string');
      expect(requestId?.length).toBeGreaterThan(0);
    });

    it('GET /ready returns 503 when D1 binding is missing', async () => {
      const app = await createApp({} as Bindings);

      const res = await app.handle(request('/ready'));
      expect(res.status).toBe(503);

      const body = await res.json<any>();
      expect(body).toMatchObject({ ok: false, ready: false });
    });

    it('GET /ready returns 200 when D1 is reachable', async () => {
      const mockDb = new MockD1Database();
      const env = {
        DB: mockDb as unknown as D1Database,
      } satisfies Bindings;

      const app = await createApp(env);

      const res = await app.handle(request('/ready'));
      expect(res.status).toBe(200);

      const body = await res.json<any>();
      expect(body).toMatchObject({ ok: true, ready: true });
    });

    it('app stays healthy when manifest JSON is invalid', async () => {
      const app = await createApp({ EDGE_MANIFEST: '{' } as unknown as Bindings);

      const res = await app.handle(request('/health'));
      expect(res.status).toBe(200);

      const body = await res.json<any>();
      expect(body).toMatchObject({ ok: true, manifestLoaded: false });
    });
  });

  describe('CRUD Routes with User and Post Entities', () => {
    let mockDb: MockD1Database;
    let bindings: Bindings;
    let app: any;

    beforeEach(async () => {
      // Reset mock database for this suite
      setupMockDb();
      mockDb = new MockD1Database();
      bindings = {
        DB: mockDb as unknown as D1Database,
        EDGE_MANIFEST: {
          id: 'test-manifest',
          name: 'Test App',
          version: '1.0.0',
          entities: [
            {
              name: 'User',
              fields: [
                { name: 'id', kind: 'id' },
                { name: 'name', kind: 'string', required: true },
                { name: 'email', kind: 'string', required: true, unique: true },
                { name: 'age', kind: 'number' },
              ],
            },
            {
              name: 'Post',
              fields: [
                { name: 'id', kind: 'id' },
                { name: 'title', kind: 'string', required: true },
                { name: 'content', kind: 'string' },
                { name: 'published', kind: 'boolean' },
              ],
            },
          ],
        },
      } as unknown as Bindings;
      app = await createApp(bindings);
    });

    describe('User CRUD', () => {
      it('POST /api/user creates a new user', async () => {
        const userData = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        };

        const res = await app.handle(request('/api/user', 'POST', userData));
        expect(res.status).toBe(201);

        const body = await res.json<any>();
        expect(body).toHaveProperty('data');
        expect(body.data).toMatchObject({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        });
        expect(body.data).toHaveProperty('id');
      });

      it('GET /api/user lists users with pagination', async () => {
        mockDb.insertTestRow('user', {
          id: 'user_1',
          name: 'Alice',
          email: 'alice@example.com',
          age: 25,
        });
        mockDb.insertTestRow('user', {
          id: 'user_2',
          name: 'Bob',
          email: 'bob@example.com',
          age: 30,
        });

        const res = await app.handle(request('/api/user?limit=10&offset=0'));
        expect(res.status).toBe(200);

        const body = await res.json<any>();
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('meta');
        expect(body.meta).toHaveProperty('limit');
        expect(body.meta).toHaveProperty('offset');
        expect(body.meta).toHaveProperty('total');
        expect(body.meta).toHaveProperty('hasMore');
      });

      it('GET /api/user/:id retrieves a specific user', async () => {
        const userId = 'user_test_123';
        mockDb.insertTestRow('user', {
          id: userId,
          name: 'Charlie',
          email: 'charlie@example.com',
          age: 28,
        });

        const res = await app.handle(request(`/api/user/${userId}`));
        expect(res.status).toBe(200);

        const body = await res.json<any>();
        expect(body).toHaveProperty('data');
        expect(body.data).toMatchObject({
          id: userId,
          name: 'Charlie',
          email: 'charlie@example.com',
          age: 28,
        });
      });

      it('GET /api/user/:id returns 404 for non-existent user', async () => {
        const res = await app.handle(request('/api/user/non_existent'));
        expect(res.status).toBe(404);

        const body = await res.json<any>();
        expect(body).toHaveProperty('error');
        expect(body.error.code).toBe('NOT_FOUND');
      });

      it('PUT /api/user/:id updates a user', async () => {
        const userId = 'user_update_123';
        mockDb.insertTestRow('user', {
          id: userId,
          name: 'David',
          email: 'david@example.com',
          age: 35,
        });

        const updateData = {
          name: 'David Updated',
          age: 36,
        };

        const res = await app.handle(request(`/api/user/${userId}`, 'PUT', updateData));
        expect(res.status).toBe(200);

        const body = await res.json<any>();
        expect(body).toHaveProperty('data');
        expect(body.data).toMatchObject({
          id: userId,
          name: 'David Updated',
          age: 36,
          email: 'david@example.com',
        });
      });

      it('PATCH /api/user/:id partially updates a user', async () => {
        const userId = 'user_patch_123';
        mockDb.insertTestRow('user', {
          id: userId,
          name: 'Eve',
          email: 'eve@example.com',
          age: 29,
        });

        const patchData = {
          age: 30,
        };

        const res = await app.handle(request(`/api/user/${userId}`, 'PATCH', patchData));
        expect(res.status).toBe(200);

        const body = await res.json<any>();
        expect(body).toHaveProperty('data');
        expect(body.data.age).toBe(30);
        expect(body.data.name).toBe('Eve');
      });

      it('PUT /api/user/:id returns 404 for non-existent user', async () => {
        const res = await app.handle(request('/api/user/non_existent', 'PUT', { name: 'Test' }));
        expect(res.status).toBe(404);

        const body = await res.json<any>();
        expect(body).toHaveProperty('error');
        expect(body.error.code).toBe('NOT_FOUND');
      });

      it('DELETE /api/user/:id deletes a user', async () => {
        const userId = 'user_delete_123';
        mockDb.insertTestRow('user', {
          id: userId,
          name: 'Frank',
          email: 'frank@example.com',
          age: 40,
        });

        const res = await app.handle(request(`/api/user/${userId}`, 'DELETE'));
        expect(res.status).toBe(200);

        const body = await res.json<any>();
        expect(body).toHaveProperty('data');
        expect(body.data.id).toBe(userId);
      });

      it('DELETE /api/user/:id returns 404 for non-existent user', async () => {
        const res = await app.handle(request('/api/user/non_existent', 'DELETE'));
        expect(res.status).toBe(404);

        const body = await res.json<any>();
        expect(body).toHaveProperty('error');
        expect(body.error.code).toBe('NOT_FOUND');
      });
    });

    describe('Post CRUD', () => {
      it('POST /api/post creates a new post', async () => {
        const postData = {
          title: 'First Post',
          content: 'This is the first post',
          published: true,
        };

        const res = await app.handle(request('/api/post', 'POST', postData));
        expect(res.status).toBe(201);

        const body = await res.json<any>();
        expect(body).toHaveProperty('data');
        expect(body.data).toMatchObject({
          title: 'First Post',
          content: 'This is the first post',
          published: true,
        });
        expect(body.data).toHaveProperty('id');
      });

      it('GET /api/post lists posts', async () => {
        mockDb.insertTestRow('post', {
          id: 'post_1',
          title: 'Post 1',
          content: 'Content 1',
          published: true,
        });
        mockDb.insertTestRow('post', {
          id: 'post_2',
          title: 'Post 2',
          content: 'Content 2',
          published: false,
        });

        const res = await app.handle(request('/api/post'));
        expect(res.status).toBe(200);

        const body = await res.json<any>();
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('meta');
      });

      it('GET /api/post/:id retrieves a specific post', async () => {
        const postId = 'post_test_456';
        mockDb.insertTestRow('post', {
          id: postId,
          title: 'Test Post',
          content: 'Test Content',
          published: true,
        });

        const res = await app.handle(request(`/api/post/${postId}`));
        expect(res.status).toBe(200);

        const body = await res.json<any>();
        expect(body).toHaveProperty('data');
        expect(body.data.id).toBe(postId);
        expect(body.data.title).toBe('Test Post');
      });

      it('PUT /api/post/:id updates a post', async () => {
        const postId = 'post_update_456';
        mockDb.insertTestRow('post', {
          id: postId,
          title: 'Original Title',
          content: 'Original Content',
          published: false,
        });

        const updateData = {
          title: 'Updated Title',
          published: true,
        };

        const res = await app.handle(request(`/api/post/${postId}`, 'PUT', updateData));
        expect(res.status).toBe(200);

        const body = await res.json<any>();
        expect(body.data.title).toBe('Updated Title');
        expect(body.data.published).toBe(true);
      });

      it('DELETE /api/post/:id deletes a post', async () => {
        const postId = 'post_delete_456';
        mockDb.insertTestRow('post', {
          id: postId,
          title: 'To Delete',
          content: 'Delete me',
          published: false,
        });

        const res = await app.handle(request(`/api/post/${postId}`, 'DELETE'));
        expect(res.status).toBe(200);

        const body = await res.json<any>();
        expect(body.data.id).toBe(postId);
      });
    });
  });

  describe('Response Envelope Format', () => {
    let mockDb: MockD1Database;
    let bindings: Bindings;
    let app: any;

    beforeEach(async () => {
      // Reset mock database for this suite
      setupMockDb();
      mockDb = new MockD1Database();
      bindings = {
        DB: mockDb as unknown as D1Database,
        EDGE_MANIFEST: {
          id: 'test-manifest',
          name: 'Test App',
          version: '1.0.0',
          entities: [
            {
              name: 'Item',
              fields: [
                { name: 'id', kind: 'id' },
                { name: 'name', kind: 'string', required: true },
              ],
            },
          ],
        },
      } as unknown as Bindings;
      app = await createApp(bindings);
    });

    it('Success response has data and optional meta', async () => {
      const res = await app.handle(request('/api/item', 'POST', { name: 'Test Item' }));
      const body = await res.json<any>();

      expect(body).toHaveProperty('data');
      expect(body).not.toHaveProperty('error');
    });

    it('List response includes pagination metadata', async () => {
      mockDb.insertTestRow('item', {
        id: 'item_1',
        name: 'Item 1',
      });

      const res = await app.handle(request('/api/item?limit=10&offset=0'));
      const body = await res.json<any>();

      expect(body).toHaveProperty('meta');
      expect(body.meta).toHaveProperty('limit');
      expect(body.meta).toHaveProperty('offset');
      expect(body.meta).toHaveProperty('total');
      expect(body.meta).toHaveProperty('hasMore');
    });

    it('Error response has error with code and message', async () => {
      const res = await app.handle(request('/api/item/non_existent'));
      const body = await res.json<any>();

      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body).not.toHaveProperty('data');
    });
  });

  describe('Validation', () => {
    let mockDb: MockD1Database;
    let bindings: Bindings;
    let app: any;

    beforeEach(async () => {
      // Reset mock database for this suite
      setupMockDb();
      mockDb = new MockD1Database();
      bindings = {
        DB: mockDb as unknown as D1Database,
        EDGE_MANIFEST: {
          id: 'test-manifest',
          name: 'Test App',
          version: '1.0.0',
          entities: [
            {
              name: 'Product',
              fields: [
                { name: 'id', kind: 'id' },
                { name: 'name', kind: 'string', required: true },
                { name: 'price', kind: 'number', required: true },
              ],
            },
          ],
        },
      } as unknown as Bindings;
      app = await createApp(bindings);
    });

    it('POST with missing required fields returns 400', async () => {
      const incompleteData = {
        name: 'Product',
        // missing price
      };

      const res = await app.handle(request('/api/product', 'POST', incompleteData));
      expect(res.status).toBe(400);

      const body = await res.json<any>();
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST with valid data succeeds', async () => {
      const completeData = {
        name: 'Product',
        price: 99.99,
      };

      const res = await app.handle(request('/api/product', 'POST', completeData));
      expect(res.status).toBe(201);

      const body = await res.json<any>();
      expect(body).toHaveProperty('data');
      expect(body.data).toMatchObject({
        name: 'Product',
        price: 99.99,
      });
    });
  });
});
