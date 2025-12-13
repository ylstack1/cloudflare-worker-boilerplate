import type { EdgeManifest, ManifestEntity, ManifestField } from '@edge-manifest/core';

/**
 * Generates Elysia API routes from manifest
 */
export async function generateApiRoutes(manifest: EdgeManifest): Promise<string> {
  const imports = generateImports();
  const routers = manifest.entities.map((entity) => generateEntityRouter(entity)).join('\n\n');
  const mainRouter = generateMainRouter(manifest.entities);

  return `${imports}\n\n${routers}\n\n${mainRouter}`;
}

function generateImports(): string {
  return `import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';`;
}

function generateEntityRouter(entity: ManifestEntity): string {
  const entityLower = entity.name.toLowerCase();

  const listRoute = generateListRoute(entity);
  const createRoute = generateCreateRoute(entity);
  const getRoute = generateGetRoute(entity);
  const updateRoute = generateUpdateRoute(entity);
  const deleteRoute = generateDeleteRoute(entity);

  return `export const ${entityLower}Router = new Elysia({ prefix: '/${entityLower}s' })
  ${listRoute}
  ${createRoute}
  ${getRoute}
  ${updateRoute}
  ${deleteRoute};`;
}

function generateListRoute(entity: ManifestEntity): string {
  const entityLower = entity.name.toLowerCase();
  const tableName = `${entityLower}Table`;

  return `.get('/', async ({ query, store }: any) => {
    const db = store.db as DrizzleD1Database;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const items = await db.select().from(schema.${tableName}).limit(limit).offset(offset).all();
    const [{ count }] = await db.select({ count: sql\`count(*)\` }).from(schema.${tableName}).all();

    return {
      data: items,
      meta: {
        total: count,
        page,
        limit,
      },
    };
  })`;
}

function generateCreateRoute(entity: ManifestEntity): string {
  const entityLower = entity.name.toLowerCase();
  const tableName = `${entityLower}Table`;
  const bodySchema = generateBodySchema(entity);

  return `.post('/', async ({ body, store }: any) => {
    const db = store.db as DrizzleD1Database;
    const id = crypto.randomUUID();
    
    const [item] = await db.insert(schema.${tableName})
      .values({ id, ...body })
      .returning()
      .all();

    return { data: item };
  }, {
    body: ${bodySchema}
  })`;
}

function generateGetRoute(entity: ManifestEntity): string {
  const entityLower = entity.name.toLowerCase();
  const tableName = `${entityLower}Table`;

  return `.get('/:id', async ({ params, store }: any) => {
    const db = store.db as DrizzleD1Database;
    
    const [item] = await db.select()
      .from(schema.${tableName})
      .where(eq(schema.${tableName}.id, params.id))
      .all();

    if (!item) {
      throw new Error('Not found');
    }

    return { data: item };
  })`;
}

function generateUpdateRoute(entity: ManifestEntity): string {
  const entityLower = entity.name.toLowerCase();
  const tableName = `${entityLower}Table`;
  const bodySchema = generatePartialBodySchema(entity);

  return `.patch('/:id', async ({ params, body, store }: any) => {
    const db = store.db as DrizzleD1Database;
    
    const [item] = await db.update(schema.${tableName})
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(schema.${tableName}.id, params.id))
      .returning()
      .all();

    if (!item) {
      throw new Error('Not found');
    }

    return { data: item };
  }, {
    body: ${bodySchema}
  })`;
}

function generateDeleteRoute(entity: ManifestEntity): string {
  const entityLower = entity.name.toLowerCase();
  const tableName = `${entityLower}Table`;

  return `.delete('/:id', async ({ params, store }: any) => {
    const db = store.db as DrizzleD1Database;
    
    await db.delete(schema.${tableName})
      .where(eq(schema.${tableName}.id, params.id))
      .run();

    return { data: { deleted: true } };
  })`;
}

function generateBodySchema(entity: ManifestEntity): string {
  const fields = entity.fields
    .filter((field) => field.kind !== 'relation' && field.kind !== 'id')
    .map((field) => generateTypeBoxField(field))
    .join(',\n      ');

  return `t.Object({
      ${fields}
    })`;
}

function generatePartialBodySchema(entity: ManifestEntity): string {
  const fields = entity.fields
    .filter((field) => field.kind !== 'relation' && field.kind !== 'id')
    .map((field) => generateTypeBoxField({ ...field, required: false }))
    .join(',\n      ');

  return `t.Partial(t.Object({
      ${fields}
    }))`;
}

function generateTypeBoxField(field: ManifestField): string {
  if (field.kind === 'relation') {
    throw new Error('Relations should be filtered out');
  }

  let typeBoxType = '';

  switch (field.kind) {
    case 'id':
    case 'uuid':
    case 'string':
      typeBoxType = 't.String()';
      break;

    case 'number':
      typeBoxType = 't.Number()';
      break;

    case 'boolean':
      typeBoxType = 't.Boolean()';
      break;

    case 'date':
      typeBoxType = 't.String()';
      break;

    case 'json':
      typeBoxType = 't.Any()';
      break;

    default:
      throw new Error(`Unsupported field kind: ${(field as any).kind}`);
  }

  if (!field.required) {
    typeBoxType = `t.Optional(${typeBoxType})`;
  }

  return `${field.name}: ${typeBoxType}`;
}

function generateMainRouter(entities: ManifestEntity[]): string {
  const routers = entities.map((entity) => `${entity.name.toLowerCase()}Router`).join(', ');

  return `export function createApiRouter() {
  return new Elysia({ prefix: '/api' })
    .use(${routers.split(', ').join(')\n    .use(')});
}`;
}

/**
 * Generates TypeBox schemas for validation
 */
export async function generateTypeBoxSchemas(manifest: EdgeManifest): Promise<string> {
  const imports = `import { t } from 'elysia';`;
  const schemas = manifest.entities.map((entity) => generateTypeBoxEntitySchema(entity)).join('\n\n');

  return `${imports}\n\n${schemas}`;
}

function generateTypeBoxEntitySchema(entity: ManifestEntity): string {
  const entityName = entity.name;
  const fields = entity.fields
    .filter((field) => field.kind !== 'relation')
    .map((field) => generateTypeBoxField(field))
    .join(',\n  ');

  return `export const ${entityName}Schema = t.Object({
  ${fields}
});`;
}
