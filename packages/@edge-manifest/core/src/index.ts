/**
 * EDGE-MANIFEST Core API
 *
 * This module provides the core functionality for EDGE-MANIFEST.
 * Currently stubbed pending core feature implementation.
 */

export type CoreConfig = Record<string, unknown>;

export function createCore(config: CoreConfig) {
  return {
    config,
  };
}

export * from './manifest/types';
export * from './manifest/validator';
export * from './config/config-parser';
