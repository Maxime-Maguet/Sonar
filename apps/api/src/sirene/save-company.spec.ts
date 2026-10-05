import { BadRequestException } from '@nestjs/common';
import type { CompanyFiche } from './helpers/normalize.js';
import { COMPANY_SOURCE_SIRENE, saveCompany } from './sirene.service.js';

function fiche(
  overrides: Partial<CompanyFiche> = {},
): CompanyFiche {
  return {
    siren: '123456789',
    siret: '12345678900012',
    name: 'SARL Dupont',
    slug: 'sarl-dupont-123456789',
    address: '12 RUE DE LA PAIX',
    postalCode: '31000',
    city: 'TOULOUSE',
    activityCode: '62.01Z',
    activityNomenclature: 'NAFRev2',
    activityCodeNaf25: '62.10A',
    communeInseeCode: '31555',
    diffusionStatus: 'O',
    isHeadquarter: true,
    ...overrides,
  };
}

describe('saveCompany', () => {
  const upsert = vi.fn();
  const prisma = { company: { upsert } } as never;

  beforeEach(() => {
    upsert.mockReset();
    upsert.mockResolvedValue({ id: 'company-1' });
  });

  it('throws BadRequestException when siren is empty', async () => {
    await expect(saveCompany(prisma, fiche({ siren: '' }))).rejects.toThrow(
      BadRequestException,
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it('upserts with where/create/update mapping and defaults city to Toulouse', async () => {
    const input = fiche({ city: null, address: null });
    const saved = await saveCompany(prisma, input);

    expect(saved).toEqual({ id: 'company-1' });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      where: { siren: '123456789' },
      create: {
        siren: '123456789',
        siretHeadquarter: '12345678900012',
        name: 'SARL Dupont',
        slug: 'sarl-dupont-123456789',
        address: null,
        postalCode: '31000',
        city: 'Toulouse',
        activityCode: '62.01Z',
        activityNomenclature: 'NAFRev2',
        activityCodeNaf25: '62.10A',
        diffusionStatus: 'O',
        source: COMPANY_SOURCE_SIRENE,
        externalId: '123456789',
        lastSyncedAt: expect.any(Date),
      },
      update: {
        siretHeadquarter: '12345678900012',
        name: 'SARL Dupont',
        slug: 'sarl-dupont-123456789',
        address: null,
        postalCode: '31000',
        city: 'Toulouse',
        activityCode: '62.01Z',
        activityNomenclature: 'NAFRev2',
        activityCodeNaf25: '62.10A',
        diffusionStatus: 'O',
        source: COMPANY_SOURCE_SIRENE,
        externalId: '123456789',
        lastSyncedAt: expect.any(Date),
      },
    });
    expect(COMPANY_SOURCE_SIRENE).toBe('SIRENE_INSEE');
  });

  it('omits siretHeadquarter on create and update when the row is not HQ', async () => {
    await saveCompany(prisma, fiche({ isHeadquarter: false }));

    const arg = upsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(arg.create).not.toHaveProperty('siretHeadquarter');
    expect(arg.update).not.toHaveProperty('siretHeadquarter');
  });

  it('sets siretHeadquarter on create and update when the row is HQ', async () => {
    await saveCompany(prisma, fiche({ isHeadquarter: true }));

    const arg = upsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(arg.create.siretHeadquarter).toBe('12345678900012');
    expect(arg.update.siretHeadquarter).toBe('12345678900012');
  });
});
