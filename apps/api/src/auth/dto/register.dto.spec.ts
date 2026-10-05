import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterDto } from './register.dto.js';

const PIPE = { whitelist: true, forbidNonWhitelisted: true } as const;

function validateRegister(plain: object) {
  return validateSync(plainToInstance(RegisterDto, plain), PIPE);
}

describe('RegisterDto', () => {
  it('accepts a valid email and password', () => {
    expect(
      validateRegister({ email: 'ada@example.com', password: 'correct horse' }),
    ).toHaveLength(0);
  });

  it('keeps leading and trailing spaces in a long enough password', () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'ada@example.com',
      password: '  twelve chars ',
    });

    expect(dto.password).toBe('  twelve chars ');
    expect(validateSync(dto, PIPE)).toHaveLength(0);
  });

  it.each(['   ', ' '.repeat(8)])(
    'rejects a whitespace-only password %j',
    (password) => {
      const errors = validateRegister({
        email: 'ada@example.com',
        password,
      });
      expect(errors.some((error) => error.property === 'password')).toBe(true);
    },
  );

  it('accepts a password of exactly 8 characters', () => {
    expect(
      validateRegister({ email: 'ada@example.com', password: 'abcdefgh' }),
    ).toHaveLength(0);
  });

  it('rejects a password shorter than 8 characters', () => {
    const errors = validateRegister({
      email: 'ada@example.com',
      password: 'abcdefg',
    });
    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('trims and lowercases email before validation', () => {
    const dto = plainToInstance(RegisterDto, {
      email: ' Ada@Example.com ',
      password: 'correct horse',
    });

    expect(dto.email).toBe('ada@example.com');
    expect(validateSync(dto, PIPE)).toHaveLength(0);
  });

  it.each([undefined, '', 'not-an-email', 12, null])(
    'rejects invalid or missing email %j',
    (email) => {
      const errors = validateRegister({ email, password: 'correct horse' });
      expect(errors.some((error) => error.property === 'email')).toBe(true);
    },
  );

  it.each([undefined, '', 12, null])(
    'rejects missing, empty, or non-string password %j',
    (password) => {
      const errors = validateRegister({
        email: 'ada@example.com',
        password,
      });
      expect(errors.some((error) => error.property === 'password')).toBe(true);
    },
  );

  it('rejects extra properties', () => {
    const errors = validateRegister({
      email: 'ada@example.com',
      password: 'correct horse',
      role: 'admin',
    });

    expect(errors.some((error) => error.property === 'role')).toBe(true);
  });
});
