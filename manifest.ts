import type { EdgeManifest } from './packages/@edge-manifest/core/src/manifest/types';

const manifest: EdgeManifest = {
  id: 'edge-manifest-app',
  name: 'EDGE-MANIFEST',
  version: '0.0.0',
  entities: [
    {
      name: 'User',
      table: 'users',
      fields: [
        { name: 'id', kind: 'uuid', required: true },
        { name: 'email', kind: 'string', required: true, unique: true },
        { name: 'name', kind: 'string', required: true },
      ],
    },
    {
      name: 'Store',
      table: 'stores',
      fields: [
        { name: 'id', kind: 'uuid', required: true },
        { name: 'name', kind: 'string', required: true },
        { name: 'city', kind: 'string', required: false },
      ],
    },
    {
      name: 'Product',
      table: 'products',
      fields: [
        { name: 'id', kind: 'uuid', required: true },
        { name: 'name', kind: 'string', required: true },
        { name: 'price', kind: 'number', required: true },
        { name: 'storeId', kind: 'string', required: false },
      ],
    },
  ],
};

export default manifest;
