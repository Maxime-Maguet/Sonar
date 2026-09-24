import { PrismaClientExceptionFilter } from './prisma-exeption.filter.js';
import { Prisma } from '../../generated/prisma/client.js';

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the table Company',
    { code, clientVersion: 'test' },
  );
}

describe('PrismaClientExceptionFilter', () => {
  it('maps P2002 to a 409 without the Prisma message', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    };

    const filter = new PrismaClientExceptionFilter();
    filter.catch(prismaError('P2002'), host as never);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      code: 'P2002',
      message: 'Une ressource avec ces informations existe déjà',
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('Company');
  });

  it('maps P2025 to a 404 without the Prisma message', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    };
    const filter = new PrismaClientExceptionFilter();
    filter.catch(prismaError('P2025'), host as never);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'P2025',
      message: "La ressource demandée n'existe pas",
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('Company');
  });

  it('maps P2003 to a 409 without the Prisma message', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    };
    const filter = new PrismaClientExceptionFilter();
    filter.catch(prismaError('P2003'), host as never);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      code: 'P2003',
      message: 'La ressource liée est introuvable ou encore référencée',
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('Company');
  });

  it('maps P9999 to a 500 without the Prisma message', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    };
  });
  it('maps P9999 to a 500 without the Prisma message', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    };
    const filter = new PrismaClientExceptionFilter();
    filter.catch(prismaError('P9999'), host as never);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'P9999',
      message: 'Une erreur interne est survenue',
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('Company');
  });
});
