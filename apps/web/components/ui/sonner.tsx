"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

/** Toaster Sonar : thème via notre `useTheme()` (pas next-themes), couleurs via les tokens. */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      duration={5000}
      closeButton
      containerAriaLabel="Notifications"
      toastOptions={{ closeButtonAriaLabel: "Fermer la notification" }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
