import { describe, expect, it } from 'vitest';
import { generateApiRoutes, generateTypeBoxSchemas } from '../src/api-generator';
import { sampleManifest, simpleManifest } from './fixtures';

describe('API Generator', () => {
  describe('generateApiRoutes', () => {
    it('should generate Elysia router', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('import { Elysia');
      expect(routes).toContain('export const userRouter');
      expect(routes).toContain('new Elysia');
    });

    it('should generate all CRUD routes', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain(".get('/'"); // List
      expect(routes).toContain(".post('/'"); // Create
      expect(routes).toContain(".get('/:id'"); // Get
      expect(routes).toContain(".patch('/:id'"); // Update
      expect(routes).toContain(".delete('/:id'"); // Delete
    });

    it('should include database operations', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('db.select()');
      expect(routes).toContain('db.insert(');
      expect(routes).toContain('db.update(');
      expect(routes).toContain('db.delete(');
    });

    it('should include pagination', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('page');
      expect(routes).toContain('limit');
      expect(routes).toContain('offset');
    });

    it('should include response envelopes', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('return { data:');
      expect(routes).toContain('meta:');
    });

    it('should include validation schemas', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('body:');
      expect(routes).toContain('t.Object');
    });

    it('should handle multiple entities', async () => {
      const routes = await generateApiRoutes(sampleManifest);

      expect(routes).toContain('userRouter');
      expect(routes).toContain('postRouter');
    });

    it('should generate main router', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('export function createApiRouter()');
      expect(routes).toContain('.use(');
    });

    it('should use correct table names', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('schema.userTable');
    });

    it('should generate UUID for IDs', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('crypto.randomUUID()');
    });

    it('should handle updates with timestamps', async () => {
      const routes = await generateApiRoutes(simpleManifest);

      expect(routes).toContain('updatedAt:');
      expect(routes).toContain('toISOString()');
    });
  });

  describe('generateTypeBoxSchemas', () => {
    it('should generate TypeBox schemas', async () => {
      const schemas = await generateTypeBoxSchemas(simpleManifest);

      expect(schemas).toContain("import { t } from 'elysia'");
      expect(schemas).toContain('export const UserSchema');
      expect(schemas).toContain('t.Object');
    });

    it('should include all fields', async () => {
      const schemas = await generateTypeBoxSchemas(simpleManifest);

      expect(schemas).toContain('id:');
      expect(schemas).toContain('email:');
      expect(schemas).toContain('name:');
    });

    it('should handle field types', async () => {
      const schemas = await generateTypeBoxSchemas(simpleManifest);

      expect(schemas).toContain('t.String()');
      expect(schemas).toContain('t.Number()');
      expect(schemas).toContain('t.Boolean()');
    });

    it('should handle optional fields', async () => {
      const schemas = await generateTypeBoxSchemas(simpleManifest);

      expect(schemas).toContain('t.Optional');
    });

    it('should handle multiple entities', async () => {
      const schemas = await generateTypeBoxSchemas(sampleManifest);

      expect(schemas).toContain('UserSchema');
      expect(schemas).toContain('PostSchema');
    });
  });
});
