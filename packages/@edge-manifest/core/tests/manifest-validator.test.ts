import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateManifest } from '../src/index';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'manifest');

async function readFixture(fileName: string): Promise<unknown> {
  const raw = await readFile(join(fixturesDir, fileName), 'utf8');
  return JSON.parse(raw) as unknown;
}

describe('manifest validator', () => {
  it('accepts a valid manifest', async () => {
    const manifest = await readFixture('valid.json');
    const parsed = validateManifest(manifest);

    expect(parsed.id).toBe('test-app');
    expect(parsed.entities).toHaveLength(1);
    expect(parsed.entities[0]?.name).toBe('User');
  });

  it('rejects an empty entities array', async () => {
    const manifest = await readFixture('invalid-empty-entities.json');

    expect(() => validateManifest(manifest)).toThrowError(/\$\.entities/);
  });

  it('rejects a field missing its kind/type', async () => {
    const manifest = await readFixture('invalid-missing-field-kind.json');

    expect(() => validateManifest(manifest)).toThrowError(/\$\.entities\[0\]\.fields\[0\]\.kind/);
  });

  it('rejects duplicate entity names', async () => {
    const manifest = await readFixture('invalid-duplicate-entity-name.json');

    expect(() => validateManifest(manifest)).toThrowError(/\$\.entities\[1\]\.name/);
  });

  it('rejects relation fields that reference unknown entities', async () => {
    const manifest = await readFixture('invalid-relation-unknown-entity.json');

    expect(() => validateManifest(manifest)).toThrowError(/\$\.entities\[0\]\.fields\[1\]\.relation\.entity/);
  });
});
