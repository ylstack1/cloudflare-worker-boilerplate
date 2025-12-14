import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { validateManifest } from '@edge-manifest/core';
import { generateAll } from '@edge-manifest/generators';
import { parse as parseYaml } from 'yaml';

export interface SetupOptions {
  cwd: string;
  manifestPath?: string;
  outDir?: string;
  force?: boolean;
}

const DEFAULT_OUT_DIR = '.output';

const MANIFEST_CANDIDATES = [
  'manifest.ts',
  '.manifest.json',
  '.manifest.yaml',
  '.manifest.yml',
  'manifest.yaml',
  'manifest.yml',
  'manifest.json',
] as const;

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.output', '.wrangler']);

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findFileByName(rootDir: string, fileName: string): Promise<string | undefined> {
  const queue: string[] = [rootDir];

  while (queue.length > 0) {
    const dir = queue.shift();
    if (!dir) continue;

    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          queue.push(path.join(dir, entry.name));
        }
        continue;
      }

      if (entry.isFile() && entry.name === fileName) {
        return path.join(dir, entry.name);
      }
    }
  }

  return undefined;
}

async function detectManifestPath(cwd: string): Promise<string> {
  for (const candidate of MANIFEST_CANDIDATES) {
    const atRoot = path.join(cwd, candidate);
    if (await fileExists(atRoot)) return atRoot;

    const found = await findFileByName(cwd, candidate);
    if (found) return found;
  }

  throw new Error(
    `No manifest found. Looked for: ${MANIFEST_CANDIDATES.map((c) => JSON.stringify(c)).join(', ')} (starting at ${cwd})`,
  );
}

async function loadManifest(filePath: string): Promise<unknown> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.ts' || ext === '.mts' || ext === '.cts') {
    const { register } = await import('esbuild-register/dist/node');
    const { unregister } = register({ format: 'cjs' });

    try {
      const require = createRequire(import.meta.url);
      const mod = require(filePath) as Record<string, unknown>;
      return mod.default ?? mod.manifest ?? mod;
    } finally {
      unregister();
    }
  }

  const raw = await readFile(filePath, 'utf-8');

  if (ext === '.json') {
    return JSON.parse(raw);
  }

  if (ext === '.yaml' || ext === '.yml') {
    return parseYaml(raw);
  }

  throw new Error(`Unsupported manifest extension: ${ext}`);
}

function formatMigrationTimestampForFilename(date: Date): string {
  const iso = date.toISOString();
  return iso.replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '').replace('Z', '');
}

async function writeFileGuarded(filePath: string, content: string, force: boolean): Promise<void> {
  if (!force && (await fileExists(filePath))) {
    throw new Error(`Refusing to overwrite existing file: ${filePath} (use --force)`);
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}

export async function setupWorkspace(options: SetupOptions): Promise<void> {
  const cwd = options.cwd;
  const outDir = path.isAbsolute(options.outDir ?? DEFAULT_OUT_DIR)
    ? (options.outDir ?? DEFAULT_OUT_DIR)
    : path.join(cwd, options.outDir ?? DEFAULT_OUT_DIR);

  const manifestPath = options.manifestPath
    ? path.isAbsolute(options.manifestPath)
      ? options.manifestPath
      : path.join(cwd, options.manifestPath)
    : await detectManifestPath(cwd);

  const manifestLike = await loadManifest(manifestPath);
  const manifest = validateManifest(manifestLike);

  const generated = await generateAll(manifest);

  await mkdir(outDir, { recursive: true });

  await writeFileGuarded(path.join(outDir, 'schema.ts'), generated.schema, Boolean(options.force));
  await writeFileGuarded(
    path.join(outDir, 'types.ts'),
    [generated.types, generated.apiTypes].filter(Boolean).join('\n\n'),
    Boolean(options.force),
  );
  await writeFileGuarded(path.join(outDir, 'routes.ts'), generated.routes, Boolean(options.force));
  await writeFileGuarded(path.join(outDir, 'config.ts'), generated.config, Boolean(options.force));
  await writeFileGuarded(
    path.join(outDir, 'admin-assets.ts'),
    generated.adminAssetsModule,
    Boolean(options.force),
  );

  for (const [relativePath, body] of Object.entries(generated.adminAssets)) {
    await writeFileGuarded(path.join(outDir, relativePath), body, Boolean(options.force));
  }

  const ts = formatMigrationTimestampForFilename(new Date());
  await writeFileGuarded(
    path.join(outDir, 'migrations', `${ts}_init.sql`),
    generated.migrations,
    Boolean(options.force),
  );

  console.info(`Generated EDGE-MANIFEST artifacts in ${outDir} (manifest: ${manifestPath})`);
}
