import { SireneService } from './sirene.service.js';
import { InseeClient } from './helpers/insee.js';
import {
  BadGatewayException,
  ConflictException,
  GatewayTimeoutException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { buildDiscoverySearchQuery } from './helpers/discovery.js';

function createService(prisma: object = {}) {
  const delay = vi.fn().mockResolvedValue(undefined);
  const config = { get: () => 'test-api-key' };
  const insee = new InseeClient(config as never, delay);
  return {
    service: new SireneService(prisma as never, insee),
    delay,
  };
}

describe('getEtablissementBySiret', () => {
  it('throws ServiceUnavailableException when INSEE_API_KEY is missing', async () => {
    const delay = vi.fn().mockResolvedValue(undefined);
    const insee = new InseeClient(
      { get: () => undefined } as never,
      delay,
    );
    const service = new SireneService({} as never, insee);
    const fetchSpy = vi.spyOn(global, 'fetch');

    await expect(
      service.getEtablissementBySiret('12345678900012'),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('throws BadGatewayException after retrying when INSEE API returns 503', async () => {
    const { service } = createService();
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    const pending = service.getEtablissementBySiret('12345678900012');
    await expect(pending).rejects.toBeInstanceOf(BadGatewayException);
    await expect(pending).rejects.toThrow('Sirene INSEE a répondu 503');
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    fetchSpy.mockRestore();
  });

  it('throws NotFoundException when INSEE API returns 404 without retry', async () => {
    const { service } = createService();
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const pending = service.getEtablissementBySiret('12345678900012');
    await expect(pending).rejects.toBeInstanceOf(NotFoundException);
    await expect(pending).rejects.toThrow('Sirene INSEE a répondu 404');
    expect(fetchSpy).toHaveBeenCalledOnce();

    fetchSpy.mockRestore();
  });

  it('returns the normalized fiche when INSEE responds 200', async () => {
    const { service } = createService();
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        etablissement: {
          siren: '123456789',
          siret: '12345678900012',
          statutDiffusionEtablissement: 'O',
          uniteLegale: { denominationUniteLegale: 'SARL Dupont' },
        },
      }),
    } as Response);

    const fiche = await service.getEtablissementBySiret('12345678900012');

    expect(fiche.siren).toBe('123456789');
    expect(fiche.siret).toBe('12345678900012');
    expect(fiche.name).toBe('SARL Dupont');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.insee.fr/api-sirene/3.11/siret/12345678900012',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'X-INSEE-Api-Key-Integration': 'test-api-key',
        },
      }),
    );

    fetchSpy.mockRestore();
  });

  it('throws GatewayTimeoutException when fetch times out after retries', async () => {
    const { service } = createService();
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(
      new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
    );

    await expect(
      service.getEtablissementBySiret('12345678900012'),
    ).rejects.toThrow(GatewayTimeoutException);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    fetchSpy.mockRestore();
  });

  it('throws BadGatewayException when fetch rejects', async () => {
    const { service } = createService();
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      service.getEtablissementBySiret('12345678900012'),
    ).rejects.toThrow(BadGatewayException);
    await expect(
      service.getEtablissementBySiret('12345678900012'),
    ).rejects.toThrow('Sirene INSEE est injoignable');

    fetchSpy.mockRestore();
  });

  it('upserts the company from a 200 response and returns the saved row', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'company-1' });
    const prisma = { company: { upsert } };
    const { service } = createService(prisma);
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        etablissement: {
          siren: '123456789',
          siret: '12345678900012',
          statutDiffusionEtablissement: 'O',
          uniteLegale: { denominationUniteLegale: 'SARL Dupont' },
        },
      }),
    } as Response);
    const saved = await service.createEtablissement('12345678900012');

    expect(saved).toEqual({ id: 'company-1' });
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siren: '123456789' },
      }),
    );
    expect(fetchSpy).toHaveBeenCalledOnce();

    fetchSpy.mockRestore();
  });
});

function inScopeEtablissement(siret: string) {
  return {
    siren: siret.slice(0, 9),
    siret,
    statutDiffusionEtablissement: 'O',
    uniteLegale: { denominationUniteLegale: 'SARL Dupont' },
    adresseEtablissement: {
      codeCommuneEtablissement: '31555',
      libelleCommuneEtablissement: 'TOULOUSE',
    },
    periodesEtablissement: [
      {
        dateFin: null,
        activitePrincipaleEtablissement: '62.01Z',
        nomenclatureActivitePrincipaleEtablissement: 'NAFRev2',
      },
    ],
  };
}

