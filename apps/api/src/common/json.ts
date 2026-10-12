export type Json = Record<string, unknown>;

function asObject(value: unknown): Json | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Json;
  }
  return undefined;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'etablissement'; // Retourne le slug ou 'etablissement' si le slug est vide.
}

export { asObject, asText, slugify }; // Exporte les fonctions asObject, asText et slugify.
