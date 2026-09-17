import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z
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

const SYSTEM = `Sei un assistente che legge piani alimentari e li converte in JSON.
Rispondi SOLO con JSON valido nel formato:
{"days":[{"weekday":0,"colazione":string,"pranzo":string,"cena":string,"spuntini":string,"kcal":number|null,"protein_g":number|null,"carbs_g":number|null,"fat_g":number|null}]}
Regole:
- weekday: 0=Lunedì, 1=Martedì, 2=Mercoledì, 3=Giovedì, 4=Venerdì, 5=Sabato, 6=Domenica.
- Includi sempre tutti e 7 i giorni. Se il piano è uguale per più giorni, ripeti lo stesso contenuto.
- Nei pasti scrivi alimenti e quantità come nel documento (es: "80g avena, 30g whey, 1 banana"). Un pasto per riga se ci sono più voci.
- Se un pasto non è indicato, usa stringa vuota. Se i macro non sono indicati, usa null.
- Non inventare alimenti non presenti nel documento.`;

const Out = z.object({
  days: z.array(
    z.object({
      weekday: z.coerce.number().int().min(0).max(6),
      colazione: z.string().catch(""),
      pranzo: z.string().catch(""),
      cena: z.string().catch(""),
      spuntini: z.string().catch(""),
      kcal: z.coerce.number().nullable().catch(null),
      protein_g: z.coerce.number().nullable().catch(null),
      carbs_g: z.coerce.number().nullable().catch(null),
      fat_g: z.coerce.number().nullable().catch(null),
    }),
  ),
});

export const parseMealPlanFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI non configurata");

    const { consumeRateLimit } = await import("./rate-limit.server");
    await consumeRateLimit(context.userId, "mealplan");


    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: data.text
          ? `Estrai il piano alimentare settimanale da questo documento (file: ${data.fileName}):\n\n${data.text.slice(0, 60000)}`
          : `Estrai il piano alimentare settimanale da questo documento (file: ${data.fileName}).`,
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
      throw new Error("Lettura del piano alimentare fallita");
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

    const result = Out.safeParse(parsed);
    if (!result.success || result.data.days.length === 0) {
      throw new Error("Non sono riuscito a estrarre il piano alimentare");
    }
    return result.data;
  });
