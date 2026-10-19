import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  Matches,
  Min,
  IsInt,
  Max,
  IsOptional,
} from 'class-validator';

export class ListLeadsQueryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z]\d{4}$/)
  rome: string;

  @Type(() => Number) // transforme la chaîne de caractères en nombre
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number) // transforme la chaîne de caractères en nombre
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize?: number = 10;
}
