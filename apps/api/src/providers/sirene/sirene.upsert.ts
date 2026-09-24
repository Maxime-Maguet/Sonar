import { PrismaService } from '../../prisma/prisma.service.js';
import { NormalizedEtablissement } from './sirene.normalize.js';
import { BadRequestException } from '@nestjs/common';

export async function upsertCompany(
  prisma: PrismaService,
  fiche: NormalizedEtablissement,
) {
  if (!fiche.siren) {
    //la donnée qu'on s'apprête à écrire est inutilisable
    throw new BadRequestException('Siren is required', {
      cause: new Error('Siren is required'),
    });
  }
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
    },
  });
  return savedCompany;
}