describe('syncDiscovery', () => {
  it('upserts in-scope rows and skips out-of-scope without persisting them', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'company-1' });
    const { service } = createService({ company: { upsert } });
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        header: { total: 2 },
        etablissements: [
          inScopeEtablissement('12345678900012'),
          {
            ...inScopeEtablissement('98765432100011'),
            adresseEtablissement: {
              codeCommuneEtablissement: '75056',
              libelleCommuneEtablissement: 'PARIS',
            },
          },
        ],
      }),
    } as Response);

    await expect(service.syncDiscovery()).resolves.toEqual({
      scanned: 2,
      upserted: 1,
      skipped: 0,
      skippedOutOfScope: 1,
      truncated: false,
    });
    expect(upsert).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledOnce();
    const searchUrl = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(searchUrl.origin + searchUrl.pathname).toBe(
      'https://api.insee.fr/api-sirene/3.11/siret',
    );
    expect(searchUrl.searchParams.get('q')).toBe(buildDiscoverySearchQuery());
    expect(searchUrl.searchParams.get('q')).not.toContain(
      'activitePrincipaleNAF25Etablissement',
    );
    expect(fetchSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );

    fetchSpy.mockRestore();
  });

  it('skips NAF out of scope without upserting', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'company-1' });
    const { service } = createService({ company: { upsert } });
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        header: { total: 1 },
        etablissements: [
          {
            ...inScopeEtablissement('12345678900012'),
            periodesEtablissement: [
              {
                dateFin: null,
                activitePrincipaleEtablissement: '47.11Z',
                nomenclatureActivitePrincipaleEtablissement: 'NAFRev2',
              },
            ],
          },
        ],
      }),
    } as Response);

    await expect(service.syncDiscovery()).resolves.toEqual({
      scanned: 1,
      upserted: 0,
      skipped: 0,
      skippedOutOfScope: 1,
      truncated: false,
    });
    expect(upsert).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('upserts P-status in-scope rows already redacted by normalize', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'company-p' });
    const { service } = createService({ company: { upsert } });
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        header: { total: 1 },
        etablissements: [
          {
            ...inScopeEtablissement('12345678900012'),
            statutDiffusionEtablissement: 'P',
            uniteLegale: { denominationUniteLegale: 'Secret SARL' },
            adresseEtablissement: {
              numeroVoieEtablissement: '12',
              typeVoieEtablissement: 'RUE',
              libelleVoieEtablissement: 'DE LA PAIX',
              codePostalEtablissement: '31000',
              libelleCommuneEtablissement: 'TOULOUSE',
              codeCommuneEtablissement: '31555',
            },
          },
        ],
      }),
    } as Response);

    await expect(service.syncDiscovery()).resolves.toEqual({
      scanned: 1,
      upserted: 1,
      skipped: 0,
      skippedOutOfScope: 0,
      truncated: false,
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          name: 'Établissement 12345678900012',
          address: null,
          diffusionStatus: 'P',
        }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it('does not log name or street when skipping a P-status row', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const upsert = vi.fn().mockRejectedValue(new Error('db down'));
    const { service } = createService({ company: { upsert } });
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        header: { total: 2 },
        etablissements: [
          {
            ...inScopeEtablissement('12345678900012'),
            statutDiffusionEtablissement: 'P',
            uniteLegale: { denominationUniteLegale: 'Secret SARL' },
            adresseEtablissement: {
              numeroVoieEtablissement: '12',
              typeVoieEtablissement: 'RUE',
              libelleVoieEtablissement: 'DE LA PAIX',
              codePostalEtablissement: '31000',
              libelleCommuneEtablissement: 'TOULOUSE',
              codeCommuneEtablissement: '31555',
            },
          },
          {
            ...inScopeEtablissement('98765432100011'),
            statutDiffusionEtablissement: 'P',
            uniteLegale: { denominationUniteLegale: 'Autre Secret' },
            adresseEtablissement: {
              codeCommuneEtablissement: '75056',
              libelleCommuneEtablissement: 'PARIS',
              libelleVoieEtablissement: 'RUE CACHEE',
            },
          },
        ],
      }),
    } as Response);

    await service.syncDiscovery();

    const messages = [...log.mock.calls, ...warn.mock.calls]
      .flat()
      .map(String)
      .join(' ');
    expect(messages).not.toMatch(/Secret SARL|Autre Secret|DE LA PAIX|RUE CACHEE/i);
    expect(messages).toContain('siret=98765432100011');
    expect(messages).toContain('status=P');

    fetchSpy.mockRestore();
    log.mockRestore();
    warn.mockRestore();
  });

  it('skips rows that fail normalize and warns with sync skip normalize', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const upsert = vi.fn().mockResolvedValue({ id: 'company-1' });
    const { service } = createService({ company: { upsert } });
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        header: { total: 2 },
        etablissements: [
          {
            siret: '12345678900012',
            statutDiffusionEtablissement: 'O',
            uniteLegale: { denominationUniteLegale: 'SARL Dupont' },
          },
          { foo: 1 },
        ],
      }),
    } as Response);

    await expect(service.syncDiscovery()).resolves.toEqual({
      scanned: 2,
      upserted: 0,
      skipped: 2,
      skippedOutOfScope: 0,
      truncated: false,
    });
    expect(upsert).not.toHaveBeenCalled();

    const messages = warn.mock.calls.flat().map(String);
    expect(messages.some((msg) => msg.includes('sync skip normalize'))).toBe(
      true,
    );
    expect(messages.join(' ')).toContain('siret=12345678900012');
    expect(messages.join(' ')).toContain('status=O');

    fetchSpy.mockRestore();
    warn.mockRestore();
  });

  it('skips P2002 unique conflicts and warns with sync skip unique', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const upsert = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the table Company',
        { code: 'P2002', clientVersion: 'test' },
      ),
    );
    const { service } = createService({ company: { upsert } });
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        header: { total: 1 },
        etablissements: [inScopeEtablissement('12345678900012')],
      }),
    } as Response);

    await expect(service.syncDiscovery()).resolves.toEqual({
      scanned: 1,
      upserted: 0,
      skipped: 1,
      skippedOutOfScope: 0,
      truncated: false,
    });

    const messages = warn.mock.calls.flat().map(String).join(' ');
    expect(messages).toContain('sync skip unique');
    expect(messages).toContain('siret=12345678900012');
    expect(messages).toContain('siren=123456789');

    fetchSpy.mockRestore();
    warn.mockRestore();
  });

  it('skips other upsert errors and debugs the message when status is not P', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const debug = vi
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
    const upsert = vi.fn().mockRejectedValue(new Error('db down'));
    const { service } = createService({ company: { upsert } });
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        header: { total: 1 },
        etablissements: [inScopeEtablissement('12345678900012')],
      }),
    } as Response);

    await expect(service.syncDiscovery()).resolves.toEqual({
      scanned: 1,
      upserted: 0,
      skipped: 1,
      skippedOutOfScope: 0,
      truncated: false,
    });

    expect(warn.mock.calls.flat().map(String).join(' ')).toContain(
      'sync skip other',
    );
    expect(debug.mock.calls.flat().map(String).join(' ')).toContain('db down');

    fetchSpy.mockRestore();
    warn.mockRestore();
    debug.mockRestore();
  });

  it('does not debug skip error.message for P-status rows', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const debug = vi
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
    const upsert = vi.fn().mockRejectedValue(new Error('db down'));
    const { service } = createService({ company: { upsert } });
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        header: { total: 1 },
        etablissements: [
          {
            ...inScopeEtablissement('12345678900012'),
            statutDiffusionEtablissement: 'P',
            uniteLegale: { denominationUniteLegale: 'Secret SARL' },
            adresseEtablissement: {
              numeroVoieEtablissement: '12',
              typeVoieEtablissement: 'RUE',
              libelleVoieEtablissement: 'DE LA PAIX',
              codePostalEtablissement: '31000',
              libelleCommuneEtablissement: 'TOULOUSE',
              codeCommuneEtablissement: '31555',
            },
          },
        ],
      }),
    } as Response);

    await expect(service.syncDiscovery()).resolves.toEqual({
      scanned: 1,
      upserted: 0,
      skipped: 1,
      skippedOutOfScope: 0,
      truncated: false,
    });

    const warnText = warn.mock.calls.flat().map(String).join(' ');
    expect(warnText).toContain('sync skip other');
    expect(warnText).toContain('siret=12345678900012');
    expect(warnText).toContain('status=P');
    expect(warnText).not.toMatch(/Secret SARL|DE LA PAIX/i);
    expect(debug).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    warn.mockRestore();
    debug.mockRestore();
  });

  it('maps search truncated=true onto the sync result', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'company-1' });
    const insee = {
      getSiret: vi.fn(),
      searchEtablissements: vi.fn().mockResolvedValue({
        etablissements: [inScopeEtablissement('12345678900012')],
        truncated: true,
        total: 50,
      }),
    };
    const service = new SireneService(
      { company: { upsert } } as never,
      insee as never,
    );

    await expect(service.syncDiscovery()).resolves.toEqual({
      scanned: 1,
      upserted: 1,
      skipped: 0,
      skippedOutOfScope: 0,
      truncated: true,
    });
  });

  it('retries 429 through the INSEE client during sync', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'company-1' });
    const { delay, service } = createService({ company: { upsert } });
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          header: { total: 1 },
          etablissements: [inScopeEtablissement('12345678900012')],
        }),
      } as Response);

    await expect(service.syncDiscovery()).resolves.toEqual({
      scanned: 1,
      upserted: 1,
      skipped: 0,
      skippedOutOfScope: 0,
      truncated: false,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledOnce();

    fetchSpy.mockRestore();
  });

  it('throws ConflictException when a sync is already running', async () => {
    const insee = {
      getSiret: vi.fn(),
      searchEtablissements: vi.fn(
        () => new Promise<unknown[]>(() => undefined),
      ),
    };
    const service = new SireneService({} as never, insee as never);

    const first = service.syncDiscovery();
    await expect(service.syncDiscovery()).rejects.toThrow(ConflictException);
    expect(insee.searchEtablissements).toHaveBeenCalledOnce();
    void first;
  });
});
