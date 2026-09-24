import { SireneService } from './sirene.service.js';
import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';

// describe = un groupe de tests. Le nom est la méthode qu'on couvre.
describe('getEtablissementBySiret', () => {
  // it = un seul scénario. La phrase dit ce qui doit arriver.
  it('throws ServiceUnavailableException when INSEE_API_KEY is missing', async () => {
    // 1. Préparer. On ne lance pas Nest : on fabrique le service à la main.
    //    config.get() renvoie undefined, donc pas de clé INSEE.
    //    {} remplace Prisma : cette méthode doit s'arrêter avant la base.
    //    L'espion sur fetch compte les appels réseau.
    const config = { get: () => undefined } as never;
    const service = new SireneService(config, {} as never);
    const fetchSpy = vi.spyOn(global, 'fetch');

    // 2. Agir et vérifier le résultat.
    //    rejects = la méthode async doit échouer.
    //    toThrow = l'erreur doit être ServiceUnavailableException.
    await expect(
      service.getEtablissementBySiret('12345678900012'),
    ).rejects.toThrow(ServiceUnavailableException);

    // 3. Vérifier l'effet de bord : INSEE n'a pas été appelé.
    expect(fetchSpy).not.toHaveBeenCalled();

    // 4. Ranger. Les tests suivants retrouvent le vrai fetch.
    fetchSpy.mockRestore();
  });

  it('throws BadGatewayException when INSEE API returns a non-200 status', async () => {
    const config = { get: () => 'test-api-key' } as never;
    const service = new SireneService(config, {} as never);
    // Faux fetch : INSEE a répondu, mais le statut n'est pas un succès.
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    const pending = service.getEtablissementBySiret('12345678900012');
    await expect(pending).rejects.toBeInstanceOf(BadGatewayException);
    await expect(pending).rejects.toThrow('Sirene INSEE a répondu 503');
    expect(fetchSpy).toHaveBeenCalledOnce();

    fetchSpy.mockRestore();
  });

  it('returns the normalized fiche when INSEE responds 200', async () => {
    const config = { get: () => 'test-api-key' } as never;
    const service = new SireneService(config, {} as never);
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

  it('throws GatewayTimeoutException when fetch times out', async () => {
    const config = { get: () => 'test-api-key' } as never;
    const service = new SireneService(config, {} as never);
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(
      new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
    );

    await expect(
      service.getEtablissementBySiret('12345678900012'),
    ).rejects.toThrow(GatewayTimeoutException);

    fetchSpy.mockRestore();
  });

  it('throws BadGatewayException when fetch rejects', async () => {
    const config = { get: () => 'test-api-key' } as never;
    const service = new SireneService(config, {} as never);
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
    const config = { get: () => 'test-api-key' } as never;
    const service = new SireneService(config, prisma as never);
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
