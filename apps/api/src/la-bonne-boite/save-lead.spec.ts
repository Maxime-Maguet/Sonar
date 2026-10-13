import { BadRequestException } from '@nestjs/common';
import type { LeadFiche } from './helpers/normalize.js';
import { saveLead, COMPANY_SOURCE_LBB } from './la-bonne-boite.service.js';

function lead(overrides: Partial<LeadFiche> = {}): LeadFiche {
  return {
    siret: '12345678900012',
    siren: '123456789',
    name: 'SARL Dupont',
    slug: 'sarl-dupont-123456789',
    city: 'Toulouse',
    postalCode: null,
    communeInseeCode: null,
    rome: 'M1805',
    naf: null,
    hiringPotential: 31.94,
    isHighPotential: false,
    ...overrides,
  };
}
describe('saveLead', () => {
  const findUnique = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const upsert = vi.fn();
  const prisma = {
    company: { findUnique, create, update, upsert },
    recruitmentSignal: { upsert },
    $transaction: async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
  } as never;

  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
    update.mockReset();
    upsert.mockReset();
  });

  it('keeps an existing SIRENE company and upserts the signal', async () => {
    findUnique.mockResolvedValueOnce({ id: 'company-1' });
    upsert.mockResolvedValue({});
    const saved = await saveLead(prisma, lead());
    expect(saved).toEqual({ companyId: 'company-1' });
    expect(findUnique).toHaveBeenCalledWith({
      where: { siren: '123456789' },
    });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      where: {
        source_externalId: {
          source: COMPANY_SOURCE_LBB,
          externalId: '12345678900012:M1805',
        },
      },
      create: expect.objectContaining({
        companyId: 'company-1',
        type: 'POTENTIAL_RECRUITMENT',
        source: COMPANY_SOURCE_LBB,
        externalId: '12345678900012:M1805',
        metadata: {
          rome: 'M1805',
          hiringPotential: 31.94,
          isHighPotential: false,
        },
      }),
      update: expect.objectContaining({
        companyId: 'company-1',
        metadata: {
          rome: 'M1805',
          hiringPotential: 31.94,
          isHighPotential: false,
        },
      }),
    });
  });
});
