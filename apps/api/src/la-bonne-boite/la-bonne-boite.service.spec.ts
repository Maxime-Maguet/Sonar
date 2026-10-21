import { BadGatewayException } from '@nestjs/common';
import { LaBonneBoiteService } from './la-bonne-boite.service.js';
import {
  LBB_SEARCH_ITEM_EXAMPLE,
  LBB_SEARCH_RESPONSE_EXAMPLE,
} from './helpers/search.fixture.js';

type CompanyStub = {
  id: string;
  siren: string;
  name: string;
  slug: string;
  city: string;
};

describe('LaBonneBoiteService.list', () => {
  const query = { rome: 'M1805', page: 1 };
  let company: CompanyStub | null = null;
  const search = vi.fn();
  const findUnique = vi.fn();
  const create = vi.fn();
  const upsert = vi.fn();
  const prisma = {
    company: { findUnique, create },
    recruitmentSignal: { upsert },
    $transaction: async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
  } as never;
  const service = new LaBonneBoiteService({ search } as never, prisma);

  beforeEach(() => {
    company = null;
    search.mockReset();
    findUnique.mockReset();
    create.mockReset();
    upsert.mockReset();
    search.mockResolvedValue(LBB_SEARCH_RESPONSE_EXAMPLE);
    upsert.mockResolvedValue({});
    findUnique.mockImplementation(
      async (args: { where: { id?: string; siren?: string } }) => {
        if (args.where.id) {
          return company;
        }
        if (
          args.where.siren &&
          company &&
          args.where.siren === company.siren
        ) {
          return company;
        }
        return null;
      },
    );
    create.mockImplementation(
      async (args: {
        data: Omit<CompanyStub, 'id'>;
      }) => {
        company = {
          id: 'x',
          siren: args.data.siren,
          name: args.data.name,
          slug: args.data.slug,
          city: args.data.city,
        };
        return company;
      },
    );
  });

  it('returns one lead from the LBB fixture', async () => {
    const result = await service.list(query);
    expect(result.hits).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].hiringPotential).toEqual(expect.any(Number));
    expect(result.items[0].isHighPotential).toBe(false);
    expect(result.items[0].source).toBe('LA_BONNE_BOITE');
    expect(result.fetchedAt).toEqual(expect.any(String));
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ citycode: '31555', rome: 'M1805' }),
    );
  });

  it('skips invalid siret but keeps FT hits', async () => {
    search.mockResolvedValue({
      ...LBB_SEARCH_RESPONSE_EXAMPLE,
      items: [
        {
          ...LBB_SEARCH_ITEM_EXAMPLE,
          siret: '123',
        },
      ],
    });
    const result = await service.list(query);
    expect(result.items).toHaveLength(0);
    expect(result.hits).toBe(1);
    expect(create).not.toHaveBeenCalled();
  });

  it('does not create the company twice', async () => {
    await service.list(query);
    await service.list(query);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('rethrows when search fails', async () => {
    search.mockRejectedValue(new BadGatewayException('search failed'));
    await expect(service.list(query)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(create).not.toHaveBeenCalled();
  });
});
