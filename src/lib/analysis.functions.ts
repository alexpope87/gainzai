import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM = `Sei un preparatore atletico esperto di bodybuilding natural. Parli diretto come un vero coach. Zero teoria senza applicazione pratica. Zero complimenti generici. Dai solo indicazioni concrete basate sui dati reali di questo atleta. Quando non hai abbastanza dati per essere certo, dillo esplicitamente. Rispondi sempre in italiano.`;

const RULES = `Regole obbligatorie:
- Mai consigli generici: cita sempre i numeri reali dell'atleta (kg, reps, kcal, ore di sonno, punteggi 1-5).
- Negli allenamenti confronta sempre pianificato vs eseguito (serie, range reps, RIR target vs effettivo).
- Se i dati sono insufficienti per una sezione, dillo chiaramente in quella sezione invece di inventare.
- Tono diretto da preparatore atletico, nessun complimento inutile.
- Ogni sezione è breve e operativa: massimo 4-5 frasi, nessun elenco puntato lungo.
Sezioni:
- peso: analisi del trend peso + azione concreta.
- forza: progressione per esercizio (in aumento / stagnante / in calo) + cosa fare.
- recupero: valutazione su sonno, energia, stress e volume allenamento.
- macro: confronta il piano alimentare di riferimento (piano_alimentare_settimanale, weekday 0=lunedi..6=domenica, con macro target e/o pasti per giorno; piano_alimentare.mode indica se l'atleta segue macro giornalieri o un piano pasti) con i pasti realmente registrati e con i target settimanali + modifica o conferma. Se il piano alimentare manca, dillo.
- priorita: 1-2 azioni specifiche e concrete per domani.`;

