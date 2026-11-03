import type { ReactNode } from "react";
import { FooterSourcesProvider } from "@/components/footer-sources";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <FooterSourcesProvider>
      <div className="flex min-h-svh flex-col">
        <a
          href="#contenu"
          className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Aller au contenu
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </FooterSourcesProvider>
  );
}
