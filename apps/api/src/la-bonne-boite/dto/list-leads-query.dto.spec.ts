import 'reflect-metadata'; // necessary for class-validator
import { plainToInstance } from 'class-transformer'; // copie l’objet plat (comme une query string) vers une instance de classe
import { validateSync } from 'class-validator'; // valide une instance de classe
import { ListLeadsQueryDto } from './list-leads-query.dto.js';

// PIPE is a pipe for the validator
const PIPE = { whitelist: true, forbidNonWhitelisted: true } as const;

// validateQuery is a function that validates a query
function validateQuery(plain: object) {
  return validateSync(plainToInstance(ListLeadsQueryDto, plain), PIPE);
}
describe('ListLeadsQueryDto', () => {
  it('rejects invalid rome', () => {
    const errors = validateQuery({ rome: '12345' });
    expect(errors.some((e) => e.property === 'rome')).toBe(true);
  });
  it('missing rome', () => {
    const errors = validateQuery({});
    expect(errors.some((e) => e.property === 'rome')).toBe(true);
  });
  it('invalid pageSize', () => {
    const errors = validateQuery({ pageSize: '100' });
    expect(errors.some((e) => e.property === 'pageSize')).toBe(true);
  });
  it('accepts a valid rome', () => {
    expect(validateQuery({ rome: 'M1805' })).toHaveLength(0);
  });
});
