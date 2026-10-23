import { Suspense } from "react";
import type { Metadata } from "next";
import { PistesBrowser, PistesFallback } from "@/components/pistes-browser";

export const metadata: Metadata = {
  title: "Pistes — Sonar",
};

export default function PistesPage() {
  return (
    <Suspense fallback={<PistesFallback />}>
      <PistesBrowser />
    </Suspense>
  );
}
