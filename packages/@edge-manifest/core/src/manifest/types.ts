export type ManifestVersion = string;

export type ManifestFieldKind = 'id' | 'string' | 'number' | 'boolean' | 'date' | 'json' | 'uuid' | 'relation';

export type ManifestRelationType = 'one' | 'many';

export interface ManifestRelation {
  entity: string;
  field?: string;
  type: ManifestRelationType;
}

export interface ManifestFieldBase {
  name: string;
  kind: ManifestFieldKind;
  description?: string;
  required?: boolean;
  unique?: boolean;
  nullable?: boolean;
  default?: unknown;
}

export interface ManifestRelationField extends ManifestFieldBase {
  kind: 'relation';
  relation: ManifestRelation;
}

export interface ManifestScalarField extends ManifestFieldBase {
  kind: Exclude<ManifestFieldKind, 'relation'>;
}

export type ManifestField = ManifestRelationField | ManifestScalarField;

export interface ManifestEntity {
  name: string;
  table?: string;
  fields: ManifestField[];
}

export interface EdgeManifest {
  id: string;
  name: string;
  version: ManifestVersion;
  generators?: Record<string, unknown>;
  entities: ManifestEntity[];
  relations?: Record<string, unknown>;
}
