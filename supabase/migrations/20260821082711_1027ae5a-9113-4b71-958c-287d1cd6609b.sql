CREATE TABLE public.macro_estimates_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash text NOT NULL UNIQUE,
  text_normalized text NOT NULL,
  kcal numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  items text[] NOT NULL DEFAULT '{}',
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.macro_estimates_cache TO authenticated;
GRANT ALL ON public.macro_estimates_cache TO service_role;

ALTER TABLE public.macro_estimates_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cache readable by authenticated"
  ON public.macro_estimates_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_macro_estimates_cache_updated_at
  BEFORE UPDATE ON public.macro_estimates_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.upsert_macro_estimate(
  _text_hash text,
  _text_normalized text,
  _kcal numeric,
  _protein_g numeric,
  _carbs_g numeric,
  _fat_g numeric,
  _items text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.macro_estimates_cache
    (text_hash, text_normalized, kcal, protein_g, carbs_g, fat_g, items, hits)
  values
    (_text_hash, _text_normalized, _kcal, _protein_g, _carbs_g, _fat_g, coalesce(_items, '{}'), 1)
  on conflict (text_hash) do update
    set hits = public.macro_estimates_cache.hits + 1,
        updated_at = now();
end;
$$;

CREATE OR REPLACE FUNCTION public.bump_macro_estimate_hit(_text_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  update public.macro_estimates_cache
    set hits = hits + 1, updated_at = now()
  where text_hash = _text_hash;
end;
$$;

GRANT EXECUTE ON FUNCTION public.bump_macro_estimate_hit(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_macro_estimate(text, text, numeric, numeric, numeric, numeric, text[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_macro_estimate(text, text, numeric, numeric, numeric, numeric, text[]) TO service_role;