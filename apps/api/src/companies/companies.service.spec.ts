import {
  CompaniesService,
  ELIGIBLE_COMPANY_WHERE,
} from './companies.service.js';
import { COMPANY_SOURCE_SIRENE } from '../sirene/sirene.service.js';
import {
  ACTIVITY_LABELS,
  getActivityLabel,
} from '../sirene/helpers/discovery.js';

type Args = {
  where?: unknown;
  select?: Record<string, boolean>;
  orderBy?: unknown;
  skip?: number;
  take?: number;
  distinct?: string[];
};

const query = (over: object = {}) =>
  ({ page: 1, pageSize: 20, ...over }) as never;

const LIST_SELECT = ['name', 'city', 'activityCode'];

describe('CompaniesService.list', () => {
  const count = vi.fn();
  const findMany = vi.fn();
  const aggregate = vi.fn();
  const prisma = { company: { count, findMany, aggregate } } as never;
  const service = new CompaniesService(prisma);

  let rows: object[];
  let cityRows: object[];
  let activityRows: object[];

  beforeEach(() => {
    rows = [];
    cityRows = [];
    activityRows = [];
    count.mockReset().mockResolvedValue(0);
    aggregate.mockReset().mockResolvedValue({ _max: { lastSyncedAt: null } });
    // Route the mock by select shape: the service runs 3 findMany calls.
    findMany.mockReset().mockImplementation(async (args: Args) => {
      const keys = Object.keys(args.select ?? {});
      if (keys.length === 1 && keys[0] === 'city') return cityRows;
      if (keys.length === 1 && keys[0] === 'activityCode') return activityRows;
      return rows;
    });
  });

  const callFor = (selectKeys: string[]) =>
    findMany.mock.calls
      .map((c) => c[0] as Args)
      .find((a) => Object.keys(a.select ?? {}).join() === selectKeys.join());

  it('runs 3 findMany calls', async () => {
    await service.list(query());
    expect(findMany).toHaveBeenCalledTimes(3);
  });

  it('defines the eligibility filter: Sirene source, P excluded, NULL allowed', () => {
    expect(ELIGIBLE_COMPANY_WHERE).toEqual({
      source: COMPANY_SOURCE_SIRENE,
      OR: [{ diffusionStatus: null }, { diffusionStatus: { not: 'P' } }],
    });
  });

  it('applies the eligibility filter to list, total, facets and date', async () => {
    await service.list(query());
    expect(callFor(LIST_SELECT)?.where).toEqual({
      AND: [ELIGIBLE_COMPANY_WHERE],
    });
    expect(count).toHaveBeenCalledWith({
      where: { AND: [ELIGIBLE_COMPANY_WHERE] },
    });
    expect(callFor(['city'])?.where).toEqual(ELIGIBLE_COMPANY_WHERE);
    expect(callFor(['activityCode'])?.where).toEqual({
      AND: [ELIGIBLE_COMPANY_WHERE, { activityCode: { not: null } }],
    });
    expect(aggregate).toHaveBeenCalledWith({
      where: ELIGIBLE_COMPANY_WHERE,
      _max: { lastSyncedAt: true },
    });
  });

  it('orders by name then siren', async () => {
    await service.list(query());
    expect(callFor(LIST_SELECT)?.orderBy).toEqual([
      { name: 'asc' },
      { siren: 'asc' },
    ]);
  });

  it.each([
    [1, 20, 0],
    [2, 20, 20],
    [3, 50, 100],
    [10000, 1, 9999],
  ])('page %i size %i -> skip %i', async (page, pageSize, skip) => {
    await service.list(query({ page, pageSize }));
    const args = callFor(LIST_SELECT);
    expect(args?.skip).toBe(skip);
    expect(args?.take).toBe(pageSize);
  });

  it('echoes page and pageSize and returns hits from count', async () => {
    count.mockResolvedValue(123);
    const res = await service.list(query({ page: 4, pageSize: 10 }));
    expect(res.hits).toBe(123);
    expect(res.page).toBe(4);
    expect(res.pageSize).toBe(10);
  });

  it('combines city and activity filters for list and total, not for facets', async () => {
    await service.list(query({ city: 'Lyon', activityCode: '62.01Z' }));
    const expected = {
      AND: [
        ELIGIBLE_COMPANY_WHERE,
        { city: 'Lyon' },
        { activityCode: '62.01Z' },
      ],
    };
    expect(callFor(LIST_SELECT)?.where).toEqual(expected);
    expect(count).toHaveBeenCalledWith({ where: expected });
    expect(callFor(['city'])?.where).toEqual(ELIGIBLE_COMPANY_WHERE);
  });

  it('applies a single filter alone', async () => {
    await service.list(query({ city: 'Lyon' }));
    expect(count).toHaveBeenCalledWith({
      where: { AND: [ELIGIBLE_COMPANY_WHERE, { city: 'Lyon' }] },
    });
    count.mockClear();
    await service.list(query({ activityCode: '62.01Z' }));
    expect(count).toHaveBeenCalledWith({
      where: { AND: [ELIGIBLE_COMPANY_WHERE, { activityCode: '62.01Z' }] },
    });
  });

  it('well-formed unknown filter: hits 0, empty items, facets unchanged', async () => {
    cityRows = [{ city: 'Lyon' }];
    activityRows = [{ activityCode: '62.01Z' }];
    const res = await service.list(query({ city: 'Nulle-Part' }));
    expect(res.hits).toBe(0);
    expect(res.items).toEqual([]);
    expect(res.facets.cities).toEqual(['Lyon']);
    expect(res.facets.activities).toEqual([
      { code: '62.01Z', label: 'Programmation informatique' },
    ]);
  });

  it('returns only name/city/activityCode/activityLabel per item', async () => {
    rows = [
      {
        id: 'x',
        siren: '123456789',
        siret: '12345678900012',
        address: '1 rue X',
        slug: 'acme',
        name: 'Acme',
        city: 'Lyon',
        activityCode: '62.01Z',
      },
    ];
    const res = await service.list(query());
    expect(res.items).toEqual([
      {
        name: 'Acme',
        city: 'Lyon',
        activityCode: '62.01Z',
        activityLabel: 'Programmation informatique',
      },
    ]);
    expect(Object.keys(res.items[0]).sort()).toEqual([
      'activityCode',
      'activityLabel',
      'city',
      'name',
    ]);
  });

  it('selects only the public columns for the list', async () => {
    await service.list(query());
    expect(callFor(LIST_SELECT)?.select).toEqual({
      name: true,
      city: true,
      activityCode: true,
    });
  });

  it('falls back to the code when it has no label, and null when no code', async () => {
    rows = [
      { name: 'A', city: 'Lyon', activityCode: '99.99Z' },
      { name: 'B', city: 'Lyon', activityCode: null },
    ];
    const res = await service.list(query());
    expect(res.items[0].activityLabel).toBe('99.99Z');
    expect(res.items[1].activityCode).toBeNull();
    expect(res.items[1].activityLabel).toBeNull();
  });

  it('builds sorted facets with labels and ignores null activity codes', async () => {
    cityRows = [{ city: 'Paris' }, { city: 'Lyon' }, { city: 'Épinal' }];
    activityRows = [
      { activityCode: '62.09Z' },
      { activityCode: null },
      { activityCode: '58.29C' },
      { activityCode: '99.99Z' },
    ];
    const res = await service.list(query());
    expect(res.facets.cities).toEqual(['Épinal', 'Lyon', 'Paris']);
    expect(res.facets.activities).toEqual([
      { code: '58.29C', label: ACTIVITY_LABELS['58.29C'] },
      { code: '62.09Z', label: ACTIVITY_LABELS['62.09Z'] },
      { code: '99.99Z', label: '99.99Z' },
    ]);
  });

  it('returns syncedAt as ISO string of the max over the annuaire', async () => {
    aggregate.mockResolvedValue({
      _max: { lastSyncedAt: new Date('2026-10-30T08:15:00.000Z') },
    });
    const res = await service.list(query());
    expect(res.syncedAt).toBe('2026-10-30T08:15:00.000Z');
  });

  it('returns syncedAt null and empty facets when the annuaire is empty', async () => {
    const res = await service.list(query());
    expect(res.syncedAt).toBeNull();
    expect(res.facets).toEqual({ cities: [], activities: [] });
  });

  it('keeps syncedAt independent from the filters', async () => {
    await service.list(query({ city: 'Lyon' }));
    expect(aggregate.mock.calls[0][0].where).toBe(ELIGIBLE_COMPANY_WHERE);
  });
});

describe('getActivityLabel', () => {
  it('returns the label of a known code', () => {
    expect(getActivityLabel('62.01Z')).toBe('Programmation informatique');
  });
  it('returns the code itself when unknown', () => {
    expect(getActivityLabel('99.99Z')).toBe('99.99Z');
  });
  it('does not resolve inherited object keys', () => {
    expect(getActivityLabel('constructor')).toBe('constructor');
    expect(getActivityLabel('__proto__')).toBe('__proto__');
  });
});
