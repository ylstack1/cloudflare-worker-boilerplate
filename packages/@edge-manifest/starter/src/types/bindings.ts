import type { EdgeManifest } from '@edge-manifest/core';

export interface Bindings {
  DB?: D1Database;

  /**
   * Optional manifest injection.
   *
   * - string: JSON encoded EdgeManifest
   * - object: EdgeManifest-like
   */
  EDGE_MANIFEST?: string | EdgeManifest;
  MANIFEST?: string | EdgeManifest;

  /** JWT secret for authentication */
  JWT_SECRET?: string;

  /** Wrangler AI binding (optional in local dev) */
  ai?: unknown;
}
