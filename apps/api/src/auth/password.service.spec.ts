import { BadRequestException } from '@nestjs/common';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('stores a bcrypt hash, not the plain password', async () => {
    const hash = await service.hash('correct horse battery');

    expect(hash).not.toBe('correct horse battery');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('produces a different hash each time for the same password', async () => {
    const first = await service.hash('correct horse battery');
    const second = await service.hash('correct horse battery');

    expect(first).not.toBe(second);
  });

  it('accepts a password of exactly 72 bytes', async () => {
    const hash = await service.hash('a'.repeat(72));

    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await service.hash('correct horse battery');

    await expect(service.verify('correct horse battery', hash)).resolves.toBe(
      true,
    );
    await expect(service.verify('wrong password', hash)).resolves.toBe(false);
  });

  it('returns false when the stored hash is corrupt', async () => {
    await expect(
      service.verify('correct horse battery', 'not-a-bcrypt-hash'),
    ).resolves.toBe(false);
  });

  it('returns false when the password or the hash is blank', async () => {
    const hash = await service.hash('correct horse battery');

    await expect(service.verify('   ', hash)).resolves.toBe(false);
    await expect(
      service.verify('correct horse battery', '   '),
    ).resolves.toBe(false);
  });

  it('rejects an empty or whitespace password', async () => {
    await expect(service.hash('')).rejects.toThrow(BadRequestException);
    await expect(service.hash('   ')).rejects.toThrow(BadRequestException);
  });

  it('rejects a password longer than 72 bytes', async () => {
    await expect(service.hash('a'.repeat(73))).rejects.toThrow(
      BadRequestException,
    );
  });
});
