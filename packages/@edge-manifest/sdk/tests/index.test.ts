import { describe, expect, it } from 'vitest';
import { createSDK } from '../src/index';

describe('@edge-manifest/sdk', () => {
  it('should create an SDK instance', () => {
    const sdk = createSDK({ endpoint: 'https://api.example.com' });
    expect(sdk).toBeDefined();
    expect(sdk.config).toEqual({ endpoint: 'https://api.example.com' });
  });
});
