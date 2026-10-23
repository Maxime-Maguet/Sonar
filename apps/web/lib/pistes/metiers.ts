import { DEFAULT_ROME } from "./query";

/** Liste courte pour changer de recherche. M1805 est le défaut. */
export const METIERS = [
  { rome: DEFAULT_ROME, label: "Études et développement informatique" },
  { rome: "M1802", label: "Expertise et support en systèmes d'information" },
  { rome: "M1806", label: "Conseil et maîtrise d'ouvrage en systèmes d'information" },
  { rome: "M1810", label: "Production et exploitation de systèmes d'information" },
] as const;

export function metierOptions(rome: string): { rome: string; label: string }[] {
  if (METIERS.some((metier) => metier.rome === rome)) return [...METIERS];
  return [...METIERS, { rome, label: rome }];
}
