import { z } from "zod";

export const MacroInput = z.object({
  text: z.string().trim().min(2).max(2000),
});

export const MACRO_SYSTEM = `Sei un nutrizionista sportivo. L'utente descrive in italiano cosa ha mangiato.
Stima i macronutrienti totali del pasto descritto usando valori medi realistici degli alimenti italiani.
Se le quantità non sono indicate, assumi porzioni standard.
Rispondi SOLO con un oggetto json con: kcal, protein_g, carbs_g, fat_g (numeri interi, totali del pasto) e items (array di stringhe: breve elenco degli alimenti riconosciuti con la quantità stimata).`;

export const MacroOut = z.object({
  kcal: z.coerce.number().min(0).max(10000),
  protein_g: z.coerce.number().min(0).max(1000),
  carbs_g: z.coerce.number().min(0).max(2000),
  fat_g: z.coerce.number().min(0).max(1000),
  items: z.array(z.string()).default([]),
});

export type MacroEstimate = z.infer<typeof MacroOut>;

/** Normalizza la descrizione del pasto per massimizzare gli hit di cache. */
export function normalizeMealText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[.,;:!?"'`´()\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function hashMealText(normalized: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
