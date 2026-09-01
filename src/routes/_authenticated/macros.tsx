import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { estimateMacros } from "@/lib/macros.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateNav, todayISO } from "@/components/date-nav";
import { PageBack } from "@/components/page-back";


export const Route = createFileRoute("/_authenticated/macros")({
  head: () => ({
    meta: [
      { title: "Log macro — GAINZ" },
      {
        name: "description",
        content:
          "Scrivi cosa hai mangiato in italiano normale: l'AI stima kcal, proteine, carboidrati e grassi e li confronta con i tuoi target.",
      },
      { property: "og:title", content: "Log macro — GAINZ" },
      {
        property: "og:description",
        content: "Stima automatica dei macro e confronto con i target giornalieri.",
      },
    ],
  }),
  component: Macros,
});


const r = (n: number) => Math.round(n);

type Estimate = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: string[];
};

const MEAL_TYPES = [
  { value: "colazione", label: "Colazione" },
  { value: "pranzo", label: "Pranzo" },
  { value: "snack", label: "Snack" },
  { value: "cena", label: "Cena" },
] as const;

function Macros() {
  const queryClient = useQueryClient();
  const estimate = useServerFn(estimateMacros);
  const [text, setText] = useState("");
  const [mealType, setMealType] = useState<string>("colazione");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Estimate | null>(null);
  const [date, setDate] = useState(todayISO());

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: meals = [] } = useQuery({
    queryKey: ["meals", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("date", date)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const estimateMutation = useMutation({
    mutationFn: async () => (await estimate({ data: { text } })) as Estimate,
    onSuccess: (d) => setDraft(d),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Stima fallita"),
  });

  const saveMutation = useMutation({
    mutationFn: async (e: Estimate) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessione scaduta");
      const payload = {
        date,
        meal_type: mealType,
        description: text.trim(),
        kcal: r(e.kcal),
        protein_g: r(e.protein_g),
        carbs_g: r(e.carbs_g),
        fat_g: r(e.fat_g),
      };
      if (editingId) {
        const { error } = await supabase.from("meals").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("meals")
          .insert({ user_id: userData.user.id, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      const wasEdit = Boolean(editingId);
      setText("");
      setDraft(null);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["meals", date] });
      toast.success(wasEdit ? "Pasto aggiornato" : "Pasto salvato");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Salvataggio fallito"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meals", date] }),
  });

  const total = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + Number(m.kcal),
      protein_g: acc.protein_g + Number(m.protein_g),
      carbs_g: acc.carbs_g + Number(m.carbs_g),
      fat_g: acc.fat_g + Number(m.fat_g),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  const targetKcal = profile?.target_kcal ?? null;
  const targetProt = profile?.target_protein_g ?? null;
  const targetCarbs = profile?.target_carbs_g ?? null;
  const targetFat = profile?.target_fat_g ?? null;

  const deltas = [
    { label: "Kcal", value: total.kcal, target: targetKcal, unit: "kcal" },
    { label: "Proteine", value: total.protein_g, target: targetProt, unit: "g" },
    { label: "Carboidrati", value: total.carbs_g, target: targetCarbs, unit: "g" },
    { label: "Grassi", value: total.fat_g, target: targetFat, unit: "g" },
  ];

  const bars = deltas;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-4 pb-24 sm:px-6 sm:py-10">
        <PageBack to="/dashboard" />
        <p className="label-caps mt-4 sm:mt-8">Nutrizione</p>

        <h1 className="mt-4 text-3xl font-semibold">Log macro</h1>
        <div className="mt-4">
          <DateNav date={date} onChange={setDate} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Scrivi cosa hai mangiato in italiano normale. Ci penso io a stimare kcal e macro.
        </p>

        {/* Riepilogo */}
        <section className="mt-8 border border-border">
          <div className="border-b border-border p-4">
            <p className="label-caps">Totale del giorno</p>
          </div>
          <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
            {bars.map((b) => {
              const pct = b.target ? Math.min(100, (b.value / b.target) * 100) : 0;
              return (
                <div key={b.label} className="border-border p-4 not-last:border-r">
                  <p className="label-caps">{b.label}</p>
                  <p className="num mt-2 text-2xl">
                    {r(b.value)}
                    <span className="ml-1 text-xs text-muted-foreground">{b.unit}</span>
                  </p>
                  {b.target != null && (
                    <>
                      <p className="num mt-1 text-xs text-muted-foreground">
                        / {b.target} {b.unit}
                      </p>
                      <div className="mt-3 h-1 w-full bg-muted">
                        <div className="h-1 bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-4">
            <p className="label-caps">Cosa manca</p>
            {deltas.some((d) => d.target == null) ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Imposta tutti i target per vedere il residuo giornaliero completo.{" "}
                <Link to="/profile" className="text-primary underline underline-offset-4">
                  Imposta target
                </Link>
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {deltas.map((d) => {
                  const rem = Math.round(d.target! - d.value);
                  return (
                    <div key={d.label}>
                      <p className="label-caps">{d.label}</p>
                      <p className="num mt-1 text-lg">
                        {rem > 0 ? rem : 0}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {d.unit}
                          {rem <= 0 ? " ✓" : ""}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Input */}
        <section className="mt-8">
          <label htmlFor="meal" className="label-caps">
            {editingId ? "Modifica pasto" : "Nuovo pasto"}
          </label>
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="mt-3 w-full" aria-label="Tipo di pasto">
              <SelectValue placeholder="Seleziona pasto" />
            </SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            id="meal"
            className="mt-3 min-h-28"
            placeholder="200g petto di pollo, 150g riso, un cucchiaio di olio"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDraft(null);
            }}
          />
          <Button
            className="mt-3 w-full"
            size="lg"
            disabled={text.trim().length < 2 || estimateMutation.isPending}
            onClick={() => estimateMutation.mutate()}
          >
            {estimateMutation.isPending
              ? "Stimo i macro…"
              : editingId
                ? "Ricalcola macro"
                : "Stima macro"}
          </Button>
          {editingId && !draft && (
            <>
              <Button
                className="mt-2 w-full"
                variant="secondary"
                disabled={text.trim().length < 2 || estimateMutation.isPending || saveMutation.isPending}
                onClick={async () => {
                  const d = await estimateMutation.mutateAsync();
                  saveMutation.mutate(d);
                }}
              >
                {saveMutation.isPending ? "Aggiorno…" : "Aggiorna"}
              </Button>
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => {
                  setEditingId(null);
                  setText("");
                  setDraft(null);
                }}
              >
                Annulla modifica
              </Button>
            </>
          )}

          {draft && (
            <div className="mt-4 border border-border p-4">
              <p className="label-caps">Stima</p>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {[
                  ["Kcal", draft.kcal],
                  ["Prot", draft.protein_g],
                  ["Carbo", draft.carbs_g],
                  ["Grassi", draft.fat_g],
                ].map(([l, v]) => (
                  <div key={l as string}>
                    <p className="label-caps">{l as string}</p>
                    <p className="num mt-1 text-lg">{r(v as number)}</p>
                  </div>
                ))}
              </div>
              {draft.items.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">{draft.items.join(" · ")}</p>
              )}
              <Button
                className="mt-4 w-full"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(draft)}
              >
                {saveMutation.isPending
                  ? "Salvo…"
                  : editingId
                    ? "Aggiorna"
                    : "Aggiungi al totale"}
              </Button>
              {editingId && (
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() => {
                    setEditingId(null);
                    setText("");
                    setDraft(null);
                  }}
                >
                  Annulla modifica
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Pasti */}
        <section className="mt-10">
          <p className="label-caps">Pasti del giorno</p>
          {meals.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nessun pasto registrato.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {MEAL_TYPES.map((t) => {
                const rows = meals.filter((m) => (m.meal_type ?? "pranzo") === t.value);
                const sum = rows.reduce(
                  (acc, m) => ({
                    kcal: acc.kcal + Number(m.kcal),
                    protein_g: acc.protein_g + Number(m.protein_g),
                    carbs_g: acc.carbs_g + Number(m.carbs_g),
                    fat_g: acc.fat_g + Number(m.fat_g),
                  }),
                  { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
                );
                return (
                  <div key={t.value} className="border border-border">
                    <div className="border-b border-border p-4">
                      <p className="label-caps">{t.label}</p>
                      <p className="num mt-1 text-xs text-muted-foreground">
                        {r(sum.kcal)} kcal · P {r(sum.protein_g)} · C {r(sum.carbs_g)} · G{" "}
                        {r(sum.fat_g)}
                      </p>
                    </div>
                    {rows.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">Nessun pasto registrato.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {rows.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-start justify-between gap-4 p-4"
                          >
                            <div className="min-w-0">
                              <p className="text-sm">{m.description}</p>
                              <p className="num mt-1 text-xs text-muted-foreground">
                                {r(Number(m.kcal))} kcal · P {r(Number(m.protein_g))} · C{" "}
                                {r(Number(m.carbs_g))} · G {r(Number(m.fat_g))}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingId(m.id);
                                  setText(m.description);
                                  setMealType(m.meal_type ?? "pranzo");
                                  setDraft(null);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                aria-label="Modifica pasto"
                              >
                                Modifica
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(m.id)}
                                aria-label="Elimina pasto"
                              >
                                Elimina
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
