import { treaty } from '@elysiajs/eden';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

function createApp() {
  const api = app({});
  return treaty(api);
}

describe('EDGE-MANIFEST Worker', () => {
  const api = createApp();

  it('should initialize the app', () => {
    expect(api).toBeDefined();
  });
});
