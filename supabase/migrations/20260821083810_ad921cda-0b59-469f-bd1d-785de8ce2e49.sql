DROP POLICY IF EXISTS "cache readable by authenticated" ON public.macro_estimates_cache;
REVOKE ALL ON public.macro_estimates_cache FROM anon, authenticated;
GRANT ALL ON public.macro_estimates_cache TO service_role;
ALTER TABLE public.macro_estimates_cache ENABLE ROW LEVEL SECURITY;