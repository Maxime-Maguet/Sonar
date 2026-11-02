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
      duplicates: 0,
      truncated: false,
    });

    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe(`${SIRENE_BASE_URL}/siret`);
    expect(url.searchParams.get('q')).toBe(q);
    expect(url.searchParams.get('q')).not.toContain(
      'activitePrincipaleNAF25Etablissement',
    );
    expect(url.searchParams.get('tri')).toBe('siret');
    expect(fetchSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('never sends a NAF25 clause in search q (INSEE 400)', async () => {
    const q = buildDiscoverySearchQuery(['31555'], ['62.01Z']);
    fetchSpy.mockResolvedValue(jsonResponse({ etablissements: [] }));

    await client.searchEtablissements(q);

    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(url.searchParams.get('q')).toBe(q);
    expect(url.searchParams.get('q')).not.toContain('NAF25');
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
      duplicates: 0,
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
      duplicates: 0,
      truncated: true,
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it(`caps pagination at ${SIRENE_SEARCH_MAX_PAGES} pages`, async () => {
    let call = 0;
    fetchSpy.mockImplementation(async () => {
      call += 1;
      return jsonResponse({
        header: { total: 10_000 },
        etablissements: [{ siret: String(call) }],
      });
    });

    const result = await client.searchEtablissements('q', 1);
    expect(result.etablissements).toHaveLength(SIRENE_SEARCH_MAX_PAGES);
    expect(result.total).toBe(10_000);
    expect(result.truncated).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(SIRENE_SEARCH_MAX_PAGES);
  });

  describe('search pagination stability', () => {
    const A = '11111111111111';
    const B = '22222222222222';
    const C = '33333333333333';
    const D = '44444444444444';

    function mockPages(total: number, pages: unknown[][]) {
      for (const etablissements of pages) {
        fetchSpy.mockResolvedValueOnce(
          jsonResponse({ header: { total }, etablissements }),
        );
      }
    }

    function sirets(rows: unknown[]): unknown[] {
      return rows.map((row) => (row as { siret?: string }).siret);
    }

    it('drops rows repeated on an overlapping page and counts them', async () => {
      mockPages(3, [
        [{ siret: A }, { siret: B }],
        [{ siret: B }, { siret: C }],
      ]);

      const result = await client.searchEtablissements('q', 2);

      expect(sirets(result.etablissements)).toEqual([A, B, C]);
      expect(result.duplicates).toBe(1);
      expect(result.total).toBe(3);
      expect(result.truncated).toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('keeps paginating until distinct rows reach the total, not raw rows', async () => {
      mockPages(4, [
        [{ siret: A }, { siret: B }],
        [{ siret: B }, { siret: C }],
        [{ siret: C }, { siret: D }],
      ]);

      const result = await client.searchEtablissements('q', 2);

      expect(sirets(result.etablissements)).toEqual([A, B, C, D]);
      expect(result.duplicates).toBe(2);
      expect(result.truncated).toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('returns no duplicate when page order changes between calls', async () => {
      mockPages(3, [
        [{ siret: A }, { siret: B }],
        [{ siret: B }, { siret: A }],
        [{ siret: C }, { siret: A }],
      ]);

      const result = await client.searchEtablissements('q', 2);
      const returned = sirets(result.etablissements);

      expect(new Set(returned).size).toBe(returned.length);
      expect([...returned].sort()).toEqual([A, B, C]);
      expect(result.duplicates).toBe(3);
      expect(result.truncated).toBe(false);
    });

    it('flags truncated when overlaps keep distinct rows below the total', async () => {
      mockPages(5, [
        [{ siret: A }, { siret: B }],
        [{ siret: A }, { siret: B }],
        [],
      ]);

      const result = await client.searchEtablissements('q', 2);

      expect(sirets(result.etablissements)).toEqual([A, B]);
      expect(result.duplicates).toBe(2);
      expect(result.truncated).toBe(true);
    });

    it('keeps rows without a siret and never counts them as duplicates', async () => {
      mockPages(4, [
        [{ foo: 1 }, { foo: 1 }, { siret: A }],
        [{ siret: A }, { siret: null }],
      ]);

      const result = await client.searchEtablissements('q', 3);

      expect(result.etablissements).toEqual([
        { foo: 1 },
        { foo: 1 },
        { siret: A },
        { siret: null },
      ]);
      expect(result.duplicates).toBe(1);
      expect(result.truncated).toBe(false);
    });

    it('sends tri=siret with q, nombre and debut on every page', async () => {
      mockPages(3, [
        [{ siret: A }],
        [{ siret: B }],
        [{ siret: C }],
      ]);

      await client.searchEtablissements('q-test', 1);

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      for (let index = 0; index < 3; index += 1) {
        const url = new URL(String(fetchSpy.mock.calls[index]?.[0]));
        expect(url.searchParams.get('tri')).toBe('siret');
        expect(url.searchParams.get('q')).toBe('q-test');
        expect(url.searchParams.get('nombre')).toBe('1');
        expect(url.searchParams.get('debut')).toBe(String(index));
      }
    });
  });
});
