import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GAINZ — Your data. Your gainz." },
      {
        name: "description",
        content:
          "Your data. Your gainz. Check-in, allenamenti, macro e analisi AI serale per bodybuilder seri.",
      },
      { property: "og:title", content: "GAINZ — Your data. Your gainz." },
      {
        property: "og:description",
        content: "Your data. Your gainz. Check-in, allenamenti, macro e analisi AI serale per bodybuilder seri.",
      },

    ],
  }),
  component: Index,
});

const pillars = [
  { n: "01", t: "Inserimento dati in 60 secondi", d: "Peso, sonno, energia, fame, stress. Ogni giorno." },
  { n: "02", t: "Log allenamento e alimentazione", d: "Serie, reps, kg, RIR, macros" },
  { n: "03", t: "Analisi AI quotidiana", d: "Tre decisioni concrete: allenamento, recupero, nutrizione." },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <BrandLogo className="text-base" />
        <Button asChild variant="ghost" size="sm">
          <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Dashboard" : "Accedi"}</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-20 pb-24">
        <p className="label-caps">PERSONAL AI TRAINER&nbsp;</p>
        <BrandLogo className="mt-6 block text-6xl leading-none sm:text-8xl" />
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold sm:text-5xl">
          Your data.
          <br />
          <span className="text-muted-foreground">Your gainz.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-white">
          Non è solo un'app. È il tuo nuovo modo di allenarti.
          <br />
          Benvenuto nell'era dell'<span className="text-[#00FF87]">A</span>llenamento{" "}
          <span className="text-[#00FF87]">I</span>ntelligente.
        </p>

        <div className="mt-10 flex gap-3">
          <Button asChild size="lg">
            <Link to={signedIn ? "/dashboard" : "/auth"}>
              {signedIn ? "Vai alla dashboard" : "Inizia ora"}
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-32">
        <div className="hairline grid gap-px sm:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.n} className="border-t border-border py-8 sm:border-t-0 sm:pr-8">
              <span className="num text-xs text-accent">{p.n}</span>
              <h2 className="mt-3 text-lg font-medium">{p.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
