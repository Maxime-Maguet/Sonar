// Active Reflect.getMetadata. class-transformer en a besoin pour lire
// les décorateurs (@Transform, @IsString…). Nest le charge au boot,
// pas Vitest : sans cet import, le spec plante.
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

// config = process.env + le fichier .env, déjà fusionnés par ConfigModule.
export function validate(config: Record<string, unknown>) {
  // Copie : on ne modifie pas l'objet reçu.
  const source = { ...config };
  // @Transform ne s'exécute pas si la clé est absente. On pose le défaut
  // ici, avant de construire la classe. "" compte comme absent.
  if (
    source.API_PORT === undefined ||
    source.API_PORT === null ||
    source.API_PORT === ''
  ) {
    source.API_PORT = 3001;
  }

  // plainToInstance construit un EnvironmentVariables et applique @Transform.
  // enableImplicitConversion : "3001" (texte du .env) devient le nombre 3001.
  const validatedConfig = plainToInstance(EnvironmentVariables, source, {
    enableImplicitConversion: true,
  });
  // validateSync lit les @IsString, @IsNotEmpty, etc.
  // skipMissingProperties: false = une clé absente est une erreur.
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
