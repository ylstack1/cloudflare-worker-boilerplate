import { describe, expect, it } from 'vitest';
import { ConfigParser, type FileLoader } from '../src/config/config-parser';
import type { EdgeManifest } from '../src/manifest/types';

// Mock file loader for testing
class MockFileLoader implements FileLoader {
  constructor(
    private shouldSucceed = true,
    private content = '',
  ) {}

  async readFile(path: string): Promise<string> {
    if (!this.shouldSucceed) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return this.content;
  }
}

// Sample valid manifest for testing
const validManifest: EdgeManifest = {
  id: 'test-manifest',
  name: 'Test Manifest',
  version: '1.0.0',
  entities: [
    {
      name: 'User',
      fields: [
        {
          name: 'id',
          kind: 'id' as const,
          required: true,
        },
        {
          name: 'email',
          kind: 'string' as const,
          required: true,
        },
        {
          name: 'name',
          kind: 'string' as const,
          required: false,
        },
      ],
    },
  ],
};

// Sample invalid manifest (missing required fields)
const invalidManifest = {
  id: '',
  name: 'Test Manifest',
  version: '1.0.0',
  entities: [],
};

describe('ConfigParser', () => {
  describe('loadFromFile', () => {
    it('should successfully load from a temporary file', async () => {
      const content = JSON.stringify(validManifest);
      const loader = new MockFileLoader(true, content);
      const parser = new ConfigParser(loader);

      const result = await parser.loadFromFile('./test-manifest.json');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-manifest');
      expect(result.name).toBe('Test Manifest');
      expect(result.version).toBe('1.0.0');
      expect(result.entities).toHaveLength(1);
      expect(result.entities?.[0]?.name).toBe('User');
      expect(result._meta?.sourcePath).toBe('./test-manifest.json');
      expect(result._meta?.loadedAt).toBeInstanceOf(Date);
    });

    it('should handle missing file path', async () => {
      const loader = new MockFileLoader(false);
      const parser = new ConfigParser(loader);

      await expect(parser.loadFromFile('./non-existent.json')).rejects.toThrow('ENOENT: no such file or directory');
    });

    it('should handle malformed JSON', async () => {
      const malformedJson = '{ "id": "test", "invalid": json }';
      const loader = new MockFileLoader(true, malformedJson);
      const parser = new ConfigParser(loader);

      await expect(parser.loadFromFile('./malformed.json')).rejects.toThrow(
        'Failed to parse manifest JSON from ./malformed.json:',
      );
    });

    it('should handle invalid manifest content', async () => {
      const content = JSON.stringify(invalidManifest);
      const loader = new MockFileLoader(true, content);
      const parser = new ConfigParser(loader);

      await expect(parser.loadFromFile('./invalid.json')).rejects.toThrow(
        'Failed to load manifest from ./invalid.json:',
      );
    });

    it('should apply runtime overrides when loading from file', async () => {
      const content = JSON.stringify(validManifest);
      const loader = new MockFileLoader(true, content);
      const parser = new ConfigParser(loader);

      const result = await parser.loadFromFile('./test.json', {
        runtimeOverrides: {
          defaultRegion: 'us-west-2',
          generatorFlags: {
            generateTypes: true,
            generateSchema: false,
          },
        },
      });

      expect((result.generators as Record<string, unknown>)?.defaultRegion).toBe('us-west-2');
      expect((result.generators as Record<string, unknown>)?.generateTypes).toBe(true);
      expect((result.generators as Record<string, unknown>)?.generateSchema).toBe(false);
      expect(result._meta?.runtimeOverrides?.defaultRegion).toBe('us-west-2');
    });
  });

  describe('loadFromObject', () => {
    it('should successfully load from a valid object', () => {
      const parser = new ConfigParser();
      const result = parser.loadFromObject(validManifest);

      expect(result).toBeDefined();
      expect(result.id).toBe('test-manifest');
      expect(result.name).toBe('Test Manifest');
      expect(result.version).toBe('1.0.0');
      expect(result.entities).toHaveLength(1);
      expect(result._meta?.loadedAt).toBeInstanceOf(Date);
    });

    it('should handle invalid manifest object', () => {
      const parser = new ConfigParser();

      expect(() => parser.loadFromObject(invalidManifest)).toThrow('Failed to load manifest:');
    });

    it('should apply runtime overrides when loading from object', () => {
      const parser = new ConfigParser();
      const result = parser.loadFromObject(validManifest, {
        runtimeOverrides: {
          defaultRegion: 'eu-central-1',
          customFlag: true,
        },
      });

      expect((result.generators as Record<string, unknown>)?.defaultRegion).toBe('eu-central-1');
      expect((result.generators as Record<string, unknown>)?.customFlag).toBe(true);
      expect(result._meta?.runtimeOverrides?.defaultRegion).toBe('eu-central-1');
    });

    it('should add metadata to result', () => {
      const parser = new ConfigParser();
      const result = parser.loadFromObject(validManifest, {
        sourcePath: './inline-manifest.json',
        runtimeOverrides: { testFlag: true },
      });

      expect(result._meta?.sourcePath).toBe('./inline-manifest.json');
      expect(result._meta?.runtimeOverrides).toEqual({ testFlag: true });
      expect(result._meta?.loadedAt).toBeInstanceOf(Date);
    });
  });

  describe('getConfig', () => {
    it('should return undefined before loading config', () => {
      const parser = new ConfigParser();
      expect(parser.getConfig()).toBeUndefined();
    });

    it('should return config after loading', () => {
      const parser = new ConfigParser();
      const result = parser.loadFromObject(validManifest);

      const config = parser.getConfig();
      expect(config).toBeDefined();
      expect(config?.id).toBe(result.id);
      expect(config?.name).toBe(result.name);
      expect(config).toBe(result); // Should return the same reference
    });

    it('should persist config across getConfig calls', () => {
      const parser = new ConfigParser();
      parser.loadFromObject(validManifest);

      const config1 = parser.getConfig();
      const config2 = parser.getConfig();
      expect(config1).toBe(config2);
    });
  });

  describe('custom FileLoader', () => {
    it('should work with custom FileLoader implementation', async () => {
      const customLoader: FileLoader = {
        async readFile(path: string): Promise<string> {
          if (path === '/custom/path/manifest.json') {
            return JSON.stringify(validManifest);
          }
          throw new Error('Custom loader error');
        },
      };

      const parser = new ConfigParser(customLoader);
      const result = await parser.loadFromFile('/custom/path/manifest.json');

      expect(result.id).toBe('test-manifest');
      expect(result._meta?.sourcePath).toBe('/custom/path/manifest.json');
    });
  });

  describe('runtime overrides merging', () => {
    it('should merge defaultRegion into generators', () => {
      const parser = new ConfigParser();
      const baseManifest: EdgeManifest = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        entities: [
          {
            name: 'TestEntity',
            fields: [
              {
                name: 'id',
                kind: 'id' as const,
                required: true,
              },
            ],
          },
        ],
        generators: {
          existingFlag: true,
        },
      };

      const result = parser.loadFromObject(baseManifest, {
        runtimeOverrides: {
          defaultRegion: 'us-east-1',
        },
      });

      expect((result.generators as Record<string, unknown>)?.defaultRegion).toBe('us-east-1');
      expect((result.generators as Record<string, unknown>)?.existingFlag).toBe(true); // Preserve existing
    });

    it('should merge generatorFlags into generators', () => {
      const parser = new ConfigParser();
      const result = parser.loadFromObject(validManifest, {
        runtimeOverrides: {
          generatorFlags: {
            generateAPI: true,
            generateAdmin: false,
          },
        },
      });

      expect((result.generators as Record<string, unknown>)?.generateAPI).toBe(true);
      expect((result.generators as Record<string, unknown>)?.generateAdmin).toBe(false);
    });

    it('should handle custom runtime overrides', () => {
      const parser = new ConfigParser();
      const result = parser.loadFromObject(validManifest, {
        runtimeOverrides: {
          customConfig: { setting: 'value' },
          numberSetting: 42,
          booleanSetting: true,
        },
      });

      expect((result.generators as Record<string, unknown>)?.customConfig).toEqual({ setting: 'value' });
      expect((result.generators as Record<string, unknown>)?.numberSetting).toBe(42);
      expect((result.generators as Record<string, unknown>)?.booleanSetting).toBe(true);
    });

    it('should not mutate the original manifest', () => {
      const parser = new ConfigParser();
      const originalManifest = JSON.parse(JSON.stringify(validManifest));

      parser.loadFromObject(originalManifest, {
        runtimeOverrides: { defaultRegion: 'test' },
      });

      // Original manifest should not have generators
      expect(originalManifest.generators).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should provide detailed error messages with source path', async () => {
      const loader = new MockFileLoader(true, JSON.stringify(invalidManifest));
      const parser = new ConfigParser(loader);

      await expect(parser.loadFromFile('/path/to/manifest.json')).rejects.toThrow(
        'Failed to load manifest from /path/to/manifest.json:',
      );
    });

    it('should preserve original validation error messages', () => {
      const parser = new ConfigParser();

      expect(() => parser.loadFromObject({ invalid: 'manifest' })).toThrow('Manifest validation failed:');
    });
  });
});
