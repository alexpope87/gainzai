import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageBack } from "@/components/page-back";

export const Route = createFileRoute("/_authenticated/workout")({
  head: () => ({
    meta: [
      { title: "Log allenamento — GAINZ" },
      {
        name: "description",
        content:
          "Scegli il Day e inizia il log allenamento.",
      },
      { property: "og:title", content: "Log allenamento — GAINZ" },
      {
        property: "og:description",
        content: "Scegli il Day e inizia il log allenamento.",
      },
    ],
  }),
  component: WorkoutPage,
});

type Program = { id: string; name: string; days: Day[] };
type Day = { id: string; name: string; exercises: { id: string; name: string }[] };

function WorkoutPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: progRows } = await supabase
        .from("programs")
        .select("id, name")
        .eq("user_id", userData.user.id)
        .eq("is_active", true)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      const list = progRows ?? [];
      if (list.length > 0) {
        const { data: rows } = await supabase
          .from("program_days")
          .select("id, name, order_index, program_id, program_exercises(id, name)")
          .in(
            "program_id",
            list.map((p) => p.id),
          )
          .order("order_index");

        const next: Program[] = list.map((p) => ({
          id: p.id,
          name: p.name,
          days: (rows ?? [])
            .filter((d) => d.program_id === p.id)
            .map((d) => ({
              id: d.id,
              name: d.name,
              exercises: (d.program_exercises ?? []).map((e) => ({
                id: e.id,
                name: e.name,
              })),
            })),
        }));
        setPrograms(next);
        if (next.length === 1) setProgramId(next[0]!.id);
      }
      setLoaded(true);
    })();
  }, []);

  const program = programs.find((p) => p.id === programId) ?? null;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-4 pb-10 sm:px-6 sm:py-16">
        <PageBack to="/dashboard" />
        <p className="label-caps mt-4 sm:mt-8">Allenamento</p>

        <h1 className="mt-3 text-3xl font-semibold">Log allenamento</h1>

        {programs.length > 0 && (
          <div className="mt-8">
            <p className="label-caps">Quale scheda stai usando?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {programs.map((p) => {
                const sel = p.id === programId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => {
                      setProgramId(p.id);
                    }}
                    className={`border p-4 text-left transition-colors ${
                      sel
                        ? "border-accent text-accent"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="num text-xs text-muted-foreground">{p.days.length} Day</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loaded && programs.length === 0 && (
          <div className="mt-8 border border-border p-5">
            <p className="text-sm text-muted-foreground">
              Nessuna scheda attiva. Caricala e poi torna qui.
            </p>
            <Button className="mt-4" onClick={() => navigate({ to: "/program" })}>
              Carica la scheda
            </Button>
          </div>
        )}

        {program && program.days.length > 0 && (
          <div className="mt-8">
            <p className="label-caps">Che Day stai facendo?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {program.days.map((d) => (
                <Link
                  key={d.id}
                  to="/workout/day/$dayId"
                  params={{ dayId: d.id }}
                  search={{ programId: program.id }}
                  className="border border-border p-4 text-left transition-colors hover:border-foreground/40"
                >
                  <span className="block text-sm font-medium">{d.name}</span>
                  <span className="num text-xs text-muted-foreground">
                    {d.exercises.length} esercizi
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
