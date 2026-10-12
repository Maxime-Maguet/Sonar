import {
  BadGatewayException,
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  FT_BASE_URL,
  FT_SEARCH_MAX_ATTEMPTS,
  FT_SEARCH_TIMEOUT,
  FT_TOKEN_URL,
  FranceTravailClient,
  ftBackoffMs,
  type FranceTravailSearchParams,
} from './france-travail.client.js';

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

const searchParams: FranceTravailSearchParams = {
  rome: 'M1805',
  citycode: '31555',
  distance: 10,
  page: 1,
  page_size: 10,
};

const tokenBody = { access_token: 'abc', expires_in: 1500 };
const searchBody = { hits: 1, items: [] };

describe('FranceTravailClient', () => {
  const delay = vi.fn().mockResolvedValue(undefined);
  const config = {
    get: (key: string) => {
      if (key === 'FT_CLIENT_ID') return 'test-id';
      if (key === 'FT_CLIENT_SECRET') return 'test-secret';
      return undefined;
    },
  };

  let client: FranceTravailClient;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delay.mockClear();
    client = new FranceTravailClient(config as never, delay);
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('does not fetch when FT credentials are missing', async () => {
    const noKey = new FranceTravailClient(
      { get: () => undefined } as never,
      delay,
    );
    await expect(noKey.search(searchParams)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs a token then GETs /recherche with Bearer and page_size', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(tokenBody))
      .mockResolvedValueOnce(jsonResponse(searchBody));

    await expect(client.search(searchParams)).resolves.toEqual(searchBody);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(FT_TOKEN_URL);
    expect(fetchSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    );
    const tokenPost = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(String(tokenPost.body)).toContain('grant_type=client_credentials');
    expect(String(tokenPost.body)).toContain(
      'scope=search+office+api_labonneboitev2',
    );

    const searchUrl = new URL(String(fetchSpy.mock.calls[1]?.[0]));
    expect(searchUrl.origin + searchUrl.pathname).toBe(FT_BASE_URL);
    expect(searchUrl.searchParams.get('rome')).toBe('M1805');
    expect(searchUrl.searchParams.get('citycode')).toBe('31555');
    expect(searchUrl.searchParams.get('page_size')).toBe('10');
    expect(searchUrl.searchParams.get('pageSize')).toBeNull();
    expect(fetchSpy.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer abc',
          Accept: 'application/json',
        },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('reuses a cached token on a second search', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(tokenBody))
      .mockResolvedValueOnce(jsonResponse(searchBody))
      .mockResolvedValueOnce(jsonResponse(searchBody));

    await client.search(searchParams);
    await client.search(searchParams);

    const tokenCalls = fetchSpy.mock.calls.filter(
      (call) => call[0] === FT_TOKEN_URL,
    );
    const searchCalls = fetchSpy.mock.calls.filter((call) =>
      String(call[0]).startsWith(FT_BASE_URL),
    );
    expect(tokenCalls).toHaveLength(1);
    expect(searchCalls).toHaveLength(2);
  });

  it('requests a new token when the cache is past expires_in minus 60s', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ access_token: 'old', expires_in: 60 }))
      .mockResolvedValueOnce(jsonResponse(searchBody))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'new', expires_in: 1500 }))
      .mockResolvedValueOnce(jsonResponse(searchBody));

    await client.search(searchParams);
    await client.search(searchParams);

    const tokenCalls = fetchSpy.mock.calls.filter(
      (call) => call[0] === FT_TOKEN_URL,
    );
    expect(tokenCalls).toHaveLength(2);
    expect(fetchSpy.mock.calls[2]?.[0]).toBe(FT_TOKEN_URL);
    expect(fetchSpy.mock.calls[3]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer new',
        }),
      }),
    );
  });

  it('on 401 search: clears cache, POSTs token again, retries GET once', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(tokenBody))
      .mockResolvedValueOnce(errorResponse(401))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'fresh', expires_in: 1500 }))
      .mockResolvedValueOnce(jsonResponse(searchBody));

    await expect(client.search(searchParams)).resolves.toEqual(searchBody);
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      FT_TOKEN_URL,
      expect.stringContaining(FT_BASE_URL),
      FT_TOKEN_URL,
      expect.stringContaining(FT_BASE_URL),
    ]);
    expect(fetchSpy.mock.calls[3]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh',
        }),
      }),
    );
  });

  it('retries 429 on search then succeeds', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(tokenBody))
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(jsonResponse(searchBody));

    await expect(client.search(searchParams)).resolves.toEqual(searchBody);
    expect(
      fetchSpy.mock.calls.filter((call) =>
        String(call[0]).startsWith(FT_BASE_URL),
      ),
    ).toHaveLength(2);
    expect(delay).toHaveBeenCalled();
  });

  it('does not retry 404', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(tokenBody))
      .mockResolvedValueOnce(errorResponse(404));

    const pending = client.search(searchParams);
    await expect(pending).rejects.toBeInstanceOf(NotFoundException);
    await expect(pending).rejects.toThrow('France Travail a répondu 404');
    expect(
      fetchSpy.mock.calls.filter((call) =>
        String(call[0]).startsWith(FT_BASE_URL),
      ),
    ).toHaveLength(1);
  });

  it('passes AbortSignal.timeout on token and search', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(tokenBody))
      .mockResolvedValueOnce(jsonResponse(searchBody));

    await client.search(searchParams);

    expect(timeoutSpy).toHaveBeenCalledWith(FT_SEARCH_TIMEOUT);
    expect(timeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    timeoutSpy.mockRestore();
  });

  it('exhausts search timeouts then throws GatewayTimeoutException', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(tokenBody)).mockRejectedValue(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );

    await expect(client.search(searchParams)).rejects.toThrow(
      GatewayTimeoutException,
    );
    expect(
      fetchSpy.mock.calls.filter((call) =>
        String(call[0]).startsWith(FT_BASE_URL),
      ),
    ).toHaveLength(FT_SEARCH_MAX_ATTEMPTS);
  });

  it('does not retry a network TypeError on search', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(tokenBody))
      .mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(client.search(searchParams)).rejects.toThrow(
      'France Travail est injoignable',
    );
    expect(
      fetchSpy.mock.calls.filter((call) =>
        String(call[0]).startsWith(FT_BASE_URL),
      ),
    ).toHaveLength(1);
  });

  it('retries 429 on token then succeeds', async () => {
    fetchSpy
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(jsonResponse(tokenBody))
      .mockResolvedValueOnce(jsonResponse(searchBody));

    await expect(client.search(searchParams)).resolves.toEqual(searchBody);
    expect(
      fetchSpy.mock.calls.filter((call) => call[0] === FT_TOKEN_URL),
    ).toHaveLength(2);
    expect(delay).toHaveBeenCalled();
    expect(ftBackoffMs(0)).toBe(500);
  });

  it('throws BadGatewayException on a 400 token response', async () => {
    fetchSpy.mockResolvedValueOnce(errorResponse(400));

    await expect(client.search(searchParams)).rejects.toThrow(
      BadGatewayException,
    );
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
