"use client";

import { SiteErrorScreen } from "@/components/site-error-screen";
import { siteErrorPage } from "@/lib/site-error/page-copy";

export default function SiteError({
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  return (
    <SiteErrorScreen
      copy={siteErrorPage("render-crash")}
      onRetry={retry ?? reset}
    />
  );
}
