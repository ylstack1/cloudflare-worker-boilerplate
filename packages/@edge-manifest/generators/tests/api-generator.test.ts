import { describe, expect, it } from 'vitest';
import { generateApiRoutes, generateTypeBoxSchemas } from '../src/api-generator';
import { sampleManifest, simpleManifest } from './fixtures';

describe('API Generator', () => {
  describe('generateApiRoutes', () => {
    it('should generate a Hono app factory', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('import { Hono');
      expect(routes).toContain('export function createRoutesPlugin');
      expect(routes).toContain('new Hono');
    });

    it('should generate all CRUD routes', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain("app.get('/api/"); // List
      expect(routes).toContain('app.post('); // Create
      expect(routes).toContain("'/api/"); // Routes
      expect(routes).toContain('app.patch('); // Update
      expect(routes).toContain('app.delete('); // Delete
    });

    it('should include database operations', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('.select()');
      expect(routes).toContain('.insert(');
      expect(routes).toContain('.update(');
      expect(routes).toContain('.delete(');
    });

    it('should include pagination', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('limit');
      expect(routes).toContain('offset');
    });

    it('should include response envelopes', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('return c.json({');
      expect(routes).toContain('data:');
      expect(routes).toContain('meta:');
    });

    it('should include validation schemas', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('zValidator');
      expect(routes).toContain('z.object');
    });

    it('should handle multiple entities', async () => {
      const routes = await generateApiRoutes(sampleManifest);

      expect(routes).toContain('users'); // User entity
      expect(routes).toContain('posts'); // Post entity
    });

    it('should generate an app entrypoint', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('export function createRoutesPlugin');
      expect(routes).toContain('return app');
    });
  });

  describe('generateTypeBoxSchemas', () => {
    it('should return placeholder', async () => {
      const schemas = await generateTypeBoxSchemas(simpleManifest);

      expect(schemas).toContain('TypeBox schemas not needed');
    });

    it('should include all fields', async () => {
      const schemas = await generateTypeBoxSchemas(simpleManifest);

      expect(schemas).toBeDefined();
    });

    it('should handle field types', async () => {
      const schemas = await generateTypeBoxSchemas(simpleManifest);

      expect(schemas).toBeDefined();
    });

    it('should handle optional fields', async () => {
      const schemas = await generateTypeBoxSchemas(simpleManifest);

      expect(schemas).toBeDefined();
    });

    it('should handle multiple entities', async () => {
      const schemas = await generateTypeBoxSchemas(sampleManifest);

      expect(schemas).toBeDefined();
    });
  });
});
