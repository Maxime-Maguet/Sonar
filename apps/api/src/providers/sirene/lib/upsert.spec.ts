import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NormalizedEtablissement } from './normalize.js';
import { upsertCompany } from './upsert.js';

function fiche(
  overrides: Partial<NormalizedEtablissement> = {},
): NormalizedEtablissement {
  return {
    siren: '123456789',
    siret: '12345678900012',
    name: 'SARL Dupont',
    slug: 'sarl-dupont',
    address: '12 RUE DE LA PAIX',
    postalCode: '31000',
    city: 'TOULOUSE',
    activityCode: '62.01Z',
    activityNomenclature: 'NAFRev2',
    activityCodeNaf25: '62.10A',
    diffusionStatus: 'O',
    ...overrides,
  };
}

describe('upsertCompany', () => {
  const upsert = vi.fn();
  const prisma = { company: { upsert } } as never;

  beforeEach(() => {
    upsert.mockReset();
    upsert.mockResolvedValue({ id: 'company-1' });
  });

  it('throws BadRequestException when siren is empty', async () => {
    await expect(upsertCompany(prisma, fiche({ siren: '' }))).rejects.toThrow(
      BadRequestException,
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it('upserts with where/create/update mapping and defaults city to Toulouse', async () => {
    const input = fiche({ city: null, address: null });
    const saved = await upsertCompany(prisma, input);

    expect(saved).toEqual({ id: 'company-1' });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      where: { siren: '123456789' },
      create: {
        siren: '123456789',
        siretHeadquarter: '12345678900012',
        name: 'SARL Dupont',
        slug: 'sarl-dupont',
        address: null,
        postalCode: '31000',
        city: 'Toulouse',
        activityCode: '62.01Z',
        activityNomenclature: 'NAFRev2',
        activityCodeNaf25: '62.10A',
        diffusionStatus: 'O',
      },
      update: {
        siretHeadquarter: '12345678900012',
        name: 'SARL Dupont',
        slug: 'sarl-dupont',
        address: null,
        postalCode: '31000',
        city: 'Toulouse',
        activityCode: '62.01Z',
        activityNomenclature: 'NAFRev2',
        activityCodeNaf25: '62.10A',
        diffusionStatus: 'O',
      },
    });
  });
});
