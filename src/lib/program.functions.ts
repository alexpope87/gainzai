import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FileInput = z
  .object({
    fileName: z.string().trim().min(1).max(200),
    mimeType: z
      .string()
      .trim()
      .max(100)
      .regex(/^(image\/[a-z0-9.+-]+|application\/pdf|text\/plain)$/i, "Tipo di file non supportato"),
    // ~8 MB di base64
    dataUrl: z.string().max(11_000_000).startsWith("data:").optional(),
    text: z.string().max(200_000).optional(),
  })
  .refine((v) => Boolean(v.dataUrl || v.text), { message: "File vuoto" });

const Input = z.union([
  FileInput,
  z.object({ files: z.array(FileInput).min(1).max(4) }),
]);

const SYSTEM = `Sei un assistente che legge schede di allenamento per bodybuilder e le converte in JSON.
Rispondi SOLO con JSON valido nel formato:
{"program_name": string, "days": [{"name": string, "exercises": [{"name": string, "target_sets": number, "target_reps_min": number, "target_reps_max": number, "target_rir": number|null, "notes": string|null}]}]}
Regole: mantieni l'ordine originale; i nomi degli esercizi in italiano come nella scheda; se le reps sono un numero singolo usa lo stesso valore per min e max; se il RIR non è indicato usa null; non inventare esercizi non presenti.
Se ricevi più file/immagini, ognuno può contenere uno o più giorni: uniscili tutti in UNA SOLA scheda, aggiungendo un Day per ogni giorno trovato, nell'ordine in cui compaiono i file. Non duplicare i Day.`;

export const parseProgramFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI non configurata");

    const { consumeRateLimit } = await import("./rate-limit.server");
    await consumeRateLimit(context.userId, "program");

    const files = "files" in data ? data.files : [data];

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          files.length > 1
            ? `Estrai la struttura di allenamento da questi ${files.length} file e uniscili in una sola scheda con più Day.`
            : `Estrai la struttura da questa scheda di allenamento (file: ${files[0]!.fileName}).`,
      },
    ];

    for (const f of files) {
      if (f.text) {
        content.push({
          type: "text",
          text: `# File: ${f.fileName}\n${f.text.slice(0, 60000)}`,
        });
      } else if (f.dataUrl) {
        if (f.mimeType.startsWith("image/")) {
          content.push({ type: "text", text: `# File: ${f.fileName}` });
          content.push({ type: "image_url", image_url: { url: f.dataUrl } });
        } else {
          content.push({
            type: "file",
            file: { filename: f.fileName, file_data: f.dataUrl },
          });
        }
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
