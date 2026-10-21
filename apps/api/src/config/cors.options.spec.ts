import { buildCorsOptions } from './cors.options.js';

describe('buildCorsOptions', () => {
  it('Uses the given origin and enables credentials', () => {
    const origin = 'https://app.example.com';
    const options = buildCorsOptions([origin]);
    expect(options.origin).toBe(origin);
    expect(options.credentials).toBe(true);
    expect(options.origin).not.toBe('*');
  });
  it('returns an array of origins when several are configured', () => {
    const options = buildCorsOptions([
      'http://localhost:3000',
      'http://192.168.1.20:3000',
    ]);
    expect(options.origin).toEqual([
      'http://localhost:3000',
      'http://192.168.1.20:3000',
    ]);
  });
  it('rejects an invalid list', () => {
    expect(() => buildCorsOptions([])).toThrow(/WEB_ORIGIN/);
  });
  it('includes all HTTP methods', () => {
    const origin = 'https://app.example.com';
    const options = buildCorsOptions([origin]);
    expect(options.methods).toEqual([
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'OPTIONS',
      'PATCH',
      'HEAD',
    ]);
  });
  it('includes all allowed headers', () => {
    const origin = 'https://app.example.com';
    const options = buildCorsOptions([origin]);
    expect(options.allowedHeaders).toEqual(['Content-Type', 'Authorization']);
  });
  describe('production', () => {
    it.each([
      'http://localhost:3000',
      'http://192.168.1.20:3000',
      'http://10.0.0.5',
      'http://[::1]:3000',
      'http://app.local',
    ])('refuse %s', (origin) => {
      expect(() => buildCorsOptions([origin], 'production')).toThrow(
        /WEB_ORIGIN/,
      );
      expect(() => buildCorsOptions([origin], ' Production ')).toThrow(
        /WEB_ORIGIN/,
      );
    });
    it('accepte une origine publique', () => {
      expect(
        buildCorsOptions(['https://app.example.com'], 'production').origin,
      ).toBe('https://app.example.com');
    });
    it('accepte localhost hors production', () => {
      expect(() =>
        buildCorsOptions(['http://localhost:3000'], 'development'),
      ).not.toThrow();
      expect(() => buildCorsOptions(['http://localhost:3000'])).not.toThrow();
    });
  });
});
