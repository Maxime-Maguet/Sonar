/** Préfixes des métadonnées Reflector (une entrée par limiteur nommé). */
export const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
export const THROTTLER_TTL = 'THROTTLER:TTL';
export const THROTTLER_SKIP = 'THROTTLER:SKIP';

/** Jetons d'injection. */
export const THROTTLER_OPTIONS = 'THROTTLER:MODULE_OPTIONS';
export const THROTTLER_STORAGE = 'THROTTLER:STORAGE';

/** Message de l'exception 429 (identique à @nestjs/throttler). */
export const THROTTLER_MESSAGE = 'ThrottlerException: Too Many Requests';
