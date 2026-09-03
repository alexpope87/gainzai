import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Check, X, Dumbbell, Utensils, Sparkles, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "GAINZ — Il tuo personal AI trainer in palestra" },
      {
        name: "description",
        content:
          "GAINZ analizza allenamenti, macro e recupero. Ogni sera ti dice esattamente cosa fare domani. Gratis, senza carta di credito.",
      },
      { property: "og:title", content: "GAINZ — Il tuo personal AI trainer in palestra" },
      {
        property: "og:description",
        content:
          "Allenamenti, macro e recupero analizzati dall'AI. Ogni sera sai esattamente cosa fare domani.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const pains = [
  "Hai un foglio Excel con i tuoi allenamenti ma non sai se stai progredendo davvero",
  "Conti i macro ma non sai se il tuo peso si muove per i motivi giusti",
  "Ti alleni duro ma non sai mai se stai recuperando abbastanza",
];

const solutions = [
  {
    icon: Dumbbell,
    title: "Log intelligente",
    desc: "Inserisci serie, reps e kg. GAINZ ricorda tutto e ti dice cosa fare la prossima sessione.",
  },
  {
    icon: Utensils,
    title: "Macros",
    desc: "Scrivi cosa hai mangiato. L'AI stima kcal, proteine, carbo e grassi.",
  },
  {
    icon: Sparkles,
    title: "Analisi serale",
    desc: "Ogni sera l'AI analizza tutti i tuoi dati e ti dice esattamente cosa fare domani.",
  },
];

const testimonials = [
  {
    quote:
      "Finalmente un'app che mi dice cosa fare invece di mostrarmi grafici che devo interpretare da solo.",
    author: "Marco, 34 anni, Milano",
  },
  {
    quote:
      "Ho caricato la scheda del mio PT in foto e in 30 secondi avevo tutto dentro. Assurdo.",
    author: "Giulia, 27 anni, Roma",
  },
  {
    quote:
      "L'analisi serale è diventata la mia routine. So sempre se spingere o recuperare.",
    author: "Andrea, 41 anni, Torino",
  },
];

