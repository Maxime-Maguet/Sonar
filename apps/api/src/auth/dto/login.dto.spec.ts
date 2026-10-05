import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from './login.dto.js';

const PIPE = { whitelist: true, forbidNonWhitelisted: true } as const;

function validateLogin(plain: object) {
  return validateSync(plainToInstance(LoginDto, plain), PIPE);
}

describe('LoginDto', () => {
  it('accepts a valid email and password', () => {
    expect(
      validateLogin({ email: 'ada@example.com', password: 'correct horse' }),
    ).toHaveLength(0);
  });

  it('accepts a well-formed email with a short password', () => {
    expect(
      validateLogin({ email: 'ada@example.com', password: 'x' }),
    ).toHaveLength(0);
  });

  it('accepts a password shorter than 8 characters', () => {
    expect(
      validateLogin({ email: 'ada@example.com', password: 'abcdefg' }),
    ).toHaveLength(0);
  });

  it('keeps a short password, including surrounding spaces', () => {
    const dto = plainToInstance(LoginDto, {
      email: 'ada@example.com',
      password: '  x ',
    });

    expect(dto.password).toBe('  x ');
    expect(validateSync(dto, PIPE)).toHaveLength(0);
  });

  it.each(['   ', ' '.repeat(8)])(
    'rejects a whitespace-only password %j',
    (password) => {
      const errors = validateLogin({
        email: 'ada@example.com',
        password,
      });
      expect(errors.some((error) => error.property === 'password')).toBe(true);
    },
  );

  it('trims and lowercases email before validation', () => {
    const dto = plainToInstance(LoginDto, {
      email: ' Ada@Example.com ',
      password: 'correct horse',
    });

    expect(dto.email).toBe('ada@example.com');
    expect(validateSync(dto, PIPE)).toHaveLength(0);
  });

  it.each([undefined, '', 'not-an-email', 12, null])(
    'rejects invalid or missing email %j',
    (email) => {
      const errors = validateLogin({ email, password: 'correct horse' });
      expect(errors.some((error) => error.property === 'email')).toBe(true);
    },
  );

  it.each([undefined, '', 12, null])(
    'rejects missing, empty, or non-string password %j',
    (password) => {
      const errors = validateLogin({
        email: 'ada@example.com',
        password,
      });
      expect(errors.some((error) => error.property === 'password')).toBe(true);
    },
  );

  it('rejects extra properties', () => {
    const errors = validateLogin({
      email: 'ada@example.com',
      password: 'correct horse',
      rememberMe: true,
    });

    expect(errors.some((error) => error.property === 'rememberMe')).toBe(true);
  });
});
