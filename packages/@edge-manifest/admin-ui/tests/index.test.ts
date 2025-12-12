import { describe, expect, it } from 'vitest';
import { createUI } from '../src/index';

describe('@edge-manifest/admin-ui', () => {
  it('should create a UI instance', () => {
    const ui = createUI({ theme: 'dark' });
    expect(ui).toBeDefined();
    expect(ui.config).toEqual({ theme: 'dark' });
  });
});
