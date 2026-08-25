import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { parseMealPlanFile } from "@/lib/meal-plan.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageBack } from "@/components/page-back";


export const Route = createFileRoute("/_authenticated/meal-plan")({
  head: () => ({
    meta: [
      { title: "Piano alimentare — GAINZ" },
      {
        name: "description",
        content:
          "Imposta i macro giornalieri per ogni giorno della settimana o carica il tuo piano pasti: l'AI lo usa come riferimento nell'analisi.",
      },
      { property: "og:title", content: "Piano alimentare — GAINZ" },
      {
        property: "og:description",
        content: "Macro giornalieri o piano pasti settimanale come riferimento per l'analisi AI.",
      },
    ],
  }),
  component: MealPlanPage,
});

const DAYS = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
] as const;

const MEALS = [
  { key: "colazione", label: "Colazione", placeholder: "80g avena, 30g whey, 1 banana" },
  { key: "pranzo", label: "Pranzo", placeholder: "150g riso, 200g pollo, verdura, 10g olio evo" },
  { key: "cena", label: "Cena", placeholder: "200g salmone, 250g patate, insalata" },
  { key: "spuntini", label: "Spuntini", placeholder: "2 gallette + 30g bresaola" },
] as const;

type Mode = "macros" | "meals";

type DayPlan = {
  kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  colazione: string;
  pranzo: string;
  cena: string;
  spuntini: string;
};

function emptyDay(): DayPlan {
  return {
    kcal: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    colazione: "",
    pranzo: "",
    cena: "",
    spuntini: "",
  };
}

