import { describe, expect, it } from 'vitest';
import { generateDrizzleSchema, generateZodSchemas } from '../src/schema-generator';
import { sampleManifest, simpleManifest } from './fixtures';

describe('Schema Generator', () => {
  describe('generateDrizzleSchema', () => {
    it('should generate a valid Drizzle schema', async () => {
      const schema = await generateDrizzleSchema(simpleManifest);

      expect(schema).toContain('sqliteTable');
      expect(schema).toContain('userTable');
      expect(schema).toContain('export const');
    });

    it('should include all entity fields', async () => {
      const schema = await generateDrizzleSchema(simpleManifest);

      expect(schema).toContain('id:');
      expect(schema).toContain('email:');
      expect(schema).toContain('name:');
      expect(schema).toContain('age:');
      expect(schema).toContain('isActive:');
    });

    it('should include timestamps', async () => {
      const schema = await generateDrizzleSchema(simpleManifest);

      expect(schema).toContain('createdAt:');
      expect(schema).toContain('updatedAt:');
      expect(schema).toContain('CURRENT_TIMESTAMP');
    });

    it('should handle multiple entities', async () => {
      const schema = await generateDrizzleSchema(sampleManifest);

      expect(schema).toContain('userTable');
      expect(schema).toContain('postTable');
    });

    it('should generate correct field types', async () => {
      const schema = await generateDrizzleSchema(simpleManifest);

      expect(schema).toContain("text('id')");
      expect(schema).toContain("text('email')");
      expect(schema).toContain("real('age')");
      expect(schema).toContain("integer('isActive')");
    });

    it('should handle field constraints', async () => {
      const schema = await generateDrizzleSchema(simpleManifest);

      expect(schema).toContain('.primaryKey()');
      expect(schema).toContain('.unique()');
      expect(schema).toContain('.notNull()');
    });

    it('should handle default values', async () => {
      const schema = await generateDrizzleSchema(simpleManifest);

      expect(schema).toContain('.default(1)'); // boolean true = 1
    });

    it('should generate type exports', async () => {
      const schema = await generateDrizzleSchema(simpleManifest);

      expect(schema).toContain('export type User');
      expect(schema).toContain('export type CreateUser');
      expect(schema).toContain('$inferSelect');
      expect(schema).toContain('$inferInsert');
    });
  });

  describe('generateZodSchemas', () => {
    it('should generate Zod schemas', async () => {
      const schemas = await generateZodSchemas(simpleManifest);

      expect(schemas).toContain("import { z } from 'zod'");
      expect(schemas).toContain('UserSchema');
      expect(schemas).toContain('z.object');
    });

    it('should include all fields', async () => {
      const schemas = await generateZodSchemas(simpleManifest);

      expect(schemas).toContain('id:');
      expect(schemas).toContain('email:');
      expect(schemas).toContain('name:');
      expect(schemas).toContain('age:');
    });

    it('should handle field types correctly', async () => {
      const schemas = await generateZodSchemas(simpleManifest);

      expect(schemas).toContain('z.string()');
      expect(schemas).toContain('z.number()');
      expect(schemas).toContain('z.boolean()');
    });

    it('should handle optional fields', async () => {
      const schemas = await generateZodSchemas(simpleManifest);

      expect(schemas).toContain('.optional()');
    });

    it('should generate create schemas', async () => {
      const schemas = await generateZodSchemas(simpleManifest);

      expect(schemas).toContain('CreateUserSchema');
      expect(schemas).toContain('.omit({');
    });

    it('should handle multiple entities', async () => {
      const schemas = await generateZodSchemas(sampleManifest);

      expect(schemas).toContain('UserSchema');
      expect(schemas).toContain('PostSchema');
    });
  });
});
