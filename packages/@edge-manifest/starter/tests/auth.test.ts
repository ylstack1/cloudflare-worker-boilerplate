import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { issueJWT, refreshJWT, verifyJWT } from '../src/auth';
import type { Bindings } from '../src/types';

describe('JWT Authentication', () => {
  const testSecret = 'test-secret-key-for-jwt';

  describe('issueJWT', () => {
    it('should create a valid JWT token', async () => {
      const payload = { userId: 'test@example.com', role: 'user' };
      const token = await issueJWT(payload, testSecret);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should create different tokens for different payloads', async () => {
      const token1 = await issueJWT({ userId: 'user1@example.com' }, testSecret);
      const token2 = await issueJWT({ userId: 'user2@example.com' }, testSecret);

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyJWT', () => {
    it('should verify a valid token and return payload', async () => {
      const payload = { userId: 'test@example.com', role: 'admin' };
      const token = await issueJWT(payload, testSecret);

      const verified = await verifyJWT(token, testSecret);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe('test@example.com');
      expect(verified?.role).toBe('admin');
    });

    it('should return null for invalid token', async () => {
      const result = await verifyJWT('invalid.token.here', testSecret);
      expect(result).toBeNull();
    });

    it('should return null for token with wrong secret', async () => {
      const payload = { userId: 'test@example.com' };
      const token = await issueJWT(payload, testSecret);

      const result = await verifyJWT(token, 'wrong-secret');
      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const result = await verifyJWT('not-a-jwt', testSecret);
      expect(result).toBeNull();
    });
  });

  describe('refreshJWT', () => {
    it('should refresh a valid token', async () => {
      const payload = { userId: 'test@example.com' };
      const oldToken = await issueJWT(payload, testSecret);

      const newToken = await refreshJWT(oldToken, testSecret);

      expect(newToken).toBeDefined();
      expect(typeof newToken).toBe('string');
      expect(newToken).not.toBe(oldToken);
    });

    it('should return null for invalid token', async () => {
      const result = await refreshJWT('invalid.token.here', testSecret);
      expect(result).toBeNull();
    });

    it('should preserve payload data in refreshed token', async () => {
      const payload = { userId: 'test@example.com', role: 'admin' };
      const oldToken = await issueJWT(payload, testSecret);

      const newToken = await refreshJWT(oldToken, testSecret);
      expect(newToken).toBeDefined();
      const verified = await verifyJWT(newToken as string, testSecret);

      expect(verified?.userId).toBe('test@example.com');
      expect(verified?.role).toBe('admin');
    });
  });
});

describe('Auth Endpoints', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let env: Bindings;

  beforeEach(async () => {
    env = {
      JWT_SECRET: 'test-secret-key',
    };
    app = await createApp(env);
  });

  describe('POST /auth/login', () => {
    it('should return a token for valid credentials', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        }),
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.ok).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.expiresIn).toBe(3600);
    });

    it('should accept any email/password combination (placeholder auth)', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'any@example.com',
            password: 'any-password',
          }),
        }),
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.ok).toBe(true);
      expect(data.token).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'not-an-email',
            password: 'password123',
          }),
        }),
      );

      expect(response.status).toBe(400);
      const data = (await response.json()) as any;
      expect(data.ok).toBe(false);
    });

    it('should return 400 for missing fields', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
          }),
        }),
      );

      expect(response.status).toBe(400);
      const data = (await response.json()) as any;
      expect(data.ok).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh a valid token', async () => {
      // First, get a token
      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        }),
      );

      const loginData = (await loginResponse.json()) as any;
      const oldToken = loginData.token;

      // Now refresh it
      const refreshResponse = await app.handle(
        new Request('http://localhost/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: oldToken,
          }),
        }),
      );

      expect(refreshResponse.status).toBe(200);
      const refreshData = (await refreshResponse.json()) as any;
      expect(refreshData.ok).toBe(true);
      expect(refreshData.token).toBeDefined();
      expect(refreshData.token).not.toBe(oldToken);
    });

    it('should return 401 for invalid token', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'invalid.token.here',
          }),
        }),
      );

      expect(response.status).toBe(401);
      const data = (await response.json()) as any;
      expect(data.ok).toBe(false);
      expect(data.error?.code).toBe('INVALID_TOKEN');
    });

    it('should return 400 for missing token', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      );

      expect(response.status).toBe(400);
      const data = (await response.json()) as any;
      expect(data.ok).toBe(false);
    });
  });
});

describe('Auth Middleware and Protected Routes', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let env: Bindings;
  let validToken: string;

  beforeEach(async () => {
    env = {
      JWT_SECRET: 'test-secret-key',
    };
    app = await createApp(env);

    // Get a valid token
    const loginResponse = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      }),
    );

    const loginData = (await loginResponse.json()) as any;
    validToken = loginData.token;
  });

  describe('Protected CRUD Routes', () => {
    it('should return 401 for GET /api/health without token', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/health', {
          method: 'GET',
        }),
      );

      // /api/health endpoint should be protected
      expect(response.status).toBe(401);
    });

    it('should allow access with valid token', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/health', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      // With valid token, should get either 200 or 503 (depending on DB availability)
      expect([200, 503]).toContain(response.status);
    });

    it('should return 401 for invalid token', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/health', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer invalid.token.here',
          },
        }),
      );

      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed Authorization header', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/health', {
          method: 'GET',
          headers: {
            Authorization: 'InvalidFormat',
          },
        }),
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Public Routes', () => {
    it('should allow /health without token', async () => {
      const response = await app.handle(
        new Request('http://localhost/health', {
          method: 'GET',
        }),
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.ok).toBe(true);
    });

    it('should allow /ready without token', async () => {
      const response = await app.handle(
        new Request('http://localhost/ready', {
          method: 'GET',
        }),
      );

      // May return 200 or 503 depending on DB availability
      expect([200, 503]).toContain(response.status);
    });
  });
});
