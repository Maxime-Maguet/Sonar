import { PrismaService } from '../../../prisma/prisma.service.js';
import { NormalizedEtablissement } from './normalize.js';
import { BadRequestException } from '@nestjs/common';

export const COMPANY_SOURCE_SIRENE = 'SIRENE_INSEE';

export async function upsertCompany(
  prisma: PrismaService,
  fiche: NormalizedEtablissement,
) {
  if (!fiche.siren) {
    throw new BadRequestException('Siren is required', {
      cause: new Error('Siren is required'),
    });
  }
  const lastSyncedAt = new Date();
  const savedCompany = await prisma.company.upsert({
    where: { siren: fiche.siren },
    create: {
      siren: fiche.siren,
      siretHeadquarter: fiche.siret,
      name: fiche.name,
      slug: fiche.slug,
      address: fiche.address,
      postalCode: fiche.postalCode,
      city: fiche.city ?? 'Toulouse',
      activityCode: fiche.activityCode,
      activityNomenclature: fiche.activityNomenclature,
      activityCodeNaf25: fiche.activityCodeNaf25,
      diffusionStatus: fiche.diffusionStatus,
      source: COMPANY_SOURCE_SIRENE,
      externalId: fiche.siren,
      lastSyncedAt,
    },
    update: {
      siretHeadquarter: fiche.siret,
      name: fiche.name,
      slug: fiche.slug,
      address: fiche.address,
      postalCode: fiche.postalCode,
      city: fiche.city ?? 'Toulouse',
      activityCode: fiche.activityCode,
      activityNomenclature: fiche.activityNomenclature,
      activityCodeNaf25: fiche.activityCodeNaf25,
      diffusionStatus: fiche.diffusionStatus,
      source: COMPANY_SOURCE_SIRENE,
      externalId: fiche.siren,
      lastSyncedAt,
    },
  });
  return savedCompany;
}
