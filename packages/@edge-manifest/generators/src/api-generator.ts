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
 * Generates an Elysia plugin factory that registers all CRUD routes for a manifest.
 *
 * The generated source is designed to compile in a Cloudflare Worker without edits.
 */
export async function generateApiRoutes(manifest: EdgeManifest): Promise<string> {
  const imports = generateImports();
  const groups = manifest.entities.map((entity) => generateEntityGroup(entity)).join('\n\n');

  return `${imports}\n\nexport function createRoutesPlugin(manifest: EdgeManifest, schema: Schema) {
  const app = new Elysia({ name: 'edge-manifest.routes', aot: false });

  return app.group('/api', (api) => {
    let out = api.get('/health', () => ({ ok: true }));

${groups}

    return out;
  });
}
`;
}

function generateImports(): string {
  return `import { Elysia, t } from 'elysia';
import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { EdgeManifest } from '@edge-manifest/core';

type Schema = typeof import('./schema');

type Ctx = {
  db: DrizzleD1Database<any>;
  request: Request;
  params: Record<string, string>;
  body: unknown;
  set: { status?: number; headers: Record<string, string> };
};`;
}

function generateEntityGroup(entity: ManifestEntity): string {
  const plural = pluralizeEntityPath(entity.name);
  const tableSymbol = getEntityTableSymbol(entity);
  const idField = getEntityIdField(entity);

  const createBodySchema = generateBodySchema(entity, false);
  const patchBodySchema = generateBodySchema(entity, true);
  const idParamSchema = 't.Object({ id: t.String() })';

  return `    out = out.group('/${plural}', (entityApp) => {
      const table = (schema as any).${tableSymbol} as any;
      const idColumn = (table as any)[${JSON.stringify(idField)}] as any;

      return entityApp
        .get('/', async ({ db, request }: Ctx) => {
          const url = new URL(request.url);
          const page = Number(url.searchParams.get('page') ?? 1) || 1;
          const limit = Number(url.searchParams.get('limit') ?? 25) || 25;
          const offset = (page - 1) * limit;

          const items = await db.select().from(table).limit(limit).offset(offset).all();
          const [{ count }] = await db.select({ count: sql<number>\`count(*)\` }).from(table).all();

          return {
            data: items,
            meta: {
              total: Number(count ?? 0),
              page,
              limit,
            },
          };
        })
        .post(
          '/',
          async ({ db, body, set }: Ctx) => {
            const id = crypto.randomUUID();

            const values = {
              ...((body as any) ?? {}),
              [${JSON.stringify(idField)}]: id,
            };

            const [item] = await db.insert(table).values(values).returning().all();

            set.status = 201;
            return { data: item };
          },
          {
            body: ${createBodySchema},
          },
        )
        .get(
          '/:id',
          async ({ db, params, set }: Ctx) => {
            const [item] = await db.select().from(table).where(eq(idColumn, params.id)).all();

            if (!item) {
              set.status = 404;
              return { error: 'Not found' };
            }

            return { data: item };
          },
          {
            params: ${idParamSchema},
          },
        )
        .patch(
          '/:id',
          async ({ db, params, body, set }: Ctx) => {
            const [item] = await db
              .update(table)
              .set({ ...((body as any) ?? {}), updatedAt: new Date().toISOString() })
              .where(eq(idColumn, params.id))
              .returning()
              .all();

            if (!item) {
              set.status = 404;
              return { error: 'Not found' };
            }

            return { data: item };
          },
          {
            params: ${idParamSchema},
            body: ${patchBodySchema},
          },
        )
        .delete(
          '/:id',
          async ({ db, params, set }: Ctx) => {
            await db.delete(table).where(eq(idColumn, params.id)).run();
            set.status = 204;
            return null;
          },
          {
            params: ${idParamSchema},
          },
        );
    });`;
}

function generateBodySchema(entity: ManifestEntity, partial: boolean): string {
  const fields = entity.fields
    .filter((field) => field.kind !== 'relation' && field.kind !== 'id' && field.kind !== 'uuid')
    .map((field) => generateTypeBoxField({ ...field, required: partial ? false : (field.required ?? false) }))
    .join(',\n      ');

  const base = `t.Object({\n      ${fields}\n    })`;

  return partial ? `t.Partial(${base})` : base;
}

function generateTypeBoxField(field: ManifestField): string {
  if (field.kind === 'relation') {
    throw new Error('Relations should be filtered out');
  }

  let typeBoxType = '';

  switch (field.kind) {
    case 'id':
      typeBoxType = 't.String()';
      break;

    case 'uuid':
      typeBoxType = "t.String({ format: 'uuid' })";
      break;

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

  return `export const ${entityName}Schema = t.Object({\n  ${fields}\n});`;
}
