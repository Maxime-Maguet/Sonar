import { Injectable } from '@nestjs/common';
import type { CompaniesPage, CompanyListItem } from '@sonar/api-contract';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { COMPANY_SOURCE_SIRENE } from '../sirene/sirene.service.js';
import { getActivityLabel } from '../sirene/helpers/discovery.js';
import type { ListCompaniesQueryDto } from './dto/list-companies-query.dto.js';

export const DIFFUSION_PARTIAL = 'P';

/** Annuaire public : source Sirene, diffusion non partielle (NULL inclus). */
export const ELIGIBLE_COMPANY_WHERE: Prisma.CompanyWhereInput = {
  source: COMPANY_SOURCE_SIRENE,
  OR: [
    { diffusionStatus: null },
    { diffusionStatus: { not: DIFFUSION_PARTIAL } },
  ],
};

type ListedRow = {
  name: string;
  city: string;
  activityCode: string | null;
};

/** Mappe explicitement une ligne vers l'item public (rien d'autre). */
export function toCompanyListItem(row: ListedRow): CompanyListItem {
  return {
    name: row.name,
    city: row.city,
    activityCode: row.activityCode,
    activityLabel:
      row.activityCode === null ? null : getActivityLabel(row.activityCode),
  };
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCompaniesQueryDto): Promise<CompaniesPage> {
    const page = query.page;
    const pageSize = query.pageSize;
    const where: Prisma.CompanyWhereInput = {
      AND: [
        ELIGIBLE_COMPANY_WHERE,
        ...(query.city ? [{ city: query.city }] : []),
        ...(query.activityCode ? [{ activityCode: query.activityCode }] : []),
      ],
    };

    const [hits, rows, cityRows, activityRows, sync] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        select: { name: true, city: true, activityCode: true },
        orderBy: [{ name: 'asc' }, { siren: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.company.findMany({
        where: ELIGIBLE_COMPANY_WHERE,
        select: { city: true },
        distinct: ['city'],
      }),
      this.prisma.company.findMany({
        where: {
          AND: [ELIGIBLE_COMPANY_WHERE, { activityCode: { not: null } }],
        },
        select: { activityCode: true },
        distinct: ['activityCode'],
      }),
      this.prisma.company.aggregate({
        where: ELIGIBLE_COMPANY_WHERE,
        _max: { lastSyncedAt: true },
      }),
    ]);

    const cities = cityRows
      .map((r) => r.city)
      .sort((a, b) => a.localeCompare(b, 'fr'));
    const activities = activityRows
      .flatMap((r) => (r.activityCode === null ? [] : [r.activityCode]))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map((code) => ({ code, label: getActivityLabel(code) }));

    return {
      hits,
      page,
      pageSize,
      items: rows.map(toCompanyListItem),
      facets: { cities, activities },
      syncedAt: sync._max.lastSyncedAt?.toISOString() ?? null,
    };
  }
}
