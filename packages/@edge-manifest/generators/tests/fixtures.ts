import type { EdgeManifest, ManifestEntity } from '@edge-manifest/core';

export const sampleUser: ManifestEntity = {
  name: 'User',
  table: 'users',
  fields: [
    {
      name: 'id',
      kind: 'id',
      required: true,
    },
    {
      name: 'email',
      kind: 'string',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      kind: 'string',
      required: true,
    },
    {
      name: 'age',
      kind: 'number',
      required: false,
    },
    {
      name: 'isActive',
      kind: 'boolean',
      required: false,
      default: true,
    },
  ],
};

export const samplePost: ManifestEntity = {
  name: 'Post',
  table: 'posts',
  fields: [
    {
      name: 'id',
      kind: 'id',
      required: true,
    },
    {
      name: 'title',
      kind: 'string',
      required: true,
    },
    {
      name: 'content',
      kind: 'string',
      required: true,
    },
    {
      name: 'published',
      kind: 'boolean',
      required: false,
      default: false,
    },
    {
      name: 'publishedAt',
      kind: 'date',
      required: false,
    },
  ],
};

export const sampleManifest: EdgeManifest = {
  id: 'test-manifest',
  name: 'Test Application',
  version: '1.0.0',
  entities: [sampleUser, samplePost],
};

export const simpleManifest: EdgeManifest = {
  id: 'simple-manifest',
  name: 'Simple App',
  version: '1.0.0',
  entities: [sampleUser],
};
