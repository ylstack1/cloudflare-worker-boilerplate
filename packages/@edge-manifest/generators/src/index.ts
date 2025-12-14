import type { EdgeManifest } from '@edge-manifest/core';
import { generateAdminAssets, generateAdminAssetsModule } from './admin-assets-generator';
import { generateAdminUI } from './admin-generator';
import { generateApiRoutes, generateTypeBoxSchemas } from './api-generator';
import { generateConfig } from './config-generator';
import { generateMigrations, generateRollback } from './migration-generator';
import { generateDrizzleSchema, generateZodSchemas } from './schema-generator';
import { generateApiTypes, generateTypes } from './type-generator';

export interface GeneratorOutput {
  schema: string;
  zodSchemas: string;
  types: string;
  apiTypes: string;
  routes: string;
  typeBoxSchemas: string;
  config: string;
  migrations: string;
  rollback: string;
  admin: {
    routes: Record<string, string>;
    components: Record<string, string>;
  };
  adminAssets: Record<string, string>;
  adminAssetsModule: string;
}

export interface GeneratorOptions {
  skip?: string[];
  outputDir?: string;
}

/**
 * Generate all code from a manifest
 */
export async function generateAll(manifest: EdgeManifest, options: GeneratorOptions = {}): Promise<GeneratorOutput> {
  const skip = options.skip || [];

  const output: GeneratorOutput = {
    schema: '',
    zodSchemas: '',
    types: '',
    apiTypes: '',
    routes: '',
    typeBoxSchemas: '',
    config: '',
    migrations: '',
    rollback: '',
    admin: {
      routes: {},
      components: {},
    },
    adminAssets: {},
    adminAssetsModule: '',
  };

  if (!skip.includes('schema')) {
    output.schema = await generateDrizzleSchema(manifest);
    output.zodSchemas = await generateZodSchemas(manifest);
  }

  if (!skip.includes('types')) {
    output.types = await generateTypes(manifest);
    output.apiTypes = await generateApiTypes(manifest);
  }

  if (!skip.includes('routes')) {
    output.routes = await generateApiRoutes(manifest);
    output.typeBoxSchemas = await generateTypeBoxSchemas(manifest);
  }

  if (!skip.includes('config')) {
    output.config = await generateConfig(manifest);
  }

  if (!skip.includes('migrations')) {
    output.migrations = await generateMigrations(manifest);
    output.rollback = await generateRollback(manifest);
  }

  if (!skip.includes('admin')) {
    output.admin = await generateAdminUI(manifest);
    output.adminAssets = await generateAdminAssets(manifest);
    output.adminAssetsModule = await generateAdminAssetsModule(manifest);
  }

  return output;
}

/**
 * Generate specific artifacts
 */
export async function generate(
  manifest: EdgeManifest,
  targets: string[],
  _options: GeneratorOptions = {},
): Promise<Partial<GeneratorOutput>> {
  const output: Partial<GeneratorOutput> = {};

  for (const target of targets) {
    switch (target) {
      case 'schema':
        output.schema = await generateDrizzleSchema(manifest);
        output.zodSchemas = await generateZodSchemas(manifest);
        break;

      case 'types':
        output.types = await generateTypes(manifest);
        output.apiTypes = await generateApiTypes(manifest);
        break;

      case 'routes':
        output.routes = await generateApiRoutes(manifest);
        output.typeBoxSchemas = await generateTypeBoxSchemas(manifest);
        break;

      case 'config':
        output.config = await generateConfig(manifest);
        break;

      case 'migrations':
        output.migrations = await generateMigrations(manifest);
        output.rollback = await generateRollback(manifest);
        break;

      case 'admin':
        output.admin = await generateAdminUI(manifest);
        output.adminAssets = await generateAdminAssets(manifest);
        output.adminAssetsModule = await generateAdminAssetsModule(manifest);
        break;

      default:
        throw new Error(`Unknown generator target: ${target}`);
    }
  }

  return output;
}

// Re-export individual generators
export {
  generateDrizzleSchema,
  generateZodSchemas,
  generateTypes,
  generateApiTypes,
  generateApiRoutes,
  generateTypeBoxSchemas,
  generateConfig,
  generateMigrations,
  generateRollback,
  generateAdminUI,
  generateAdminAssets,
  generateAdminAssetsModule,
};
