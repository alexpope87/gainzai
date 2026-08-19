# Migrazione GAINZ → nuovo progetto (Supabase GAINZ PROD)

Il progetto originale resta intatto: lavoro solo su una copia in sola lettura del suo codice.

## 1. Analisi del progetto originale

**Stack**: identico a questo nuovo progetto (TanStack Start + React 19 + Tailwind v4 + shadcn/ui + Supabase). Nessun cambio di framework necessario.

### File e cartelle da trasferire (116 file)
- `src/routes/` — `index.tsx`, `auth.tsx`, `reset-password.tsx`, `__root.tsx`, e il gruppo protetto `_authenticated/` (route.tsx, dashboard, onboarding, checkin, workout, program, meal-plan, macros, analysis)
- `src/components/` — componenti app (back-nav, brand-logo, dashboard-actions, dashboard-metrics, date-nav, program-list) + libreria `ui/` shadcn completa
- `src/lib/` — logica server e utility: `analysis.functions.ts`, `macros.functions.ts`, `meal-plan.functions.ts`, `program.functions.ts`, `error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts`, `utils.ts`
- `src/hooks/use-mobile.tsx`
- `src/styles.css` (tema/design system), `src/router.tsx`, `src/start.ts`, `src/server.ts`
- `public/favicon.ico`, `public/robots.txt`, `components.json`

### Da NON trasferire
- `src/integrations/supabase/*` → nel nuovo progetto sono già generati e puntano a GAINZ PROD (incluso `types.ts`)
- `src/routeTree.gen.ts` → rigenerato automaticamente
- `.env`, `.lovable/`, `supabase/config.toml` (project_id diverso), `bun.lock`

### Dipendenze
Tutte già presenti tranne una: **`xlsx`** (usata in `program.tsx` e `meal-plan.tsx` per importare schede/piani da Excel/CSV). Da installare.

### Configurazioni da adattare al nuovo Supabase
- `supabase/config.toml`: mantiene il project_id del nuovo progetto (`iqddzlckdkmwignlmfhy`) — non copio quello vecchio
- Client Supabase e `types.ts`: si usano quelli già generati qui
- `.env`: già popolato con URL/chiavi di GAINZ PROD
- Schema DB: **le tabelle su GAINZ PROD esistono già e combaciano** (profiles, checkins, programs, program_days, program_exercises, workout_sessions, workout_sets, meals, meal_plans, meal_plan_days, analyses) con RLS e trigger. Nessuna migrazione da rieseguire; verifico solo eventuali scostamenti.
- `__root.tsx`: sostituisco l'URL `og:image` che punta all'anteprima del progetto vecchio

### Server / edge functions
Nessuna Supabase Edge Function. Tutta la logica server è in TanStack server functions (`src/lib/*.functions.ts`) con `requireSupabaseAuth`. Nessun webhook, cron o route `api/public`.

### Secrets e variabili d'ambiente
- Già presenti su GAINZ PROD: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `LOVABLE_API_KEY`, `LOVABLE_CRON_SECRET`
- Il runtime server legge `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` — tutti disponibili. Nessun secret nuovo da chiedere.

### Riferimenti a Lovable Cloud da valutare
- **AI Gateway** (`https://ai.gateway.lovable.dev`) usato da analisi, macro, piano pasti e import scheda con `LOVABLE_API_KEY`. Non è legato a Lovable Cloud/Supabase: **lo mantengo invariato**, continua a funzionare.
- `lovable-error-reporting.ts` / `error-capture.ts`: telemetria dell'editor, innocua. Mantenuti.
- `og:image` con URL preview del vecchio progetto → rimosso/aggiornato.

## 2. Piano di esecuzione

1. Installare `xlsx`.
2. Copiare componenti, hooks, lib, styles.css, public assets e configurazione shadcn.
3. Copiare le route (sovrascrivendo `index.tsx` placeholder e `__root.tsx`), lasciando intatta l'integrazione Supabase locale.
4. Adattare `__root.tsx` (og:image) e verificare che tutti gli import puntino a `@/integrations/supabase/*` del nuovo progetto.
5. Verificare che `src/start.ts` registri `attachSupabaseAuth` (già fatto) e rigenerare il route tree.
6. Confrontare lo schema DB con quello atteso dal codice; applicare una migrazione solo se emergono differenze.
7. Verifica finale: build + typecheck + controllo delle pagine principali nell'anteprima.

Il progetto originale non viene toccato in nessun passaggio.
