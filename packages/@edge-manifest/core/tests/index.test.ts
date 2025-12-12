import { describe, expect, it } from 'vitest';
import { createCore } from '../src/index';

describe('@edge-manifest/core', () => {
  it('should create a core instance', () => {
    const core = createCore({ apiUrl: 'https://api.example.com' });
    expect(core).toBeDefined();
    expect(core.config).toEqual({ apiUrl: 'https://api.example.com' });
  });
});
