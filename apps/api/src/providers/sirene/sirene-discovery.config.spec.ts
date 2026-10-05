import {
  DISCOVERY_COMMUNE_CODES,
  DISCOVERY_NAF_25,
  DISCOVERY_NAF_25_CODES,
  DISCOVERY_NAF_REV2_CODES,
  buildDiscoverySearchQuery,
  isAllowedCommune,
  isAllowedNaf,
  isAllowedNaf25,
  isInDiscoveryNafScope,
} from './sirene-discovery.config.js';

describe('sirene-discovery.config', () => {
  it('includes Toulouse and first-ring communes', () => {
    expect(isAllowedCommune('31555')).toBe(true);
    expect(isAllowedCommune('31069')).toBe(true);
    expect(isAllowedCommune('31149')).toBe(true);
    expect(isAllowedCommune('31557')).toBe(true);
    expect(isAllowedCommune('31157')).toBe(true);
    expect(isAllowedCommune('31044')).toBe(true);
    expect(isAllowedCommune('31561')).toBe(true);
    expect(isAllowedCommune('31506')).toBe(true);
    expect(isAllowedCommune('31446')).toBe(true);
    expect(isAllowedCommune('31056')).toBe(true);
    expect(isAllowedCommune('31022')).toBe(true);
    expect(DISCOVERY_COMMUNE_CODES).toHaveLength(11);
  });

  it('rejects communes outside the net', () => {
    expect(isAllowedCommune('75056')).toBe(false);
    expect(isAllowedCommune(null)).toBe(false);
    expect(isAllowedCommune(undefined)).toBe(false);
    expect(isAllowedCommune('')).toBe(false);
  });

  it('allows the Rev2 discovery NAF codes', () => {
    for (const code of DISCOVERY_NAF_REV2_CODES) {
      expect(isAllowedNaf(code)).toBe(true);
      expect(
        isInDiscoveryNafScope({ activityCode: code, activityCodeNaf25: null }),
      ).toBe(true);
    }
    expect(isAllowedNaf('47.11Z')).toBe(false);
  });

  it('keeps the NAF25 allowlist empty by default', () => {
    expect(DISCOVERY_NAF_25_CODES).toEqual([]);
    expect(DISCOVERY_NAF_25.size).toBe(0);
    expect(isAllowedNaf25('62.10A')).toBe(false);
    expect(
      isInDiscoveryNafScope({
        activityCode: '47.11Z',
        activityCodeNaf25: '62.10A',
      }),
    ).toBe(false);
  });

  it('matches NAF25-only when a mapped allowlist is passed', () => {
    const mapped = new Set(['62.10A']);
    expect(
      isInDiscoveryNafScope(
        { activityCode: '47.11Z', activityCodeNaf25: '62.10A' },
        { naf25: mapped },
      ),
    ).toBe(true);
    expect(
      isInDiscoveryNafScope(
        { activityCode: '47.11Z', activityCodeNaf25: '00.00Z' },
        { naf25: mapped },
      ),
    ).toBe(false);
    expect(DISCOVERY_NAF_25.size).toBe(0);
  });

  it('rejects out-of-scope NAF with default lists', () => {
    expect(
      isInDiscoveryNafScope({
        activityCode: '01.11Z',
        activityCodeNaf25: null,
      }),
    ).toBe(false);
    expect(
      isInDiscoveryNafScope({
        activityCode: null,
        activityCodeNaf25: null,
      }),
    ).toBe(false);
    expect(isInDiscoveryNafScope({})).toBe(false);
  });

  it('omits the NAF25 clause from q while the parallel list is empty', () => {
    const q = buildDiscoverySearchQuery();
    expect(q).toContain('periode(etatAdministratifEtablissement:A)');
    expect(q).toContain('codeCommuneEtablissement:(31555 OR 31069');
    expect(q).toContain(
      'activitePrincipaleEtablissement:(62.01Z OR 62.02A OR 58.29C OR 62.09Z)',
    );
    expect(q).not.toContain('activitePrincipaleNAF25Etablissement');
  });

  it('adds the NAF25 OR clause when that allowlist is non-empty', () => {
    const q = buildDiscoverySearchQuery(
      ['31555'],
      ['62.01Z'],
      ['62.10A'],
    );
    expect(q).toBe(
      'periode(etatAdministratifEtablissement:A) AND codeCommuneEtablissement:(31555) AND (activitePrincipaleEtablissement:(62.01Z) OR activitePrincipaleNAF25Etablissement:(62.10A))',
    );
  });
});
