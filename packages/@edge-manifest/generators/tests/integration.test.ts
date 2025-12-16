import { describe, expect, it } from 'vitest';
import { generate, generateAll } from '../src/index';
import { sampleManifest, simpleManifest } from './fixtures';

describe('Generator Integration', () => {
  describe('generateAll', () => {
    it('should generate all artifacts', async () => {
      const output = await generateAll(simpleManifest);

      expect(output).toHaveProperty('schema');
      expect(output).toHaveProperty('zodSchemas');
      expect(output).toHaveProperty('types');
      expect(output).toHaveProperty('apiTypes');
      expect(output).toHaveProperty('routes');
      expect(output).toHaveProperty('typeBoxSchemas');
      expect(output).toHaveProperty('migrations');
      expect(output).toHaveProperty('rollback');
      expect(output).toHaveProperty('admin');
    });

    it('should generate non-empty output', async () => {
      const output = await generateAll(simpleManifest);

      expect(output.schema.length).toBeGreaterThan(0);
      expect(output.types.length).toBeGreaterThan(0);
      expect(output.routes.length).toBeGreaterThan(0);
      expect(output.migrations.length).toBeGreaterThan(0);
    });

    it('should generate valid TypeScript for schema', async () => {
      const output = await generateAll(simpleManifest);

      // Check for valid TypeScript syntax markers
      expect(output.schema).toContain('export const');
      expect(output.schema).toContain('sqliteTable');
      expect(output.schema).not.toContain('undefined');
    });

    it('should generate valid TypeScript for types', async () => {
      const output = await generateAll(simpleManifest);

      expect(output.types).toContain('export interface');
      expect(output.types).toContain('export type');
      expect(output.types).not.toContain('undefined');
    });

    it('should generate valid TypeScript for routes', async () => {
      const output = await generateAll(simpleManifest);

      expect(output.routes).toContain('import');
      expect(output.routes).toContain('export');
      expect(output.routes).toContain('Hono');
      expect(output.routes).not.toContain('undefined');
    });

    it('should generate valid SQL for migrations', async () => {
      const output = await generateAll(simpleManifest);

      expect(output.migrations).toContain('CREATE TABLE');
      expect(output.migrations).toContain('TEXT');
      expect(output.migrations).not.toContain('undefined');
    });

    it('should generate admin routes', async () => {
      const output = await generateAll(simpleManifest);

      expect(output.admin.routes['user/+page.svelte']).toBeDefined();
      expect(output.admin.routes['user/+page.svelte']).toContain('<script');
    });

    it('should handle multiple entities', async () => {
      const output = await generateAll(sampleManifest);

      expect(output.schema).toContain('userTable');
      expect(output.schema).toContain('postTable');
      expect(output.types).toContain('interface User');
      expect(output.types).toContain('interface Post');
    });

    it('should respect skip option', async () => {
      const output = await generateAll(simpleManifest, { skip: ['admin'] });

      expect(output.schema.length).toBeGreaterThan(0);
      expect(output.admin.routes).toEqual({});
      expect(output.admin.components).toEqual({});
    });

    it('should skip multiple generators', async () => {
      const output = await generateAll(simpleManifest, { skip: ['admin', 'migrations'] });

      expect(output.schema.length).toBeGreaterThan(0);
      expect(output.migrations).toBe('');
      expect(output.admin.routes).toEqual({});
    });
  });

  describe('generate', () => {
    it('should generate specific targets', async () => {
      const output = await generate(simpleManifest, ['schema', 'types']);

      expect(output).toHaveProperty('schema');
      expect(output).toHaveProperty('types');
      expect(output).not.toHaveProperty('routes');
    });

    it('should generate only requested target', async () => {
      const output = await generate(simpleManifest, ['schema']);

      expect(output).toHaveProperty('schema');
      expect(output.schema).toBeDefined();
      expect(output.schema!.length).toBeGreaterThan(0);
    });

    it('should throw on invalid target', async () => {
      await expect(generate(simpleManifest, ['invalid'])).rejects.toThrow();
    });

    it('should handle multiple targets', async () => {
      const output = await generate(simpleManifest, ['schema', 'types', 'routes']);

      expect(output).toHaveProperty('schema');
      expect(output).toHaveProperty('types');
      expect(output).toHaveProperty('routes');
    });
  });

  describe('Cross-Generator Consistency', () => {
    it('should generate consistent entity names', async () => {
      const output = await generateAll(simpleManifest);

      expect(output.schema).toContain('userTable');
      expect(output.types).toContain('interface User');
      expect(output.routes).toContain('createRoutesPlugin');
      expect(output.routes).toContain("'/api/users'");
      expect(output.migrations).toContain('users');
    });

    it('should generate consistent field names', async () => {
      const output = await generateAll(simpleManifest);

      // All generators should use the same field names
      expect(output.schema).toContain('email');
      expect(output.types).toContain('email');
      expect(output.migrations).toContain('email');
    });

    it('should generate consistent field types', async () => {
      const output = await generateAll(simpleManifest);

      // String fields
      expect(output.schema).toContain("text('email')");
      expect(output.types).toContain('email: string');
      expect(output.migrations).toContain('email TEXT');

      // Number fields
      expect(output.schema).toContain("real('age')");
      expect(output.types).toContain('age?: number');
      expect(output.migrations).toContain('age REAL');
    });

    it('should include timestamps everywhere', async () => {
      const output = await generateAll(simpleManifest);

      expect(output.schema).toContain('createdAt');
      expect(output.schema).toContain('updatedAt');
      expect(output.types).toContain('createdAt');
      expect(output.types).toContain('updatedAt');
      expect(output.migrations).toContain('created_at');
      expect(output.migrations).toContain('updated_at');
    });
  });

  describe('Output Quality', () => {
    it('should generate importable TypeScript', async () => {
      const output = await generateAll(simpleManifest);

      // Check schema has proper imports
      expect(output.schema).toContain('import {');
      expect(output.schema).toMatch(/from ['"]drizzle-orm/);

      // Check routes have proper imports
      expect(output.routes).toContain('import {');
      expect(output.routes).toMatch(/from ['"]hono['"]/);
    });

    it('should not have syntax errors in generated code', async () => {
      const output = await generateAll(simpleManifest);

      // Check for common syntax errors
      expect(output.schema).not.toContain(',,');
      expect(output.types).not.toContain(';;');
      expect(output.routes).not.toContain('{{');
    });

    it('should have proper formatting', async () => {
      const output = await generateAll(simpleManifest);

      // Check for proper indentation
      expect(output.schema).toContain('  '); // Has indentation
      expect(output.types).toContain('  ');
      expect(output.routes).toContain('  ');
    });
  });
});
