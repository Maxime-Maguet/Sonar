import type { CompanyListItem } from "@sonar/api-contract";
import { cn } from "cn";

const NO_ACTIVITY_LABEL = "Activité non renseignée";

/** Carte d'entreprise de l'annuaire (ni SIREN, ni SIRET, ni adresse). `className` ajoute le survol éventuel. */
export function CompanyCard({
  company,
  className,
  as: Tag = "li",
  heading: Heading = "h2",
}: {
  company: CompanyListItem;
  className?: string;
  as?: "li" | "div";
  /** Niveau du titre selon le contexte de la page. */
  heading?: "h2" | "h3";
}) {
  return (
    <Tag className={cn("h-full min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <Heading className="text-base font-medium wrap-break-word">{company.name}</Heading>
      <p className="text-sm text-muted-foreground">{company.city}</p>
      <p className="text-sm text-muted-foreground">{company.activityLabel ?? NO_ACTIVITY_LABEL}</p>
    </Tag>
  );
}
