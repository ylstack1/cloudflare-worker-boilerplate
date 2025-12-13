import { beforeEach, describe, expect, it } from 'vitest';
import {
  apiDocsPlugin,
  clearGenerators,
  type GeneratorPlugin,
  getAllGenerators,
  getGenerator,
  hasGenerator,
  listGenerators,
  registerGenerator,
  runAllGenerators,
  runGenerator,
  unregisterGenerator,
} from '../src/plugins';
import { simpleManifest } from './fixtures';

describe('Plugin System', () => {
  beforeEach(() => {
    clearGenerators();
  });

  describe('registerGenerator', () => {
    it('should register a new generator', () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        outputPath: 'output/test.ts',
        async generate() {
          return 'test output';
        },
      };

      registerGenerator(plugin);
      expect(hasGenerator('test-generator')).toBe(true);
    });

    it('should throw if plugin already registered', () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        outputPath: 'output/test.ts',
        async generate() {
          return 'test output';
        },
      };

      registerGenerator(plugin);
      expect(() => registerGenerator(plugin)).toThrow();
    });
  });

  describe('unregisterGenerator', () => {
    it('should unregister a generator', () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        outputPath: 'output/test.ts',
        async generate() {
          return 'test output';
        },
      };

      registerGenerator(plugin);
      expect(hasGenerator('test-generator')).toBe(true);

      unregisterGenerator('test-generator');
      expect(hasGenerator('test-generator')).toBe(false);
    });

    it('should return false if plugin not found', () => {
      expect(unregisterGenerator('non-existent')).toBe(false);
    });
  });

  describe('getGenerator', () => {
    it('should get a registered generator', () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        outputPath: 'output/test.ts',
        async generate() {
          return 'test output';
        },
      };

      registerGenerator(plugin);
      const retrieved = getGenerator('test-generator');

      expect(retrieved).toBe(plugin);
    });

    it('should return null if plugin not found', () => {
      expect(getGenerator('non-existent')).toBeNull();
    });
  });

  describe('hasGenerator', () => {
    it('should return true for registered generator', () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        outputPath: 'output/test.ts',
        async generate() {
          return 'test output';
        },
      };

      registerGenerator(plugin);
      expect(hasGenerator('test-generator')).toBe(true);
    });

    it('should return false for unregistered generator', () => {
      expect(hasGenerator('non-existent')).toBe(false);
    });
  });

  describe('listGenerators', () => {
    it('should list all registered generators', () => {
      registerGenerator({
        name: 'gen1',
        outputPath: 'output/gen1.ts',
        async generate() {
          return '';
        },
      });

      registerGenerator({
        name: 'gen2',
        outputPath: 'output/gen2.ts',
        async generate() {
          return '';
        },
      });

      const list = listGenerators();
      expect(list).toContain('gen1');
      expect(list).toContain('gen2');
    });

    it('should return empty array if no generators', () => {
      expect(listGenerators()).toEqual([]);
    });
  });

  describe('getAllGenerators', () => {
    it('should return all registered plugins', () => {
      const plugin1: GeneratorPlugin = {
        name: 'gen1',
        outputPath: 'output/gen1.ts',
        async generate() {
          return '';
        },
      };

      const plugin2: GeneratorPlugin = {
        name: 'gen2',
        outputPath: 'output/gen2.ts',
        async generate() {
          return '';
        },
      };

      registerGenerator(plugin1);
      registerGenerator(plugin2);

      const all = getAllGenerators();
      expect(all).toHaveLength(2);
      expect(all).toContain(plugin1);
      expect(all).toContain(plugin2);
    });
  });

  describe('runGenerator', () => {
    it('should run a registered generator', async () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        outputPath: 'output/test.ts',
        async generate() {
          return 'test output';
        },
      };

      registerGenerator(plugin);
      const result = await runGenerator('test-generator', simpleManifest);

      expect(result).toBe('test output');
    });

    it('should throw if generator not found', async () => {
      await expect(runGenerator('non-existent', simpleManifest)).rejects.toThrow();
    });

    it('should pass manifest to generator', async () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        outputPath: 'output/test.ts',
        async generate(manifest) {
          return manifest.name;
        },
      };

      registerGenerator(plugin);
      const result = await runGenerator('test-generator', simpleManifest);

      expect(result).toBe('Simple App');
    });

    it('should pass options to generator', async () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        outputPath: 'output/test.ts',
        async generate(_manifest, options) {
          return options?.custom as string;
        },
      };

      registerGenerator(plugin);
      const result = await runGenerator('test-generator', simpleManifest, { custom: 'value' });

      expect(result).toBe('value');
    });

    it('should validate manifest if validator provided', async () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        outputPath: 'output/test.ts',
        async generate() {
          return 'test output';
        },
        validate() {
          return false;
        },
      };

      registerGenerator(plugin);
      await expect(runGenerator('test-generator', simpleManifest)).rejects.toThrow();
    });
  });

  describe('runAllGenerators', () => {
    it('should run all registered generators', async () => {
      registerGenerator({
        name: 'gen1',
        outputPath: 'output/gen1.ts',
        async generate() {
          return 'output1';
        },
      });

      registerGenerator({
        name: 'gen2',
        outputPath: 'output/gen2.ts',
        async generate() {
          return 'output2';
        },
      });

      const results = await runAllGenerators(simpleManifest);

      expect(results).toHaveProperty('gen1', 'output1');
      expect(results).toHaveProperty('gen2', 'output2');
    });

    it('should skip generators with failed validation', async () => {
      registerGenerator({
        name: 'gen1',
        outputPath: 'output/gen1.ts',
        async generate() {
          return 'output1';
        },
        validate() {
          return false;
        },
      });

      const results = await runAllGenerators(simpleManifest);

      expect(results).not.toHaveProperty('gen1');
    });
  });

  describe('apiDocsPlugin', () => {
    it('should generate API documentation', async () => {
      const docs = await apiDocsPlugin.generate(simpleManifest);

      expect(docs).toContain('# API Documentation');
      expect(docs).toContain('## User');
      expect(docs).toContain('GET /api/users');
      expect(docs).toContain('POST /api/users');
    });

    it('should validate manifest has entities', () => {
      expect(apiDocsPlugin.validate?.(simpleManifest)).toBe(true);
    });

    it('should have correct properties', () => {
      expect(apiDocsPlugin.name).toBe('api-docs');
      expect(apiDocsPlugin.outputPath).toBe('docs/api.md');
      expect(apiDocsPlugin.description).toBeDefined();
    });
  });

  describe('clearGenerators', () => {
    it('should clear all registered generators', () => {
      registerGenerator({
        name: 'gen1',
        outputPath: 'output/gen1.ts',
        async generate() {
          return '';
        },
      });

      expect(listGenerators()).toHaveLength(1);

      clearGenerators();
      expect(listGenerators()).toHaveLength(0);
    });
  });
});
