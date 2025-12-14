#!/usr/bin/env node
import { runCli } from './run-cli';

await runCli(process.argv.slice(2));
