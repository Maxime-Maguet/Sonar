import {
  BadGatewayException,
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { buildDiscoverySearchQuery } from './discovery.js';
import {
  SIRENE_BASE_URL,
  SIRENE_SEARCH_MAX_PAGES,
  InseeClient,
  sireneBackoffMs,
} from './insee.js';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function errorResponse(status: number): Response {
  return { ok: false, status, json: async () => ({}) } as Response;
}

describe('InseeClient', () => {
  const delay = vi.fn().mockResolvedValue(undefined);
  const config = { get: () => 'test-api-key' };

  let client: InseeClient;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delay.mockClear();
    client = new InseeClient(config as never, delay);
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('does not fetch when INSEE_API_KEY is missing', async () => {
    const noKey = new InseeClient({ get: () => undefined } as never, delay);
    await expect(noKey.getSiret('12345678900012')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('GETs /siret/{siret} and returns JSON on 200', async () => {
    const payload = { etablissement: { siret: '12345678900012' } };
    fetchSpy.mockResolvedValue(jsonResponse(payload));

    await expect(client.getSiret('12345678900012')).resolves.toEqual(payload);
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      `${SIRENE_BASE_URL}/siret/12345678900012`,
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'X-INSEE-Api-Key-Integration': 'test-api-key',
        },
      }),
    );
    expect(String(fetchSpy.mock.calls[0]?.[0])).not.toContain(
      'entreprises/sirene',
    );
    expect(fetchSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('passes AbortSignal.timeout(10s) to fetch', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    fetchSpy.mockResolvedValue(jsonResponse({ ok: true }));

    await client.getSiret('12345678900012');

    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    timeoutSpy.mockRestore();
  });

  it('retries 429 then succeeds', async () => {
    fetchSpy
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(client.getSiret('12345678900012')).resolves.toEqual({
      ok: true,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledOnce();
  });

  it('retries 503 then succeeds', async () => {
    fetchSpy
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(client.getSiret('12345678900012')).resolves.toEqual({
      ok: true,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not retry 400', async () => {
    fetchSpy.mockResolvedValue(errorResponse(400));

    await expect(client.getSiret('12345678900012')).rejects.toThrow(
      BadGatewayException,
    );
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(delay).not.toHaveBeenCalled();
  });

  it('does not retry 404', async () => {
    fetchSpy.mockResolvedValue(errorResponse(404));

    const pending = client.getSiret('12345678900012');
    await expect(pending).rejects.toBeInstanceOf(NotFoundException);
    await expect(pending).rejects.toThrow('Sirene INSEE a répondu 404');
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(delay).not.toHaveBeenCalled();
  });

  it('does not retry other 4xx such as 422', async () => {
    fetchSpy.mockResolvedValue(errorResponse(422));

    await expect(client.getSiret('12345678900012')).rejects.toThrow(
      BadGatewayException,
    );
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(delay).not.toHaveBeenCalled();
  });

  it('retries timeout then succeeds', async () => {
    fetchSpy
      .mockRejectedValueOnce(
        new DOMException(
          'The operation was aborted due to timeout',
          'TimeoutError',
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(client.getSiret('12345678900012')).resolves.toEqual({
      ok: true,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledOnce();
  });

  it('exhausts retries on 503 then throws BadGatewayException', async () => {
    fetchSpy.mockResolvedValue(errorResponse(503));

    const pending = client.getSiret('12345678900012');
    await expect(pending).rejects.toBeInstanceOf(BadGatewayException);
    await expect(pending).rejects.toThrow('Sirene INSEE a répondu 503');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenNthCalledWith(1, sireneBackoffMs(0));
    expect(delay).toHaveBeenNthCalledWith(2, sireneBackoffMs(1));
    expect(sireneBackoffMs(0)).toBe(200);
    expect(sireneBackoffMs(1)).toBe(400);
  });

  it('exhausts retries on timeout then throws GatewayTimeoutException', async () => {
    fetchSpy.mockRejectedValue(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );

    await expect(client.getSiret('12345678900012')).rejects.toThrow(
      GatewayTimeoutException,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('does not retry a network TypeError', async () => {
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'));

    await expect(client.getSiret('12345678900012')).rejects.toThrow(
      'Sirene INSEE est injoignable',
    );
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('searches GET /siret?q= with the discovery query and parses etablissements', async () => {
    const q = buildDiscoverySearchQuery();
    fetchSpy.mockResolvedValue(
      jsonResponse({
        header: { total: 1 },
        etablissements: [{ siret: '12345678900012' }],
      }),
    );

    await expect(client.searchEtablissements(q)).resolves.toEqual({
      etablissements: [{ siret: '12345678900012' }],
      total: 1,
      truncated: false,
    });

    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe(`${SIRENE_BASE_URL}/siret`);
    expect(url.searchParams.get('q')).toBe(q);
    expect(url.searchParams.get('q')).not.toContain(
      'activitePrincipaleNAF25Etablissement',
    );
    expect(fetchSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('forwards a non-empty NAF25 clause in search q', async () => {
    const q = buildDiscoverySearchQuery(['31555'], ['62.01Z'], ['62.10A']);
    fetchSpy.mockResolvedValue(jsonResponse({ etablissements: [] }));

    await client.searchEtablissements(q);

    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(url.searchParams.get('q')).toContain(
      'activitePrincipaleNAF25Etablissement:(62.10A)',
    );
  });

  it('parses search etablissements and paginates until header.total', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({
          header: { total: 2, debut: 0, nombre: 1 },
          etablissements: [{ siret: '11111111111111' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          header: { total: 2, debut: 1, nombre: 1 },
          etablissements: [{ siret: '22222222222222' }],
        }),
      );

    const result = await client.searchEtablissements('q-test', 1);
    expect(result).toEqual({
      etablissements: [
        { siret: '11111111111111' },
        { siret: '22222222222222' },
      ],
      total: 2,
      truncated: false,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const secondUrl = String(fetchSpy.mock.calls[1]?.[0]);
    expect(secondUrl).toContain('debut=1');
    expect(secondUrl).toContain(`${SIRENE_BASE_URL}/siret?`);
  });

  it('stops on an empty page', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ header: { total: 10 }, etablissements: [] }),
    );
    await expect(client.searchEtablissements('q')).resolves.toEqual({
      etablissements: [],
      total: 10,
      truncated: true,
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it(`caps pagination at ${SIRENE_SEARCH_MAX_PAGES} pages`, async () => {
    fetchSpy.mockImplementation(async () =>
      jsonResponse({
        header: { total: 10_000 },
        etablissements: [{ siret: '1' }],
      }),
    );

    const result = await client.searchEtablissements('q', 1);
    expect(result.etablissements).toHaveLength(SIRENE_SEARCH_MAX_PAGES);
    expect(result.total).toBe(10_000);
    expect(result.truncated).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(SIRENE_SEARCH_MAX_PAGES);
  });
});
