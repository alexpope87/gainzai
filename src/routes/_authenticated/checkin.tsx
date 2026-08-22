import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateNav, todayISO } from "@/components/date-nav";

export const Route = createFileRoute("/_authenticated/checkin")({
  head: () => ({
    meta: [
      { title: "Check-in giornaliero — GAINZ" },
      {
        name: "description",
        content: "Registra peso, sonno, energia, fame e stress in meno di 60 secondi.",
      },
      { property: "og:title", content: "Check-in giornaliero — GAINZ" },
      {
        property: "og:description",
        content: "60 secondi al giorno: peso, sonno, energia, fame, stress.",
      },
    ],
  }),
  component: CheckIn,
});

const schema = z.object({
  weight_kg: z.coerce.number().min(30, { message: "Peso non valido" }).max(300),
  sleep_hours: z.coerce.number().min(0, { message: "Ore di sonno non valide" }).max(16),
  sleep_quality: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  hunger: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  notes: z.string().trim().max(500).optional(),
});

const scales = [
  { key: "sleep_quality", label: "Qualità sonno", low: "Pessima", high: "Ottima" },
  { key: "energy", label: "Energia", low: "A terra", high: "Al massimo" },
  { key: "hunger", label: "Fame", low: "Nulla", high: "Costante" },
  { key: "stress", label: "Stress", low: "Zero", high: "Alto" },
] as const;

type ScaleKey = (typeof scales)[number]["key"];

function CheckIn() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [notes, setNotes] = useState("");
  const [ratings, setRatings] = useState<Record<ScaleKey, number>>({
    sleep_quality: 3,
    energy: 3,
    hunger: 3,
    stress: 3,
  });
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState(false);


  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const [{ data: profile }, { data: checkin }] = await Promise.all([
        supabase.from("profiles").select("weight_kg").eq("id", userData.user.id).maybeSingle(),
        supabase
          .from("checkins")
          .select("*")
          .eq("user_id", userData.user.id)
          .eq("date", date)
          .maybeSingle(),
      ]);

      if (checkin) {
        setExisting(true);
        setWeight(checkin.weight_kg != null ? String(checkin.weight_kg) : "");
        setSleepHours(checkin.sleep_hours != null ? String(checkin.sleep_hours) : "");
        setNotes(checkin.notes ?? "");
        setRatings({
          sleep_quality: checkin.sleep_quality ?? 3,
          energy: checkin.energy ?? 3,
          hunger: checkin.hunger ?? 3,
          stress: checkin.stress ?? 3,
        });
      } else {
        setExisting(false);
        setSleepHours("");
        setNotes("");
        setRatings({ sleep_quality: 3, energy: 3, hunger: 3, stress: 3 });
        setWeight(profile?.weight_kg != null ? String(profile.weight_kg) : "");
      }
    })();
  }, [date]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      weight_kg: weight,
      sleep_hours: sleepHours,
      ...ratings,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessione scaduta");
      const { error } = await supabase.from("checkins").upsert(
        {
          user_id: userData.user.id,
          date,
          ...parsed.data,
          notes: parsed.data.notes ?? null,
        },
        { onConflict: "user_id,date" },
      );
      if (error) throw error;
      if (date === todayISO()) {
        await supabase
          .from("profiles")
          .update({ weight_kg: parsed.data.weight_kg })
          .eq("id", userData.user.id);
      }
      toast.success("Check-in salvato");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-5 py-4 pb-10 sm:px-6 sm:py-16">
        <p className="label-caps mt-4 sm:mt-8">
          {existing ? "Aggiorna giornata" : "60 secondi"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Check-in giornaliero</h1>
        <div className="mt-4">
          <DateNav date={date} onChange={setDate} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Dimmi com'è andata la giornata. Bastano numeri veloci — il coach fa il resto.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="weight">Peso</Label>
                <span className="label-caps">kg</span>
              </div>
              <Input
                id="weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="82.4"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="num h-12 text-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="sleep">Sonno</Label>
                <span className="label-caps">ore</span>
              </div>
              <Input
                id="sleep"
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder="7.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="num h-12 text-lg"
                required
              />
            </div>
          </div>

          <div className="space-y-6">
            {scales.map((s) => (
              <div key={s.key} className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <Label>{s.label}</Label>
                  <span className="num text-sm text-muted-foreground">{ratings[s.key]} / 5</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((v) => {
                    const active = ratings[s.key] === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-label={`${s.label} ${v}`}
                        aria-pressed={active}
                        onClick={() => setRatings((r) => ({ ...r, [s.key]: v }))}
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
                <div className="flex justify-between">
                  <span className="label-caps">{s.low}</span>
                  <span className="label-caps">{s.high}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="notes">Note</Label>
              <span className="label-caps">opzionale</span>
            </div>
            <Textarea
              id="notes"
              rows={3}
              maxLength={500}
              placeholder="Ginocchio un po' infiammato, giornata pesante al lavoro…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="sticky bottom-0 -mx-5 bg-background px-5 pt-4 pb-5 sm:static sm:mx-0 sm:px-0 sm:pb-0">
            <Button type="submit" className="h-12 w-full" size="lg" disabled={loading}>
              {loading ? "Salvataggio…" : existing ? "Aggiorna check-in" : "Salva check-in"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
