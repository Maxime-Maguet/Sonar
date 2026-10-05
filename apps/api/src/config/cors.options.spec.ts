import { buildCorsOptions } from './cors.options.js';

describe('buildCorsOptions', () => {
  it('Uses the given origin and enables credentials', () => {
    const origin = 'https://app.example.com';
    const options = buildCorsOptions(origin);
    expect(options.origin).toBe(origin);
    expect(options.credentials).toBe(true);
    expect(options.origin).not.toBe('*');
  });
  it('includes all HTTP methods', () => {
    const origin = 'https://app.example.com';
    const options = buildCorsOptions(origin);
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
    const options = buildCorsOptions(origin);
    expect(options.allowedHeaders).toEqual(['Content-Type', 'Authorization']);
  });
});
