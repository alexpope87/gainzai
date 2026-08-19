import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataUrl: z.string().optional(),
  text: z.string().optional(),
});

const SYSTEM = `Sei un assistente che legge schede di allenamento per bodybuilder e le converte in JSON.
Rispondi SOLO con JSON valido nel formato:
{"program_name": string, "days": [{"name": string, "exercises": [{"name": string, "target_sets": number, "target_reps_min": number, "target_reps_max": number, "target_rir": number|null, "notes": string|null}]}]}
Regole: mantieni l'ordine originale; i nomi degli esercizi in italiano come nella scheda; se le reps sono un numero singolo usa lo stesso valore per min e max; se il RIR non è indicato usa null; non inventare esercizi non presenti.`;

export const parseProgramFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI non configurata");

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: data.text
          ? `Estrai la struttura da questa scheda (file: ${data.fileName}):\n\n${data.text.slice(0, 60000)}`
          : `Estrai la struttura da questa scheda di allenamento (file: ${data.fileName}).`,
      },
    ];

    if (data.dataUrl) {
      if (data.mimeType.startsWith("image/")) {
        content.push({ type: "image_url", image_url: { url: data.dataUrl } });
      } else {
        content.push({
          type: "file",
          file: { filename: data.fileName, file_data: data.dataUrl },
        });
      }
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Troppe richieste, riprova tra poco");
    if (res.status === 402) throw new Error("Crediti AI esauriti");
    if (!res.ok) {
      console.error("AI gateway error", res.status, await res.text());
      throw new Error("Lettura della scheda fallita");
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Risposta AI non leggibile");
    }

    const Out = z.object({
      program_name: z.string().optional(),
      days: z.array(
        z.object({
          name: z.string(),
          exercises: z.array(
            z.object({
              name: z.string(),
              target_sets: z.coerce.number().int().min(1).max(20).catch(3),
              target_reps_min: z.coerce.number().int().min(1).max(100).catch(8),
              target_reps_max: z.coerce.number().int().min(1).max(100).catch(12),
              target_rir: z.coerce.number().int().min(0).max(10).nullable().catch(null),
              notes: z.string().nullable().catch(null),
            }),
          ),
        }),
      ),
    });

    const result = Out.safeParse(parsed);
    if (!result.success || result.data.days.length === 0) {
      throw new Error("Non sono riuscito a estrarre i Day dalla scheda");
    }
    return result.data;
  });
