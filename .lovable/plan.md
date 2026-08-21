# Ottimizzazione costi AI: stima macro

Obiettivo: ridurre il costo mensile dell'AI Gateway (~70–95 $ stimati con 100 utenti) portandolo a ~30–45 $, senza peggiorare l'esperienza utente.

Le stime macro sono il 75% delle chiamate (9.000/mese su 12.000) ma il task più semplice: si prestano sia a un modello più economico sia alla cache.

## 1. Modello più economico per le macro

`estimateMacros` passa da `openai/gpt-5.6-sol` (Responses API con reasoning) a `google/gemini-3.6-flash` sulla chat completions API, la stessa già usata con successo per l'import del piano alimentare e delle schede.

- Stesso schema JSON di output (`kcal`, `protein_g`, `carbs_g`, `fat_g`, `items`) e stesso prompt di sistema: nessun cambiamento per il frontend.
- Stessa gestione errori (429 / 402 / risposta non leggibile) e stessa validazione Zod.
- Risparmio atteso su questa voce: circa −80%.

L'analisi giornaliera (`generateAnalysis`) resta su `openai/gpt-5.6-sol`: è il task di ragionamento vero e proprio e vale il costo.

## 2. Cache delle stime già calcolate

Nuova tabella `macro_estimates_cache` su Supabase, condivisa tra tutti gli utenti (le macro di "100g di petto di pollo" non dipendono da chi le chiede).

- Chiave: hash della descrizione normalizzata (minuscolo, spazi e punteggiatura compattati).
- Colonne: `text_hash` (unique), `text_normalized`, i quattro macro, `items`, `hits`, `created_at`.
- Flusso in `estimateMacros`: cerca in cache → se trovata restituisce subito (0 chiamate AI, risposta istantanea) e incrementa `hits`; altrimenti chiama il modello e salva il risultato.
- RLS: lettura consentita a tutti gli utenti autenticati; la scrittura avviene solo dal server tramite funzione security definer, così nessuno può avvelenare la cache con valori arbitrari.

Con pasti ricorrenti (colazione uguale ogni giorno, piatti abituali) ci si aspetta un hit rate del 30–50% dopo le prime settimane.

## Costo atteso dopo l'intervento

| Voce | Prima | Dopo |
|---|---|---|
| Analisi giornaliere | ~45–60 $ | invariato |
| Stime macro | ~25–35 $ | ~3–6 $ |
| **Totale AI/mese** | **~70–95 $** | **~50–65 $** |

Più Lovable Pro (25 $) e Supabase (0 $ su Free, 25 $ su Pro).

## Dettagli tecnici

- Migrazione SQL: `CREATE TABLE public.macro_estimates_cache`, `GRANT SELECT` a `authenticated` + `GRANT ALL` a `service_role`, RLS abilitata con policy di sola lettura, indice unique su `text_hash`.
- Funzione `public.upsert_macro_estimate(...)` security definer per la scrittura dal server, oppure scrittura con client service role dentro l'handler.
- Hash con `crypto.subtle.digest('SHA-256', ...)` (disponibile nel runtime Worker).
- `src/lib/macros.functions.ts`: sostituzione della chiamata Responses API con una fetch a `https://ai.gateway.lovable.dev/v1/chat/completions`, modello `google/gemini-3.6-flash`, `response_format` json_schema; niente streaming necessario per questo modello.
- Nessuna modifica ai componenti che chiamano `estimateMacros`: firma e forma del risultato restano identiche.
- Verifica finale: chiamata reale di prova alla funzione (primo miss → salvataggio in cache, secondo hit → nessuna chiamata AI) e typecheck.
