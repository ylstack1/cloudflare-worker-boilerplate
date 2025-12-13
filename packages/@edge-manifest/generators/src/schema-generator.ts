import type { EdgeManifest, ManifestEntity, ManifestField } from '@edge-manifest/core';

/**
 * Generates a complete Drizzle schema file from a manifest
 * Outputs TypeScript code as a string
 */
export async function generateDrizzleSchema(manifest: EdgeManifest): Promise<string> {
  const imports = generateImports();
  const tables = manifest.entities.map((entity) => generateTable(entity)).join('\n\n');
  const types = manifest.entities.map((entity) => generateTypes(entity)).join('\n\n');

  return `${imports}\n\n${tables}\n\n${types}`;
}

function generateImports(): string {
  return `import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';`;
}

function generateTable(entity: ManifestEntity): string {
  const tableName = entity.table || entity.name.toLowerCase();
  const fields = entity.fields
    .filter((field) => field.kind !== 'relation')
    .map((field) => generateField(field))
    .join(',\n  ');

  const timestamps = `createdAt: text('created_at').default(sql\`CURRENT_TIMESTAMP\`),
  updatedAt: text('updated_at').default(sql\`CURRENT_TIMESTAMP\`)`;

  return `export const ${entity.name.toLowerCase()}Table = sqliteTable('${tableName}', {
  ${fields},
  ${timestamps}
});`;
}

function generateField(field: ManifestField): string {
  if (field.kind === 'relation') {
    throw new Error('Relations should be filtered out before calling generateField');
  }

  const columnName = field.name;
  let column = '';

  switch (field.kind) {
    case 'id':
    case 'uuid':
      column = `text('${columnName}').primaryKey().notNull()`;
      break;

    case 'string':
      column = `text('${columnName}')`;
      if (field.required) column += '.notNull()';
      if (field.unique) column += '.unique()';
      if (field.default !== undefined) {
        column += `.default('${String(field.default)}')`;
      }
      break;

    case 'number':
      column = `real('${columnName}')`;
      if (field.required) column += '.notNull()';
      if (field.unique) column += '.unique()';
      if (field.default !== undefined) {
        column += `.default(${field.default})`;
      }
      break;

    case 'boolean':
      column = `integer('${columnName}')`;
      if (field.required) column += '.notNull()';
      if (field.default !== undefined) {
        column += `.default(${field.default ? 1 : 0})`;
      }
      break;

    case 'date':
      column = `text('${columnName}')`;
      if (field.required) column += '.notNull()';
      break;

    case 'json':
      column = `blob('${columnName}', { mode: 'json' })`;
      if (field.required) column += '.notNull()';
      break;

    default:
      throw new Error(`Unsupported field kind: ${(field as any).kind}`);
  }

  return `${field.name}: ${column}`;
}

function generateTypes(entity: ManifestEntity): string {
  const entityName = entity.name;
  const tableName = `${entity.name.toLowerCase()}Table`;

  return `export type ${entityName} = typeof ${tableName}.$inferSelect;
export type Create${entityName} = typeof ${tableName}.$inferInsert;`;
}

/**
 * Generates Zod validation schemas for each entity
 */
export async function generateZodSchemas(manifest: EdgeManifest): Promise<string> {
  const imports = `import { z } from 'zod';`;
  const schemas = manifest.entities.map((entity) => generateZodSchema(entity)).join('\n\n');

  return `${imports}\n\n${schemas}`;
}

function generateZodSchema(entity: ManifestEntity): string {
  const fields = entity.fields
    .filter((field) => field.kind !== 'relation')
    .map((field) => generateZodField(field))
    .join(',\n  ');

  return `export const ${entity.name}Schema = z.object({
  ${fields}
});

export const Create${entity.name}Schema = ${entity.name}Schema.omit({ id: true, createdAt: true, updatedAt: true });`;
}

function generateZodField(field: ManifestField): string {
  if (field.kind === 'relation') {
    throw new Error('Relations should be filtered out');
  }

  let zodType = '';

  switch (field.kind) {
    case 'id':
    case 'uuid':
      zodType = 'z.string().uuid()';
      break;

    case 'string':
      zodType = 'z.string()';
      if (!field.required) zodType += '.optional()';
      break;

    case 'number':
      zodType = 'z.number()';
      if (!field.required) zodType += '.optional()';
      break;

    case 'boolean':
      zodType = 'z.boolean()';
      if (!field.required) zodType += '.optional()';
      break;

    case 'date':
      zodType = 'z.string().datetime()';
      if (!field.required) zodType += '.optional()';
      break;

    case 'json':
      zodType = 'z.any()';
      if (!field.required) zodType += '.optional()';
      break;

    default:
      throw new Error(`Unsupported field kind: ${(field as any).kind}`);
  }

  return `${field.name}: ${zodType}`;
}
