import { describe, expect, it } from 'vitest';
import { cli } from '../src/index';

describe('@edge-manifest/cli', () => {
  it('should return CLI info', () => {
    const info = cli();
    expect(info).toBeDefined();
    expect(info.version).toBe('0.0.0');
  });
});
