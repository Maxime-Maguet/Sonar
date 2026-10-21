import { validate } from './env.validation.js';

// Fausse clé, uniquement pour vérifier qu'elle n'apparaît pas dans le message.
const SECRET = 'ft-client-secret-value';

// Objet complet et valide. `overrides` remplace une clé pour un scénario.
function validEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgresql://sonar:sonar@localhost:5433/sonar',
    JWT_SECRET: 'replace-with-a-long-random-string',
    WEB_ORIGIN: 'http://localhost:3000',
    NODE_ENV: 'development',
    INSEE_API_KEY: 'insee-key',
    FT_CLIENT_ID: 'ft-client-id',
    FT_CLIENT_SECRET: SECRET,
    ...overrides,
  };
}

// describe = un groupe de tests. On teste la fonction, pas Nest.
describe('validate', () => {
  // it = un seul scénario. La phrase dit ce qui doit arriver.
  it('returns the config when every required variable is set', () => {
    // Les espaces autour du secret doivent disparaître (trim).
    const config = validEnv({ JWT_SECRET: '  local-secret  ' });

    // toMatchObject = ces champs sont présents et égaux.
    // API_PORT absent → 3001.
    expect(validate(config)).toMatchObject({
      DATABASE_URL: 'postgresql://sonar:sonar@localhost:5433/sonar',
      JWT_SECRET: 'local-secret',
      WEB_ORIGIN: 'http://localhost:3000',
      INSEE_API_KEY: 'insee-key',
      FT_CLIENT_ID: 'ft-client-id',
      FT_CLIENT_SECRET: SECRET,
      API_PORT: 3001,
    });
  });

  it('names a missing variable and does not include its value', () => {
    // delete enlève la clé. Ce n'est pas la même chose qu'une chaîne vide.
    const env = validEnv();
    delete env.INSEE_API_KEY;

    // toThrow avec une chaîne = le message doit être exactement celui-là.
    // Le nom est là, jamais la valeur de la clé.
    expect(() => validate(env)).toThrow(
      "Variables d'environnement invalides ou manquantes : INSEE_API_KEY",
    );
  });

  it('rejects an empty string', () => {
    // "" est présent, mais vide : le boot doit quand même refuser.
    expect(() => validate(validEnv({ FT_CLIENT_SECRET: '' }))).toThrow(
      "Variables d'environnement invalides ou manquantes : FT_CLIENT_SECRET",
    );
  });

  it('rejects a blank string after trim', () => {
    // "   " devient "" après trim, donc la clé est traitée comme vide.
    // /JWT_SECRET/ = le message contient au moins ce nom.
    expect(() => validate(validEnv({ JWT_SECRET: '   ' }))).toThrow(
      /JWT_SECRET/,
    );
  });

  it('lists every missing variable in one error', () => {
    // Une seule erreur liste toutes les clés. On ne s'arrête pas à la première.
    const env = validEnv();
    delete env.FT_CLIENT_SECRET;
    delete env.INSEE_API_KEY;

    expect(() => validate(env)).toThrow(
      "Variables d'environnement invalides ou manquantes : INSEE_API_KEY, FT_CLIENT_SECRET",
    );
  });

  it('rejects a WEB_ORIGIN that is not a URL', () => {
    // localhost est accepté (require_tld: false), pas un texte libre.
    expect(() => validate(validEnv({ WEB_ORIGIN: 'pas une url' }))).toThrow(
      /WEB_ORIGIN/,
    );
  });

  it('accepts several origins (local + LAN phone)', () => {
    const raw = 'http://localhost:3000, http://192.168.1.20:3000';
    expect(validate(validEnv({ WEB_ORIGIN: raw })).WEB_ORIGIN).toBe(raw);
  });

  it.each(['', '   ', 'http://localhost:3000,', 'http://a.com/path'])(
    'rejects WEB_ORIGIN %j',
    (value) => {
      expect(() => validate(validEnv({ WEB_ORIGIN: value }))).toThrow(
        /WEB_ORIGIN/,
      );
    },
  );

  it('rejects a missing WEB_ORIGIN', () => {
    const env = validEnv();
    delete env.WEB_ORIGIN;
    expect(() => validate(env)).toThrow(/WEB_ORIGIN/);
  });

  it.each([
    'http://localhost:3000',
    'https://app.example.com,http://192.168.1.20:3000',
    'https://10.0.0.5',
    'https://[::1]',
  ])('rejects %s in production', (value) => {
    expect(() =>
      validate(validEnv({ NODE_ENV: 'production', WEB_ORIGIN: value })),
    ).toThrow(/WEB_ORIGIN/);
  });

  it.each([' production ', 'production'])(
    'detects production with whitespace (%j)',
    (nodeEnv) => {
      expect(() =>
        validate(validEnv({ NODE_ENV: nodeEnv, WEB_ORIGIN: 'http://localhost.' })),
      ).toThrow(/WEB_ORIGIN/);
    },
  );

  it('rejects an unknown or wrongly-cased NODE_ENV', () => {
    expect(() => validate(validEnv({ NODE_ENV: 'PRODUCTION' }))).toThrow(
      /NODE_ENV/,
    );
    expect(() => validate(validEnv({ NODE_ENV: 'staging' }))).toThrow(
      /NODE_ENV/,
    );
  });

  it('requires NODE_ENV: missing, empty or blank is rejected by name', () => {
    const missing = validEnv();
    delete missing.NODE_ENV;
    expect(() => validate(missing)).toThrow(
      "Variables d'environnement invalides ou manquantes : NODE_ENV",
    );
    expect(() => validate(validEnv({ NODE_ENV: '' }))).toThrow(/NODE_ENV/);
    expect(() => validate(validEnv({ NODE_ENV: '   ' }))).toThrow(/NODE_ENV/);
  });

  it.each(['development', 'test', 'production'])(
    'accepts NODE_ENV=%s',
    (nodeEnv) => {
      expect(() =>
        validate(validEnv({ NODE_ENV: nodeEnv, WEB_ORIGIN: 'https://app.example.com' })),
      ).not.toThrow();
    },
  );

  it('accepts public https origins in production', () => {
    expect(
      validate(
        validEnv({
          NODE_ENV: 'production',
          WEB_ORIGIN: 'https://app.example.com,https://www.example.com',
        }),
      ).WEB_ORIGIN,
    ).toBe('https://app.example.com,https://www.example.com');
  });

  it('rejects a DATABASE_URL that is not Postgres and hides the value', () => {
    // Le message nomme DATABASE_URL et ne contient pas secret-db.
    expect(() =>
      validate(
        validEnv({ DATABASE_URL: 'mysql://user:secret-db@localhost/sonar' }),
      ),
    ).toThrow(
      "Variables d'environnement invalides ou manquantes : DATABASE_URL",
    );
  });

  it('defaults API_PORT to 3001 when it is absent', () => {
    // validEnv() n'envoie pas API_PORT. Le défaut est celui de main.ts.
    expect(validate(validEnv()).API_PORT).toBe(3001);
  });
});
