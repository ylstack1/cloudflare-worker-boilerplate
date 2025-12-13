import type { EdgeManifest } from '@edge-manifest/core';

/**
 * Interface for custom generator plugins
 */
export interface GeneratorPlugin {
  name: string;
  description?: string;
  generate(manifest: EdgeManifest, options?: Record<string, unknown>): Promise<string | Record<string, string>>;
  outputPath: string;
  validate?(manifest: EdgeManifest): boolean;
}

/**
 * Plugin registry
 */
class GeneratorRegistry {
  private plugins = new Map<string, GeneratorPlugin>();

  /**
   * Register a new generator plugin
   */
  register(plugin: GeneratorPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Generator plugin "${plugin.name}" is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Unregister a generator plugin
   */
  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  /**
   * Get a generator plugin by name
   */
  get(name: string): GeneratorPlugin | null {
    return this.plugins.get(name) || null;
  }

  /**
   * Check if a generator plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * List all registered generator plugins
   */
  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get all registered plugins
   */
  getAll(): GeneratorPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Clear all registered plugins
   */
  clear(): void {
    this.plugins.clear();
  }
}

// Global registry instance
const registry = new GeneratorRegistry();

/**
 * Register a custom generator plugin
 */
export function registerGenerator(plugin: GeneratorPlugin): void {
  registry.register(plugin);
}

/**
 * Unregister a generator plugin
 */
export function unregisterGenerator(name: string): boolean {
  return registry.unregister(name);
}

/**
 * Get a generator plugin by name
 */
export function getGenerator(name: string): GeneratorPlugin | null {
  return registry.get(name);
}

/**
 * Check if a generator plugin is registered
 */
export function hasGenerator(name: string): boolean {
  return registry.has(name);
}

/**
 * List all registered generator plugins
 */
export function listGenerators(): string[] {
  return registry.list();
}

/**
 * Get all registered plugins
 */
export function getAllGenerators(): GeneratorPlugin[] {
  return registry.getAll();
}

/**
 * Run a custom generator plugin
 */
export async function runGenerator(
  name: string,
  manifest: EdgeManifest,
  options?: Record<string, unknown>,
): Promise<string | Record<string, string>> {
  const plugin = registry.get(name);

  if (!plugin) {
    throw new Error(`Generator plugin "${name}" is not registered`);
  }

  if (plugin.validate && !plugin.validate(manifest)) {
    throw new Error(`Manifest validation failed for generator "${name}"`);
  }

  return plugin.generate(manifest, options);
}

/**
 * Run all registered generators
 */
export async function runAllGenerators(
  manifest: EdgeManifest,
  options?: Record<string, unknown>,
): Promise<Record<string, string | Record<string, string>>> {
  const results: Record<string, string | Record<string, string>> = {};
  const plugins = registry.getAll();

  for (const plugin of plugins) {
    if (plugin.validate && !plugin.validate(manifest)) {
      console.warn(`Skipping generator "${plugin.name}" - validation failed`);
      continue;
    }

    results[plugin.name] = await plugin.generate(manifest, options);
  }

  return results;
}

/**
 * Example plugin: Custom API documentation generator
 */
export const apiDocsPlugin: GeneratorPlugin = {
  name: 'api-docs',
  description: 'Generates API documentation in Markdown format',
  outputPath: 'docs/api.md',

  async generate(manifest: EdgeManifest): Promise<string> {
    const header = `# API Documentation\n\nGenerated from ${manifest.name} v${manifest.version}\n\n`;

    const entities = manifest.entities
      .map((entity) => {
        const entityLower = entity.name.toLowerCase();
        return (
          `## ${entity.name}\n\n` +
          '### Endpoints\n\n' +
          `- \`GET /api/${entityLower}s\` - List all ${entity.name}s\n` +
          `- \`POST /api/${entityLower}s\` - Create a new ${entity.name}\n` +
          `- \`GET /api/${entityLower}s/:id\` - Get a ${entity.name} by ID\n` +
          `- \`PATCH /api/${entityLower}s/:id\` - Update a ${entity.name}\n` +
          `- \`DELETE /api/${entityLower}s/:id\` - Delete a ${entity.name}\n`
        );
      })
      .join('\n\n');

    return header + entities;
  },

  validate(manifest: EdgeManifest): boolean {
    return manifest.entities.length > 0;
  },
};

/**
 * Clear all registered plugins (useful for testing)
 */
export function clearGenerators(): void {
  registry.clear();
}
