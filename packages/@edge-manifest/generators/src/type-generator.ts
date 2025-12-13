import type { EdgeManifest, ManifestEntity, ManifestField } from '@edge-manifest/core';

/**
 * Generates TypeScript types for API requests and responses
 */
export async function generateTypes(manifest: EdgeManifest): Promise<string> {
  const entityTypes = manifest.entities.map((entity) => generateEntityTypes(entity)).join('\n\n');
  const queryTypes = manifest.entities.map((entity) => generateQueryTypes(entity)).join('\n\n');
  const apiEnvelope = generateApiEnvelope();

  return `${entityTypes}\n\n${queryTypes}\n\n${apiEnvelope}`;
}

function generateEntityTypes(entity: ManifestEntity): string {
  const entityName = entity.name;
  const fields = entity.fields
    .filter((field) => field.kind !== 'relation')
    .map((field) => generateTypeField(field))
    .join('\n  ');

  return `export interface ${entityName} {
  ${fields}
  createdAt?: Date;
  updatedAt?: Date;
}

export type Create${entityName}Input = Omit<${entityName}, 'id' | 'createdAt' | 'updatedAt'>;
export type Update${entityName}Input = Partial<Create${entityName}Input>;`;
}

function generateTypeField(field: ManifestField): string {
  if (field.kind === 'relation') {
    throw new Error('Relations should be filtered out');
  }

  let tsType = '';

  switch (field.kind) {
    case 'id':
    case 'uuid':
    case 'string':
      tsType = 'string';
      break;

    case 'number':
      tsType = 'number';
      break;

    case 'boolean':
      tsType = 'boolean';
      break;

    case 'date':
      tsType = 'Date';
      break;

    case 'json':
      tsType = 'any';
      break;

    default:
      throw new Error(`Unsupported field kind: ${(field as any).kind}`);
  }

  const optional = !field.required || field.nullable ? '?' : '';
  return `${field.name}${optional}: ${tsType};`;
}

function generateQueryTypes(entity: ManifestEntity): string {
  const entityName = entity.name;
  const scalarFields = entity.fields
    .filter((field) => field.kind !== 'relation')
    .map((field) => `'${field.name}'`)
    .join(' | ');

  return `export interface List${entityName}Query {
  page?: number;
  limit?: number;
  sortBy?: ${scalarFields} | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}`;
}

function generateApiEnvelope(): string {
  return `export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
  error?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}`;
}

/**
 * Generates TypeScript request/response types for API endpoints
 */
export async function generateApiTypes(manifest: EdgeManifest): Promise<string> {
  const endpoints = manifest.entities.map((entity) => generateEndpointTypes(entity)).join('\n\n');

  return endpoints;
}

function generateEndpointTypes(entity: ManifestEntity): string {
  const entityName = entity.name;

  return `// ${entityName} API Endpoints
export interface Get${entityName}Request {
  id: string;
}

export interface Get${entityName}Response {
  data: ${entityName};
}

export interface List${entityName}Request extends List${entityName}Query {}

export interface List${entityName}Response {
  data: ${entityName}[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface Create${entityName}Request {
  data: Create${entityName}Input;
}

export interface Create${entityName}Response {
  data: ${entityName};
}

export interface Update${entityName}Request {
  id: string;
  data: Update${entityName}Input;
}

export interface Update${entityName}Response {
  data: ${entityName};
}

export interface Delete${entityName}Request {
  id: string;
}

export interface Delete${entityName}Response {
  data: { deleted: boolean };
}`;
}
