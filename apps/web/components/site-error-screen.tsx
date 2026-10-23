"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { SiteErrorPageCopy } from "@/lib/site-error/page-copy";

export function SiteErrorScreen({
  copy,
  onRetry,
}: {
  copy: SiteErrorPageCopy;
  onRetry?: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium text-primary">{copy.siteName}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{copy.sentence}</h1>
      <div className="flex flex-wrap gap-3">
        {copy.actions.map((action) =>
          action.kind === "retry" ? (
            <Button key={action.kind} type="button" onClick={() => onRetry?.()}>
              {action.label}
            </Button>
          ) : (
            <Link
              key={action.kind}
              href={action.href}
              className={buttonVariants({ variant: "outline" })}
            >
              {action.label}
            </Link>
          ),
        )}
      </div>
    </main>
  );
}
