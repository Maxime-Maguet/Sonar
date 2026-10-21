import { isPrivateOrLocalHost, parseWebOrigins } from './web-origins.js';

describe('parseWebOrigins', () => {
  it('parses a single origin', () => {
    expect(parseWebOrigins('http://localhost:3000')).toEqual([
      'http://localhost:3000',
    ]);
  });

  it('parses several origins, trims, normalizes and dedupes', () => {
    expect(
      parseWebOrigins(
        ' http://localhost:3000/ , http://192.168.1.20:3000,http://localhost:3000',
      ),
    ).toEqual(['http://localhost:3000', 'http://192.168.1.20:3000']);
  });

  it.each([
    '',
    '   ',
    'http://a.com,',
    ',http://a.com',
    'http://a.com,,http://b.com',
    'pas une url',
    'ftp://a.com',
    'http://a.com/app',
    'http://a.com?x=1',
    'http://a.com/#x',
    'http://user:pw@a.com',
  ])('rejects %j', (raw) => {
    expect(() => parseWebOrigins(raw)).toThrow(/WEB_ORIGIN/);
  });

  it('does not leak the rejected value in the error', () => {
    expect(() => parseWebOrigins('http://user:s3cret@a.com')).not.toThrow(
      /s3cret/,
    );
  });
});

describe('isPrivateOrLocalHost', () => {
  it.each([
    'localhost',
    '127.0.0.1',
    '127.5.5.5',
    '[::1]',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.1',
    '192.168.1.20',
    '169.254.1.1',
    'mac.local',
    '[fd00::1]',
    '[fe80::1]',
    'localhost.',
    'foo.local.',
    '[::7f00:1]',
    '[64:ff9b::7f00:1]',
    '100.64.0.1',
    '100.127.255.255',
    '0.0.0.0',
    '0.1.2.3',
    '224.0.0.1',
    '255.255.255.255',
  ])('flags %s', (host) => {
    expect(isPrivateOrLocalHost(host)).toBe(true);
  });

  it.each(['app.example.com', '8.8.8.8', '172.32.0.1', '172.15.0.1', '100.63.0.1', '100.128.0.1', '223.1.1.1', '[2001:db8::1]'])(
    'accepts %s',
    (host) => {
      expect(isPrivateOrLocalHost(host)).toBe(false);
    },
  );
});
