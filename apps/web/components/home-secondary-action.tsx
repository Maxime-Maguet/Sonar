"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { secondaryAction } from "@/lib/home/home";
import { useSession } from "@/components/session-provider";

/** Pendant le chargement : emplacement vide de même taille, pour éviter tout décalage. */
export function HomeSecondaryAction() {
  const { session } = useSession();
  const action = secondaryAction(session);
  const className = buttonVariants({ variant: "outline", size: "lg" });

  if (action === null) {
    return <span aria-hidden="true" className={`${className} invisible`}>&nbsp;</span>;
  }
  return (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  );
}
