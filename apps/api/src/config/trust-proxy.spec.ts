import { parseTrustProxyHops, resolveTrustProxy } from './trust-proxy.js';

describe('parseTrustProxyHops', () => {
  it('returns undefined when absent or empty', () => {
    expect(parseTrustProxyHops(undefined)).toBeUndefined();
    expect(parseTrustProxyHops('')).toBeUndefined();
    expect(parseTrustProxyHops('   ')).toBeUndefined();
  });

  it.each([
    ['0', 0],
    ['1', 1],
    ['2', 2],
    [' 3 ', 3],
  ])('accepts the non-negative integer %j', (raw, expected) => {
    expect(parseTrustProxyHops(raw)).toBe(expected);
  });

  it.each(['-1', '1.5', 'abc', '1e2', '0x1', '+1', '99999999999999999999'])(
    'rejects %j without echoing it',
    (raw) => {
      expect(() => parseTrustProxyHops(raw)).toThrow(/TRUST_PROXY_HOPS/);
      expect(() => parseTrustProxyHops(raw)).not.toThrow(
        new RegExp(raw.replace(/[.+]/g, '\\$&')),
      );
    },
  );
});

describe('resolveTrustProxy', () => {
  it('trusts no proxy when the setting is absent', () => {
    expect(resolveTrustProxy(undefined)).toBe(false);
  });

  it('keeps zero and positive counts', () => {
    expect(resolveTrustProxy(0)).toBe(0);
    expect(resolveTrustProxy(2)).toBe(2);
  });
});
