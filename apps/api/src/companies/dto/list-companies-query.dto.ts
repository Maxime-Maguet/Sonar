import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const COMPANIES_DEFAULT_PAGE_SIZE = 20;
export const COMPANIES_MAX_PAGE_SIZE = 50;

// Entier décimal strict : tout le reste (1e1, 0x10, " 5 ", tableau) devient NaN -> 400.
function toStrictInt({ value }: { value: unknown }): unknown {
  if (value === undefined) return value;
  return typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : Number.NaN;
}

export class ListCompaniesQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city?: string;

  // Forme NAF Rév. 2, comme stocké dans Company.activityCode (ex. 62.01Z)
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\.\d{2}[A-Z]$/)
  activityCode?: string;

  @Transform(toStrictInt)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  page: number = 1;

  @Transform(toStrictInt)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(COMPANIES_MAX_PAGE_SIZE)
  pageSize: number = COMPANIES_DEFAULT_PAGE_SIZE;
}
