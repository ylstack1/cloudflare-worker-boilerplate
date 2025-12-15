import type { EdgeManifest, ManifestEntity } from '@edge-manifest/core';

function pluralizeEntityPath(entityName: string): string {
  return `${entityName.toLowerCase()}s`;
}

function getEntityTable(entity: ManifestEntity): string {
  return entity.table || entity.name.toLowerCase();
}

function getPrimaryKeyFieldName(entity: ManifestEntity): string {
  const idField = entity.fields.find((f) => f.kind === 'id' || f.kind === 'uuid');
  return idField?.name ?? 'id';
}

export async function generateConfig(manifest: EdgeManifest): Promise<string> {
  const entities = manifest.entities.map((entity) => {
    const route = `/api/${pluralizeEntityPath(entity.name)}`;

    return {
      name: entity.name,
      table: getEntityTable(entity),
      primaryKey: getPrimaryKeyFieldName(entity),
      route,
    };
  });

  const serializedManifest = JSON.stringify(manifest, null, 2);
  const serializedEntities = JSON.stringify(entities, null, 2);

  return `import type { EdgeManifest } from '@edge-manifest/core';

export const manifest = ${serializedManifest} as const satisfies EdgeManifest;

export const appConfig = {
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
  openapi: {
    title: manifest.name,
    version: manifest.version,
  },
  entities: ${serializedEntities},
} as const;

export type AppConfig = typeof appConfig;
`;
}