const Out = z.object({
  peso: z.string(),
  forza: z.string(),
  recupero: z.string(),
  macro: z.string(),
  priorita: z.string(),
});

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const generateAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI non configurata");
    const { supabase, userId } = context;

    const from = isoDaysAgo(6);
    const today = isoDaysAgo(0);

    const [profileRes, checkinsRes, mealsRes, sessionsRes, programsRes, mealPlanRes, mealPlanDaysRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("checkins").select("*").gte("date", from).order("date"),
        supabase.from("meals").select("*").gte("date", from).order("date"),
        supabase.from("workout_sessions").select("*").gte("date", from).order("date"),
        supabase
          .from("programs")
          .select("id, name, is_active, archived_at")
          .eq("is_active", true)
          .is("archived_at", null),
        supabase
          .from("meal_plans")
          .select("mode, colazione, pranzo, cena, spuntini, notes")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("meal_plan_days")
          .select("weekday, kcal, protein_g, carbs_g, fat_g, colazione, pranzo, cena, spuntini")
          .eq("user_id", userId)
          .order("weekday"),
      ]);


    const sessions = sessionsRes.data ?? [];
    const sessionIds = sessions.map((s) => s.id);
    const setsRes = sessionIds.length
      ? await supabase.from("workout_sets").select("*").in("session_id", sessionIds)
      : { data: [] as Array<Record<string, unknown>> };

    const activeProgram = (programsRes.data ?? [])[0];
    let planned: unknown = null;
    if (activeProgram) {
      const { data: days } = await supabase
        .from("program_days")
        .select("id, name, order_index")
        .eq("program_id", activeProgram.id)
        .order("order_index");
      const dayIds = (days ?? []).map((d) => d.id);
      const { data: exercises } = dayIds.length
        ? await supabase
            .from("program_exercises")
            .select("day_id, name, target_sets, target_reps_min, target_reps_max, target_rir, order_index")
            .in("day_id", dayIds)
            .order("order_index")
        : { data: [] };
      planned = (days ?? []).map((d) => ({
        day: d.name,
        esercizi: (exercises ?? []).filter((e) => e.day_id === d.id),
      }));
    }

    const payload = {
      oggi: today,
      finestra: `${from} → ${today}`,
      profilo: profileRes.data,
      checkin: checkinsRes.data ?? [],
      pasti: mealsRes.data ?? [],
      allenamenti: sessions.map((s) => ({
        data: s.date,
        day: s.day_name,
        pump: s.pump,
        sforzo: s.effort,
        motivazione: s.motivation,
        note: s.notes,
        serie: (setsRes.data ?? []).filter((x) => (x as { session_id: string }).session_id === s.id),
      })),
      scheda_pianificata: planned,
      piano_alimentare: mealPlanRes.data ?? null,
      piano_alimentare_settimanale: mealPlanDaysRes.data ?? [],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        stream: true,
        instructions: SYSTEM,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${RULES}\n\nDati degli ultimi 7 giorni (JSON):\n${JSON.stringify(payload)}`,
              },
            ],
          },
        ],
        reasoning: { effort: "medium", summary: "auto" },
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "analisi_serale",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                peso: { type: "string" },
                forza: { type: "string" },
                recupero: { type: "string" },
                macro: { type: "string" },
                priorita: { type: "string" },
              },
              required: ["peso", "forza", "recupero", "macro", "priorita"],
            },
          },
        },
      }),
    });

    if (res.status === 429) throw new Error("Troppe richieste, riprova tra poco");
    if (res.status === 402) throw new Error("Crediti AI esauriti");
    if (!res.ok || !res.body) {
      console.error("AI gateway error", res.status, await res.text());
      throw new Error("Generazione analisi fallita");
    }

    type OutputItem = {
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    };
    type ResponsePayload = {
      output_text?: string | string[];
      output?: OutputItem[];
      status?: string;
      incomplete_details?: unknown;
      error?: unknown;
    };

    function textFromResponse(r: ResponsePayload | undefined): string {
      if (!r) return "";
      if (typeof r.output_text === "string" && r.output_text) return r.output_text;
      if (Array.isArray(r.output_text)) return r.output_text.join("");
      const parts: string[] = [];
      for (const item of r.output ?? []) {
        if (item.type === "reasoning") continue;
        for (const c of item.content ?? []) {
          if (typeof c.text === "string" && c.type !== "reasoning_text") parts.push(c.text);
        }
      }
      return parts.join("");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let lastResponse: ResponsePayload | undefined;
    const eventTypes = new Set<string>();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const evt = JSON.parse(raw) as {
            type?: string;
            delta?: string;
            text?: string;
            response?: ResponsePayload;
          };
          if (evt.type) eventTypes.add(evt.type);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.output_text.done" && typeof evt.text === "string" && !text) {
            text = evt.text;
          } else if (evt.response) {
            lastResponse = evt.response;
          }
        } catch {
          /* ignore partial */
        }
      }
    }

    if (!text.trim()) text = textFromResponse(lastResponse);

    // Strip eventuali code fence ```json ... ```
    let cleaned = text.trim();
    const fence = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence?.[1]) cleaned = fence[1].trim();
    if (!cleaned.startsWith("{")) {
      const first = cleaned.indexOf("{");
      const last = cleaned.lastIndexOf("}");
      if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("[analysis] parsing fallito", {
        errore: e instanceof Error ? e.message : String(e),
        eventi: [...eventTypes],
        status: lastResponse?.status,
        incomplete: lastResponse?.incomplete_details,
        aiError: lastResponse?.error,
        lunghezza: cleaned.length,
        anteprima: cleaned.slice(0, 1500),
      });
      throw new Error(
        cleaned
          ? "Risposta AI non leggibile"
          : "L'AI non ha restituito testo (nessun output). Riprova.",
      );
    }
    const result = Out.safeParse(parsed);
    if (!result.success) {
      console.error("[analysis] schema non valido", {
        issues: result.error.issues,
        anteprima: cleaned.slice(0, 1500),
      });
      throw new Error("Analisi non valida");
    }

    const counts = `${payload.checkin.length} check-in · ${payload.allenamenti.length} allenamenti · ${payload.pasti.length} pasti`;

    const { data: saved, error } = await supabase
      .from("analyses")
      .upsert(
        { user_id: userId, date: today, ...result.data, data_notes: counts },
        { onConflict: "user_id,date" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return saved;
  });
