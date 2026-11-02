import { BadGatewayException } from '@nestjs/common';
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
        codeCommuneEtablissement: '31555',
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

function withCommune(code: string, label: string): Record<string, unknown> {
  const base = baseEtablissement();
  const etab = base.etablissement as Record<string, unknown>;
  return {
    etablissement: {
      ...etab,
      adresseEtablissement: {
        ...(etab.adresseEtablissement as Record<string, unknown>),
        codeCommuneEtablissement: code,
        libelleCommuneEtablissement: label,
      },
    },
  };
}

describe('normalizeEtablissement', () => {
  describe('city canonicalisation', () => {
    it('gives the same city for both INSEE spellings of Ramonville', () => {
      const short = normalizeEtablissement(
        withCommune('31446', 'RAMONVILLE ST AGNE'),
      );
      const long = normalizeEtablissement(
        withCommune('31446', 'RAMONVILLE-SAINT-AGNE'),
      );
      expect(short.city).toBe('Ramonville-Saint-Agne');
      expect(long.city).toBe(short.city);
    });

    it('keeps the INSEE label outside the discovery', () => {
      const result = normalizeEtablissement(withCommune('75056', 'PARIS'));
      expect(result.city).toBe('PARIS');
    });
  });

  it('maps an open etablissement to a Sonar fiche', () => {
    const result = normalizeEtablissement(baseEtablissement());

    expect(result).toEqual({
      siren: '123456789',
      siret: '12345678900012',
      name: 'SARL Dupont',
      slug: 'sarl-dupont-123456789',
      address: '12 RUE DE LA PAIX',
      postalCode: '31000',
      city: 'Toulouse',
      activityCode: '62.01Z',
      activityNomenclature: 'NAFRev2',
      activityCodeNaf25: '62.10A',
      communeInseeCode: '31555',
      diffusionStatus: 'O',
      isHeadquarter: false,
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
    expect(result.slug).toBe('etablissement-12345678900012-123456789');
    expect(result.address).toBeNull();
    expect(result.postalCode).toBe('31000');
    expect(result.city).toBe('Toulouse');
    expect(result.activityCode).toBe('62.01Z');
    expect(result.diffusionStatus).toBe('P');
  });

  it('throws BadGatewayException when etablissement is missing', () => {
    expect(() => normalizeEtablissement({})).toThrow(BadGatewayException);
    expect(() => normalizeEtablissement({})).toThrow(
      'Réponse INSEE inattendue : etablissement manquant',
    );
  });

  it('throws BadGatewayException when siren or siret is missing', () => {
    expect(() =>
      normalizeEtablissement(baseEtablissement({ siren: '' })),
    ).toThrow(BadGatewayException);
    expect(() =>
      normalizeEtablissement(baseEtablissement({ siret: '   ' })),
    ).toThrow('Réponse INSEE inattendue : siren ou siret manquant');
  });

  it('parses etablissementSiege as boolean', () => {
    expect(
      normalizeEtablissement(baseEtablissement({ etablissementSiege: true }))
        .isHeadquarter,
    ).toBe(true);
    expect(
      normalizeEtablissement(baseEtablissement({ etablissementSiege: 'true' }))
        .isHeadquarter,
    ).toBe(true);
    expect(
      normalizeEtablissement(baseEtablissement({ etablissementSiege: false }))
        .isHeadquarter,
    ).toBe(false);
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
