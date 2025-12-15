import { cac } from 'cac';
import { type SetupOptions, setupWorkspace } from './setup.js.js';

export async function runCli(argv: string[]): Promise<void> {
  const cli = cac('edge-manifest');

  cli
    .command('setup', 'Generate .output artifacts from a manifest')
    .option('--manifest <path>', 'Path to manifest (manifest.ts, .manifest.json/yaml/yml, manifest.yaml/yml)')
    .option('--out-dir <path>', 'Output directory (default: .output)')
    .option('--force', 'Overwrite existing files')
    .action(async (options: { manifest?: string; outDir?: string; force?: boolean }) => {
      const setupOptions: SetupOptions = {
        cwd: process.cwd(),
        force: Boolean(options.force),
      };

      if (options.manifest !== undefined) {
        setupOptions.manifestPath = options.manifest;
      }

      if (options.outDir !== undefined) {
        setupOptions.outDir = options.outDir;
      }

      await setupWorkspace(setupOptions);
    });

  cli.help();

  await cli.parse(argv, { run: true });
}
