import { cac } from 'cac';
import { setupWorkspace } from './setup';

export async function runCli(argv: string[]): Promise<void> {
  const cli = cac('edge-manifest');

  cli
    .command('setup', 'Generate .output artifacts from a manifest')
    .option('--manifest <path>', 'Path to manifest (manifest.ts, .manifest.json/yaml/yml, manifest.yaml/yml)')
    .option('--out-dir <path>', 'Output directory (default: .output)')
    .option('--force', 'Overwrite existing files')
    .action(async (options: { manifest?: string; outDir?: string; force?: boolean }) => {
      await setupWorkspace({
        cwd: process.cwd(),
        manifestPath: options.manifest,
        outDir: options.outDir,
        force: Boolean(options.force),
      });
    });

  cli.help();

  await cli.parse(argv, { run: true });
}
