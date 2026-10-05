import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { SireneController } from './sirene.controller.js';

describe('SireneController', () => {
  // test unitaire pour la méthode getCompany
  it('passes the siret param to getEtablissementBySiret', async () => {
    const fiche = { siren: '123456789', siret: '12345678900012' };
    const getEtablissementBySiret = vi.fn().mockResolvedValue(fiche);
    const controller = new SireneController({
      getEtablissementBySiret,
    } as never);
    const result = await controller.getCompany('12345678900012');
    expect(getEtablissementBySiret).toHaveBeenCalledWith('12345678900012');
    expect(result).toBe(fiche);
  });
  // test unitaire pour la méthode createCompany
  it('passes the siret param to createEtablissement', async () => {
    const saved = { id: 'company-1' };
    const createEtablissement = vi.fn().mockResolvedValue(saved);
    const controller = new SireneController({
      createEtablissement,
    } as never);
    const result = await controller.createCompany('12345678900012');
    expect(createEtablissement).toHaveBeenCalledWith('12345678900012');
    expect(result).toBe(saved);
  });

  it('leaves GET public', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SireneController.prototype.getCompany),
    ).toBeUndefined();
  });

  it('protects create with AuthGuard then AdminGuard', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        SireneController.prototype.createCompany,
      ),
    ).toEqual([AuthGuard, AdminGuard]);
  });
});