const faqs = [
  {
    q: "Devo inserire manualmente tutti i macro?",
    a: "No, scrivi in italiano quello che hai mangiato e l'AI stima tutto automaticamente.",
  },
  {
    q: "Funziona con la mia scheda del PT?",
    a: "Sì, carica la scheda in foto, PDF o Excel e l'AI estrae automaticamente tutti gli esercizi.",
  },
  {
    q: "Posso cancellare quando voglio?",
    a: "Sì, nessun vincolo. Cancelli dall'app in qualsiasi momento.",
  },
  {
    q: "È diverso da MyFitnessPal o Hevy?",
    a: "GAINZ non ti mostra solo i dati — li analizza e ti dice cosa fare. È la differenza tra avere un foglio Excel e avere un preparatore.",
  },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const ctaTo = "/auth";
  const ctaLabel = "Iscriviti";

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <BrandLogo className="text-base" />
        <Button asChild variant="ghost" size="sm" className="text-white">
          <Link to={ctaTo}>{signedIn ? "Dashboard" : "Accedi"}</Link>
        </Button>
      </header>

      {/* 1. HERO */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center sm:pt-24">
        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight sm:text-6xl">
          Il tuo personal AI trainer.
          <br />
          <span className="text-[#00FF87]">Sempre con te in palestra.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-neutral-400 sm:text-lg">
          GAINZ analizza i tuoi allenamenti, i tuoi macro e il tuo recupero. Ogni sera ti dice
          esattamente cosa fare domani.
        </p>
        <div className="mt-10">
          <Button
            asChild
            size="lg"
            className="h-14 bg-[#00FF87] px-10 text-base font-bold text-black hover:bg-[#00FF87]/90"
          >
            <Link to={ctaTo}>{ctaLabel}</Link>
          </Button>
          <p className="mt-3 text-sm text-neutral-500">Nessuna carta di credito richiesta</p>
        </div>
      </section>

      {/* 2. PROBLEMA */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Le altre app raccolgono dati.{" "}
          <span className="text-neutral-500">Tu devi ancora interpretarli.</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {pains.map((p) => (
            <div key={p} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <X className="h-5 w-5 text-neutral-500" />
              <p className="mt-4 text-sm leading-relaxed text-neutral-300">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SOLUZIONE */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          GAINZ <span className="text-[#00FF87]">decide per te.</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {solutions.map((s) => (
            <div key={s.title} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <s.icon className="h-6 w-6 text-[#00FF87]" />
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SOCIAL PROOF */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Cosa dicono i nostri utenti</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.author}
              className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6"
            >
              <blockquote className="text-sm leading-relaxed text-neutral-300">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="h-9 w-9 rounded-full bg-neutral-700" aria-hidden="true" />
                <span className="text-xs text-neutral-500">{t.author}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 5. PRICING */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Semplice. <span className="text-[#00FF87]">Trasparente.</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-6">
            <h3 className="text-lg font-semibold">Free</h3>
            <p className="mt-1 text-3xl font-bold">
              €0 <span className="text-sm font-normal text-neutral-500">/ mese</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <Feature ok>Stima AI macro da testo libero</Feature>
              <Feature ok>1 scheda di allenamento</Feature>
              <Feature ok>Check-in giornaliero</Feature>
              <Feature ok>Dashboard progressi base</Feature>
              <Feature>Analisi AI serale</Feature>
              <Feature>Modifica esercizi e dati</Feature>
              <Feature>Più schede di allenamento</Feature>
            </ul>
            <Button
              asChild
              variant="outline"
              className="mt-6 h-12 w-full border-neutral-700 text-white hover:bg-neutral-800"
            >
              <Link to={ctaTo}>INIZIA GRATIS</Link>
            </Button>
          </div>
          {/* Premium */}
          <div className="relative rounded-xl border-2 border-[#00FF87] bg-neutral-900/50 p-6">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00FF87] px-3 py-1 text-xs font-bold text-black">
              Più popolare
            </span>
            <h3 className="text-lg font-semibold">Premium</h3>
            <p className="mt-1 text-3xl font-bold">
              €4,99 <span className="text-sm font-normal text-neutral-500">/ mese</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <Feature ok>Tutto il piano Free</Feature>
              <Feature ok>Analisi AI serale completa</Feature>
              <Feature ok>Modifica completa di tutti i dati</Feature>
              <Feature ok>Fino a 4 schede di allenamento</Feature>
              <Feature ok>Storico analisi illimitato</Feature>
              <Feature ok>Supporto prioritario</Feature>
            </ul>
            <Button
              asChild
              className="mt-6 h-12 w-full bg-[#00FF87] font-bold text-black hover:bg-[#00FF87]/90"
            >
              <Link to={ctaTo}>REGISTRATI</Link>
            </Button>
            <p className="mt-3 text-center text-xs text-neutral-500">
              7 giorni gratis, poi €4,99/mese. Cancelli quando vuoi.
            </p>
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Domande frequenti</h2>
        <div className="mt-10 divide-y divide-neutral-800 rounded-xl border border-neutral-800">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex min-h-[56px] w-full items-center justify-between gap-4 px-6 py-4 text-left"
                aria-expanded={openFaq === i}
              >
                <span className="text-sm font-medium">{f.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <p className="px-6 pb-5 text-sm leading-relaxed text-neutral-400">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. FOOTER CTA */}
      <section className="bg-[#00FF87] px-6 py-16 text-center text-black">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Smetti di raccogliere dati. Inizia a progredire.
        </h2>
      </section>

      {/* 8. FOOTER */}
      <footer className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <BrandLogo className="text-base" />
            <p className="mt-1 text-xs text-neutral-500">Your data. Your gainz.</p>
          </div>
          <nav className="flex gap-6 text-xs text-neutral-400">
            <a href="#" className="hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white">
              Termini di servizio
            </a>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs text-neutral-600 sm:text-left">
          © 2026 GAINZ. Tutti i diritti riservati.
        </p>
      </footer>
    </main>
  );
}

function Feature({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <Check className="h-4 w-4 shrink-0 text-[#00FF87]" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-neutral-600" />
      )}
      <span className={ok ? "text-neutral-200" : "text-neutral-600"}>{children}</span>
    </li>
  );
}
