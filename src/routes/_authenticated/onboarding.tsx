import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — GAINZ" },
      { name: "description", content: "Imposta i tuoi dati e i target giornalieri su GAINZ." },
      { property: "og:title", content: "Onboarding — GAINZ" },
      { property: "og:description", content: "Imposta i tuoi dati e i target giornalieri." },
    ],
  }),
  component: Onboarding,
});

const schema = z.object({
  name: z.string().trim().min(1, { message: "Inserisci il tuo nome" }).max(80),
  age: z.coerce.number().int().min(14, { message: "Età non valida" }).max(100),
  height_cm: z.coerce.number().min(120, { message: "Altezza non valida" }).max(250),
  weight_kg: z.coerce.number().min(30, { message: "Peso non valido" }).max(300),
  target_kcal: z.coerce.number().int().min(800, { message: "Target kcal non valido" }).max(8000),
  target_protein_g: z.coerce
    .number()
    .int()
    .min(30, { message: "Target proteine non valido" })
    .max(500),
});

const fields = [
  { key: "name", label: "Nome", type: "text", unit: "", placeholder: "Marco" },
  { key: "age", label: "Età", type: "number", unit: "anni", placeholder: "28" },
  { key: "height_cm", label: "Altezza", type: "number", unit: "cm", placeholder: "178" },
  { key: "weight_kg", label: "Peso attuale", type: "number", unit: "kg", placeholder: "82.4" },
  { key: "target_kcal", label: "Target calorico", type: "number", unit: "kcal / giorno", placeholder: "2900" },
  { key: "target_protein_g", label: "Target proteine", type: "number", unit: "g / giorno", placeholder: "180" },
] as const;

type FormState = Record<(typeof fields)[number]["key"], string>;

function Onboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    name: "",
    age: "",
    height_cm: "",
    weight_kg: "",
    target_kcal: "",
    target_protein_g: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!data) return;
      setForm((f) => ({
        name: data.name ?? f.name,
        age: data.age != null ? String(data.age) : f.age,
        height_cm: data.height_cm != null ? String(data.height_cm) : f.height_cm,
        weight_kg: data.weight_kg != null ? String(data.weight_kg) : f.weight_kg,
        target_kcal: data.target_kcal != null ? String(data.target_kcal) : f.target_kcal,
        target_protein_g:
          data.target_protein_g != null ? String(data.target_protein_g) : f.target_protein_g,
      }));
    })();
  }, [navigate]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessione scaduta");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userData.user.id, ...parsed.data, onboarded: true });
      if (error) throw error;
      toast.success("Profilo salvato");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-5 py-4 pb-16 sm:px-6 sm:py-16">
        <p className="label-caps mt-4 sm:mt-8">Passo 1 di 1</p>
        <h1 className="mt-4 text-3xl font-semibold">Impostiamo la base</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your data. Your gainz. Questi numeri servono al coach per calibrare volume, recupero e
          calorie. Puoi modificarli quando vuoi.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          {fields.map((f) => (
            <div key={f.key} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor={f.key}>{f.label}</Label>
                {f.unit && <span className="label-caps">{f.unit}</span>}
              </div>
              <Input
                id={f.key}
                type={f.type}
                inputMode={f.type === "number" ? "decimal" : undefined}
                step={f.key === "weight_kg" || f.key === "height_cm" ? "0.1" : "1"}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className={f.type === "number" ? "num" : undefined}
                required
              />
            </div>
          ))}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Salvataggio…" : "Salva e continua"}
          </Button>
        </form>
      </div>
    </main>
  );
}
