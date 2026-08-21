import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MACRO_SYSTEM,
  MacroInput,
  MacroOut,
  hashMealText,
  normalizeMealText,
  type MacroEstimate,
} from "./macros-shared";

export const estimateMacros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MacroInput.parse(input))
  .handler(async ({ data }): Promise<MacroEstimate> => {
    const normalized = normalizeMealText(data.text);
    const textHash = await hashMealText(normalized);

    // 1. Cache lookup (nessuna chiamata AI se già stimato) - solo lato server
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cached } = await supabaseAdmin
      .from("macro_estimates_cache")
      .select("kcal, protein_g, carbs_g, fat_g, items")
      .eq("text_hash", textHash)
      .maybeSingle();

    if (cached) {
      const hit = MacroOut.safeParse({
        kcal: cached.kcal,
        protein_g: cached.protein_g,
        carbs_g: cached.carbs_g,
        fat_g: cached.fat_g,
        items: cached.items ?? [],
      });
      if (hit.success) {
        try {
          await supabaseAdmin.rpc("bump_macro_estimate_hit", { _text_hash: textHash });
        } catch (e) {
          console.error("cache hit bump failed", e);
        }
        return hit.data;
      }
    }


    // 2. Cache miss -> modello economico
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI non configurata");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: MACRO_SYSTEM },
          { role: "user", content: `Pasto: ${data.text}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Troppe richieste, riprova tra poco");
    if (res.status === 402) throw new Error("Crediti AI esauriti");
    if (!res.ok) {
      console.error("AI gateway error", res.status, await res.text());
      throw new Error("Stima dei macro fallita");
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

    const result = MacroOut.safeParse(parsed);
    if (!result.success) throw new Error("Stima dei macro non valida");

    // 3. Salva in cache (best effort)
    try {
      await supabaseAdmin.rpc("upsert_macro_estimate", {

        _text_hash: textHash,
        _text_normalized: normalized,
        _kcal: result.data.kcal,
        _protein_g: result.data.protein_g,
        _carbs_g: result.data.carbs_g,
        _fat_g: result.data.fat_g,
        _items: result.data.items,
      });
    } catch (e) {
      console.error("cache write failed", e);
    }

    return result.data;
  });
