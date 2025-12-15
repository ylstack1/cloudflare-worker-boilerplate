#!/usr/bin/env node
import { runCli } from './run-cli.js';

console.log('[BIN] Starting CLI with args:', process.argv.slice(2));

runCli(process.argv.slice(2))
  .then(() => {
    console.log('[BIN] CLI completed successfully');
  })
  .catch((error) => {
    console.error('[BIN] Error:', error);
    process.exit(1);
  });
