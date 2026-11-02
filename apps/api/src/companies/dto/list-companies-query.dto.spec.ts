import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListCompaniesQueryDto } from './list-companies-query.dto.js';

const PIPE = { whitelist: true, forbidNonWhitelisted: true } as const;

function validateQuery(plain: object) {
  return validateSync(plainToInstance(ListCompaniesQueryDto, plain), PIPE);
}

function failsOn(plain: object, property: string): boolean {
  return validateQuery(plain).some((e) => e.property === property);
}

describe('ListCompaniesQueryDto', () => {
  it('applies the defaults (page 1, pageSize 20) on an empty query', () => {
    const dto = plainToInstance(ListCompaniesQueryDto, {});
    expect(validateSync(dto, PIPE)).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
  });

  it('accepts and converts valid values', () => {
    const dto = plainToInstance(ListCompaniesQueryDto, {
      page: '3',
      pageSize: '50',
      city: '  Lyon ',
      activityCode: '62.01Z',
    });
    expect(validateSync(dto, PIPE)).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(50);
    expect(dto.city).toBe('Lyon');
    expect(dto.activityCode).toBe('62.01Z');
  });

  it.each(['1', '10000', '0042'])('accepts page %s', (page) => {
    expect(validateQuery({ page })).toHaveLength(0);
  });

  it.each(['abc', '0', '1.5', '1e1', '10001', '-1', '', ' 5 ', '0x10'])(
    'rejects page %j',
    (page) => {
      expect(failsOn({ page }, 'page')).toBe(true);
    },
  );

  it('rejects a repeated page parameter (array)', () => {
    expect(failsOn({ page: ['1', '2'] }, 'page')).toBe(true);
  });

  it.each(['51', '100', '0', 'abc', '1.5', '1e1'])(
    'rejects pageSize %j',
    (pageSize) => {
      expect(failsOn({ pageSize }, 'pageSize')).toBe(true);
    },
  );

  it('accepts pageSize 50 and 1', () => {
    expect(validateQuery({ pageSize: '50' })).toHaveLength(0);
    expect(validateQuery({ pageSize: '1' })).toHaveLength(0);
  });

  it.each(['abc', '62.01z', '6201Z', '62.01', '62.01ZZ', '62.0Z', ''])(
    'rejects activityCode %j',
    (activityCode) => {
      expect(failsOn({ activityCode }, 'activityCode')).toBe(true);
    },
  );

  it.each(['62.01Z', '62.02A', '58.29C'])('accepts activityCode %s', (code) => {
    expect(validateQuery({ activityCode: code })).toHaveLength(0);
  });

  it.each(['', '   '])('rejects blank city %j', (city) => {
    expect(failsOn({ city }, 'city')).toBe(true);
  });

  it('rejects a city longer than 100 characters', () => {
    expect(failsOn({ city: 'a'.repeat(101) }, 'city')).toBe(true);
  });

  it('rejects an unknown key', () => {
    expect(failsOn({ foo: 'bar' }, 'foo')).toBe(true);
  });
});
