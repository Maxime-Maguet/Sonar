import { FAQ_TITLE, HOME_FAQ } from "@/lib/home/home";

/** FAQ en éléments natifs details/summary : aucun JavaScript client. */
export function FaqBlock({ className }: { className: string }) {
  return (
    <section aria-labelledby="faq-titre" className="py-12 md:py-20">
      <div className={className}>
        <div className="mx-auto max-w-2xl">
          <h2
            id="faq-titre"
            className="text-center text-2xl font-semibold tracking-tight text-balance md:text-3xl"
          >
            {FAQ_TITLE}
          </h2>
          <div className="mt-8 space-y-3">
            {HOME_FAQ.map((item) => (
              <details key={item.question} className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
