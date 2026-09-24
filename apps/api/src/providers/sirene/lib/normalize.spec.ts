import { BadGatewayException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { normalizeEtablissement } from './normalize.js';

function baseEtablissement(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    etablissement: {
      siren: '123456789',
      siret: '12345678900012',
      statutDiffusionEtablissement: 'O',
      uniteLegale: {
        denominationUniteLegale: 'SARL Dupont',
      },
      adresseEtablissement: {
        numeroVoieEtablissement: '12',
        typeVoieEtablissement: 'RUE',
        libelleVoieEtablissement: 'DE LA PAIX',
        codePostalEtablissement: '31000',
        libelleCommuneEtablissement: 'TOULOUSE',
      },
      periodesEtablissement: [
        {
          dateFin: null,
          activitePrincipaleEtablissement: '62.01Z',
          nomenclatureActivitePrincipaleEtablissement: 'NAFRev2',
          activitePrincipaleNAF25Etablissement: '62.10A',
        },
      ],
      ...overrides,
    },
  };
}

describe('normalizeEtablissement', () => {
  it('maps an open etablissement to a Sonar fiche', () => {
    const result = normalizeEtablissement(baseEtablissement());

    expect(result).toEqual({
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
    });
  });

  it('redacts name and address when diffusion status is P', () => {
    const result = normalizeEtablissement(
      baseEtablissement({
        statutDiffusionEtablissement: 'P',
        uniteLegale: {
          denominationUniteLegale: 'Secret SARL',
        },
      }),
    );

    expect(result.name).toBe('Établissement 12345678900012');
    expect(result.slug).toBe('etablissement-12345678900012');
    expect(result.address).toBeNull();
    expect(result.postalCode).toBe('31000');
    expect(result.city).toBe('TOULOUSE');
    expect(result.activityCode).toBe('62.01Z');
    expect(result.diffusionStatus).toBe('P');
  });

  it('throws BadGatewayException when etablissement is missing', () => {
    expect(() => normalizeEtablissement({})).toThrow(BadGatewayException);
    expect(() => normalizeEtablissement({})).toThrow(
      'Réponse INSEE inattendue : etablissement manquant',
    );
  });

  it('prefers periode NAF25 over uniteLegale NAF25', () => {
    const result = normalizeEtablissement(
      baseEtablissement({
        uniteLegale: {
          denominationUniteLegale: 'SARL Dupont',
          activitePrincipaleNAF25UniteLegale: '99.99Z',
        },
        periodesEtablissement: [
          {
            dateFin: null,
            activitePrincipaleEtablissement: '62.01Z',
            nomenclatureActivitePrincipaleEtablissement: 'NAFRev2',
            activitePrincipaleNAF25Etablissement: '62.10A',
          },
        ],
      }),
    );

    expect(result.activityCodeNaf25).toBe('62.10A');
  });

  it('falls back to denominationUsuelle when denomination is absent', () => {
    const result = normalizeEtablissement(
      baseEtablissement({
        uniteLegale: {},
        periodesEtablissement: [
          {
            dateFin: null,
            denominationUsuelleEtablissement: 'Boutique Usuelle',
            activitePrincipaleEtablissement: '47.11Z',
          },
        ],
      }),
    );

    expect(result.name).toBe('Boutique Usuelle');
  });

  it('falls back to enseigne when denomination and usuelle are absent', () => {
    const result = normalizeEtablissement(
      baseEtablissement({
        uniteLegale: {},
        periodesEtablissement: [
          {
            dateFin: null,
            enseigne1Etablissement: 'Enseigne Soleil',
            activitePrincipaleEtablissement: '47.11Z',
          },
        ],
      }),
    );

    expect(result.name).toBe('Enseigne Soleil');
  });

  it('falls back to prenom+nom for person companies', () => {
    const result = normalizeEtablissement(
      baseEtablissement({
        uniteLegale: {
          prenom1UniteLegale: 'Marie',
          nomUniteLegale: 'Martin',
        },
        periodesEtablissement: [
          {
            dateFin: null,
            activitePrincipaleEtablissement: '62.01Z',
          },
        ],
      }),
    );

    expect(result.name).toBe('Marie Martin');
  });
});
