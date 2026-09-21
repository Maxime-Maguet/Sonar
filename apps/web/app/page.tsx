import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

const swatches = [
  { name: "background", className: "bg-background", role: "fond (clair)" },
  { name: "card", className: "bg-card", role: "carte" },
  { name: "muted", className: "bg-muted", role: "secondaire" },
  { name: "primary", className: "bg-primary", role: "accent sky" },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
          Toulouse
        </span>
        <ModeToggle />
      </div>

      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Sonar</h1>
        <p className="max-w-lg text-muted-foreground">
          L&apos;écosystème tech de Toulouse, sans le bruit. Les compteurs
          arriveront en live depuis la base — pas de chiffres inventés ici.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {swatches.map((swatch) => (
          <div key={swatch.name} className="space-y-2">
            <div
              className={`h-16 rounded-lg border border-border ${swatch.className}`}
            />
            <p className="text-sm font-medium">{swatch.name}</p>
            <p className="text-xs text-muted-foreground">{swatch.role}</p>
          </div>
        ))}
      </div>

      <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Outil interne</p>
        <h2 className="mt-1 text-lg font-medium">Tokens branchés</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Clair par défaut. Le sombre, c&apos;est le mode shadcn (classe{" "}
          <code className="text-foreground">.dark</code>
          ), pas un thème forcé. Accent sky, Inter.
        </p>
        <Button className="mt-4">Continuer</Button>
      </article>
    </main>
  );
}
