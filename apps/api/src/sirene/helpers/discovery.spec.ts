import {
  COMMUNE_NAMES,
  DISCOVERY_COMMUNE_CODES,
  DISCOVERY_NAF_25,
  DISCOVERY_NAF_25_CODES,
  DISCOVERY_NAF_REV2_CODES,
  buildDiscoverySearchQuery,
  getCommuneName,
  isAllowedCommune,
  isAllowedNaf,
  isAllowedNaf25,
  isInDiscoveryNafScope,
} from './discovery.js';

describe('discovery', () => {
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

  it('has a canonical name for every discovery commune, and only those', () => {
    for (const code of DISCOVERY_COMMUNE_CODES) {
      expect(getCommuneName(code)).toBeTruthy();
    }
    expect(Object.keys(COMMUNE_NAMES).sort()).toEqual(
      [...DISCOVERY_COMMUNE_CODES].sort(),
    );
    expect(getCommuneName('31446')).toBe('Ramonville-Saint-Agne');
    expect(getCommuneName('31561')).toBe("L'Union");
  });

  it('has no canonical name outside the net or for prototype keys', () => {
    expect(getCommuneName('75056')).toBeUndefined();
    expect(getCommuneName('toString')).toBeUndefined();
    expect(getCommuneName(null)).toBeUndefined();
    expect(getCommuneName(undefined)).toBeUndefined();
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

  describe('buildDiscoverySearchQuery', () => {
    /** Contenu du premier groupe `periode(...)`, parenthèses équilibrées. */
    function periodeContent(q: string): { inside: string; outside: string } {
      const start = q.indexOf('periode(');
      expect(start).toBeGreaterThanOrEqual(0);
      const open = start + 'periode'.length;
      let depth = 0;
      for (let i = open; i < q.length; i += 1) {
        if (q[i] === '(') depth += 1;
        if (q[i] === ')') depth -= 1;
        if (depth === 0) {
          return {
            inside: q.slice(open + 1, i),
            outside: q.slice(0, start) + q.slice(i + 1),
          };
        }
      }
      throw new Error('unbalanced periode(');
    }

    it('produces the exact verified default query', () => {
      expect(buildDiscoverySearchQuery()).toBe(
        'periode(etatAdministratifEtablissement:A AND activitePrincipaleEtablissement:(62.01Z OR 62.02A OR 58.29C OR 62.09Z) AND caractereEmployeurEtablissement:O) AND etablissementSiege:true AND codeCommuneEtablissement:(31555 OR 31069 OR 31149 OR 31557 OR 31157 OR 31044 OR 31561 OR 31506 OR 31446 OR 31056 OR 31022)',
      );
    });

    it('keeps historised fields inside periode() and others outside', () => {
      const { inside, outside } = periodeContent(buildDiscoverySearchQuery());
      expect(inside).toContain('etatAdministratifEtablissement:A');
      expect(inside).toContain('activitePrincipaleEtablissement:(');
      expect(inside).toContain('caractereEmployeurEtablissement:O');
      expect(inside).not.toContain('codeCommuneEtablissement');
      expect(inside).not.toContain('etablissementSiege');
      expect(outside).toContain('codeCommuneEtablissement:(');
      expect(outside).toContain('etablissementSiege:true');
      expect(outside).not.toContain('activitePrincipaleEtablissement');
      expect(outside).not.toContain('caractereEmployeurEtablissement');
      expect(outside).not.toContain('etatAdministratifEtablissement');
    });

    it('never emits a NAF25 field, whatever the lists passed', () => {
      const extra = (
        buildDiscoverySearchQuery as (...args: string[][]) => string
      )(['31555'], ['62.01Z'], ['62.10A']);
      expect(extra).not.toContain('NAF25');
      expect(buildDiscoverySearchQuery()).not.toContain('NAF25');
      expect(extra).not.toContain('62.10A');
    });

    it('has balanced parentheses', () => {
      for (const q of [
        buildDiscoverySearchQuery(),
        buildDiscoverySearchQuery(['31555'], ['62.01Z']),
      ]) {
        let depth = 0;
        for (const char of q) {
          if (char === '(') depth += 1;
          if (char === ')') depth -= 1;
          expect(depth).toBeGreaterThanOrEqual(0);
        }
        expect(depth).toBe(0);
      }
    });
  });
});