function num(v: string) {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

function MealPlanPage() {
  const parse = useServerFn(parseMealPlanFile);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode | null>(null);
  const [days, setDays] = useState<DayPlan[]>(() => DAYS.map(() => emptyDay()));
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const [{ data: plan }, { data: rows }] = await Promise.all([
        supabase.from("meal_plans").select("*").eq("user_id", userData.user.id).maybeSingle(),
        supabase.from("meal_plan_days").select("*").eq("user_id", userData.user.id),
      ]);
      if (plan) {
        setNotes(plan.notes ?? "");
        if (plan.mode === "macros" || plan.mode === "meals") setMode(plan.mode);
      }
      if (rows && rows.length > 0) {
        setDays(
          DAYS.map((_, i) => {
            const r = rows.find((x) => x.weekday === i);
            if (!r) return emptyDay();
            return {
              kcal: r.kcal != null ? String(r.kcal) : "",
              protein_g: r.protein_g != null ? String(r.protein_g) : "",
              carbs_g: r.carbs_g != null ? String(r.carbs_g) : "",
              fat_g: r.fat_g != null ? String(r.fat_g) : "",
              colazione: r.colazione ?? "",
              pranzo: r.pranzo ?? "",
              cena: r.cena ?? "",
              spuntini: r.spuntini ?? "",
            };
          }),
        );
      } else if (plan && (plan.colazione || plan.pranzo || plan.cena || plan.spuntini)) {
        setDays(
          DAYS.map(() => ({
            ...emptyDay(),
            colazione: plan.colazione ?? "",
            pranzo: plan.pranzo ?? "",
            cena: plan.cena ?? "",
            spuntini: plan.spuntini ?? "",
          })),
        );
      }
      setLoaded(true);
    })();
  }, []);

  function patchDay(i: number, patch: Partial<DayPlan>) {
    setDays((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function copyToAll(i: number) {
    setDays((prev) => prev.map(() => ({ ...prev[i]! })));
    toast.success("Copiato su tutti i giorni");
  }

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      let payload: { fileName: string; mimeType: string; dataUrl?: string; text?: string };

      if (["xlsx", "xls", "csv"].includes(ext)) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const text = wb.SheetNames.map(
          (n) => `# ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n]!)}`,
        ).join("\n\n");
        payload = { fileName: file.name, mimeType: file.type || "text/csv", text };
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Lettura file fallita"));
          reader.readAsDataURL(file);
        });
        payload = { fileName: file.name, mimeType: file.type || "application/pdf", dataUrl };
      }

      const result = await parse({ data: payload });
      setDays((prev) =>
        DAYS.map((_, i) => {
          const r = result.days.find((d) => d.weekday === i);
          if (!r) return prev[i] ?? emptyDay();
          return {
            kcal: r.kcal != null ? String(r.kcal) : "",
            protein_g: r.protein_g != null ? String(r.protein_g) : "",
            carbs_g: r.carbs_g != null ? String(r.carbs_g) : "",
            fat_g: r.fat_g != null ? String(r.fat_g) : "",
            colazione: r.colazione,
            pranzo: r.pranzo,
            cena: r.cena,
            spuntini: r.spuntini,
          };
        }),
      );
      toast.success("Piano estratto — controlla e correggi prima di salvare");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lettura fallita");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!mode) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sessione scaduta");

      const { error: planErr } = await supabase.from("meal_plans").upsert(
        {
          user_id: user.id,
          mode,
          colazione: days[0]?.colazione.trim() ?? "",
          pranzo: days[0]?.pranzo.trim() ?? "",
          cena: days[0]?.cena.trim() ?? "",
          spuntini: days[0]?.spuntini.trim() ?? "",
          notes: notes.trim() || null,
        },
        { onConflict: "user_id" },
      );
      if (planErr) throw planErr;

      const { error: daysErr } = await supabase.from("meal_plan_days").upsert(
        days.map((d, i) => ({
          user_id: user.id,
          weekday: i,
          kcal: num(d.kcal),
          protein_g: num(d.protein_g),
          carbs_g: num(d.carbs_g),
          fat_g: num(d.fat_g),
          colazione: d.colazione.trim(),
          pranzo: d.pranzo.trim(),
          cena: d.cena.trim(),
          spuntini: d.spuntini.trim(),
        })),
        { onConflict: "user_id,weekday" },
      );
      if (daysErr) throw daysErr;

      toast.success("Piano alimentare salvato");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-4 pb-10 sm:px-6 sm:py-16">
        <PageBack to="/profile" />
        <p className="label-caps mt-4 sm:mt-8">Nutrizione</p>

        <h1 className="mt-3 text-3xl font-semibold">Piano alimentare</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Scegli come vuoi impostare la tua nutrizione. L'AI userà questo piano come riferimento per
          confrontarlo con quello che hai mangiato davvero.
        </p>

        {!loaded ? (
          <p className="mt-10 text-sm text-muted-foreground">Caricamento…</p>
        ) : (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("macros")}
                className={`border p-4 text-left transition ${
                  mode === "macros" ? "border-accent bg-accent/10" : "border-border hover:bg-muted"
                }`}
              >
                <p className="text-sm font-semibold">Ho i macro giornalieri</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Kcal, proteine, carbo e grassi per ogni giorno della settimana
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("meals")}
                className={`border p-4 text-left transition ${
                  mode === "meals" ? "border-accent bg-accent/10" : "border-border hover:bg-muted"
                }`}
              >
                <p className="text-sm font-semibold">Ho un piano pasti definito</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Carica foto, PDF o Excel: l'AI estrae i pasti giorno per giorno
                </p>
              </button>
            </div>

            {mode === "meals" && (
              <div className="mt-6 border border-border p-4">
                <Label htmlFor="plan-file">Carica il tuo piano</Label>
                <input
                  id="plan-file"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,image/*"
                  className="mt-3 block w-full text-sm file:mr-3 file:border file:border-border file:bg-transparent file:px-3 file:py-2 file:text-sm"
                  disabled={parsing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {parsing
                    ? "Lettura del piano in corso…"
                    : "Foto, PDF o Excel. Dopo l'estrazione puoi correggere tutto."}
                </p>
              </div>
            )}

            {mode && (
              <div className="mt-8 space-y-3">
                {DAYS.map((label, i) => {
                  const d = days[i]!;
                  const isOpen = open === i;
                  return (
                    <div key={label} className="border border-border">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between px-4 py-4 text-left sm:py-3"
                        onClick={() => setOpen(isOpen ? -1 : i)}
                      >
                        <span className="text-sm font-medium">{label}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="num text-xs text-muted-foreground">
                            {mode === "macros"
                              ? d.kcal
                                ? `${d.kcal} kcal · ${d.protein_g || "–"}P`
                                : "da impostare"
                              : d.colazione || d.pranzo || d.cena || d.spuntini
                                ? "compilato"
                                : "vuoto"}
                          </span>
                          <span
                            className="grid h-6 w-6 shrink-0 place-items-center text-xs"
                            aria-hidden="true"
                          >
                            {isOpen ? "▲" : "▼"}
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="space-y-4 border-t border-border px-4 py-4">
                          {mode === "macros" ? (
                            <div className="grid grid-cols-2 gap-3">
                              {(
                                [
                                  ["kcal", "Calorie"],
                                  ["protein_g", "Proteine (g)"],
                                  ["carbs_g", "Carboidrati (g)"],
                                  ["fat_g", "Grassi (g)"],
                                ] as const
                              ).map(([key, lbl]) => (
                                <div key={key} className="space-y-2">
                                  <Label htmlFor={`${key}-${i}`}>{lbl}</Label>
                                  <Input
                                    id={`${key}-${i}`}
                                    inputMode="decimal"
                                    className="num h-12"
                                    value={d[key]}
                                    onChange={(e) => patchDay(i, { [key]: e.target.value })}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            MEALS.map((m) => (
                              <div key={m.key} className="space-y-2">
                                <Label htmlFor={`${m.key}-${i}`}>{m.label}</Label>
                                <Textarea
                                  id={`${m.key}-${i}`}
                                  rows={2}
                                  maxLength={1000}
                                  placeholder={m.placeholder}
                                  value={d[m.key]}
                                  onChange={(e) => patchDay(i, { [m.key]: e.target.value })}
                                />
                              </div>
                            ))
                          )}

                          <Button variant="ghost" size="sm" onClick={() => copyToAll(i)}>
                            Copia su tutti i giorni
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="space-y-2 pt-4">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="plan-notes">Note</Label>
                    <span className="label-caps">opzionale</span>
                  </div>
                  <Textarea
                    id="plan-notes"
                    rows={3}
                    maxLength={1000}
                    placeholder="Giorni off: -50g carboidrati a cena…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {mode && (
              <div className="sticky bottom-0 -mx-5 mt-8 bg-background px-5 pt-4 pb-5 sm:static sm:mx-0 sm:px-0 sm:pb-0">
                <Button className="h-12 w-full" size="lg" onClick={save} disabled={saving}>
                  {saving ? "Salvataggio…" : "Salva piano alimentare"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
