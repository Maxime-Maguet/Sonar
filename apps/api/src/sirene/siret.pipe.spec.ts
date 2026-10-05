import { BadRequestException } from '@nestjs/common';
import { SiretPipe } from './sirene.controller.js';

const INVALID_SIRET_MESSAGE = 'SIRET invalide : 14 chiffres attendus';

describe('SiretPipe', () => {
  const pipe = new SiretPipe();

  it('returns the same string when the SIRET is exactly 14 digits', () => {
    expect(pipe.transform('12345678900012')).toBe('12345678900012');
  });

  it('throws BadRequestException for 13 digits', () => {
    expect(() => pipe.transform('1234567890001')).toThrow(BadRequestException);
  });

  it('throws BadRequestException for 15 digits', () => {
    expect(() => pipe.transform('123456789000123')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when a letter is in the middle', () => {
    expect(() => pipe.transform('1234567890001A')).toThrow(BadRequestException);
  });

  it('throws BadRequestException for an empty string', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when the value contains a space', () => {
    expect(() => pipe.transform('123456789 0012')).toThrow(BadRequestException);
  });

  it('uses the exact invalid-SIRET message', () => {
    expect(() => pipe.transform('1234567890001A')).toThrow(
      INVALID_SIRET_MESSAGE,
    );

    try {
      pipe.transform('');
      expect.unreachable('expected BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: INVALID_SIRET_MESSAGE,
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  });
});
