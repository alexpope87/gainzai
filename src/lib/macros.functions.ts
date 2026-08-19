import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  text: z.string().trim().min(2).max(2000),
});

const SYSTEM = `Sei un nutrizionista sportivo. L'utente descrive in italiano cosa ha mangiato.
Stima i macronutrienti totali del pasto descritto usando valori medi realistici degli alimenti italiani.
Se le quantità non sono indicate, assumi porzioni standard.
Rispondi in json con: kcal, protein_g, carbs_g, fat_g (numeri interi, totali del pasto) e items (breve elenco degli alimenti riconosciuti con la quantità stimata).`;

const Out = z.object({
  kcal: z.coerce.number().min(0).max(10000),
  protein_g: z.coerce.number().min(0).max(1000),
  carbs_g: z.coerce.number().min(0).max(2000),
  fat_g: z.coerce.number().min(0).max(1000),
  items: z.array(z.string()).default([]),
});

export const estimateMacros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI non configurata");

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
            content: [{ type: "input_text", text: `Pasto: ${data.text}` }],
          },
        ],
        reasoning: { effort: "low", summary: "auto" },
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "macro_estimate",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                kcal: { type: "number" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
                items: { type: "array", items: { type: "string" } },
              },
              required: ["kcal", "protein_g", "carbs_g", "fat_g", "items"],
            },
          },
        },
      }),
    });

    if (res.status === 429) throw new Error("Troppe richieste, riprova tra poco");
    if (res.status === 402) throw new Error("Crediti AI esauriti");
    if (!res.ok || !res.body) {
      console.error("AI gateway error", res.status, await res.text());
      throw new Error("Stima dei macro fallita");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed" && evt.response?.output_text) {
            if (!text) text = evt.response.output_text;
          }
        } catch {
          /* ignore partial */
        }
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      throw new Error("Risposta AI non leggibile");
    }

    const result = Out.safeParse(parsed);
    if (!result.success) throw new Error("Stima dei macro non valida");
    return result.data;
  });
