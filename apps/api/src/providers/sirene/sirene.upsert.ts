import { PrismaService } from '../../prisma/prisma.service.js';
import { NormalizedEtablissement } from './sirene.normalize.js';

export async function upsertCompany(
  prisma: PrismaService,
  fiche: NormalizedEtablissement,
) {
  console.log('3 upsert reçoit siren =', fiche.siren);
  if (!fiche.siren) {
    throw new Error('Siren is required');
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
  console.log('4 upsert retourne siren =', savedCompany.siren);
  return savedCompany;
}
