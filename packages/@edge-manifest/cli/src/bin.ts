#!/usr/bin/env node
import { runCli } from './run-cli.js.js';

await runCli(process.argv.slice(2));
