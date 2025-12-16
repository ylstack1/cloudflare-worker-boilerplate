#!/usr/bin/env node
import { runCli } from './run-cli.js';

runCli(process.argv.slice(2))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
