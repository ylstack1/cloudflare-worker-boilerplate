import type { ManifestEntity } from '@edge-manifest/core';
import { integer, text, real, blob, primaryKey, sqliteTable, unique } from 'drizzle-orm/sqlite-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export interface DrizzleTable {
  name: string;
  fields: Record<string, unknown>;
}

/**
 * Generates Drizzle table definitions from manifest entities
 * Currently supports: id, string, number, boolean, date, json, uuid
 */
export function generateSchemaFromManifest(entities: ManifestEntity[]): Record<string, unknown> {
  const schema: Record<string, unknown> = {};

  for (const entity of entities) {
    const tableName = entity.table || entity.name.toLowerCase();
    const columns: Record<string, unknown> = {};

    for (const field of entity.fields) {
      if (field.kind === 'relation') {
        // Skip relation fields - they'll be handled in a future phase
        continue;
      }

      let column: unknown;

      switch (field.kind) {
        case 'id':
          column = text('id').primaryKey().notNull();
          break;

        case 'uuid':
          column = text('id').primaryKey().notNull();
          break;

        case 'string':
          column = text(field.name);
          if (field.required) column = (column as any).notNull();
          if (field.unique) column = (column as any).unique();
          if (field.default !== undefined) column = (column as any).default(field.default as string);
          break;

        case 'number':
          column = real(field.name);
          if (field.required) column = (column as any).notNull();
          if (field.unique) column = (column as any).unique();
          if (field.default !== undefined) column = (column as any).default(field.default as number);
          break;

        case 'boolean':
          column = integer(field.name);
          if (field.required) column = (column as any).notNull();
          if (field.default !== undefined) column = (column as any).default(field.default ? 1 : 0);
          break;

        case 'date':
          column = text(field.name);
          if (field.required) column = (column as any).notNull();
          break;

        case 'json':
          column = blob(field.name);
          if (field.required) column = (column as any).notNull();
          break;

        default:
          const _exhaustive: never = field.kind;
          throw new Error(`Unsupported field kind: ${_exhaustive}`);
      }

      columns[field.name] = column;
    }

    // Create the table
    schema[entity.name] = sqliteTable(tableName, columns as Parameters<typeof sqliteTable>[1]);
  }

  return schema;
}

/**
 * Extract TypeScript types from a generated schema
 */
export type InferSchema<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends { $inferSelect: infer S } ? S : never;
};

export type InferInsertSchema<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends { $inferInsert: infer I } ? I : never;
};
