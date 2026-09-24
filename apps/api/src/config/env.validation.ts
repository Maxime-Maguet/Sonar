import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

class EnvironmentVariables {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @Matches(/^postgres(ql)?:\/\//)
  DATABASE_URL: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @Transform(trimString)
  @IsUrl({ require_tld: false, require_protocol: true })
  WEB_ORIGIN: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  INSEE_API_KEY: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  FT_CLIENT_ID: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  FT_CLIENT_SECRET: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 3001;
    }
    const port = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(port) ? port : value;
  })
  @IsInt()
  @Min(0)
  @Max(65535)
  API_PORT: number;
}

export function validate(config: Record<string, unknown>) {
  const source = { ...config };
  if (
    source.API_PORT === undefined ||
    source.API_PORT === null ||
    source.API_PORT === ''
  ) {
    source.API_PORT = 3001;
  }

  const validatedConfig = plainToInstance(EnvironmentVariables, source, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const names = errors.map((error) => error.property).join(', ');
    throw new Error(
      `Variables d'environnement invalides ou manquantes : ${names}`,
    );
  }

  return validatedConfig;
}
