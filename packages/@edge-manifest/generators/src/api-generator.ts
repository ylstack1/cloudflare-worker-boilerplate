import type { EdgeManifest, ManifestEntity, ManifestField } from '@edge-manifest/core';

function pluralizeEntityPath(entityName: string): string {
  return `${entityName.toLowerCase()}s`;
}

function getEntityIdField(entity: ManifestEntity): string {
  const idField = entity.fields.find((f) => f.kind === 'id' || f.kind === 'uuid');
  return idField?.name ?? 'id';
}

function getEntityTableSymbol(entity: ManifestEntity): string {
  return `${entity.name.toLowerCase()}Table`;
}

/**
 * Generates a Hono app factory that registers all CRUD routes for a manifest.
 *
 * The generated source is designed to compile in a Cloudflare Worker without edits.
 */
export async function generateApiRoutes(manifest: EdgeManifest): Promise<string> {
  const imports = generateImports();
  const groups = manifest.entities.map((entity) => generateEntityGroup(entity)).join('\n\n');

  return `${imports}

export function createRoutesPlugin(manifest: EdgeManifest, schema: Schema) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  // Health check
  app.get('/api/health', (c) => c.json({ ok: true }));

${groups}

  return app;
}
`;
}

function generateImports(): string {
  return `import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { EdgeManifest } from '@edge-manifest/core';

type Schema = typeof import('./schema');

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET?: string;
  KV_SESSION_TTL?: string;
};

type Variables = {
  requestId: string;
  db: DrizzleD1Database<any>;
};`;
}

function generateEntityGroup(entity: ManifestEntity): string {
  const pathBase = pluralizeEntityPath(entity.name);
  const tableSymbol = getEntityTableSymbol(entity);
  const idField = getEntityIdField(entity);

  const createSchema = generateZodSchema(entity, false);
  const updateSchema = generateZodSchema(entity, true);

  return `  // ${entity.name} CRUD routes
  const ${tableSymbol} = schema.${entity.table};

  // List ${entity.name}s
  app.get('/api/${pathBase}', async (c) => {
    const db = c.get('db');
    const url = new URL(c.req.url);
    const limit = Math.min(Number.parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = Number.parseInt(url.searchParams.get('offset') || '0');

    const items = await db
      .select()
      .from(${tableSymbol})
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: sql<number>\`count(*)\` })
      .from(${tableSymbol})
      .then((r) => r[0]?.count ?? 0);

    return c.json({
      data: items,
      meta: { total, limit, offset },
    });
  });

  // Get ${entity.name} by ID
  app.get('/api/${pathBase}/:id', async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');

    const item = await db
      .select()
      .from(${tableSymbol})
      .where(eq(${tableSymbol}.${idField}, id))
      .limit(1)
      .then((r) => r[0]);

    if (!item) {
      return c.json({ error: '${entity.name} not found' }, 404);
    }

    return c.json({ data: item });
  });

  // Create ${entity.name}
  app.post(
    '/api/${pathBase}',
    zValidator('json', ${createSchema}),
    async (c) => {
      const db = c.get('db');
      const body = c.req.valid('json');

      const newItem = {
        ${idField}: crypto.randomUUID(),
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.insert(${tableSymbol}).values(newItem);

      return c.json({ data: newItem }, 201);
    }
  );

  // Update ${entity.name}
  app.patch(
    '/api/${pathBase}/:id',
    zValidator('json', ${updateSchema}),
    async (c) => {
      const db = c.get('db');
      const id = c.req.param('id');
      const body = c.req.valid('json');

      const existing = await db
        .select()
        .from(${tableSymbol})
        .where(eq(${tableSymbol}.${idField}, id))
        .limit(1)
        .then((r) => r[0]);

      if (!existing) {
        return c.json({ error: '${entity.name} not found' }, 404);
      }

      const updated = {
        ...body,
        updatedAt: new Date().toISOString(),
      };

      await db
        .update(${tableSymbol})
        .set(updated)
        .where(eq(${tableSymbol}.${idField}, id));

      return c.json({ data: { ...existing, ...updated } });
    }
  );

  // Delete ${entity.name}
  app.delete('/api/${pathBase}/:id', async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');

    const existing = await db
      .select()
      .from(${tableSymbol})
      .where(eq(${tableSymbol}.${idField}, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return c.json({ error: '${entity.name} not found' }, 404);
    }

    await db
      .delete(${tableSymbol})
      .where(eq(${tableSymbol}.${idField}, id));

    return c.body(null, 204);
  });`;
}

function generateZodSchema(entity: ManifestEntity, partial: boolean): string {
  const fields = entity.fields
    .filter((field) => field.kind !== 'relation' && field.kind !== 'id' && field.kind !== 'uuid')
    .map((field) => generateZodField(field, partial))
    .join(',\n    ');

  return `z.object({
    ${fields}
  })${partial ? '.partial()' : ''}`;
}

function generateZodField(field: ManifestField, isPartial: boolean): string {
  if (field.kind === 'relation') {
    throw new Error('Relations should be filtered out');
  }

  let zodType = '';

  switch (field.kind) {
    case 'id':
      zodType = 'z.string().uuid()';
      break;

    case 'uuid':
      zodType = 'z.string().uuid()';
      break;

    case 'string':
      zodType = 'z.string()';
      break;

    case 'number':
      zodType = 'z.number()';
      break;

    case 'boolean':
      zodType = 'z.boolean()';
      break;

    case 'date':
      zodType = 'z.string().datetime()';
      break;

    case 'json':
      zodType = 'z.any()';
      break;

    default:
      zodType = 'z.any()';
  }

  const required = field.required ?? false;
  if (!required && !isPartial) {
    zodType += '.optional()';
  }

  return `${field.name}: ${zodType}`;
}

export async function generateTypeBoxSchemas(_manifest: EdgeManifest): Promise<string> {
  return '// TypeBox schemas not needed for Hono - using Zod instead';
}
