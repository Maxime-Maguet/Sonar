"use client";

import { Compass } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { HOME_ACTION_SIZE_CLASS, PISTES_ACTION, secondaryAction } from "@/lib/home/home";
import { useSession } from "@/components/session-provider";
import { cn } from "cn";

const SECONDARY_CLASS = cn(
  buttonVariants({ variant: "outline", size: "lg" }),
  HOME_ACTION_SIZE_CLASS,
  "font-medium hover:border-primary/50 hover:bg-muted hover:text-foreground",
);

/** Pendant le chargement : emplacement vide de même taille, pour éviter tout décalage. */
export function HomeSecondaryAction() {
  const { session } = useSession();
  const action = secondaryAction(session);

  if (action === null) {
    return (
      <span aria-hidden="true" className={cn(SECONDARY_CLASS, "invisible")}>
        &nbsp;
      </span>
    );
  }
  return (
    <Link href={action.href} className={SECONDARY_CLASS}>
      {action.href === PISTES_ACTION.href ? <Compass aria-hidden="true" className="size-4" /> : null}
      {action.label}
    </Link>
  );
}
