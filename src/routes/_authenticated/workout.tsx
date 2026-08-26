import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateNav, todayISO } from "@/components/date-nav";
import { PageBack } from "@/components/page-back";


export const Route = createFileRoute("/_authenticated/workout")({
  head: () => ({
    meta: [
      { title: "Log allenamento — GAINZ" },
      {
        name: "description",
        content:
          "Scegli il Day, logga serie, reps, kg e RIR con suggerimenti di progressione automatici.",
      },
      { property: "og:title", content: "Log allenamento — GAINZ" },
      {
        property: "og:description",
        content: "Serie, reps, kg e RIR in pochi tap, con progressione suggerita.",
      },
    ],
  }),
  component: WorkoutPage,
});

type Exercise = {
  id: string;
  name: string;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_rir: number | null;
};
type Day = { id: string; name: string; exercises: Exercise[] };
type Program = { id: string; name: string; days: Day[] };
type SetEntry = { reps: string; weight: string; rir: string };
type Suggestion = { text: string; reps?: number; weight?: number };

const ratings = [
  { key: "pump", label: "Pump" },
  { key: "effort", label: "Sforzo percepito" },
  { key: "motivation", label: "Motivazione" },
] as const;
type RatingKey = (typeof ratings)[number]["key"];


function buildSuggestion(ex: Exercise, last: { reps: number | null; weight_kg: number | null }[]) {
  if (last.length === 0) return null;
  const weights = last.map((s) => s.weight_kg ?? 0);
  const weight = Math.max(...weights);
  const reps = last.map((s) => s.reps ?? 0);
  const completedAll = last.length >= ex.target_sets;
  const allAtMax = completedAll && reps.every((r) => r >= ex.target_reps_max);
  const allInRange = completedAll && reps.every((r) => r >= ex.target_reps_min);

  if (allAtMax) {
    const next = Math.round((weight + 2.5) * 10) / 10;
    return {
      text: `Ultima: ${weight} kg × ${reps.join("/")} — sali a ${next} kg × ${ex.target_reps_min}`,
      reps: ex.target_reps_min,
      weight: next,
    };
  }
  if (allInRange) {
    const next = Math.min(Math.max(...reps) + 1, ex.target_reps_max);
    return {
      text: `Ultima: ${weight} kg × ${reps.join("/")} — punta a ${next} rep con ${weight} kg`,
      reps: next,
      weight,
    };
  }
  return {
    text: `Ultima: ${weight} kg × ${reps.join("/")} — consolida lo stesso carico`,
    reps: Math.max(...reps),
    weight,
  };
}

function WorkoutPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState<string | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<Record<string, SetEntry[]>>({});
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [scores, setScores] = useState<Record<RatingKey, number>>({
    pump: 3,
    effort: 3,
    motivation: 3,
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [doneEx, setDoneEx] = useState<Record<string, boolean>>({});
  const [savingEx, setSavingEx] = useState<string | null>(null);

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
          .select("id, name, order_index, program_id, program_exercises(*)")
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
              exercises: [...(d.program_exercises ?? [])]
                .sort((a, b) => a.order_index - b.order_index)
                .map((e) => ({
                  id: e.id,
                  name: e.name,
                  target_sets: e.target_sets,
                  target_reps_min: e.target_reps_min,
                  target_reps_max: e.target_reps_max,
                  target_rir: e.target_rir,
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
  const days: Day[] = program?.days ?? [];
  const day = days.find((d) => d.id === dayId) ?? null;

  async function selectDay(d: Day, forDate: string = date) {
    setDayId(d.id);
    const base: Record<string, SetEntry[]> = {};
    for (const ex of d.exercises) {
      base[ex.id] = Array.from({ length: ex.target_sets }, () => ({
        reps: "",
        weight: "",
        rir: ex.target_rir != null ? String(ex.target_rir) : "",
      }));
    }

    // Sessione già registrata in questa data (modifica)
    const { data: existingRows } = await supabase
      .from("workout_sessions")
      .select("id, pump, effort, motivation, notes")
      .eq("day_id", d.id)
      .eq("date", forDate)
      .order("created_at", { ascending: false })
      .limit(1);
    const existing = existingRows?.[0] ?? null;

    setSessionId(existing?.id ?? null);

    if (existing) {
      setScores({
        pump: existing.pump ?? 3,
        effort: existing.effort ?? 3,
        motivation: existing.motivation ?? 3,
      });
      setNotes(existing.notes ?? "");
      const { data: oldSets } = await supabase
        .from("workout_sets")
        .select("exercise_id, reps, weight_kg, rir, set_index")
        .eq("session_id", existing.id)
        .order("set_index");
      const done: Record<string, boolean> = {};
      for (const s of oldSets ?? []) {
        if (!s.exercise_id || !base[s.exercise_id]) continue;
        const idx = s.set_index - 1;
        const entry = {
          reps: s.reps != null ? String(s.reps) : "",
          weight: s.weight_kg != null ? String(s.weight_kg) : "",
          rir: s.rir != null ? String(s.rir) : "",
        };
        if (idx < base[s.exercise_id]!.length) base[s.exercise_id]![idx] = entry;
        else base[s.exercise_id]!.push(entry);
        done[s.exercise_id] = true;
      }
      setDoneEx(done);
    } else {
      setScores({ pump: 3, effort: 3, motivation: 3 });
      setNotes("");
      setDoneEx({});
    }
    setEntries(base);

    const { data: lastSession } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("day_id", d.id)
      .lt("date", forDate)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastSession) {
      setSuggestions({});
      return;
    }

    const { data: sets } = await supabase
      .from("workout_sets")
      .select("exercise_id, reps, weight_kg, set_index")
      .eq("session_id", lastSession.id)
      .order("set_index");

    const next: Record<string, Suggestion> = {};
    for (const ex of d.exercises) {
      const exSets = (sets ?? []).filter((s) => s.exercise_id === ex.id);
      const sugg = buildSuggestion(
        ex,
        exSets.map((s) => ({ reps: s.reps, weight_kg: s.weight_kg })),
      );
      if (sugg) next[ex.id] = sugg;
    }
    setSuggestions(next);
  }

  function changeDate(next: string) {
    setDate(next);
    const current = days.find((d) => d.id === dayId);
    if (current) void selectDay(current, next);
  }


  function updateSet(exId: string, i: number, patch: Partial<SetEntry>) {
    setEntries((prev) => ({
      ...prev,
      [exId]: (prev[exId] ?? []).map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  }

  async function ensureSession(userId: string): Promise<string> {
    if (sessionId) return sessionId;
    if (!day) throw new Error("Nessun Day selezionato");
    const { data: session, error } = await supabase
      .from("workout_sessions")
      .upsert(
        {
          user_id: userId,
          day_id: day.id,
          day_name: day.name,
          date,
        },
        { onConflict: "user_id,day_id,date" },
      )
      .select("id")
      .single();
    if (error) throw error;
    setSessionId(session.id);
    return session.id;
  }

  async function saveExercise(ex: Exercise) {
    const rows = (entries[ex.id] ?? [])
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.reps !== "" || s.weight !== "")
      .map(({ s, i }) => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        set_index: i + 1,
        reps: s.reps === "" ? null : Number(s.reps),
        weight_kg: s.weight === "" ? null : Number(s.weight),
        rir: s.rir === "" ? null : Number(s.rir),
      }));
    if (rows.length === 0) {
      toast.error("Inserisci almeno una serie per questo esercizio");
      return;
    }
    setSavingEx(ex.id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sessione scaduta");
      const sid = await ensureSession(user.id);

      const { error: dErr } = await supabase
        .from("workout_sets")
        .delete()
        .eq("session_id", sid)
        .eq("exercise_id", ex.id);
      if (dErr) throw dErr;

      const { error: iErr } = await supabase
        .from("workout_sets")
        .insert(rows.map((r) => ({ ...r, user_id: user.id, session_id: sid })));
      if (iErr) throw iErr;

      setDoneEx((prev) => ({ ...prev, [ex.id]: true }));
      toast.success(`${ex.name} salvato`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setSavingEx(null);
    }
  }

  async function save() {
    if (!day) return;
    const rows = day.exercises.flatMap((ex) =>
      (entries[ex.id] ?? [])
        .map((s, i) => ({ ex, s, i }))
        .filter(({ s }) => s.reps !== "" || s.weight !== "")
        .map(({ ex, s, i }) => ({
          exercise_id: ex.id,
          exercise_name: ex.name,
          set_index: i + 1,
          reps: s.reps === "" ? null : Number(s.reps),
          weight_kg: s.weight === "" ? null : Number(s.weight),
          rir: s.rir === "" ? null : Number(s.rir),
        })),
    );
    if (rows.length === 0) {
      toast.error("Inserisci almeno una serie");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sessione scaduta");

      let currentSessionId = sessionId;
      if (currentSessionId) {
        const { error: uErr } = await supabase
          .from("workout_sessions")
          .update({
            day_name: day.name,
            pump: scores.pump,
            effort: scores.effort,
            motivation: scores.motivation,
            notes: notes.trim() || null,
          })
          .eq("id", currentSessionId);
        if (uErr) throw uErr;
        const { error: dErr } = await supabase
          .from("workout_sets")
          .delete()
          .eq("session_id", currentSessionId);
        if (dErr) throw dErr;
      } else {
        const { data: session, error: sErr } = await supabase
          .from("workout_sessions")
          .upsert(
            {
              user_id: user.id,
              day_id: day.id,
              day_name: day.name,
              date,
              pump: scores.pump,
              effort: scores.effort,
              motivation: scores.motivation,
              notes: notes.trim() || null,
            },
            { onConflict: "user_id,day_id,date" },
          )
          .select("id")
          .single();
        if (sErr) throw sErr;
        currentSessionId = session.id;
        await supabase.from("workout_sets").delete().eq("session_id", session.id);
      }


      const { error: setErr } = await supabase
        .from("workout_sets")
        .insert(rows.map((r) => ({ ...r, user_id: user.id, session_id: currentSessionId })));
      if (setErr) throw setErr;

      toast.success("Allenamento salvato");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-4 pb-10 sm:px-6 sm:py-16">
        <PageBack to="/dashboard" />
        <p className="label-caps mt-4 sm:mt-8">Allenamento</p>

        <h1 className="mt-3 text-3xl font-semibold">Log allenamento</h1>
        <div className="mt-4">
          <DateNav date={date} onChange={changeDate} />
        </div>
        {sessionId && (
          <p className="mt-3 text-sm text-muted-foreground">
            Allenamento già registrato in questa data: puoi modificarlo.
          </p>
        )}


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
                      setDayId(null);
                      setSessionId(null);
                      setEntries({});
                      setSuggestions({});
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

        {days.length > 0 && (
          <div className="mt-8">
            <p className="label-caps">Che Day stai facendo?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {days.map((d) => {
                const active = d.id === dayId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => void selectDay(d)}
                    className={`border p-4 text-left transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <span className="block text-sm font-medium">{d.name}</span>
                    <span
                      className={`num text-xs ${active ? "opacity-70" : "text-muted-foreground"}`}
                    >
                      {d.exercises.length} esercizi
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {day && (
          <div className="mt-10 space-y-8">
            {day.exercises.map((ex) => (
              <div key={ex.id} className="border border-border">
                <div className="border-b border-border p-4">
                  <p className="font-medium">{ex.name}</p>
                  <p className="num mt-1 text-xs text-muted-foreground">
                    {ex.target_sets} ×{" "}
                    {ex.target_reps_min === ex.target_reps_max
                      ? ex.target_reps_min
                      : `${ex.target_reps_min}–${ex.target_reps_max}`}
                  </p>
                  {suggestions[ex.id] && (
                    <p className="mt-3 border-l-2 border-accent pl-3 text-xs text-accent">
                      {suggestions[ex.id]!.text}
                    </p>
                  )}
                </div>

                <div className="p-4">
                  <div className="label-caps mb-2 grid grid-cols-[2rem_1fr_1fr_1fr] gap-2">
                    <span>#</span>
                    <span>Reps</span>
                    <span>Kg</span>
                    <span>RIR</span>
                  </div>
                  <div className="space-y-2">
                    {(entries[ex.id] ?? []).map((s, i) => (
                      <div key={i} className="grid grid-cols-[2rem_1fr_1fr_1fr] items-center gap-2">
                        <span className="num text-sm text-muted-foreground">{i + 1}</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          aria-label={`${ex.name} serie ${i + 1} reps`}
                          placeholder={
                            suggestions[ex.id]?.reps != null
                              ? String(suggestions[ex.id]!.reps)
                              : String(ex.target_reps_min)
                          }
                          value={s.reps}
                          onChange={(e) => updateSet(ex.id, i, { reps: e.target.value })}
                          className="num h-12"
                        />
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          aria-label={`${ex.name} serie ${i + 1} kg`}
                          placeholder={
                            suggestions[ex.id]?.weight != null
                              ? String(suggestions[ex.id]!.weight)
                              : "kg"
                          }
                          value={s.weight}
                          onChange={(e) => updateSet(ex.id, i, { weight: e.target.value })}
                          className="num h-12"
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          aria-label={`${ex.name} serie ${i + 1} RIR`}
                          placeholder="RIR"
                          value={s.rir}
                          onChange={(e) => updateSet(ex.id, i, { rir: e.target.value })}
                          className="num h-12"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      setEntries((prev) => ({
                        ...prev,
                        [ex.id]: [
                          ...(prev[ex.id] ?? []),
                          {
                            reps: "",
                            weight: "",
                            rir: ex.target_rir != null ? String(ex.target_rir) : "",
                          },
                        ],
                      }))
                    }
                  >
                    + Serie
                  </Button>
                </div>
              </div>
            ))}

            <div className="space-y-6 border border-border p-4">
              <p className="label-caps">Fine sessione</p>
              {ratings.map((r) => (
                <div key={r.key} className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <Label>{r.label}</Label>
                    <span className="num text-sm text-muted-foreground">{scores[r.key]} / 5</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((v) => {
                      const active = scores[r.key] === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          aria-label={`${r.label} ${v}`}
                          aria-pressed={active}
                          onClick={() => setScores((prev) => ({ ...prev, [r.key]: v }))}
                          className={`num h-12 border text-sm transition-colors ${
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="wnotes">Note</Label>
                  <span className="label-caps">opzionale</span>
                </div>
                <Textarea
                  id="wnotes"
                  rows={3}
                  maxLength={500}
                  placeholder="Spalla ok, panca pesante nell'ultima serie…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="sticky bottom-0 -mx-5 bg-background px-5 pt-4 pb-5 sm:static sm:mx-0 sm:px-0 sm:pb-0">
              <Button className="h-12 w-full" size="lg" onClick={save} disabled={saving}>
                {saving ? "Salvataggio…" : "Salva allenamento"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
