import { createFileRoute, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageBack } from "@/components/page-back";

export const Route = createFileRoute("/_authenticated/programs/$id")({
  head: () => ({
    meta: [
      { title: "Dettaglio scheda — GAINZ" },
      {
        name: "description",
        content: "Modifica i Day, gli esercizi e i target di serie e reps della tua scheda.",
      },
      { property: "og:title", content: "Dettaglio scheda — GAINZ" },
      {
        property: "og:description",
        content: "Modifica Day ed esercizi della tua scheda di allenamento.",
      },
    ],
  }),
  component: ProgramDetailPage,
});

type Ex = {
  name: string;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_rir: number | null;
};
type Day = { name: string; exercises: Ex[] };

function emptyEx(): Ex {
  return { name: "", target_sets: 3, target_reps_min: 10, target_reps_max: 10, target_rir: null };
}

function ProgramDetailPage() {
  const { id } = useParams({ from: "/_authenticated/programs/$id" });
  const [name, setName] = useState("");
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: program, error } = await supabase
      .from("programs")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();
    if (error || !program) {
      toast.error("Scheda non trovata");
      setLoading(false);
      return;
    }
    setName(program.name);
    const { data: dayRows } = await supabase
      .from("program_days")
      .select("id, name, order_index, program_exercises(*)")
      .eq("program_id", id)
      .order("order_index");
    setDays(
      (dayRows ?? []).map((d) => ({
        name: d.name,
        exercises: [
          ...((d as unknown as { program_exercises: (Ex & { order_index: number })[] })
            .program_exercises ?? []),
        ]
          .sort((a, b) => a.order_index - b.order_index)
          .map((e) => ({
            name: e.name,
            target_sets: e.target_sets,
            target_reps_min: e.target_reps_min,
            target_reps_max: e.target_reps_max,
            target_rir: e.target_rir,
          })),
      })),
    );
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateEx(di: number, ei: number, patch: Partial<Ex>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === di
          ? { ...d, exercises: d.exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) }
          : d,
      ),
    );
  }

  async function save() {
    if (days.some((d) => d.exercises.some((e) => !e.name.trim()))) {
      toast.error("Ogni esercizio deve avere un nome");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sessione scaduta");

      const { error: nErr } = await supabase
        .from("programs")
        .update({ name: name.trim() || "Scheda" })
        .eq("id", id);
      if (nErr) throw nErr;

      // Sostituisce i Day/esercizi con lo stato corrente
      const { error: dDel } = await supabase.from("program_days").delete().eq("program_id", id);
      if (dDel) throw dDel;

      if (days.length > 0) {
        const { data: dayRows, error: dErr } = await supabase
          .from("program_days")
          .insert(
            days.map((d, i) => ({
              user_id: user.id,
              program_id: id,
              name: d.name.trim() || `Day ${i + 1}`,
              order_index: i,
            })),
          )
          .select("id, order_index");
        if (dErr) throw dErr;

        const exRows = days.flatMap((d, i) => {
          const dayId = dayRows.find((r) => r.order_index === i)!.id;
          return d.exercises.map((e, j) => ({
            user_id: user.id,
            day_id: dayId,
            name: e.name.trim(),
            target_sets: e.target_sets,
            target_reps_min: e.target_reps_min,
            target_reps_max: e.target_reps_max,
            target_rir: e.target_rir,
            order_index: j,
          }));
        });
        if (exRows.length > 0) {
          const { error: eErr } = await supabase.from("program_exercises").insert(exRows);
          if (eErr) throw eErr;
        }
      }

      toast.success("Scheda aggiornata");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-4 pb-28 sm:px-6">
        <PageBack to="/program" />
        <p className="label-caps mt-4">Dettaglio scheda</p>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Caricamento…</p>
        ) : (
          <div className="mt-4 space-y-8">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-lg font-semibold"
              aria-label="Nome scheda"
            />

            {days.map((day, di) => (
              <div key={di} className="border border-border">
                <div className="flex items-center gap-2 border-b border-border p-4">
                  <Input
                    value={day.name}
                    onChange={(e) =>
                      setDays((prev) =>
                        prev.map((d, i) => (i === di ? { ...d, name: e.target.value } : d)),
                      )
                    }
                    className="h-11 font-medium"
                    aria-label="Nome Day"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDays((prev) => prev.filter((_, i) => i !== di))}
                  >
                    Elimina
                  </Button>
                </div>

                <div className="divide-y divide-border">
                  {day.exercises.map((ex, ei) => (
                    <div key={ei} className="space-y-3 p-4">
                      <div className="flex gap-2">
                        <Input
                          value={ex.name}
                          placeholder="Esercizio"
                          onChange={(e) => updateEx(di, ei, { name: e.target.value })}
                          className="h-11"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Rimuovi esercizio"
                          onClick={() =>
                            setDays((prev) =>
                              prev.map((d, i) =>
                                i === di
                                  ? { ...d, exercises: d.exercises.filter((_, j) => j !== ei) }
                                  : d,
                              ),
                            )
                          }
                        >
                          ✕
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <span className="label-caps">Serie</span>
                          <Input
                            inputMode="numeric"
                            value={ex.target_sets ?? ""}
                            onChange={(e) =>
                              updateEx(di, ei, { target_sets: Number(e.target.value) || 0 })
                            }
                            className="num h-11"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="label-caps">Reps</span>
                          <Input
                            inputMode="numeric"
                            value={ex.target_reps_min ?? ""}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              updateEx(di, ei, { target_reps_min: v, target_reps_max: v });
                            }}
                            className="num h-11"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="label-caps">RIR</span>
                          <Input
                            inputMode="numeric"
                            value={ex.target_rir ?? ""}
                            onChange={(e) =>
                              updateEx(di, ei, {
                                target_rir: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className="num h-11"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border p-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setDays((prev) =>
                        prev.map((d, i) =>
                          i === di ? { ...d, exercises: [...d.exercises, emptyEx()] } : d,
                        ),
                      )
                    }
                  >
                    + Esercizio
                  </Button>
                </div>
              </div>
            ))}

            <Button
              variant="secondary"
              onClick={() =>
                setDays((prev) => [
                  ...prev,
                  { name: `Day ${prev.length + 1}`, exercises: [emptyEx()] },
                ])
              }
            >
              + Day
            </Button>

            <div className="sticky bottom-20 -mx-5 bg-background px-5 pt-4 pb-4 sm:static sm:mx-0 sm:px-0">
              <Button className="h-12 w-full" size="lg" onClick={save} disabled={saving}>
                {saving ? "Salvataggio…" : "Salva modifiche"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
