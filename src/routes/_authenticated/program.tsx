import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { parseProgramFile } from "@/lib/program.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackNav } from "@/components/back-nav";
import { ProgramList } from "@/components/program-list";
import { Link } from "@tanstack/react-router";


export const Route = createFileRoute("/_authenticated/program")({
  head: () => ({
    meta: [
      { title: "La tua scheda — GAINZ" },
      {
        name: "description",
        content:
          "Carica la tua scheda in PDF, Excel o foto: l'AI estrae Day, esercizi, serie e reps.",
      },
      { property: "og:title", content: "La tua scheda — GAINZ" },
      {
        property: "og:description",
        content: "L'AI legge la tua scheda di allenamento e la rende modificabile.",
      },
    ],
  }),
  component: ProgramPage,
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

function ProgramPage() {

  const queryClient = useQueryClient();
  const parse = useServerFn(parseProgramFile);

  const fileRef = useRef<HTMLInputElement>(null);
  const [programName, setProgramName] = useState("Scheda");
  const [days, setDays] = useState<Day[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadActive = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: program } = await supabase
      .from("programs")
      .select("id, name")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (program) {
      setProgramName(program.name);
      const { data: dayRows } = await supabase
        .from("program_days")
        .select("id, name, order_index, program_exercises(*)")
        .eq("program_id", program.id)
        .order("order_index");
      setDays(
        (dayRows ?? []).map((d) => ({
          name: d.name,
          exercises: [...((d as unknown as { program_exercises: Ex[] & { order_index: number }[] }).program_exercises ?? [])]
            .sort((a, b) => (a as unknown as { order_index: number }).order_index - (b as unknown as { order_index: number }).order_index)
            .map((e) => ({
              name: e.name,
              target_sets: e.target_sets,
              target_reps_min: e.target_reps_min,
              target_reps_max: e.target_reps_max,
              target_rir: e.target_rir,
            })),
        })),
      );
    } else {
      setProgramName("Scheda");
      setDays([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void loadActive();
  }, [loadActive]);


  async function handleFile(file: File) {
    setSaved(false);
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
        payload = {
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          dataUrl,
        };
      }

      const result = await parse({ data: payload });
      if (result.program_name) setProgramName(result.program_name);
      setDays(
        result.days.map((d) => ({
          name: d.name,
          exercises: d.exercises.map((e) => ({
            name: e.name,
            target_sets: e.target_sets,
            target_reps_min: e.target_reps_min,
            target_reps_max: e.target_reps_max,
            target_rir: null,
          })),
        })),
      );
      toast.success(`Estratti ${result.days.length} Day`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lettura fallita");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
    if (days.length === 0) return;
    if (days.some((d) => d.exercises.some((e) => !e.name.trim()))) {
      toast.error("Ogni esercizio deve avere un nome");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sessione scaduta");

      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({ user_id: user.id, name: programName.trim() || "Scheda", is_active: true })
        .select("id")
        .single();
      if (pErr) throw pErr;

      const { data: dayRows, error: dErr } = await supabase
        .from("program_days")
        .insert(
          days.map((d, i) => ({
            user_id: user.id,
            program_id: program.id,
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

      toast.success("Scheda salvata");
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["programs"] });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-4 pb-10 sm:px-6 sm:py-16">
        <BackNav />
        <p className="label-caps mt-4 sm:mt-8">Scheda</p>
        <h1 className="mt-3 text-3xl font-semibold">La tua scheda</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Carica PDF, Excel o una foto. L'AI estrae i Day e gli esercizi — poi correggi quello che
          serve.
        </p>

        {saved && (
          <div className="mt-8 border border-border p-5">
            <p className="text-sm font-medium">Scheda salvata ✓</p>
            <p className="mt-2 text-sm text-muted-foreground">
              È ora la tua scheda attiva. Puoi caricarne un'altra o tornare alla dashboard.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 sm:h-11"
                onClick={() => {
                  setSaved(false);
                  setDays([]);
                  setProgramName("Scheda");
                  fileRef.current?.click();
                }}
              >
                Aggiungi altra scheda
              </Button>
              <Link
                to="/dashboard"
                className="flex h-12 items-center justify-center border border-border px-4 text-sm sm:h-11"
              >
                Torna alla dashboard
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 border border-border p-5">

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button
            className="h-12 w-full"
            disabled={parsing}
            onClick={() => fileRef.current?.click()}
          >
            {parsing ? "Lettura in corso…" : "Carica scheda"}
          </Button>
          <p className="label-caps mt-3">PDF · Excel · CSV · Foto</p>
        </div>

        <section className="mt-10">
          <p className="label-caps">Le tue schede</p>
          <div className="mt-4">
            <ProgramList onChanged={() => void loadActive()} />
          </div>
        </section>


        {loaded && days.length === 0 && !parsing && (
          <div className="mt-6 border border-border p-5">
            <p className="text-sm text-muted-foreground">
              Nessuna scheda ancora. Puoi anche crearla a mano.
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => setDays([{ name: "Day 1", exercises: [emptyEx()] }])}
            >
              Crea a mano
            </Button>
          </div>
        )}

        {days.length > 0 && (
          <div className="mt-10 space-y-8">
            <div className="space-y-2">
              <Label htmlFor="pname">Nome scheda</Label>
              <Input
                id="pname"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                className="h-12"
              />
            </div>

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
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="label-caps">Serie</span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={ex.target_sets ?? ""}
                            onChange={(e) =>
                              updateEx(di, ei, {
                                target_sets: e.target.value === "" ? 0 : Number(e.target.value),
                              })
                            }
                            className="num h-11"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="label-caps">Reps</span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={ex.target_reps_min ?? ""}
                            onChange={(e) => {
                              const v = e.target.value === "" ? 0 : Number(e.target.value);
                              updateEx(di, ei, { target_reps_min: v, target_reps_max: v });
                            }}
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

            <div className="sticky bottom-0 -mx-5 bg-background px-5 pt-4 pb-5 sm:static sm:mx-0 sm:px-0 sm:pb-0">
              <Button className="h-12 w-full" size="lg" onClick={save} disabled={saving}>
                {saving ? "Salvataggio…" : "Conferma scheda"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
