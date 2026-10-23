"use client";

import { Inter } from "next/font/google";
import { SiteErrorScreen } from "@/components/site-error-screen";
import { siteErrorPage } from "@/lib/site-error/page-copy";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function GlobalError({
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  return (
    <html lang="fr" className={cn("font-sans", inter.variable)}>
      <head>
        <title>Sonar</title>
      </head>
      <body>
        <SiteErrorScreen
          copy={siteErrorPage("frame-crash")}
          onRetry={retry ?? reset}
        />
      </body>
    </html>
  );
}
