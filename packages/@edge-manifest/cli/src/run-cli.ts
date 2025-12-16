import { type SetupOptions, setupWorkspace } from './setup.js';

export async function runCli(argv: string[]): Promise<void> {
  const command = argv[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(`
edge-manifest CLI

Commands:
  setup [options]    Generate .output artifacts from a manifest

Options:
  --manifest <path>  Path to manifest file (default: auto-detect)
  --out-dir <path>   Output directory (default: .output)
  --force            Overwrite existing files
  --help, -h         Show help
  --version, -v      Show version

Examples:
  edge-manifest setup
  edge-manifest setup --manifest manifest.ts --force
`);
    return;
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log('0.0.0');
    return;
  }

  if (command === 'setup') {
    const options: { manifest?: string; outDir?: string; force?: boolean } = {};

    for (let i = 1; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === '--manifest' && i + 1 < argv.length) {
        const nextArg = argv[++i];
        if (nextArg) options.manifest = nextArg;
      } else if (arg === '--out-dir' && i + 1 < argv.length) {
        const nextArg = argv[++i];
        if (nextArg) options.outDir = nextArg;
      } else if (arg === '--force') {
        options.force = true;
      }
    }

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
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Run "edge-manifest --help" for usage information');
  process.exit(1);
}
