/**
 * EDGE-MANIFEST Admin UI
 *
 * Web interface for EDGE-MANIFEST administration.
 * Currently stubbed pending admin UI implementation.
 */

export type UIConfig = Record<string, unknown>;

export function createUI(config: UIConfig) {
  return {
    config,
  };
}
