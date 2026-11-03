import { resolveDatabaseUrl } from './database-url.js';

const DIRECT = 'postgresql://sonar:sonar@localhost:5433/sonar';
const POOLED = 'postgresql://sonar:sonar@pooler.example.com:6543/sonar';

describe('resolveDatabaseUrl', () => {
  it('uses the pooled address when it is set', () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: DIRECT, DATABASE_URL_POOLED: POOLED }),
    ).toBe(POOLED);
  });

  it('uses the pooled address even without DATABASE_URL', () => {
    expect(resolveDatabaseUrl({ DATABASE_URL_POOLED: POOLED })).toBe(POOLED);
  });

  it('falls back to DATABASE_URL when the pooled one is absent', () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: DIRECT })).toBe(DIRECT);
  });

  it.each(['', '   '])(
    'treats a pooled value of %j as absent',
    (pooled) => {
      expect(
        resolveDatabaseUrl({
          DATABASE_URL: DIRECT,
          DATABASE_URL_POOLED: pooled,
        }),
      ).toBe(DIRECT);
    },
  );

  it('throws the clear error when neither variable is set', () => {
    expect(() => resolveDatabaseUrl({})).toThrow('DATABASE_URL is required');
    expect(() =>
      resolveDatabaseUrl({ DATABASE_URL: '', DATABASE_URL_POOLED: ' ' }),
    ).toThrow('DATABASE_URL is required');
  });
});
