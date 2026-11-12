import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CompanyCard } from "@/components/company-card";
import {
  DIRECTORY_EYEBROW,
  DIRECTORY_LINK,
  DIRECTORY_TITLE,
  type DirectoryPreview as DirectoryPreviewData,
} from "@/lib/home/home";

/** Aperçu de l'annuaire : cartes non cliquables (ni lien, ni curseur main) jusqu'à la fiche entreprise. */
export function DirectoryPreview({ preview, className }: { preview: DirectoryPreviewData; className: string }) {
  return (
    <section aria-labelledby="annuaire-titre" className="py-12 md:py-20">
      <div className={className}>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-medium tracking-wide text-brand-from uppercase">{DIRECTORY_EYEBROW}</p>
          <h2 id="annuaire-titre" className="mt-2 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {DIRECTORY_TITLE}
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {preview.companies.map((company, index) => (
            <CompanyCard
              key={`${company.name}-${company.city}-${index}`}
              company={company}
              heading="h3"
              className="shadow-card"
            />
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-muted-foreground">{preview.sourceLine}</p>
        <div className="mt-6 flex justify-center">
          <Link
            href={DIRECTORY_LINK.href}
            className="group inline-flex items-center gap-1 text-sm font-medium text-brand-from"
          >
            {DIRECTORY_LINK.label}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-300 ease-calm group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
