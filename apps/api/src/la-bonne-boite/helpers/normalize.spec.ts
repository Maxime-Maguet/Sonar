import { LBB_SEARCH_ITEM_EXAMPLE } from './search.fixture.js';
import { normalizeLead } from './normalize.js';

/** Item live Toulouse (forme réelle) — pas de dump complet. */
const toulouseItem = {
  rome: 'M1805',
  siret: '88123980000017',
  email: 'yes',
  company_name: 'TOMORRO',
  office_name: '',
  naf: '6209Z',
  city: 'Toulouse',
  citycode: '31555',
  postcode: '31000',
  hiring_potential: 23.795312627999998,
};

describe('normalizeLead', () => {
  it('maps the official LBB fixture to a LeadFiche', () => {
    const result = normalizeLead(LBB_SEARCH_ITEM_EXAMPLE);

    expect(result).toEqual({
      siret: '30509416100034',
      siren: '305094161',
      name: 'MAISON NICOLAS',
      slug: 'maison-nicolas-305094161',
      city: 'Metz',
      postalCode: '57000',
      communeInseeCode: '57463',
      rome: 'D1102',
      naf: '4781Z',
      hiringPotential: 2.4201609999999993,
      isHighPotential: false,
    });
    expect(result).not.toHaveProperty('hiring_potential');
    expect(result).not.toHaveProperty('email');
  });

  it('maps a live Toulouse item and ignores extra LBB fields', () => {
    const result = normalizeLead(toulouseItem);

    expect(result).toEqual({
      siret: '88123980000017',
      siren: '881239800',
      name: 'TOMORRO',
      slug: 'tomorro-881239800',
      city: 'Toulouse',
      postalCode: '31000',
      communeInseeCode: '31555',
      rome: 'M1805',
      naf: '6209Z',
      hiringPotential: 23.795312627999998,
      isHighPotential: null,
    });
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('hiring_potential');
  });

  it('returns null when siret is missing or not 14 digits', () => {
    expect(normalizeLead({ ...toulouseItem, siret: 'abc' })).toBeNull();
    expect(normalizeLead({ ...toulouseItem, siret: '123' })).toBeNull();
    expect(normalizeLead({ ...toulouseItem, siret: '' })).toBeNull();
    expect(
      normalizeLead({ company_name: 'X', city: 'Toulouse' }),
    ).toBeNull();
  });

  it('returns null when company_name and office_name are empty', () => {
    expect(
      normalizeLead({
        ...toulouseItem,
        company_name: '',
        office_name: '   ',
      }),
    ).toBeNull();
  });

  it('returns null for non-objects', () => {
    expect(normalizeLead(null)).toBeNull();
    expect(normalizeLead([])).toBeNull();
    expect(normalizeLead('88123980000017')).toBeNull();
  });

  it('keeps the lead when the hiring score is not a finite number', () => {
    const result = normalizeLead({
      ...toulouseItem,
      hiring_potential: Number.NaN,
      is_high_potential: 'false',
    });

    expect(result?.hiringPotential).toBeNull();
    expect(result?.isHighPotential).toBeNull();
  });

  it('still normalizes a city outside Toulouse couronne', () => {
    expect(normalizeLead(LBB_SEARCH_ITEM_EXAMPLE)?.communeInseeCode).toBe(
      '57463',
    );
  });
});
