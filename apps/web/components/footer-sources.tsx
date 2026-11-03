"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { FooterLine } from "@/lib/footer/types";

const LinesContext = createContext<FooterLine[] | null>(null);
const SetLinesContext = createContext<(lines: FooterLine[] | null) => void>(
  () => {},
);

/** Porte le bloc de sources de la page courante jusqu'au pied de page du layout. */
export function FooterSourcesProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<FooterLine[] | null>(null);
  return (
    <SetLinesContext.Provider value={setLines}>
      <LinesContext.Provider value={lines}>{children}</LinesContext.Provider>
    </SetLinesContext.Provider>
  );
}

export function usePageFooterLines(): FooterLine[] | null {
  return useContext(LinesContext);
}

/**
 * Une page le rend pour fournir (ou mettre à jour) son bloc de sources ;
 * le bloc est retiré au démontage. Ne dessine rien.
 */
export function FooterSources({ lines }: { lines: FooterLine[] }) {
  const setLines = useContext(SetLinesContext);
  const signature = JSON.stringify(lines);

  useEffect(() => {
    setLines(JSON.parse(signature) as FooterLine[]);
    return () => setLines(null);
  }, [signature, setLines]);

  return null;
}
